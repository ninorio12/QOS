import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const record = mutation({
  args: {
    leadId:    v.id("crm_leads"),
    stageId:   v.string(),
    stageName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("lead_stage_history", {
      leadId:    args.leadId,
      stageId:   args.stageId,
      stageName: args.stageName,
      enteredAt: new Date().toISOString().split('T')[0],
    })
  },
})

// Count distinct leads per stage in a date range
export const countByStageInPeriod = query({
  args: { stageId: v.string(), from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("lead_stage_history")
      .withIndex("by_stage", q => q.eq("stageId", args.stageId))
      .collect()
    const inPeriod = entries.filter(e => e.enteredAt >= args.from && e.enteredAt <= args.to)
    const distinct = new Set(inPeriod.map(e => e.leadId.toString()))
    return distinct.size
  },
})
