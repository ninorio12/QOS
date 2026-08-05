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
    // La pierre tombale se pose TOUJOURS, même si le parcours a déjà disparu :
    // c'est elle qui empêche le filet Zernio de ressusciter le lead purgé.
    const dead = await ctx.db.query("os_ignored_leadgen").withIndex("by_leadgen", (q) => q.eq("leadgenId", a.leadgenId)).first()
    if (!dead) await ctx.db.insert("os_ignored_leadgen", { leadgenId: a.leadgenId, createdAt: new Date().toISOString() })
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
    // La carte du board de prospection vit dans sa propre table : sans ça, le
    // lead de test restait affiché alors que son contact avait disparu.
    if (row.contactId) {
      const recs = await ctx.db.query("prospection_records").withIndex("by_contact", (q) => q.eq("contactId", row.contactId!)).collect()
      for (const rec of recs) { await ctx.db.delete(rec._id); removed++ }
    }
    // Un RDV RÉEL déjà en base a pu se rattacher à ce contact par email (le sync
    // iClosed relie un appel historique dès qu'un contact correspond). Supprimer
    // le contact sans le détacher laisserait l'appel pointer dans le vide : on le
    // remet donc simplement sans contact, comme avant. On ne supprime JAMAIS un
    // appel ici, c'est de l'historique de vente.
    let detachedCalls = 0
    if (row.contactId) {
      const calls = await ctx.db.query("os_sales_calls").collect()
      for (const call of calls) {
        if (String((call as { contactId?: string }).contactId ?? "") === String(row.contactId)) {
          await ctx.db.patch(call._id, { contactId: undefined })
          detachedCalls++
        }
      }
    }
    if (row.contactId) {
      const contact = await ctx.db.get(row.contactId as never)
      if (contact) { await ctx.db.delete(row.contactId as never); removed++ }
    }
    await ctx.db.delete(row._id)
    return { removed: removed + 1, detachedCalls }
  },
})

/**
 * Purge complète des fiches de TEST, par adresse email.
 *
 * Utilitaire ponctuel. Efface tout ce qu'un parcours de test laisse derrière
 * lui : contact, lead, carte de prospection, parcours, réponses du quiz,
 * réponses du formulaire de confirmation et rendez-vous. Ne s'applique qu'à des
 * adresses explicitement listées par l'appelant : rien n'est deviné.
 */
export const purgeParEmail = internalMutation({
  args: { emails: v.array(v.string()), confirm: v.boolean() },
  handler: async (ctx, a) => {
    if (!a.confirm) return { supprime: 0 }
    const cibles = new Set(a.emails.map(e => e.trim().toLowerCase()))
    const est = (e?: string | null) => !!e && cibles.has(String(e).trim().toLowerCase())
    let supprime = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts: any[] = await ctx.db.query("crm_contacts").collect()
    const idsContacts = new Set(contacts.filter(c => est(c.email)).map(c => String(c._id)))

    for (const t of ["crm_leads", "prospection_records", "os_lead_journey", "quiz_responses", "confirmation_intake", "os_sales_calls"] as const) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = await ctx.db.query(t).collect()
      for (const r of rows) {
        const lie = idsContacts.has(String(r.contactId ?? "")) || est(r.email)
        if (lie) { await ctx.db.delete(r._id); supprime++ }
      }
    }
    for (const c of contacts) {
      if (idsContacts.has(String(c._id))) { await ctx.db.delete(c._id); supprime++ }
    }
    return { supprime, contacts: idsContacts.size }
  },
})
