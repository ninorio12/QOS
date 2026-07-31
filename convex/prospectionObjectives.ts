import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Seuils d'objectif du cockpit Prospection. Valeurs par défaut si rien n'est encore saisi.
const DEFAULTS = {
  leadsR1: 50, leadsR2: 25, tauxShow: 75, tauxShowR2: 75, tauxClose: 30, ca: 30000, roi: 5, coutParVente: 500,
  ventes: 30, cashContracte: 30000, panierMoyen: 2000, tauxReponse: 30, cpl: 30,
}

export const get = query({
  args: { funnel: v.optional(v.string()) },
  handler: async (ctx, a) => {
    // Chaque parcours a ses propres seuils. Tant qu'il n'en a pas, on retombe
    // sur la ligne historique commune plutôt que d'imposer les valeurs par défaut.
    const rows = await ctx.db
      .query("prospection_objectives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const doc = (a.funnel ? rows.find((r) => r.funnel === a.funnel) : undefined)
      ?? rows.find((r) => !r.funnel)
      ?? rows[0]
    return {
      leadsR1:       doc?.leadsR1       ?? DEFAULTS.leadsR1,
      leadsR2:       doc?.leadsR2       ?? DEFAULTS.leadsR2,
      tauxShow:      doc?.tauxShow      ?? DEFAULTS.tauxShow,
      tauxShowR2:    doc?.tauxShowR2    ?? DEFAULTS.tauxShowR2,
      tauxClose:     doc?.tauxClose     ?? DEFAULTS.tauxClose,
      tauxReponse:   doc?.tauxReponse   ?? DEFAULTS.tauxReponse,
      cpl:           doc?.cpl           ?? DEFAULTS.cpl,
      ca:            doc?.ca            ?? DEFAULTS.ca,
      roi:           doc?.roi           ?? DEFAULTS.roi,
      coutParVente:  doc?.coutParVente  ?? DEFAULTS.coutParVente,
      ventes:        doc?.ventes        ?? DEFAULTS.ventes,
      cashContracte: doc?.cashContracte ?? DEFAULTS.cashContracte,
      panierMoyen:   doc?.panierMoyen   ?? DEFAULTS.panierMoyen,
    }
  },
})

export const set = mutation({
  args: {
    funnel:        v.optional(v.string()),
    leadsR1:       v.optional(v.number()),
    leadsR2:       v.optional(v.number()),
    tauxShow:      v.optional(v.number()),
    tauxShowR2:    v.optional(v.number()),
    tauxClose:     v.optional(v.number()),
    tauxReponse:   v.optional(v.number()),
    cpl:           v.optional(v.number()),
    ca:            v.optional(v.number()),
    roi:           v.optional(v.number()),
    coutParVente:  v.optional(v.number()),
    ventes:        v.optional(v.number()),
    cashContracte: v.optional(v.number()),
    panierMoyen:   v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("prospection_objectives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    // On écrit sur la ligne du parcours ; si elle n'existe pas encore, on la crée
    // en partant des seuils actuellement en vigueur pour ce parcours.
    const existing = a.funnel ? rows.find((r) => r.funnel === a.funnel) : rows.find((r) => !r.funnel)
    const patch = { ...a, updatedAt: new Date().toISOString() }
    if (existing) await ctx.db.patch(existing._id, patch)
    else {
      const base = rows.find((r) => !r.funnel)
      const { _id, _creationTime, ...baseFields } = base ?? ({} as Record<string, unknown>)
      await ctx.db.insert("prospection_objectives", { ...baseFields, workspaceId: WORKSPACE, ...patch })
    }
    return { ok: true }
  },
})
