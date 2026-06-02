import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getMany = query({
  args: { ghl_contact_ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.ghl_contact_ids.map(id =>
        ctx.db
          .query("contact_meta")
          .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", id))
          .first()
      )
    )
    return results.filter(Boolean)
  },
})

export const upsert = mutation({
  args: {
    ghl_contact_id: v.string(),
    source: v.optional(v.string()),
    statut: v.optional(v.string()),
    canton: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contact_meta")
      .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", args.ghl_contact_id))
      .first()
    if (existing) {
      const patch: Record<string, string | undefined> = {}
      if (args.source  !== undefined) patch.source  = args.source
      if (args.statut  !== undefined) patch.statut  = args.statut
      if (args.canton  !== undefined) patch.canton  = args.canton
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert("contact_meta", args)
  },
})

export const upsertMany = mutation({
  args: {
    entries: v.array(v.object({
      ghl_contact_id: v.string(),
      source: v.optional(v.string()),
      statut: v.optional(v.string()),
      canton: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("contact_meta")
        .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", entry.ghl_contact_id))
        .first()
      if (existing) {
        const patch: Record<string, string | undefined> = {}
        if (entry.source !== undefined) patch.source = entry.source
        if (entry.statut !== undefined) patch.statut = entry.statut
        if (entry.canton !== undefined) patch.canton = entry.canton
        await ctx.db.patch(existing._id, patch)
      } else {
        await ctx.db.insert("contact_meta", entry)
      }
    }
  },
})
