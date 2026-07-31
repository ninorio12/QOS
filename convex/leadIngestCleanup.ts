// Nettoyage des leads de TEST de l'ingestion Facebook.
//
// Utilitaire ponctuel : supprime un parcours, son lead et son contact à partir
// de l'identifiant de soumission. Sert uniquement à effacer les faux leads
// injectés pour valider la chaîne, jamais un lead réel.
import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const purgeTestLead = internalMutation({
  args: { leadgenId: v.string(), confirm: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    // Garde-fou : on ne purge que ce qui a été explicitement désigné comme test.
    // Les leads de test réels de Meta portent un identifiant numérique ordinaire,
    // donc l'appelant doit confirmer par `confirm: true`.
    if (!a.leadgenId.startsWith("TEST-") && !a.confirm) {
      throw new Error("Lead non marqué TEST- : repasser avec confirm: true si c'est bien un test")
    }
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
