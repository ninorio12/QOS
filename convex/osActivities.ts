import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"

export const list = query({
  args: { limit: v.optional(v.number()), entityType: v.optional(v.string()), entityId: v.optional(v.string()) },
  handler: async (ctx, { limit, entityType, entityId }) => {
    let rows
    if (entityType && entityId) {
      rows = await ctx.db.query("os_activities").withIndex("by_entity", q => q.eq("entityType", entityType).eq("entityId", entityId)).collect()
    } else {
      rows = await ctx.db.query("os_activities").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return rows.slice(0, limit ?? 200).map(r => ({ ...r, id: r._id }))
  },
})

// Public log endpoint (humans/agents/system)
export const log = mutation({
  args: {
    actorType: v.string(),
    actorId: v.string(),
    eventType: v.string(),
    summary: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, a) => { await logActivity(ctx, a) },
})
