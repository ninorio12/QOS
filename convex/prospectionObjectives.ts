import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Seuils d'objectif du cockpit Prospection. Valeurs par défaut si rien n'est encore saisi.
const DEFAULTS = {
  leadsR1: 50, leadsR2: 25, tauxShow: 75, tauxShowR2: 75, tauxClose: 30, ca: 30000, roi: 5, coutParVente: 500,
  ventes: 30, cashContracte: 30000, panierMoyen: 2000, tauxReponse: 30, cpl: 30,
  tauxContact: 30, convDmR1: 20,
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
    // L'objectif Encaissé est un objectif d'ENTREPRISE, pas de canal : une seule
    // valeur, la ligne commune, quel que soit le parcours affiché (décision
    // Jonathan 2026-08-02). Le modifier depuis n'importe quel onglet le change partout.
    const base = rows.find((r) => !r.funnel)
    return {
      leadsR1:       doc?.leadsR1       ?? DEFAULTS.leadsR1,
      leadsR2:       doc?.leadsR2       ?? DEFAULTS.leadsR2,
      tauxShow:      doc?.tauxShow      ?? DEFAULTS.tauxShow,
      tauxShowR2:    doc?.tauxShowR2    ?? DEFAULTS.tauxShowR2,
      tauxClose:     doc?.tauxClose     ?? DEFAULTS.tauxClose,
      tauxReponse:   doc?.tauxReponse   ?? DEFAULTS.tauxReponse,
      tauxContact:   doc?.tauxContact   ?? DEFAULTS.tauxContact,
      convDmR1:      doc?.convDmR1      ?? DEFAULTS.convDmR1,
      cpl:           doc?.cpl           ?? DEFAULTS.cpl,
      ca:            base?.ca           ?? doc?.ca ?? DEFAULTS.ca,
      roi:           doc?.roi           ?? DEFAULTS.roi,
      coutParVente:  doc?.coutParVente  ?? DEFAULTS.coutParVente,
      ventes:        doc?.ventes        ?? DEFAULTS.ventes,
      cashContracte: doc?.cashContracte ?? DEFAULTS.cashContracte,
      panierMoyen:   doc?.panierMoyen   ?? DEFAULTS.panierMoyen,
      link:          doc?.link          ?? null,
    }
  },
})

export const set = mutation({
  args: {
    funnel:        v.optional(v.string()),
    link:          v.optional(v.union(v.string(), v.null())),
    leadsR1:       v.optional(v.number()),
    leadsR2:       v.optional(v.number()),
    tauxShow:      v.optional(v.number()),
    tauxShowR2:    v.optional(v.number()),
    tauxClose:     v.optional(v.number()),
    tauxReponse:   v.optional(v.number()),
    tauxContact:   v.optional(v.number()),
    convDmR1:      v.optional(v.number()),
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
    // `null` arrive quand l'interface renvoie l'objet complet : on le traduit en
    // « champ absent » au lieu de faire échouer tout l'enregistrement.
    const clean = Object.fromEntries(Object.entries(a).filter(([, val]) => val !== null))
    // Encaissé = objectif d'entreprise : il vit sur la ligne commune uniquement.
    // Saisi depuis n'importe quel parcours, il est écrit là-bas et retiré du
    // patch du parcours, pour qu'aucune copie locale ne diverge.
    if (typeof clean.ca === "number" && a.funnel) {
      const base = rows.find((r) => !r.funnel)
      if (base) await ctx.db.patch(base._id, { ca: clean.ca, updatedAt: new Date().toISOString() })
      else await ctx.db.insert("prospection_objectives", { workspaceId: WORKSPACE, ca: clean.ca, updatedAt: new Date().toISOString() })
      delete clean.ca
    }
    const patch = { ...clean, updatedAt: new Date().toISOString() }
    if (existing) await ctx.db.patch(existing._id, patch)
    else {
      const base = rows.find((r) => !r.funnel)
      // `ca` est GLOBAL : on ne le recopie jamais sur une ligne de parcours,
      // sinon une valeur fantôme y dort et ressort au moindre changement de
      // lecture (audit tribunal 2026-08-02 : 50000/120000 traînaient encore).
      const { _id, _creationTime, ca: _ca, ...baseFields } = base ?? ({} as Record<string, unknown>)
      await ctx.db.insert("prospection_objectives", { ...baseFields, workspaceId: WORKSPACE, ...patch })
    }
    return { ok: true }
  },
})
