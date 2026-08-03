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

/** Photo du jour : un point de courbe par plateforme et par date (idempotent). */
export const snapshotFollowers = internalMutation({
  args: { platform: v.string(), date: v.string(), followers: v.number(), source: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("os_social_followers_daily")
      .withIndex("by_ws_platform_date", (q) => q.eq("workspaceId", WORKSPACE).eq("platform", a.platform).eq("date", a.date))
      .first()
    if (existing) await ctx.db.patch(existing._id, { followers: a.followers, source: a.source ?? existing.source })
    else await ctx.db.insert("os_social_followers_daily", { workspaceId: WORKSPACE, platform: a.platform, date: a.date, followers: a.followers, source: a.source ?? "cron" })
  },
})

/** Import d'un historique (Brvndlab) : liste de points, idempotent par date. */
export const importFollowersHistory = internalMutation({
  args: { platform: v.string(), points: v.array(v.object({ date: v.string(), followers: v.number() })) },
  handler: async (ctx, a) => {
    let inserted = 0
    for (const p of a.points) {
      const existing = await ctx.db
        .query("os_social_followers_daily")
        .withIndex("by_ws_platform_date", (q) => q.eq("workspaceId", WORKSPACE).eq("platform", a.platform).eq("date", p.date))
        .first()
      if (!existing) { await ctx.db.insert("os_social_followers_daily", { workspaceId: WORKSPACE, platform: a.platform, date: p.date, followers: p.followers, source: "brvndlab-import" }); inserted++ }
    }
    return { inserted }
  },
})

/** La courbe d'abonnés d'une plateforme (pour un futur graphique du Profil). */
export const followersHistory = query({
  args: { platform: v.string(), from: v.optional(v.string()) },
  handler: async (ctx, a) =>
    (await ctx.db
      .query("os_social_followers_daily")
      .withIndex("by_ws_platform_date", (q) => q.eq("workspaceId", WORKSPACE).eq("platform", a.platform))
      .collect())
      .filter((r) => !a.from || r.date >= a.from)
      .sort((x, y) => (x.date < y.date ? -1 : 1))
      .map((r) => ({ date: r.date, followers: r.followers })),
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
    dmSent7: v.optional(v.number()),
    dmSent30: v.optional(v.number()),
    dmSentAll: v.optional(v.number()),
    conv7: v.optional(v.number()),
    conv30: v.optional(v.number()),
    convAll: v.optional(v.number()),
    inboxFetchedAt: v.optional(v.number()),
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
