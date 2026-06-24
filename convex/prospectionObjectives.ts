import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Seuils d'objectif du cockpit Prospection. Valeurs par défaut si rien n'est encore saisi.
const DEFAULTS = {
  leadsR1: 30, tauxShow: 75, tauxClose: 30, ca: 30000, roi: 5,
  ventes: 30, cashContracte: 30000, panierMoyen: 2000,
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("prospection_objectives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .first()
    return {
      leadsR1:       doc?.leadsR1       ?? DEFAULTS.leadsR1,
      tauxShow:      doc?.tauxShow      ?? DEFAULTS.tauxShow,
      tauxClose:     doc?.tauxClose     ?? DEFAULTS.tauxClose,
      ca:            doc?.ca            ?? DEFAULTS.ca,
      roi:           doc?.roi           ?? DEFAULTS.roi,
      ventes:        doc?.ventes        ?? DEFAULTS.ventes,
      cashContracte: doc?.cashContracte ?? DEFAULTS.cashContracte,
      panierMoyen:   doc?.panierMoyen   ?? DEFAULTS.panierMoyen,
    }
  },
})

export const set = mutation({
  args: {
    leadsR1:       v.optional(v.number()),
    tauxShow:      v.optional(v.number()),
    tauxClose:     v.optional(v.number()),
    ca:            v.optional(v.number()),
    roi:           v.optional(v.number()),
    ventes:        v.optional(v.number()),
    cashContracte: v.optional(v.number()),
    panierMoyen:   v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("prospection_objectives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .first()
    const patch = { ...a, updatedAt: new Date().toISOString() }
    if (existing) await ctx.db.patch(existing._id, patch)
    else await ctx.db.insert("prospection_objectives", { workspaceId: WORKSPACE, ...patch })
    return { ok: true }
  },
})
