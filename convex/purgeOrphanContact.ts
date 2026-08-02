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

// Retrait d'un contact de test SANS email (ex. « ping » du 28/07). Garde-fous :
// le prénom doit correspondre exactement, le contact ne doit avoir NI email NI
// statut client. Supprime aussi ses leads, cartes de prospection et parcours.
export const removeTestContact = internalMutation({
  args: { contactId: v.id("crm_contacts"), expectedFirstName: v.string(), confirm: v.boolean() },
  handler: async (ctx, a) => {
    if (!a.confirm) throw new Error("confirm requis")
    const c = await ctx.db.get(a.contactId)
    if (!c) return { removed: false, reason: "introuvable" }
    if (c.email) throw new Error("Ce contact a un email : utiliser remove (@example.com) ou ne pas supprimer")
    if (c.statut === "client") throw new Error("Jamais un client")
    if ((c.firstName ?? "").trim().toLowerCase() !== a.expectedFirstName.trim().toLowerCase()) throw new Error("Prénom inattendu")
    const leads = await ctx.db.query("crm_leads").withIndex("by_contact", (q) => q.eq("contactId", a.contactId)).collect()
    for (const l of leads) await ctx.db.delete(l._id)
    const recs = await ctx.db.query("prospection_records").withIndex("by_contact", (q) => q.eq("contactId", String(a.contactId))).collect()
    for (const r of recs) await ctx.db.delete(r._id)
    const journeys = (await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", "vividflow")).collect())
      .filter((j) => j.contactId === String(a.contactId))
    for (const j of journeys) await ctx.db.delete(j._id)
    await ctx.db.delete(a.contactId)
    return { removed: true, leads: leads.length, records: recs.length, journeys: journeys.length }
  },
})

// Retrait d'un parcours de test (adresse @example.com uniquement, même garde-fou).
export const removeJourney = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    if (!a.email.endsWith("@example.com")) throw new Error("Réservé aux parcours de test @example.com")
    const rows = await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", a.email.toLowerCase())).collect()
    for (const r of rows) await ctx.db.delete(r._id)
    return { removed: rows.length }
  },
})
