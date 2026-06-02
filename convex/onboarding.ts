import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getByContact = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", args.contactId))
      .first()
  },
})

export const list = query({
  handler: async (ctx) => ctx.db.query("onboarding").collect(),
})

// Upsert a partial patch for a contact's onboarding
export const patch = mutation({
  args: {
    contactId:       v.string(),
    tasks:           v.optional(v.any()),
    payment:         v.optional(v.object({ installments: v.number(), amounts: v.array(v.number()) })),
    signedContract:  v.optional(v.object({ fileName: v.string(), storageId: v.optional(v.string()), dataUrl: v.optional(v.string()), uploadedAt: v.string() })),
    form:            v.optional(v.any()),
    kickoffEventId:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contactId, ...rest } = args
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", contactId))
      .first()
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert("onboarding", { contactId, ...patch } as never)
  },
})
