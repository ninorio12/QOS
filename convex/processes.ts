import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const blockValidator = v.array(v.object({ type: v.string(), text: v.string() }))

export const list = query({
  // clerkUserId : permet de résoudre le rôle côté serveur et de filtrer la visibilité.
  // - admin (ou aucun clerkUserId fourni) → voit tous les process
  // - autre profil (setter, téléphoniste, viewer) → voit uniquement les process dont
  //   assignedRoles contient son rôle. Process non assigné = admins seulement.
  args: { clerkUserId: v.optional(v.string()) },
  handler: async (ctx, { clerkUserId }) => {
    let role: string | null = null
    let userId: string | null = null
    if (clerkUserId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkUserId", clerkUserId))
        .unique()
      role = user?.role ?? null
      userId = user?._id ?? null
    }
    const isAdmin = role === "admin" || !clerkUserId

    let rows = await ctx.db.query("processes").collect()
    if (!isAdmin) {
      rows = rows.filter((r) => (r.assignedUserIds ?? []).includes(userId as string))
    }

    const out = await Promise.all(rows.map(async (r) => ({
      id:         r._id,
      title:      r.title,
      icon:       r.icon ?? 'workflow',
      link:       r.link ?? '',
      previewUrl: r.previewStorageId ? (await ctx.storage.getUrl(r.previewStorageId as never)) ?? '' : '',
      blocks:     r.blocks ?? [],
      category:   r.category ?? 'Process internes',
      linkedClientId: r.linkedClientId ?? '',
      assignedUserIds: r.assignedUserIds ?? [],
      order:      r.order ?? 0,
      updatedAt:  r.updatedAt,
    })))
    out.sort((a, b) => (a.order - b.order) || (a.updatedAt < b.updatedAt ? -1 : 1))
    return out
  },
})

export const create = mutation({
  args: { title: v.string(), icon: v.optional(v.string()), category: v.optional(v.string()), linkedClientId: v.optional(v.string()), assignedUserIds: v.optional(v.array(v.string())) },
  handler: async (ctx, { title, icon, category, linkedClientId, assignedUserIds }) => {
    const count = (await ctx.db.query("processes").collect()).length
    return await ctx.db.insert("processes", {
      title: title || 'Nouveau process', icon: icon ?? 'workflow', blocks: [],
      category: category ?? 'Process internes', linkedClientId,
      assignedUserIds: assignedUserIds ?? [],
      order: count, updatedAt: new Date().toISOString(),
    })
  },
})

export const update = mutation({
  args: {
    id:               v.id("processes"),
    title:            v.optional(v.string()),
    icon:             v.optional(v.string()),
    link:             v.optional(v.string()),
    previewStorageId: v.optional(v.string()),
    blocks:           v.optional(blockValidator),
    category:         v.optional(v.string()),
    linkedClientId:   v.optional(v.string()),
    assignedUserIds:  v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...rest }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    await ctx.db.patch(id, patch)
  },
})

export const remove = mutation({
  args: { id: v.id("processes") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id)
    if (item?.previewStorageId) { try { await ctx.storage.delete(item.previewStorageId as never) } catch { /* ignore */ } }
    await ctx.db.delete(id)
  },
})
