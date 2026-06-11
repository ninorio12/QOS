import { mutation } from "./_generated/server"

// Nettoyage one-shot des liens orphelins / désync détectés par le vérificateur
// (scripts/integrity). Idempotent : ne touche que ce qui est réellement cassé.
// À lancer : npx convex run integrityCleanup:run
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    const leads = await ctx.db.query("crm_leads").collect()
    const contactIds = new Set(contacts.map(c => c._id.toString()))
    const leadIds = new Set(leads.map(l => l._id.toString()))
    const contactById = new Map(contacts.map(c => [c._id.toString(), c]))
    const report = { onboarding: 0, salesCalls: 0, prospection: 0, desyncLeads: 0 }

    // 1. onboarding rattaché à un contact inexistant → supprimer (orphelin).
    for (const o of await ctx.db.query("onboarding").collect()) {
      if (o.contactId && !contactIds.has(o.contactId.toString())) { await ctx.db.delete(o._id); report.onboarding++ }
    }

    // 2. sales-calls rattachés à un contact/lead inexistant → supprimer.
    for (const s of await ctx.db.query("os_sales_calls").collect()) {
      const badContact = s.contactId && !contactIds.has(s.contactId.toString())
      const badLead = s.leadId && !leadIds.has(s.leadId.toString())
      if (badContact || badLead) { await ctx.db.delete(s._id); report.salesCalls++ }
    }

    // 3. prospection avec leadId inexistant → effacer le lien (garder l'enregistrement).
    for (const p of await ctx.db.query("prospection_records").collect()) {
      if (p.leadId && !leadIds.has(p.leadId.toString())) { await ctx.db.patch(p._id, { leadId: undefined }); report.prospection++ }
    }

    // 4. désync : lead en stage actif alors que son contact est "perdu" → aligner le lead (lost).
    for (const l of leads) {
      if (!l.contactId) continue
      const ct = contactById.get(l.contactId.toString())
      if (ct && ct.statut === "perdu" && l.status === "open" && l.stageId !== "perdu") {
        await ctx.db.patch(l._id, { status: "lost" })
        report.desyncLeads++
      }
    }

    return report
  },
})
