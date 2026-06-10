import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("process_categories").collect()
    return rows.map(r => ({ id: r._id, name: r.name, order: r.order ?? 0 })).sort((a, b) => (a.order - b.order) || (a.name < b.name ? -1 : 1))
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const n = name.trim()
    if (!n) return null
    const existing = (await ctx.db.query("process_categories").collect()).find(c => c.name.toLowerCase() === n.toLowerCase())
    if (existing) return existing._id
    const count = (await ctx.db.query("process_categories").collect()).length
    return await ctx.db.insert("process_categories", { name: n, order: count })
  },
})

export const remove = mutation({
  args: { id: v.id("process_categories") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
