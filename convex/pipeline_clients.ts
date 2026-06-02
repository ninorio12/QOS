import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("pipeline_clients").order("desc").collect()
  },
})

export const create = mutation({
  args: {
    ghl_contact_id: v.optional(v.string()),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    value: v.number(),
    stageId: v.string(),
    initials: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipeline_clients", args)
  },
})

export const updateStage = mutation({
  args: { id: v.id("pipeline_clients"), stageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stageId: args.stageId })
  },
})

export const updateValue = mutation({
  args: { id: v.id("pipeline_clients"), value: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { value: args.value })
  },
})

export const remove = mutation({
  args: { id: v.id("pipeline_clients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})
