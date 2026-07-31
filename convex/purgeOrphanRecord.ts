// Retrait d'une carte de prospection orpheline.
//
// Un enregistrement dont le contact a été supprimé reste affiché sur le board
// avec un nom vide. Utilitaire ponctuel, réservé aux cartes réellement
// orphelines : on refuse de supprimer une carte dont le contact existe encore.
import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const removeIfOrphan = internalMutation({
  args: { recordId: v.id("prospection_records") },
  handler: async (ctx, a) => {
    const rec = await ctx.db.get(a.recordId)
    if (!rec) return { removed: false, reason: "introuvable" }
    const contact = await ctx.db.get(rec.contactId as never)
    if (contact) return { removed: false, reason: "le contact existe encore" }
    await ctx.db.delete(a.recordId)
    return { removed: true }
  },
})
