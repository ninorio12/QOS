import { v } from "convex/values"
import { query, internalMutation } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Cache des profils sociaux (rempli par socialProfile.refresh, cron 30 min).

export const get = query({
  args: { platform: v.string() },
  handler: async (ctx, a) =>
    await ctx.db
      .query("os_social_profiles")
      .withIndex("by_ws_platform", (q) => q.eq("workspaceId", WORKSPACE).eq("platform", a.platform))
      .first(),
})

export const upsert = internalMutation({
  args: {
    platform: v.string(),
    connected: v.boolean(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    followersCount: v.optional(v.number()),
    gained7: v.optional(v.number()),
    gained30: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("os_social_profiles")
      .withIndex("by_ws_platform", (q) => q.eq("workspaceId", WORKSPACE).eq("platform", a.platform))
      .first()
    const doc = { workspaceId: WORKSPACE, ...a, updatedAt: new Date().toISOString() }
    if (existing) await ctx.db.replace(existing._id, doc)
    else await ctx.db.insert("os_social_profiles", doc)
  },
})
