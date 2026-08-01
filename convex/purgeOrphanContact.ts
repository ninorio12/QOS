// Retrait d'un contact de test orphelin (adresse @example.com uniquement).
// Refuse tout contact réel : le domaine example.com est réservé aux tests.
import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const remove = internalMutation({
  args: { contactId: v.id("crm_contacts") },
  handler: async (ctx, a) => {
    const c = await ctx.db.get(a.contactId)
    if (!c) return { removed: false, reason: "introuvable" }
    if (!c.email?.endsWith("@example.com")) throw new Error("Réservé aux contacts de test @example.com")
    const leads = await ctx.db.query("crm_leads").withIndex("by_contact", (q) => q.eq("contactId", a.contactId)).collect()
    for (const l of leads) await ctx.db.delete(l._id)
    const recs = await ctx.db.query("prospection_records").withIndex("by_contact", (q) => q.eq("contactId", String(a.contactId))).collect()
    for (const r of recs) await ctx.db.delete(r._id)
    await ctx.db.delete(a.contactId)
    return { removed: true, leads: leads.length, records: recs.length }
  },
})
