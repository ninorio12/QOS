import { v } from "convex/values"
import { mutation, query, internalQuery, internalMutation } from "./_generated/server"
import { WORKSPACE, requireAdmin } from "./osLib"

// ─── Connexion Stripe (clés en vault Convex, jamais exposées au client) ───
export const connectionStatus = query({
  args: {},
  returns: v.object({
    connected: v.boolean(),
    accountName: v.union(v.string(), v.null()),
    livemode: v.union(v.boolean(), v.null()),
    lastSyncAt: v.union(v.string(), v.null()),
    hasWebhook: v.boolean(),
  }),
  handler: async (ctx) => {
    const c = await ctx.db.query("stripe_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    return {
      connected: !!c,
      accountName: c?.accountName ?? null,
      livemode: c?.livemode ?? null,
      lastSyncAt: c?.lastSyncAt ?? null,
      hasWebhook: !!c?.webhookSecret,
    }
  },
})

export const connect = mutation({
  args: { secretKey: v.string(), webhookSecret: v.optional(v.string()), accountName: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    const iso = new Date().toISOString()
    const key = a.secretKey.trim()
    const livemode = key.startsWith("sk_live")
    const fields = {
      secretKey: key,
      webhookSecret: a.webhookSecret?.trim() || undefined,
      accountName: a.accountName?.trim() || (livemode ? "Compte Stripe (live)" : "Compte Stripe (test)"),
      livemode,
    }
    const existing = await ctx.db.query("stripe_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert("stripe_connection", { workspaceId: WORKSPACE, connectedAt: iso, ...fields })
    return { ok: true }
  },
})

export const disconnect = mutation({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const c = await ctx.db.query("stripe_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (c) await ctx.db.delete(c._id)
    return { ok: true }
  },
})

// Lecture privée (clés incluses) — appelée uniquement depuis le sync/webhook Convex.
export const _connection = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stripe_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
  },
})

// Vérifie qu'un clerkUserId correspond à un admin (utilisé par syncStripe, une action sans ctx.db direct).
export const _isAdmin = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db.query("users").withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId)).first()
    return !!user && user.role === "admin"
  },
})

export const _touch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const c = await ctx.db.query("stripe_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (c) await ctx.db.patch(c._id, { lastSyncAt: new Date().toISOString() })
  },
})
