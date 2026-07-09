import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { LEAD_STAGE_FOR_COLUMN } from "./leadSync"
import { logActivity } from "./osLib"

// Colonne réelle d'un record prospection (boardColumn fait foi ; dérivé du status sinon).
const BOARD_COLUMNS = ["leads_a_traiter", "nrp1", "nrp2", "nrp3", "nrp4", "rdv_booke", "perdu"]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boardColumnOf(r: any): string {
  if (r.boardColumn && BOARD_COLUMNS.includes(r.boardColumn)) return r.boardColumn
  if (r.status === "handoff") return "rdv_booke"
  if (r.status === "lost" || r.status === "archived") return "perdu"
  return "leads_a_traiter"
}

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

  // GARDE statut : on normalise (casse/espaces) et on RANGE toute valeur inconnue non-vide sur 'lead'
  // au lieu de tomber dans la branche « no statut » qui SUPPRIME lead+client (perte silencieuse de pipeline
  // sur une simple faute type "Lead" / "prospect"). Seul un statut VIDE retire des pipelines.
  {
    const raw = String(contact.statut ?? '').trim().toLowerCase()
    const valid = raw === 'lead' || raw === 'client' || raw === 'perdu'
    const normalized = valid ? raw : (raw ? 'lead' : '')
    if (normalized !== contact.statut) {
      if (normalized) await ctx.db.patch(contactId, { statut: normalized })
      contact.statut = normalized
    }
  }

  // Objection cohérente avec l'issue COURANTE du deal :
  //  - rouge (lostObjection) seulement si statut=perdu ; vert (wonObjection) seulement si statut=client.
  //  Sinon on efface l'objection devenue obsolète (ex. deal perdu ré-ouvert → plus de rouge).
  const objPatch: Record<string, unknown> = {}
  if (contact.statut !== 'perdu' && contact.lostObjection) objPatch.lostObjection = undefined
  if (contact.statut !== 'client' && contact.wonObjection) objPatch.wonObjection = undefined
  if (Object.keys(objPatch).length) { await ctx.db.patch(contactId, objPatch); Object.assign(contact, objPatch) }

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
        source: contact.source ?? 'inbound', contactId,
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

// Passage en client UNIFIÉ (source unique). Tous les chemins (Pipeline, Contacts, MCP, route /api/crm/convert)
// passent ici → un seul endroit qui tue le bug "client à 0 CHF".
//  - GARDE : montant > 0 OBLIGATOIRE, sauf si amountTbd (case "Montant à définir") explicitement coché.
//  - Réutilise enforce() pour l'upsert pipeline_clients + suppression du lead + réconciliation prospection.
//  - Écrit l'historique "Gagné - Client" sur le lead AVANT sa suppression (preuve de l'étape de conversion).
//  - Shell onboarding minimal (idempotent) pour que le client apparaisse dans le module Onboarding.
//  - Idempotent : ré-exécuter sur un client déjà client ne duplique ni historique ni onboarding.
// Logique partagée du passage en client (réutilisée par la mutation convertToClient ET par
// closing.recordOutcome issue "gagné"). Même garde, même upsert, même historique, même onboarding.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function convertToClientLogic(ctx: any, args: {
  contactId: any
  dealValue?: number
  dealDate?: string
  wonObjection?: string
  amountTbd?: boolean
  by?: string
}) {
    const { contactId } = args
    // GARDE anti "client à 0 CHF" : montant requis sauf si "Montant à définir" coché.
    if ((args.dealValue == null || args.dealValue <= 0) && args.amountTbd !== true) {
      throw new Error("Montant requis : indiquez un montant supérieur à 0 CHF, ou cochez Montant à définir.")
    }
    const finalValue = args.amountTbd ? 0 : (args.dealValue as number)
    const dealDate = args.dealDate ?? new Date().toISOString().split("T")[0]
    const by = args.by ?? "human:thomas"

    // Patch fiche contact (source de vérité) : statut client + champs de conversion.
    const contactPatch: Record<string, unknown> = {
      statut: "client", leadStatus: "active", dealDate, amountTbd: !!args.amountTbd, updatedAt: new Date().toISOString(),
    }
    if (args.wonObjection !== undefined) contactPatch.wonObjection = args.wonObjection
    await ctx.db.patch(contactId, contactPatch)

    // AVANT qu'enforce ne supprime le lead : écrire l'historique "Gagné - Client" si pas déjà la dernière étape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openLead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
    if (openLead) {
      const history = await ctx.db.query("lead_stage_history").withIndex("by_lead", (q: any) => q.eq("leadId", openLead._id)).collect()
      const last = history.length ? history[history.length - 1] : null
      if (!last || last.stageId !== "nouveau-client") {
        await ctx.db.insert("lead_stage_history", { leadId: openLead._id, stageId: "nouveau-client", stageName: "Gagné - Client", enteredAt: dealDate, source: openLead.source, contactId })
      }
    }

    // Upsert client + suppression lead + réconciliation prospection (logique réutilisée, jamais dupliquée).
    const res = await enforce(ctx, contactId, { dealValue: finalValue })

    // Shell onboarding minimal (idempotent) : le client doit apparaître dans le module Onboarding "à rattacher".
    const cid = contactId.toString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingOb = await ctx.db.query("onboarding").withIndex("by_contact", (q: any) => q.eq("contactId", cid)).first()
    if (!existingOb) await ctx.db.insert("onboarding", { contactId: cid, updatedAt: new Date().toISOString() } as never)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = await ctx.db.get(contactId) as any
    const cName = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "contact"
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "lead.converted", summary: `Converti en client : ${cName}`, entityType: "contact", entityId: cid, source: "sync" })

    return { ...res, ok: true, value: finalValue, dealDate }
}

// Passage en client UNIFIÉ (source unique). Wrapper mince autour de convertToClientLogic :
// MÊME nom/signature/export (le MCP, /api/crm/convert et le test l'appellent).
export const convertToClient = mutation({
  args: {
    contactId:    v.id("crm_contacts"),
    dealValue:    v.optional(v.number()),
    dealDate:     v.optional(v.string()),
    wonObjection: v.optional(v.string()),
    amountTbd:    v.optional(v.boolean()),
    by:           v.optional(v.string()),
  },
  handler: async (ctx, args) => convertToClientLogic(ctx, args),
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

// Repair one-shot : rend les 3 pipelines + fiches cohérents.
//  1) enforce() sur chaque contact → 1 seule représentation active (lead XOR client), prospection réconciliée.
//  2) Aligne le stage du Pipeline Leads sur la COLONNE Prospection (prospection = source de vérité outbound) :
//     leads_a_traiter→nouveau-lead | NRP 1-4→conversation | rdv_booke→r1.
export const reconcileAll = mutation({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    let enforced = 0
    for (const c of contacts) { await enforce(ctx, c._id); enforced++ }

    const recs = await ctx.db.query("prospection_records").collect()
    let aligned = 0
    for (const r of recs) {
      if (r.status === "lost" || r.status === "archived" || !r.leadId) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead = await ctx.db.get(r.leadId as any) as any
      if (!lead || lead.status !== "open") continue
      const want = LEAD_STAGE_FOR_COLUMN[boardColumnOf(r)]
      if (want && lead.stageId !== want) {
        await ctx.db.patch(lead._id, { stageId: want })
        await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId: want, stageName: want, enteredAt: new Date().toISOString().split("T")[0], source: lead.source, contactId: lead.contactId })
        aligned++
      }
    }
    return { contacts: contacts.length, enforced, aligned }
  },
})
