import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { findDuplicateContact } from "./contactDedup"
import { enforce } from "./sync"
import { linkInternal } from "./osProspection"
import { WORKSPACE } from "./osLib"
import { normalizeLeadSource } from "./lib/leadSource"

// ── RÈGLE MÉTIER (Thomas, 2026-06-19) ──
// Un lead OUTBOUND créé depuis le module Contacts DOIT impérativement apparaître à la fois
// dans le Pipeline Leads (colonne « Nouveau lead ») ET dans le board Prospection.
// On force donc statut=lead puis on passe par linkInternal (chemin canonique osProspection),
// qui crée/réutilise la card lead à `nouveau-lead` + le prospection_record (phase1/à appeler).
// Idempotent : ne duplique jamais ni le lead ni le record. Ne s'applique pas aux clients.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureOutboundCards(ctx: any, contactId: any, by: string) {
  const c = await ctx.db.get(contactId)
  if (!c || c.statut === "client") return
  if (!c.statut) {
    await ctx.db.patch(contactId, { statut: "lead", leadStatus: c.leadStatus ?? "active", updatedAt: new Date().toISOString() })
  }
  await enforce(ctx, contactId)
  await linkInternal(ctx, contactId, { temperature: c.temperature ?? "froid", by })
}

const digits = (s?: string | null) => (s || "").replace(/\D/g, "")
const norm = (s?: string | null) => (s || "").toLowerCase().trim()

// ── Étape commerciale : où en est le contact à travers tous les pipelines ──
const STAGE_RANK: Record<string, number> = {
  leads_a_traiter: 1, nrp1: 2, nrp2: 3, nrp3: 4, nrp4: 5,
  r1: 6, r2: 7, nouveau_client: 8, onboarding_envoye: 9, onboarding_traite: 10,
}
const STAGE_LABEL: Record<string, string> = {
  leads_a_traiter: "Leads à traiter", nrp1: "NRP 1", nrp2: "NRP 2", nrp3: "NRP 3", nrp4: "NRP 4",
  rdv_booke: "RDV booké", "nouveau-lead": "Nouveau lead", conversation: "En conversation",
  r1: "R1", r2: "R2", nouveau_client: "Nouveau client",
  onboarding_envoye: "Onboarding envoyé", onboarding_traite: "Onboarding traité", prospection: "Prospection",
}

// Colonnes RÉELLES du board Clients (cf. ClientsBoard.tsx CLIENT_STAGES) — source de vérité
// de l'étape d'un client. La clé "onboarding" est l'ancien id legacy (= Onboarding envoyé).
const CLIENT_STAGE_LABEL: Record<string, string> = {
  "nouveau-client":    "Nouveau client",
  "onboarding-envoye": "Onboarding envoyé",
  "onboarding-complet":"Onboarding complété",
  "kickoff-booke":     "Kickoff booké",
  "setup-cree":        "Setup créé",
  "consulting":        "Consulting",
  "onboarding":        "Onboarding envoyé", // legacy
}

// Calcule l'étape commerciale d'un contact = son EMPLACEMENT RÉEL dans les pipelines
// (prospection / lead pour les leads ; board Clients pour les clients).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveStage(contact: any, rec: any, lead: any, cli: any): { lost: boolean; key: string; label: string } | null {
  if (!contact.statut && !rec && !lead && !cli) return null
  // Perdu → COLONNE EXACTE au moment de la perte (lostStage), affichée en rouge.
  if (contact.statut === "perdu") {
    const key = contact.lostStage || "prospection"
    return { lost: true, key, label: STAGE_LABEL[key] ?? "Prospection" }
  }
  // Client → colonne réelle du board Clients (pipeline_clients.stageId), pas l'état onboarding.
  if (contact.statut === "client") {
    const sid = cli?.stageId
    const key = sid || "nouveau-client"
    return { lost: false, key, label: CLIENT_STAGE_LABEL[key] ?? "Nouveau client" }
  }
  // Lead actif → étape la plus avancée entre la colonne prospection et l'étape pipeline.
  let bestKey = "leads_a_traiter"
  const setBest = (k?: string) => { if (k && (STAGE_RANK[k] ?? 0) > (STAGE_RANK[bestKey] ?? 0)) bestKey = k }
  if (rec) {
    const col = rec.boardColumn
    if (col && ["leads_a_traiter", "nrp1", "nrp2", "nrp3", "nrp4"].includes(col)) setBest(col)
    else if (col === "rdv_booke") setBest("r1")
  }
  if (lead) {
    const m: Record<string, string> = { "nouveau-lead": "leads_a_traiter", conversation: "nrp1", r1: "r1", r2: "r2", "nouveau-client": "nouveau_client" }
    setBest(m[lead.stageId])
  }
  return { lost: false, key: bestKey, label: STAGE_LABEL[bestKey] }
}

export const commercialStage = query({
  args: { contactId: v.id("crm_contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId)
    if (!contact) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = (await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find((r: any) => r.contactId === contactId)
    const lead = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", contactId)).first()
    const cli = await ctx.db.query("pipeline_clients").withIndex("by_contact", q => q.eq("contactId", contactId)).first()
    return deriveStage(contact, rec, lead, cli)
  },
})

// Version groupée pour le tableau Contacts (1 seul appel pour tous les contacts).
export const commercialStagesAll = query({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const leads = await ctx.db.query("crm_leads").collect()
    const clis = await ctx.db.query("pipeline_clients").collect()
    const recBy = new Map<string, unknown>(); for (const r of recs) recBy.set(String(r.contactId), r)
    const leadBy = new Map<string, unknown>(); for (const l of leads) if (l.contactId) leadBy.set(String(l.contactId), l)
    const cliBy = new Map<string, unknown>(); for (const cl of clis) if (cl.contactId) cliBy.set(String(cl.contactId), cl)
    const out: Record<string, { lost: boolean; key: string; label: string }> = {}
    for (const c of contacts) {
      const id = String(c._id)
      const s = deriveStage(c, recBy.get(id), leadBy.get(id), cliBy.get(id))
      if (s) out[id] = s
    }
    return out
  },
})

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("crm_contacts").order("desc").collect()
  },
})

export const get = query({
  args: { id: v.id("crm_contacts") },
  handler: async (ctx, args) => ctx.db.get(args.id),
})

// Distinct métiers + niches (for dropdowns in the contact modal)
export const distinctMetiersNiches = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("crm_contacts").collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles   = [...new Set(all.map((c: any) => c.role).filter(Boolean) as string[])].sort()
    const metiers = [...new Set(all.map(c => c.metier).filter(Boolean) as string[])].sort()
    const niches  = [...new Set(all.map(c => c.niche).filter(Boolean) as string[])].sort()
    return { roles, metiers, niches }
  },
})

export const create = mutation({
  args: {
    firstName:   v.string(),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    address1:    v.optional(v.string()),
    city:        v.optional(v.string()),
    postalCode:  v.optional(v.string()),
    website:     v.optional(v.string()),
    source:      v.optional(v.string()),
    statut:      v.optional(v.string()),
    lostStage:    v.optional(v.string()),
    lostReason:   v.optional(v.string()),
    lostObjection:v.optional(v.string()),
    wonObjection: v.optional(v.string()),
    dealDate:     v.optional(v.string()),
    leadStatus:  v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    country:     v.optional(v.string()),
    canton:      v.optional(v.string()),
    role:        v.optional(v.string()),
    metier:      v.optional(v.string()),
    niche:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    notes:       v.optional(v.string()),
    createdBy:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { createdBy, ...fields } = args
    const by = createdBy ?? "human:thomas"
    // Source outbound (après normalisation) → la fiche EST un lead outbound : cards obligatoires.
    const isOutbound = fields.source !== undefined && normalizeLeadSource(fields.source) === "outbound"
    // ── Dédup forte : ne JAMAIS créer un doublon si un contact existe déjà
    //    avec le même téléphone / email / LinkedIn → on lie au contact existant.
    const dupId = await findDuplicateContact(ctx, { phone: fields.phone, email: fields.email, linkedinUrl: fields.linkedinUrl })
    if (dupId) {
      const match = (await ctx.db.get(dupId))!
      // Compléter uniquement les champs manquants (Contacts reste source de vérité)
      const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
      if (fields.email && !match.email) patch.email = fields.email
      if (fields.phone && !match.phone) patch.phone = fields.phone
      if (fields.linkedinUrl && !match.linkedinUrl) patch.linkedinUrl = fields.linkedinUrl
      if (fields.companyName && !match.companyName) patch.companyName = fields.companyName
      // Enrichir la fiche en entier (compléter les champs manquants — Contacts reste source de vérité)
      if (fields.firstName && !match.firstName) patch.firstName = fields.firstName
      if (fields.lastName && !match.lastName) patch.lastName = fields.lastName
      if (fields.city && !match.city) patch.city = fields.city
      if (fields.postalCode && !match.postalCode) patch.postalCode = fields.postalCode
      if (fields.country && !match.country) patch.country = fields.country
      if (fields.canton && !match.canton) patch.canton = fields.canton
      if (fields.website && !match.website) patch.website = fields.website
      if (fields.metier && !match.metier) patch.metier = fields.metier
      if (fields.niche && !match.niche) patch.niche = fields.niche
      if (fields.address1 && !match.address1) patch.address1 = fields.address1
      await ctx.db.patch(match._id, patch)
      await enforce(ctx, match._id)
      if (isOutbound) await ensureOutboundCards(ctx, match._id, by)
      return match._id
    }
    const newId = await ctx.db.insert("crm_contacts", {
      ...fields,
      source:    fields.source !== undefined ? normalizeLeadSource(fields.source) : undefined,
      tags:      fields.tags ?? [],
      createdAt: new Date().toISOString(),
    })
    await enforce(ctx, newId)
    if (isOutbound) await ensureOutboundCards(ctx, newId, by)
    return newId
  },
})

// ── Lead INBOUND (formulaire Meta Ads / lead entrant) ──
// Crée/réutilise le contact (source=inbound, statut=lead) PUIS matérialise la card
// Pipeline Leads (« Nouveau lead », source héritée=inbound) via le chemin canonique
// linkInternal — donc visible dans le module Contacts ET la pipeline commerciale.
// Idempotent : dédup forte par téléphone/email, jamais de doublon de lead.
export const ingestInboundLead = mutation({
  args: {
    firstName:   v.string(),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    notes:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    temperature: v.optional(v.string()),
    createdBy:   v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const by = a.createdBy ?? "agent:meta-ads"
    const iso = new Date().toISOString()
    let contactId = await findDuplicateContact(ctx, { phone: a.phone, email: a.email })
    if (contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (await ctx.db.get(contactId))! as any
      const patch: Record<string, unknown> = { updatedAt: iso }
      if (a.email && !c.email) patch.email = a.email
      if (a.phone && !c.phone) patch.phone = a.phone
      if (a.companyName && !c.companyName) patch.companyName = a.companyName
      if (a.tags?.length) patch.tags = Array.from(new Set([...(c.tags ?? []), ...a.tags]))
      if (!c.statut) { patch.statut = "lead"; patch.leadStatus = "active" }
      await ctx.db.patch(contactId, patch)
    } else {
      contactId = await ctx.db.insert("crm_contacts", {
        firstName: a.firstName, lastName: a.lastName,
        email: a.email, phone: a.phone, companyName: a.companyName,
        source: "inbound", statut: "lead", leadStatus: "active",
        tags: a.tags ?? [], notes: a.notes,
        createdAt: iso,
      })
    }
    await enforce(ctx, contactId)
    const res = await linkInternal(ctx, contactId, { temperature: a.temperature ?? "tiede", channel: "formulaire", by })
    return { contactId, leadId: res.leadId, created: res.created }
  },
})

export const update = mutation({
  args: {
    id:          v.id("crm_contacts"),
    firstName:   v.optional(v.string()),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    address1:    v.optional(v.string()),
    city:        v.optional(v.string()),
    postalCode:  v.optional(v.string()),
    website:     v.optional(v.string()),
    source:      v.optional(v.string()),
    statut:      v.optional(v.string()),
    lostStage:    v.optional(v.string()),
    lostReason:   v.optional(v.string()),
    lostObjection:v.optional(v.string()),
    wonObjection: v.optional(v.string()),
    dealDate:     v.optional(v.string()),
    leadStatus:  v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    country:     v.optional(v.string()),
    canton:      v.optional(v.string()),
    role:        v.optional(v.string()),
    metier:      v.optional(v.string()),
    niche:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    notes:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v
    }
    if (patch.source !== undefined) {
      patch.source = normalizeLeadSource(patch.source as string)
      // Source = ORIGINE IMMUABLE : on ne change jamais une source déjà posée (défense serveur, cf. UI verrouillée).
      // Un inbound reste inbound, etc. — sinon les analytics de conversion par source seraient faussées.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cur = await ctx.db.get(id) as any
      if (cur?.source) delete patch.source
    }
    await ctx.db.patch(id, patch)
    // Fiche = source de vérité : toute édition resynchronise le placement pipeline
    // (lead↔client↔perdu) et propage les champs dérivés. Plus de désync possible.
    await enforce(ctx, id)
    // Lead OUTBOUND (source posée OU éditée après coup) → garantir sa card Prospection
    // automatiquement, exactement comme à la création. Idempotent (linkInternal ne double pas).
    // Sinon un contact passé en outbound via l'édition n'apparaissait jamais dans le module Prospection.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await ctx.db.get(id) as any
    if (updated && updated.statut !== "client" && normalizeLeadSource(updated.source ?? "") === "outbound") {
      await ensureOutboundCards(ctx, id, "human:thomas")
    }
  },
})

// Migration one-off : l'ancien champ "metier" contenait en réalité des RÔLES (CEO, Directeur…).
// On déplace metier → role, puis on vide metier (qui redevient le vrai secteur d'activité). Idempotent.
export const migrateMetierToRole = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    let n = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of contacts as any[]) {
      if (c.metier && (!c.role || c.metier === c.role)) { await ctx.db.patch(c._id, { role: c.role ?? c.metier, metier: undefined }); n++ }
    }
    return { migrated: n }
  },
})

export const remove = mutation({
  args: { id: v.id("crm_contacts") },
  handler: async (ctx, args) => {
    // Cascade: remove associated lead + client + stage history
    const leads = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", args.id)).collect()
    for (const l of leads) {
      const hist = await ctx.db.query("lead_stage_history").withIndex("by_lead", q => q.eq("leadId", l._id)).collect()
      for (const h of hist) await ctx.db.delete(h._id)
      await ctx.db.delete(l._id)
    }
    const cid = args.id.toString()
    // pipeline_clients : purger via les DEUX index (ghl_contact_id legacy + contactId typé Vague 2) → zéro orphelin
    const clientDocs = [
      ...await ctx.db.query("pipeline_clients").withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", cid)).collect(),
      ...await ctx.db.query("pipeline_clients").withIndex("by_contact", q => q.eq("contactId", args.id)).collect(),
    ]
    const seenClient = new Set<string>()
    for (const c of clientDocs) { const k = c._id.toString(); if (!seenClient.has(k)) { seenClient.add(k); await ctx.db.delete(c._id) } }
    // onboarding lié au contact (sinon doc orphelin)
    for (const ob of await ctx.db.query("onboarding").withIndex("by_contact", q => q.eq("contactId", cid)).collect()) await ctx.db.delete(ob._id)
    // os_tasks liées (créées en prospection, linkedClientId = id contact) — pas d'index → scan filtré
    for (const t of await ctx.db.query("os_tasks").collect()) { if (t.linkedClientId === cid) await ctx.db.delete(t._id) }
    // os_sales_calls liés (R1/R2 iClosed du contact) — pas d'index par contact → scan filtré (sinon fiche Closing orpheline)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const sc of await ctx.db.query("os_sales_calls").collect()) { if ((sc as any).contactId === cid) await ctx.db.delete(sc._id) }
    // Cascade prospection : enregistrements + événements liés (sinon orphelins dans le board prospection)
    const precords = await ctx.db.query("prospection_records").withIndex("by_contact", q => q.eq("contactId", cid)).collect()
    for (const r of precords) {
      const evs = await ctx.db.query("prospection_events").withIndex("by_record", q => q.eq("prospectionRecordId", r._id)).collect()
      for (const e of evs) await ctx.db.delete(e._id)
      await ctx.db.delete(r._id)
    }
    await ctx.db.delete(args.id)
  },
})
