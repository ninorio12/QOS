import { internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

/**
 * Détache une campagne de son parcours : ses dépenses restent visibles dans le
 * module Media Buyer (historique du compte) mais ne comptent plus dans aucun
 * entonnoir. Utilisé pour l'ancienne campagne « Formulaire funnel 2026 », qui
 * a tourné avant la refonte et n'appartient à aucun parcours actuel.
 */
export const run = internalMutation({
  args: { campaignName: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("os_campaign_funnels").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    let removed = 0
    for (const r of rows) if (r.campaignName === a.campaignName) { await ctx.db.delete(r._id); removed++ }
    return { removed }
  },
})

/**
 * Neutralise une campagne HISTORIQUE : on pose explicitement un parcours
 * « archive », qui n'est l'onglet de personne. Nécessaire quand le nom de la
 * campagne contient un mot-clé (« VSL »…) que la déduction automatique
 * rattacherait à un parcours actuel.
 */
export const archive = internalMutation({
  args: { campaignId: v.string(), campaignName: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const existing = await ctx.db.query("os_campaign_funnels").withIndex("by_campaign", (q) => q.eq("campaignId", a.campaignId)).first()
    if (existing) await ctx.db.patch(existing._id, { funnel: "archive", updatedAt: new Date().toISOString() })
    else await ctx.db.insert("os_campaign_funnels", { workspaceId: WORKSPACE, campaignId: a.campaignId, campaignName: a.campaignName, funnel: "archive", updatedAt: new Date().toISOString() })
    return { ok: true }
  },
})
