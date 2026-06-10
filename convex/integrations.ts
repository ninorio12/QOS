import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Statuses only — NEVER returns the raw secret to clients.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("integrations").collect()
    return rows.map(r => ({ key: r.key, status: r.status, account: r.account ?? '', hasSecret: !!r.secret, updatedAt: r.updatedAt }))
  },
})

export const connect = mutation({
  args: { key: v.string(), secret: v.optional(v.string()), account: v.optional(v.string()) },
  handler: async (ctx, { key, secret, account }) => {
    const masked = account || (secret ? `•••• ${secret.slice(-4)}` : 'Connecté')
    const existing = await ctx.db.query("integrations").withIndex("by_key", q => q.eq("key", key)).first()
    const patch = { status: 'connected', account: masked, updatedAt: new Date().toISOString(), ...(secret ? { secret } : {}) }
    if (existing) await ctx.db.patch(existing._id, patch)
    else await ctx.db.insert("integrations", { key, secret, ...patch })
  },
})

export const disconnect = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db.query("integrations").withIndex("by_key", q => q.eq("key", key)).first()
    if (existing) await ctx.db.patch(existing._id, { status: 'disconnected', secret: undefined, account: undefined, updatedAt: new Date().toISOString() })
  },
})
