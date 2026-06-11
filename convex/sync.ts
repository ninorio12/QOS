import { v } from "convex/values"
import { mutation } from "./_generated/server"

// Enforce single-pipeline membership for ONE contact based on its statut.
// statut 'lead'   → 1 open lead in Leads pipeline, NO client row
// statut 'client' → 1 client row in Clients pipeline, NO open lead
// statut 'perdu'  → 1 lost lead in Leads pipeline, NO client row
// Réconcilie les records prospection d'un contact avec l'état réel de son lead/statut.
// - leadId : re-pointé vers le lead courant, ou nettoyé si plus aucun lead (devenu client).
// - status : aligné sur le statut de la fiche (client→handoff, perdu→lost), source unique de vérité.
async function reconcileProspection(ctx: any, cid: string, finalLeadId: any, statut?: string) {
  const records = await ctx.db.query("prospection_records").withIndex("by_contact", (q: any) => q.eq("contactId", cid)).collect()
  for (const r of records) {
    const patch: { leadId?: any; status?: string } = {}
    const desiredLead = finalLeadId ? finalLeadId.toString() : undefined
    if (r.leadId !== desiredLead) patch.leadId = desiredLead
    const desiredStatus = statut === 'client' ? 'handoff' : statut === 'perdu' ? 'lost' : r.status
    if (desiredStatus !== r.status) patch.status = desiredStatus
    if (Object.keys(patch).length) await ctx.db.patch(r._id, { ...patch, updatedAt: new Date().toISOString() })
  }
}

export async function enforce(ctx: any, contactId: any, opts?: { dealValue?: number }) {
  const contact = await ctx.db.get(contactId)
  if (!contact) return { ok: false, reason: 'contact not found' }

  const name = `${contact.firstName} ${contact.lastName ?? ''}`.trim()
  const initials = name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
  const cid = contactId.toString()

  const leadsPipeline = await ctx.db.query("pipeline_config").withIndex("by_type", (q: any) => q.eq("type", "leads")).first()
  const existingLead   = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  // Client retrouvé par la clé typée contactId OU l'ancienne ghl_contact_id (compat migration).
  const existingClient = (await ctx.db.query("pipeline_clients").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first())
    ?? (await ctx.db.query("pipeline_clients").withIndex("by_ghl_contact", (q: any) => q.eq("ghl_contact_id", cid)).first())

  if (contact.statut === 'client') {
    // Remove any lead row (a client is not a lead)
    if (existingLead) await ctx.db.delete(existingLead._id)
    // Devenu client : plus de lead → on réconcilie la prospection (leadId nettoyé, status handoff).
    await reconcileProspection(ctx, cid, null, 'client')
    if (existingClient) {
      if (opts?.dealValue !== undefined && opts.dealValue !== existingClient.value) {
        await ctx.db.patch(existingClient._id, { value: opts.dealValue })
      }
      return { ok: true, action: 'client-kept' }
    }
    await ctx.db.insert("pipeline_clients", {
      ghl_contact_id: cid, contactId, name,
      company: contact.companyName ?? undefined, email: contact.email ?? undefined,
      phone: contact.phone ?? undefined, value: opts?.dealValue ?? 0,
      stageId: 'nouveau-client', initials, createdAt: new Date().toISOString().split('T')[0],
    })
    return { ok: true, action: 'client-created' }
  }

  if (contact.statut === 'lead' || contact.statut === 'perdu') {
    // Remove any client row (not a client)
    if (existingClient) await ctx.db.delete(existingClient._id)
    const targetStatus = contact.statut === 'perdu' ? 'lost' : 'open'
    if (existingLead) {
      // Propager les champs dérivés de la fiche contact (source unique de vérité) au lead existant.
      const patch: { status?: string; source?: string } = {}
      if (existingLead.status !== targetStatus) patch.status = targetStatus
      if (contact.source && existingLead.source !== contact.source) patch.source = contact.source
      if (Object.keys(patch).length) await ctx.db.patch(existingLead._id, patch)
      await reconcileProspection(ctx, cid, existingLead._id, contact.statut)
      return { ok: true, action: `lead-${targetStatus}` }
    }
    const firstStage = leadsPipeline ? [...leadsPipeline.stages].sort((a: any, b: any) => a.position - b.position)[0] : null
    const leadId = await ctx.db.insert("crm_leads", {
      contactId, name,
      email: contact.email ?? undefined, phone: contact.phone ?? undefined,
      company: contact.companyName ?? undefined,
      pipelineId: leadsPipeline?._id ?? 'leads',
      stageId: firstStage?.id ?? 'nouveau-lead',
      value: 0, source: contact.source ?? 'inbound', status: targetStatus, initials,
      createdAt: new Date().toISOString(),
    })
    if (targetStatus === 'open') {
      await ctx.db.insert("lead_stage_history", {
        leadId, stageId: firstStage?.id ?? 'nouveau-lead',
        stageName: firstStage?.name ?? 'Nouveau lead', enteredAt: new Date().toISOString().split('T')[0],
      })
    }
    await reconcileProspection(ctx, cid, leadId, contact.statut)
    return { ok: true, action: `lead-${targetStatus}-created` }
  }

  // No statut → remove from both pipelines
  if (existingLead) await ctx.db.delete(existingLead._id)
  if (existingClient) await ctx.db.delete(existingClient._id)
  await reconcileProspection(ctx, cid, null, undefined)
  return { ok: true, action: 'no-statut' }
}

export const syncContactToPipeline = mutation({
  args: { contactId: v.id("crm_contacts"), dealValue: v.optional(v.number()) },
  handler: async (ctx, args) => enforce(ctx, args.contactId, { dealValue: args.dealValue }),
})

// Re-sync ALL contacts: enforce single membership + clean stale rows.
export const syncAllContacts = mutation({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    let processed = 0
    for (const c of contacts) { await enforce(ctx, c._id); processed++ }
    return { processed }
  },
})
