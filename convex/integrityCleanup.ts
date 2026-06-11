import { mutation } from "./_generated/server"

// RÉALIGNEMENT des liens (pas de suppression) : reconnecte les références cassées aux
// entités vivantes, sur toute la ligne. Idempotent.
// À lancer : npx convex run integrityCleanup:realign
export const realign = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    const leads = await ctx.db.query("crm_leads").collect()
    const contactIds = new Set(contacts.map((c) => String(c._id)))
    const leadIds = new Set(leads.map((l) => String(l._id)))
    const contactById = new Map(contacts.map((c) => [String(c._id), c]))
    const leadsByContact = new Map<string, typeof leads>()
    for (const l of leads) {
      if (!l.contactId) continue
      const k = String(l.contactId)
      const arr = leadsByContact.get(k) ?? []
      arr.push(l)
      leadsByContact.set(k, arr)
    }

    const report = {
      leadRealigned: 0,
      leadCleared: 0,
      desyncAligned: 0,
      unrealignable: [] as { table: string; id: string; raison: string }[],
    }

    // 1. prospection_records : contactId valide mais leadId périmé → re-dériver le lead du contact.
    for (const p of await ctx.db.query("prospection_records").collect()) {
      const contactOk = contactIds.has(String(p.contactId))
      if (p.leadId && !leadIds.has(String(p.leadId))) {
        if (contactOk) {
          const cl = leadsByContact.get(String(p.contactId)) ?? []
          if (cl.length) { await ctx.db.patch(p._id, { leadId: String(cl[0]._id) }); report.leadRealigned++ }
          else { await ctx.db.patch(p._id, { leadId: undefined }); report.leadCleared++ }
        } else {
          report.unrealignable.push({ table: "prospection_records", id: String(p._id), raison: "contact et lead périmés" })
        }
      }
    }

    // 2. os_sales_calls : contactId/leadId périmés sans champ de re-matching → non réalignable.
    for (const s of await ctx.db.query("os_sales_calls").collect()) {
      const badContact = s.contactId && !contactIds.has(String(s.contactId))
      const badLead = s.leadId && !leadIds.has(String(s.leadId))
      if (badContact || badLead) {
        report.unrealignable.push({ table: "os_sales_calls", id: String(s._id), raison: "contact/lead supprimé, aucun champ pour re-matcher (donnée de test)" })
      }
    }

    // 3. onboarding : contactId vers un contact supprimé → non réalignable (donnée de test).
    for (const o of await ctx.db.query("onboarding").collect()) {
      if (o.contactId && !contactIds.has(String(o.contactId))) {
        report.unrealignable.push({ table: "onboarding", id: String(o._id), raison: "contact supprimé (donnée de test E2E)" })
      }
    }

    // 4. désync : aligner chaque lead sur sa fiche contact (source unique de vérité).
    for (const l of leads) {
      if (!l.contactId) continue
      const ct = contactById.get(String(l.contactId))
      if (!ct) continue
      const patch: { status?: string; source?: string } = {}
      // a) lead ouvert mais contact "perdu" → lead perdu (Zone perdu).
      if (ct.statut === "perdu" && l.status === "open" && l.stageId !== "perdu") patch.status = "lost"
      // b) source du lead différente de la fiche → aligner sur la fiche.
      if (ct.source && l.source !== ct.source) patch.source = ct.source
      if (Object.keys(patch).length) { await ctx.db.patch(l._id, patch); report.desyncAligned++ }
    }

    return report
  },
})

// PURGE des coquilles de test non réalignables : enregistrements dont le contact/lead
// a été supprimé et qui n'ont aucun moyen d'être re-liés (résidus de tests E2E / seeds).
// À lancer : npx convex run integrityCleanup:purgeTestHusks
export const purgeTestHusks = mutation({
  args: {},
  handler: async (ctx) => {
    const contactIds = new Set((await ctx.db.query("crm_contacts").collect()).map((c) => String(c._id)))
    const leadIds = new Set((await ctx.db.query("crm_leads").collect()).map((l) => String(l._id)))
    const report = { onboarding: 0, salesCalls: 0 }

    for (const o of await ctx.db.query("onboarding").collect()) {
      if (o.contactId && !contactIds.has(String(o.contactId))) { await ctx.db.delete(o._id); report.onboarding++ }
    }
    for (const s of await ctx.db.query("os_sales_calls").collect()) {
      const bad = (s.contactId && !contactIds.has(String(s.contactId))) || (s.leadId && !leadIds.has(String(s.leadId)))
      if (bad) { await ctx.db.delete(s._id); report.salesCalls++ }
    }
    return report
  },
})
