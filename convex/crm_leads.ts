import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("crm_leads").order("desc").collect()
  },
})

export const listByPipeline = query({
  args: { pipelineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crm_leads")
      .withIndex("by_pipeline", q => q.eq("pipelineId", args.pipelineId))
      .collect()
  },
})

export const create = mutation({
  args: {
    contactId:  v.optional(v.id("crm_contacts")),
    name:       v.string(),
    email:      v.optional(v.string()),
    phone:      v.optional(v.string()),
    company:    v.optional(v.string()),
    pipelineId: v.string(),
    stageId:    v.string(),
    value:      v.number(),
    source:     v.optional(v.string()),
    initials:   v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crm_leads", {
      ...args,
      status:    "open",
      createdAt: new Date().toISOString(),
    })
  },
})

export const updateStage = mutation({
  args: { id: v.id("crm_leads"), stageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stageId: args.stageId })
  },
})

export const updateStatus = mutation({
  args: { id: v.id("crm_leads"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
  },
})

export const remove = mutation({
  args: { id: v.id("crm_leads") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
})
