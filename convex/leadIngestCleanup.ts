// Nettoyage des leads de TEST de l'ingestion Facebook.
//
// Utilitaire ponctuel : supprime un parcours, son lead et son contact à partir
// de l'identifiant de soumission. Sert uniquement à effacer les faux leads
// injectés pour valider la chaîne, jamais un lead réel.
import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const purgeTestLead = internalMutation({
  args: { leadgenId: v.string() },
  handler: async (ctx, a) => {
    if (!a.leadgenId.startsWith("TEST-")) throw new Error("Réservé aux leads de test (préfixe TEST-)")
    const row = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_leadgen", (q) => q.eq("leadgenId", a.leadgenId))
      .first()
    if (!row) return { removed: 0 }
    let removed = 0
    if (row.leadId) {
      const lead = await ctx.db.get(row.leadId as never)
      if (lead) { await ctx.db.delete(row.leadId as never); removed++ }
    }
    if (row.contactId) {
      const contact = await ctx.db.get(row.contactId as never)
      if (contact) { await ctx.db.delete(row.contactId as never); removed++ }
    }
    await ctx.db.delete(row._id)
    return { removed: removed + 1 }
  },
})
