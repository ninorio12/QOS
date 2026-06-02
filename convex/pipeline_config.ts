import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const DEFAULT_LEADS_STAGES = [
  { id: 'nouveau-lead',   name: 'Nouveau lead',    color: '#6366F1', position: 0 },
  { id: 'conversation',   name: 'En conversation', color: '#F59E0B', position: 1 },
  { id: 'r1',             name: 'R1',              color: '#3B82F6', position: 2 },
  { id: 'r2',             name: 'R2',              color: '#8B5CF6', position: 3 },
  { id: 'nouveau-client', name: 'Nouveau client',  color: '#84cc16', position: 4 },
]

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("pipeline_config").collect()
  },
})

export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipeline_config")
      .withIndex("by_type", q => q.eq("type", args.type))
      .first()
  },
})

// Called on first load to ensure default pipeline exists
export const ensureDefaults = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("pipeline_config").collect()
    if (existing.length > 0) return existing

    const leadsId = await ctx.db.insert("pipeline_config", {
      name:   "Leads",
      type:   "leads",
      stages: DEFAULT_LEADS_STAGES,
    })

    const created = await ctx.db.get(leadsId)
    return [created]
  },
})

export const updateStages = mutation({
  args: {
    id:     v.id("pipeline_config"),
    stages: v.array(v.object({
      id:       v.string(),
      name:     v.string(),
      color:    v.string(),
      position: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stages: args.stages })
  },
})
