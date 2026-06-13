import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

const now = () => new Date().toISOString()

// Skills uploadés (import .md). Famille = "Skills importés".
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("os_skills").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
})

export const create = mutation({
  args: {
    skillId: v.string(), name: v.string(), description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())), body: v.string(), createdBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db.query("os_skills")
      .withIndex("by_skill", q => q.eq("workspaceId", WORKSPACE).eq("skillId", a.skillId)).first()
    const base = { workspaceId: WORKSPACE, skillId: a.skillId, name: a.name, description: a.description ?? "", tags: a.tags ?? [], body: a.body, updatedAt: now() }
    if (existing) { await ctx.db.patch(existing._id, base); return existing._id }
    return await ctx.db.insert("os_skills", { ...base, createdBy: a.createdBy ?? "human:thomas", createdAt: now() })
  },
})

export const remove = mutation({
  args: { id: v.id("os_skills") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
