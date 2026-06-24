import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const ALLOWED = ["r1", "r2", "follow_up", "interne", "client", "autre"]

// Liste tous les overrides de type d'event (eventId -> type). Partagé entre profils.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("calendar_event_types").collect()
    return rows.map(r => ({ eventId: r.eventId, type: r.type }))
  },
})

// Définit (ou met à jour / efface) le type métier d'un event du calendrier.
// type vide ou null → on retire l'override.
export const setType = mutation({
  args: { eventId: v.string(), type: v.union(v.string(), v.null()), setBy: v.optional(v.string()) },
  handler: async (ctx, { eventId, type, setBy }) => {
    const existing = await ctx.db
      .query("calendar_event_types")
      .withIndex("by_event", q => q.eq("eventId", eventId))
      .first()
    const clean = type && ALLOWED.includes(type) ? type : null
    if (!clean) {
      if (existing) await ctx.db.delete(existing._id)
      return
    }
    const updatedAt = new Date().toISOString()
    if (existing) {
      await ctx.db.patch(existing._id, { type: clean, setBy, updatedAt })
    } else {
      await ctx.db.insert("calendar_event_types", { eventId, type: clean, setBy, updatedAt })
    }
  },
})
