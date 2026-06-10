import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

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

// All library items, with a resolved download URL for files.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("library_items").collect()
    const out = await Promise.all(rows.map(async (r) => ({
      id:          r._id,
      kind:        r.kind,
      category:    r.category,
      name:        r.name,
      ext:         r.ext ?? '',
      url:         r.kind === 'link' ? (r.url ?? '') : (r.storageId ? await ctx.storage.getUrl(r.storageId as never) ?? '' : ''),
      mime:        r.mime ?? '',
      size:        r.size ?? 0,
      addedAt:     r.addedAt,
      tags:        r.tags ?? [],
      description: r.description ?? '',
      assignedTo:  r.assignedTo ?? [],
    })))
    out.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    return out
  },
})

// Register an uploaded file (blob already pushed to Convex storage via generateUploadUrl)
export const addFile = mutation({
  args: { name: v.string(), ext: v.string(), storageId: v.string(), mime: v.optional(v.string()), size: v.optional(v.number()) },
  handler: async (ctx, { name, ext, storageId, mime, size }) => {
    return await ctx.db.insert("library_items", {
      kind: 'file', category: categoryForExt(ext), name, ext: ext.toLowerCase().replace(/^\./, ''),
      storageId, mime, size, addedAt: new Date().toISOString(),
    })
  },
})

// Add a link (Notion / GitHub / Vercel / autre) — category auto-detected, overridable
export const addLink = mutation({
  args: { name: v.string(), url: v.string(), category: v.optional(v.string()) },
  handler: async (ctx, { name, url, category }) => {
    return await ctx.db.insert("library_items", {
      kind: 'link', category: category || categoryForUrl(url), name, url, addedAt: new Date().toISOString(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("library_items") },
  handler: async (ctx, { id }) => {
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
  },
  handler: async (ctx, { id, ...patch }) => {
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filtered)
  },
})
