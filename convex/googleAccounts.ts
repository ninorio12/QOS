import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Connecte (ou met à jour) le Google d'un profil — appelé par le callback OAuth (serveur).
export const connect = mutation({
  args: { clerkUserId: v.string(), refreshToken: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, { clerkUserId, refreshToken, email }) => {
    const existing = await ctx.db
      .query("google_accounts")
      .withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { refreshToken, email, connectedAt: Date.now() })
    } else {
      await ctx.db.insert("google_accounts", { clerkUserId, refreshToken, email, connectedAt: Date.now() })
    }
  },
})

export const disconnect = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const row = await ctx.db
      .query("google_accounts")
      .withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId))
      .first()
    if (row) await ctx.db.delete(row._id)
  },
})

// État de connexion pour l'UI — ne renvoie JAMAIS le token.
export const isConnected = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const row = await ctx.db
      .query("google_accounts")
      .withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId))
      .first()
    return row ? { connected: true as const, email: row.email ?? null } : { connected: false as const, email: null }
  },
})

// Lecture serveur du token (calendrier / freebusy). Protégé par un secret partagé
// pour qu'un client ne puisse pas exfiltrer le token d'un autre profil.
export const getToken = query({
  args: { clerkUserId: v.string(), secret: v.string() },
  handler: async (ctx, { clerkUserId, secret }) => {
    if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) return null
    const row = await ctx.db
      .query("google_accounts")
      .withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId))
      .first()
    return row?.refreshToken ?? null
  },
})

// Liste des profils connectés (pour la dispo FreeBusy de l'équipe) — token inclus, secret requis.
export const listConnected = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) return []
    const rows = await ctx.db.query("google_accounts").collect()
    return rows.map(r => ({ clerkUserId: r.clerkUserId, refreshToken: r.refreshToken, email: r.email ?? null }))
  },
})
