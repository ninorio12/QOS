import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { findDuplicateContact } from "./contactDedup"
import { enforce } from "./sync"
import { WORKSPACE } from "./osLib"
import { normalizeLeadSource } from "./lib/leadSource"

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
    const metiers = [...new Set(all.map(c => c.metier).filter(Boolean) as string[])].sort()
    const niches  = [...new Set(all.map(c => c.niche).filter(Boolean) as string[])].sort()
    return { metiers, niches }
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
    canton:      v.optional(v.string()),
    metier:      v.optional(v.string()),
    niche:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    notes:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Dédup forte : ne JAMAIS créer un doublon si un contact existe déjà
    //    avec le même téléphone / email / LinkedIn → on lie au contact existant.
    const dupId = await findDuplicateContact(ctx, { phone: args.phone, email: args.email, linkedinUrl: args.linkedinUrl })
    if (dupId) {
      const match = (await ctx.db.get(dupId))!
      // Compléter uniquement les champs manquants (Contacts reste source de vérité)
      const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
      if (args.email && !match.email) patch.email = args.email
      if (args.phone && !match.phone) patch.phone = args.phone
      if (args.linkedinUrl && !match.linkedinUrl) patch.linkedinUrl = args.linkedinUrl
      if (args.companyName && !match.companyName) patch.companyName = args.companyName
      await ctx.db.patch(match._id, patch)
      await enforce(ctx, match._id)
      return match._id
    }
    const newId = await ctx.db.insert("crm_contacts", {
      ...args,
      source:    args.source !== undefined ? normalizeLeadSource(args.source) : undefined,
      tags:      args.tags ?? [],
      createdAt: new Date().toISOString(),
    })
    await enforce(ctx, newId)
    return newId
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
    canton:      v.optional(v.string()),
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
    if (patch.source !== undefined) patch.source = normalizeLeadSource(patch.source as string)
    await ctx.db.patch(id, patch)
    // Fiche = source de vérité : toute édition resynchronise le placement pipeline
    // (lead↔client↔perdu) et propage les champs dérivés. Plus de désync possible.
    await enforce(ctx, id)
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
    const clients = await ctx.db.query("pipeline_clients").withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", cid)).collect()
    for (const c of clients) await ctx.db.delete(c._id)
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
