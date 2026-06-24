import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdmin } from "./osLib"

// Auto-categorize a file by extension, or a link by its URL host.
function categoryForExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '')
  if (e === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'heic'].includes(e)) return 'image'
  if (e === 'svg') return 'svg'
  if (['md', 'markdown', 'mdx'].includes(e)) return 'markdown'
  return 'doc'
}
function categoryForUrl(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('notion.so') || u.includes('notion.site')) return 'notion'
  if (u.includes('github.com')) return 'github'
  if (u.includes('vercel.app') || u.includes('vercel.com')) return 'vercel'
  return 'link'
}

// Plus de dossier auto par type : le type est désormais un filtre transversal côté UI.
// Les imports à la racine restent à la racine ; le classement se fait par dossier d'usage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultFolder(_category: string): string {
  return ''
}

// All library items, with a resolved download URL for files.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("library_items").collect()
    const out = await Promise.all(rows.map(async (r) => ({
      id:          r._id,
      kind:        r.kind,
      category:    r.category,
      folder:      r.folder ?? defaultFolder(r.category),
      name:        r.name,
      ext:         r.ext ?? '',
      url:         r.kind === 'link' ? (r.url ?? '') : (r.storageId ? await ctx.storage.getUrl(r.storageId as never) ?? '' : ''),
      mime:        r.mime ?? '',
      size:        r.size ?? 0,
      addedAt:     r.addedAt,
      tags:        r.tags ?? [],
      description: r.description ?? '',
      assignedTo:  r.assignedTo ?? [],
      status:      r.status ?? '',
    })))
    out.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    return out
  },
})

// Register an uploaded file (blob already pushed to Convex storage via generateUploadUrl)
export const addFile = mutation({
  args: { name: v.string(), ext: v.string(), storageId: v.string(), mime: v.optional(v.string()), size: v.optional(v.number()), folder: v.optional(v.string()) },
  handler: async (ctx, { name, ext, storageId, mime, size, folder }) => {
    const category = categoryForExt(ext)
    return await ctx.db.insert("library_items", {
      kind: 'file', category, folder: folder ?? defaultFolder(category), name, ext: ext.toLowerCase().replace(/^\./, ''),
      storageId, mime, size, addedAt: new Date().toISOString(),
    })
  },
})

// Add a link (Notion / GitHub / Vercel / autre) — category auto-detected, overridable
export const addLink = mutation({
  args: { name: v.string(), url: v.string(), category: v.optional(v.string()), folder: v.optional(v.string()) },
  handler: async (ctx, { name, url, category, folder }) => {
    const cat = category || categoryForUrl(url)
    return await ctx.db.insert("library_items", {
      kind: 'link', category: cat, folder: folder ?? defaultFolder(cat), name, url, addedAt: new Date().toISOString(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("library_items") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const item = await ctx.db.get(id)
    if (item?.storageId) { try { await ctx.storage.delete(item.storageId as never) } catch { /* ignore */ } }
    await ctx.db.delete(id)
  },
})

export const updateItem = mutation({
  args: {
    id:          v.id("library_items"),
    name:        v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    assignedTo:  v.optional(v.array(v.string())),
    folder:      v.optional(v.string()),
    status:      v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filtered)
  },
})

// ─── Dossiers (arborescence path-based) ─────────────────────────────────────

export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("library_folders").collect()
    return rows.map(r => ({ id: r._id, name: r.name, path: r.path, parentPath: r.parentPath }))
  },
})

export const createFolder = mutation({
  args: { name: v.string(), parentPath: v.optional(v.string()) },
  handler: async (ctx, { name, parentPath }) => {
    await requireAdmin(ctx)
    const clean = name.trim().replace(/\//g, " ").replace(/\s+/g, " ")
    if (!clean) return null
    const parent = (parentPath ?? "").trim()
    const path = parent ? `${parent}/${clean}` : clean
    // Recréer à la racine un dossier de base supprimé le restaure (on lève le masquage).
    if (!parent) {
      const hidden = await ctx.db.query("library_hidden_base").withIndex("by_name", q => q.eq("name", clean)).collect()
      for (const h of hidden) await ctx.db.delete(h._id)
    }
    const existing = await ctx.db.query("library_folders").withIndex("by_path", q => q.eq("path", path)).first()
    if (existing) return existing._id
    return await ctx.db.insert("library_folders", { name: clean, path, parentPath: parent, createdAt: new Date().toISOString() })
  },
})

// Dossiers de base masqués (supprimés par l'utilisateur). Liste de noms.
export const listHiddenBase = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("library_hidden_base").collect()).map(r => r.name),
})

// Masque un dossier de base (= le "supprimer"). Idempotent.
export const hideBaseFolder = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const clean = name.trim()
    if (!clean) return
    const existing = await ctx.db.query("library_hidden_base").withIndex("by_name", q => q.eq("name", clean)).first()
    if (!existing) await ctx.db.insert("library_hidden_base", { name: clean })
  },
})

export const renameFolder = mutation({
  args: { path: v.string(), name: v.string() },
  handler: async (ctx, { path, name }) => {
    await requireAdmin(ctx)
    const clean = name.trim().replace(/\//g, " ").replace(/\s+/g, " ")
    if (!clean) return
    const folder = await ctx.db.query("library_folders").withIndex("by_path", q => q.eq("path", path)).first()
    const parentPath = folder ? folder.parentPath : (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "")
    const newPath = parentPath ? `${parentPath}/${clean}` : clean
    if (newPath === path) return
    const folders = await ctx.db.query("library_folders").collect()
    for (const f of folders) {
      if (f.path === path || f.path.startsWith(path + "/")) {
        const np = newPath + f.path.slice(path.length)
        const npParent = np.includes("/") ? np.slice(0, np.lastIndexOf("/")) : ""
        await ctx.db.patch(f._id, { path: np, parentPath: npParent, name: f.path === path ? clean : f.name })
      }
    }
    const items = await ctx.db.query("library_items").collect()
    for (const it of items) {
      const fol = it.folder ?? ""
      if (fol === path || fol.startsWith(path + "/")) {
        await ctx.db.patch(it._id, { folder: newPath + fol.slice(path.length) })
      }
    }
  },
})

export const deleteFolder = mutation({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    await requireAdmin(ctx)
    const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
    const items = await ctx.db.query("library_items").collect()
    for (const it of items) {
      const fol = it.folder ?? ""
      if (fol === path || fol.startsWith(path + "/")) {
        await ctx.db.patch(it._id, { folder: parentPath || undefined })
      }
    }
    const folders = await ctx.db.query("library_folders").collect()
    for (const f of folders) {
      if (f.path === path || f.path.startsWith(path + "/")) await ctx.db.delete(f._id)
    }
  },
})
