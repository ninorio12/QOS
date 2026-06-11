import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Sous-dossiers de process, rattachés à une catégorie. Persistés pour s'afficher même vides.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("process_subfolders").collect()
    return rows
      .map(r => ({ id: r._id, category: r.category, name: r.name, order: r.order ?? 0 }))
      .sort((a, b) => (a.order - b.order) || (a.name < b.name ? -1 : 1))
  },
})

export const create = mutation({
  args: { category: v.string(), name: v.string() },
  handler: async (ctx, { category, name }) => {
    const n = name.trim(); const cat = category.trim()
    if (!n || !cat) return null
    const existing = (await ctx.db.query("process_subfolders").collect())
      .find(s => s.category === cat && s.name.toLowerCase() === n.toLowerCase())
    if (existing) return existing._id
    const count = (await ctx.db.query("process_subfolders").collect()).length
    return await ctx.db.insert("process_subfolders", { category: cat, name: n, order: count })
  },
})

export const remove = mutation({
  args: { id: v.id("process_subfolders") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
