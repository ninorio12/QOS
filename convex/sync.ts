import { v } from "convex/values"
import { mutation } from "./_generated/server"

// Idempotent: ensures a contact appears in the right pipeline based on its statut.
// statut 'lead'   → crm_leads (Leads pipeline, first stage if not already present)
// statut 'client' → pipeline_clients (first stage if not already present)
export const syncContactToPipeline = mutation({
  args: { contactId: v.id("crm_contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId)
    if (!contact) return { ok: false, reason: 'contact not found' }

    const name = `${contact.firstName} ${contact.lastName ?? ''}`.trim()
    const initials = name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
    const cid = args.contactId.toString()

    if (contact.statut === 'lead') {
      // Find the Leads pipeline
      const leadsPipeline = await ctx.db
        .query("pipeline_config")
        .withIndex("by_type", q => q.eq("type", "leads"))
        .first()
      if (!leadsPipeline) return { ok: false, reason: 'no leads pipeline' }

      // Does a lead already exist for this contact?
      const existing = await ctx.db
        .query("crm_leads")
        .withIndex("by_contact", q => q.eq("contactId", args.contactId))
        .first()
      if (existing) return { ok: true, action: 'lead-exists', id: existing._id }

      const firstStage = [...leadsPipeline.stages].sort((a, b) => a.position - b.position)[0]
      const leadId = await ctx.db.insert("crm_leads", {
        contactId:  args.contactId,
        name,
        email:      contact.email   ?? undefined,
        phone:      contact.phone   ?? undefined,
        company:    contact.companyName ?? undefined,
        pipelineId: leadsPipeline._id,
        stageId:    firstStage?.id ?? 'nouveau-lead',
        value:      0,
        source:     contact.source ?? 'inbound',
        status:     'open',
        initials,
        createdAt:  new Date().toISOString(),
      })
      await ctx.db.insert("lead_stage_history", {
        leadId,
        stageId:   firstStage?.id ?? 'nouveau-lead',
        stageName: firstStage?.name ?? 'Nouveau lead',
        enteredAt: new Date().toISOString().split('T')[0],
      })
      return { ok: true, action: 'lead-created', id: leadId }
    }

    if (contact.statut === 'client') {
      const existing = await ctx.db
        .query("pipeline_clients")
        .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", cid))
        .first()
      if (existing) return { ok: true, action: 'client-exists', id: existing._id }

      const clientId = await ctx.db.insert("pipeline_clients", {
        ghl_contact_id: cid,
        name,
        company:   contact.companyName ?? undefined,
        email:     contact.email ?? undefined,
        phone:     contact.phone ?? undefined,
        value:     0,
        stageId:   'nouveau-client',
        initials,
        createdAt: new Date().toISOString().split('T')[0],
      })
      return { ok: true, action: 'client-created', id: clientId }
    }

    return { ok: true, action: 'no-sync' }
  },
})
