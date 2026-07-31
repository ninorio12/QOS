import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE, logActivity } from "./osLib"
import { findDuplicateContact } from "./contactDedup"
import { LEAD_STAGE_FOR_COLUMN } from "./leadSync"
import { normalizeLeadSource } from "./lib/leadSource"

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().split("T")[0]
const initialsOf = (n: string) => (n || "X").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
const norm = (s?: string) => (s || "").toLowerCase().trim()
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString() }

// ── Modèle final ──
// Colonnes du board (dérivées du status) : lead_a_traiter | r1_booke | perdu
// phase interne (dans la carte) : phase1 | phase2 | phase3
// phaseStatus : a_appeler | appele | repondu | pas_repondu | message_laisse | a_rappeler | interesse | negatif | mauvais_numero | non_qualifie
const PHASE_NEXT: Record<string, string> = { phase1: "phase2", phase2: "phase3", phase3: "perdu" }
const ATTEMPT = ["pas_repondu", "message_laisse", "a_rappeler"]   // tentatives ratées → font progresser la phase
const ALIAS: Record<string, string> = { non_qualifie: "non_qualifie", en_conversation: "repondu" }

// Colonnes du nouveau board kanban : leads_a_traiter | leads_interne | nrp1..nrp4 | rdv_booke | a_suivre | perdu.
// boardColumn fait foi ; rétro-compat = dérivé du status pour les anciens enregistrements.
const BOARD_COLUMNS = ["leads_a_traiter", "leads_interne", "nrp1", "nrp2", "nrp3", "nrp4", "rdv_booke", "a_suivre", "perdu"] as const
type BoardColumn = (typeof BOARD_COLUMNS)[number]
function boardColumnOf(r: { boardColumn?: string; status: string }): BoardColumn {
  if (r.boardColumn && (BOARD_COLUMNS as readonly string[]).includes(r.boardColumn)) return r.boardColumn as BoardColumn
  if (r.status === "handoff") return "rdv_booke"
  if (r.status === "lost" || r.status === "archived") return "perdu"
  return "leads_a_traiter"
}
// Alias de colonnes (anciens noms / variantes que les agents peuvent passer) → colonne board réelle.
const COLUMN_ALIASES: Record<string, BoardColumn> = {
  lead_a_traiter: "leads_a_traiter", a_traiter: "leads_a_traiter", nouveau_lead: "leads_a_traiter",
  r1_booke: "rdv_booke", r1: "rdv_booke", rdv: "rdv_booke", booke: "rdv_booke",
  leads_interne: "leads_interne", interne: "leads_interne", lost: "perdu", a_suivre: "a_suivre",
}
function normalizeColumn(col: string): string {
  if ((BOARD_COLUMNS as readonly string[]).includes(col)) return col
  return COLUMN_ALIASES[col] ?? col
}
// status synchronisé à la colonne (cohérence avec le reste du système).
function statusForColumn(col: BoardColumn): string {
  if (col === "perdu") return "lost"
  if (col === "rdv_booke") return "handoff"
  return "active"
}
// Synchro Pipeline leads : chaque colonne prospection → un stage du pipeline.
// Map centralisée dans leadSync (source unique pour les deux sens).
// leads_a_traiter→Nouveau lead ; NRP 1-4→Conversation ; RDV booké→R1 ; Perdu→lost derrière Conversation.

async function contactCard(ctx: { db: { get: (id: Id<"crm_contacts">) => Promise<unknown> } }, contactId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = await ctx.db.get(contactId as Id<"crm_contacts">) as any
  if (!c) return { contactId, fullName: "—" }
  return {
    contactId,
    fullName: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—",
    companyName: c.companyName ?? "", phone: c.phone ?? "", email: c.email ?? "",
    linkedinUrl: c.linkedinUrl ?? "", source: c.source ?? "", niche: c.niche ?? "",
    canton: c.canton ?? "", statut: c.statut ?? "", temperature: c.temperature ?? "",
  }
}

export const list = query({
  args: { phase: v.optional(v.string()), temperature: v.optional(v.string()), channel: v.optional(v.string()), status: v.optional(v.string()), column: v.optional(v.string()), ownerUserId: v.optional(v.string()), search: v.optional(v.string()) },
  handler: async (ctx, f) => {
    let rows = await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    if (f.status) rows = rows.filter(r => r.status === f.status)
    if (f.column) { const col = normalizeColumn(f.column); rows = rows.filter(r => boardColumnOf(r) === col) }
    if (f.phase) rows = rows.filter(r => r.phase === f.phase)
    if (f.temperature) rows = rows.filter(r => r.temperature === f.temperature)
    if (f.channel) rows = rows.filter(r => r.channel === f.channel)
    if (f.ownerUserId) rows = rows.filter(r => r.ownerUserId === f.ownerUserId)
    const out = await Promise.all(rows.map(async r => ({ ...r, id: r._id, column: boardColumnOf(r), contact: await contactCard(ctx, r.contactId) })))
    // Un lead converti en client (statut contact = "client") quitte la prospection :
    // il ne doit plus apparaître dans RDV booké (ni ailleurs), comme il quitte R1 du pipeline.
    const visible = out.filter(o => o.contact.statut !== "client")
    const q = norm(f.search)
    const filtered = q ? visible.filter(o => `${o.contact.fullName} ${o.contact.companyName} ${o.contact.phone} ${o.contact.email} ${o.contact.linkedinUrl}`.toLowerCase().includes(q)) : visible
    return filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },
})

export const get = query({
  args: { id: v.id("prospection_records") },
  handler: async (ctx, { id }) => { const r = await ctx.db.get(id); if (!r) return null; return { ...r, id: r._id, column: boardColumnOf(r), contact: await contactCard(ctx, r.contactId) } },
})

// Déplace une carte vers une colonne du board (drag & drop kanban).
// lostReason : renseigné quand on dépose dans "Perdu" (faux_numero | pas_interesse | jamais_repondu).
// followUpReason : texte libre renseigné quand on dépose dans "À suivre" (devient un chip sur la carte).
export const setColumn = mutation({
  args: { id: v.id("prospection_records"), column: v.string(), lostReason: v.optional(v.string()), followUpReason: v.optional(v.string()) },
  handler: async (ctx, { id, column, lostReason, followUpReason }) => {
    if (!(BOARD_COLUMNS as readonly string[]).includes(column)) throw new Error(`colonne inconnue: ${column}`)
    const rec = await ctx.db.get(id)
    if (!rec) throw new Error("record introuvable")
    // Règles métier de déplacement (mouvement libre pour corriger une erreur de drop — retour possible
    // depuis n'importe quelle colonne, NRP/Perdu/RDV inclus). Seuls 2 garde-fous d'intégrité de TYPE :
    //  • un lead interne ne peut JAMAIS (re)tomber dans "Leads à traiter" (entrée réservée aux leads bruts) ;
    //  • "Leads interne" est réservé aux contacts envoyés depuis leur fiche → on n'y glisse pas un lead normal.
    if (rec.internalLead && column === "leads_a_traiter") throw new Error("Un lead interne ne peut pas être remis dans « Leads à traiter »")
    if (!rec.internalLead && column === "leads_interne") throw new Error("« Leads interne » est réservé aux contacts envoyés depuis leur fiche")
    const col = column as BoardColumn
    const wasLost = rec.status === "lost"
    const recPatch: Record<string, unknown> = { boardColumn: col, status: statusForColumn(col), updatedAt: now() }
    if (col === "perdu") { if (lostReason) recPatch.lostReason = lostReason }
    else recPatch.lostReason = undefined   // sort de "Perdu" → on efface la raison
    if (col === "a_suivre") {
      if (followUpReason) recPatch.followUpReason = followUpReason
      // date d'entrée dans "À suivre" : posée à l'entrée, conservée si déjà dedans
      recPatch.followUpAt = (boardColumnOf(rec) === "a_suivre" && rec.followUpAt) ? rec.followUpAt : now()
    } else { recPatch.followUpReason = undefined; recPatch.followUpAt = undefined }   // sort de "À suivre"
    await ctx.db.patch(id, recPatch)

    // Synchro du lead Pipeline lié + du contact (la raison vit aussi sur le contact pour la fiche).
    const stageId = LEAD_STAGE_FOR_COLUMN[col]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = rec.leadId ? await ctx.db.get(rec.leadId as Id<"crm_leads">) as any : null
    if (col === "perdu") {
      if (lead) await ctx.db.patch(lead._id, { stageId, status: "lost" })
      // Colonne EXACTE au moment de la perte (leads_a_traiter | nrp1..4 | rdv_booke) — rec est pré-patch.
      const priorCol = boardColumnOf(rec)
      const lostStage = priorCol === "perdu" ? (rec.lostStage ?? "prospection") : priorCol
      await ctx.db.patch(rec.contactId as Id<"crm_contacts">, { statut: "perdu", lostStage, lostReason: lostReason ?? rec.lostReason ?? undefined, updatedAt: now() })
    } else {
      if (lead) {
        const stageChanged = lead.stageId !== stageId
        await ctx.db.patch(lead._id, { stageId, status: "open" })
        if (stageChanged) await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId, stageName: stageId, enteredAt: today() })
      }
      if (wasLost) await ctx.db.patch(rec.contactId as Id<"crm_contacts">, { statut: "lead", lostStage: undefined, lostReason: undefined, lostObjection: undefined, updatedAt: now() })
    }

    // KPIs Suivi Setting (alimentés par les ÉVÉNEMENTS) : le simple drag d'une carte doit logguer
    // l'événement correspondant, sinon les compteurs ne le voient pas. Les KPIs comptent des leads
    // DISTINCTS → un éventuel doublon d'événement n'inflate rien.
    const prevCol = boardColumnOf(rec)   // rec est pré-patch
    if (col !== prevCol) {
      // Mapping colonne → événement métier. Chaque déplacement = une action loggée, donc visible
      // dans les KPIs (Contactés / Réponses / R1 / À rappeler / Perdus). leads DISTINCTS → pas d'inflation.
      const evFor = (c: string): { type: string; notes?: string } | null => {
        if (c === "rdv_booke") return { type: "r1_booke" }                       // R1 booké + réponse
        if (c === "perdu")     return { type: "perdu", notes: lostReason ?? rec.lostReason }
        if (c === "a_suivre")  return { type: "a_rappeler" }                       // à relancer (contacté)
        if (c === "nrp1" || c === "nrp2" || c === "nrp3" || c === "nrp4") return { type: "pas_repondu" } // tentative sans réponse = contacté
        return null   // leads_a_traiter / leads_interne : pas une action de contact
      }
      const ev = evFor(col)
      if (ev) {
        await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: id, contactId: rec.contactId, eventType: ev.type, phase: rec.phase, notes: ev.notes ?? undefined, createdBy: "human:thomas", createdAt: now() })
      }
    }
    return { ok: true, column: col }
  },
})

export const events = query({
  args: { recordId: v.string() },
  handler: async (ctx, { recordId }) => (await ctx.db.query("prospection_events").withIndex("by_record", q => q.eq("prospectionRecordId", recordId)).collect()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
})

// Backfill one-shot : crée les événements r1_booke / perdu manquants pour les cartes déjà en
// « RDV booké » / « Perdu » (déplacées AVANT que moveColumn ne logue les événements). Idempotent :
// ne recrée pas un événement déjà présent. Daté à la dernière action de la carte (bon jour).
export const backfillBoardEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evs = await ctx.db.query("prospection_events").withIndex("by_workspace_created", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const has = new Set(evs.map((e: any) => `${e.prospectionRecordId}|${e.eventType}`))
    let r1 = 0, lost = 0, contact = 0, rappel = 0
    for (const r of recs) {
      const col = boardColumnOf(r)
      const when = r.lastActionAt ?? r.updatedAt ?? r.createdAt ?? now()
      if (col === "rdv_booke" && !has.has(`${r._id}|r1_booke`)) {
        await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: r._id, contactId: r.contactId, eventType: "r1_booke", createdBy: "human:thomas", createdAt: when })
        r1++
      }
      if (col === "perdu" && !has.has(`${r._id}|perdu`)) {
        await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: r._id, contactId: r.contactId, eventType: "perdu", notes: r.lostReason ?? undefined, createdBy: "human:thomas", createdAt: when })
        lost++
      }
      // NRP = tentative sans réponse (contacté) ; À suivre = à rappeler. On ne crée que si AUCUN
      // événement de contact n'existe déjà pour ce lead (sinon il est déjà compté comme contacté).
      const contactTypes = ["appele", "message_laisse", "pas_repondu", "repondu", "a_rappeler", "interesse"]
      const alreadyContacted = contactTypes.some(t => has.has(`${r._id}|${t}`))
      if ((col === "nrp1" || col === "nrp2" || col === "nrp3" || col === "nrp4") && !alreadyContacted) {
        await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: r._id, contactId: r.contactId, eventType: "pas_repondu", createdBy: "human:thomas", createdAt: when })
        contact++
      }
      if (col === "a_suivre" && !has.has(`${r._id}|a_rappeler`)) {
        await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: r._id, contactId: r.contactId, eventType: "a_rappeler", createdBy: "human:thomas", createdAt: when })
        rappel++
      }
    }
    return { r1, lost, contact, rappel, recs: recs.length }
  },
})

// Crée un lead via dédup contact (utilisé par le MCP). Contacts = source de vérité.
export const createOrLink = mutation({
  args: { fullName: v.string(), companyName: v.optional(v.string()), phone: v.optional(v.string()), email: v.optional(v.string()), linkedinUrl: v.optional(v.string()), source: v.optional(v.string()), niche: v.optional(v.string()), canton: v.optional(v.string()), channel: v.optional(v.string()), temperature: v.optional(v.string()), ownerUserId: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const by = a.createdBy ?? "agent:chief_of_staff"
    const temp = a.temperature ?? "froid"
    const matchId = await findDuplicateContact(ctx, { phone: a.phone, email: a.email, linkedinUrl: a.linkedinUrl, fullName: a.fullName, companyName: a.companyName }, true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = matchId ? (await ctx.db.get(matchId)) as any : null
    let contactId: string
    const created = !match
    if (match) {
      contactId = match._id
      await ctx.db.patch(match._id, { statut: match.statut ?? "lead", leadStatus: "active", temperature: match.temperature ?? temp, linkedinUrl: a.linkedinUrl ?? match.linkedinUrl, updatedAt: now() })
    } else {
      const [firstName, ...rest] = (a.fullName || "Lead").split(" ")
      contactId = await ctx.db.insert("crm_contacts", { firstName, lastName: rest.join(" ") || undefined, email: a.email, phone: a.phone, companyName: a.companyName, linkedinUrl: a.linkedinUrl, source: a.source !== undefined ? normalizeLeadSource(a.source) : undefined, niche: a.niche, canton: a.canton, statut: "lead", leadStatus: "active", temperature: temp, tags: [], createdAt: now() })
    }
    return await linkInternal(ctx, contactId, { channel: a.channel, temperature: temp, ownerUserId: a.ownerUserId, by })
  },
})

// Lie un contact EXISTANT (créé via le formulaire Contacts) à la prospection. Ne duplique aucun champ identité.
export const linkContact = mutation({
  args: { contactId: v.id("crm_contacts"), temperature: v.optional(v.string()), channel: v.optional(v.string()), ownerUserId: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const by = a.createdBy ?? "human:thomas"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await ctx.db.get(a.contactId) as any
    if (!contact) throw new Error("Contact introuvable")
    const temp = a.temperature ?? "froid"
    await ctx.db.patch(a.contactId, { statut: contact.statut ?? "lead", leadStatus: "active", temperature: contact.temperature ?? temp, updatedAt: now() })
    return await linkInternal(ctx, a.contactId, { channel: a.channel, temperature: temp, ownerUserId: a.ownerUserId, by })
  },
})

// Helper partagé : crée/réutilise le lead Pipeline + le prospection_record (phase1/a_appeler).
// Exporté car la création d'un lead outbound depuis le module Contacts (crm_contacts.create)
// DOIT impérativement matérialiser les 2 cards (Nouveau lead + Prospection) via ce même chemin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function linkInternal(ctx: any, contactId: string, o: { channel?: string; temperature: string; ownerUserId?: string; by: string; isDemo?: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact = await ctx.db.get(contactId as Id<"crm_contacts">) as any
  const cName = `${contact?.firstName ?? ""} ${contact?.lastName ?? ""}`.trim() || "Lead"
  // Réutilise le lead Pipeline (jamais de doublon)
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  let leadId: string
  if (lead && lead.status === "open") leadId = lead._id
  else if (lead) {
    // Lead existant mais fermé (lost/won) → on le rouvre au lieu de créer un doublon
    await ctx.db.patch(lead._id, { status: "open", stageId: "nouveau-lead" })
    leadId = lead._id
  } else {
    const pipelines = await ctx.db.query("pipeline_config").collect()
    const pipelineId = pipelines[0]?._id ?? "leads"
    leadId = await ctx.db.insert("crm_leads", { contactId, name: cName, email: contact?.email, phone: contact?.phone, company: contact?.companyName, pipelineId, stageId: "nouveau-lead", status: "open", value: 0, source: normalizeLeadSource(contact?.source ?? "outbound"), initials: initialsOf(cName), isDemo: o.isDemo, createdAt: now() })
    await ctx.db.insert("lead_stage_history", { leadId, stageId: "nouveau-lead", stageName: "Nouveau lead", enteredAt: today() })
  }
  // Pas de doublon de prospection_record
  const existing = (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
    .find((r: any) => r.contactId === contactId && r.status !== "archived")
  if (existing) {
    await ctx.db.patch(existing._id, { temperature: o.temperature, leadId: existing.leadId ?? leadId, updatedAt: now() })
    return { recordId: existing._id, contactId, leadId, created: false }
  }
  const recordId = await ctx.db.insert("prospection_records", { workspaceId: WORKSPACE, contactId, leadId, phase: "phase1", phaseStatus: "a_appeler", temperature: o.temperature, channel: o.channel ?? "appel", lastActionAt: now(), ownerUserId: o.ownerUserId, status: "active", isDemo: o.isDemo, createdAt: now(), updatedAt: now() })
  await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: recordId, contactId, eventType: "created", createdBy: o.by, createdAt: now() })
  await logActivity(ctx, { actorType: o.by.startsWith("agent") ? "agent" : "human", actorId: o.by, eventType: "lead.created", summary: `Lead créé : ${cName}`, entityType: "prospection", entityId: recordId, source: "prospection" })
  return { recordId, contactId, leadId, created: true }
}

// Envoie un contact EXISTANT dans le board Prospection, directement en colonne "Leads interne".
// Déclenché par le bouton "Envoyer en prospection" de la fiche contact (n'importe quelle fiche).
// Idempotent : réutilise le lead + le prospection_record via linkInternal (jamais de doublon).
export const sendToInternalLeads = mutation({
  args: { contactId: v.id("crm_contacts"), createdBy: v.optional(v.string()) },
  handler: async (ctx, { contactId, createdBy }) => {
    const by = createdBy ?? "human:thomas"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await ctx.db.get(contactId) as any
    if (!contact) throw new Error("Contact introuvable")
    // Garde-fou : on ne rétrograde jamais un client en prospection.
    if (contact.statut === "client") throw new Error("Un client ne peut pas être envoyé en prospection")
    const cName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "Lead"
    // Le contact doit être visible sur le board → statut lead actif (réactive un "perdu" au passage).
    await ctx.db.patch(contactId, { statut: "lead", leadStatus: "active", lostStage: undefined, lostReason: undefined, lostObjection: undefined, updatedAt: now() })
    // Crée/réutilise lead Pipeline + prospection_record (chemin canonique).
    const res = await linkInternal(ctx, contactId, { temperature: contact.temperature ?? "froid", by })
    // Force la colonne "Leads interne" (entrée du board) + marque le lead comme interne
    // (flag persistant : la card garde sa couleur teal et reste interdite de retour en "Leads à traiter"
    //  même après s'être baladée dans les NRP / RDV booké). phase/tracker inchangés.
    await ctx.db.patch(res.recordId as Id<"prospection_records">, { boardColumn: "leads_interne", internalLead: true, status: "active", updatedAt: now() })
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: res.recordId, contactId, eventType: "leads_interne", createdBy: by, createdAt: now() })
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "prospection.leads_interne", summary: `Envoyé en prospection (Leads interne) — ${cName}`, entityType: "prospection", entityId: res.recordId, source: "prospection" })
    return { ...res, column: "leads_interne" }
  },
})

export const quickAction = mutation({
  args: { id: v.id("prospection_records"), action: v.string(), note: v.optional(v.string()), nextFollowUpAt: v.optional(v.string()), r1At: v.optional(v.string()), lostReason: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const rec = await ctx.db.get(a.id); if (!rec) return
    const by = a.createdBy ?? "human:thomas"
    const action = ALIAS[a.action] ?? a.action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await ctx.db.get(rec.contactId as Id<"crm_contacts">) as any
    const cName = contact ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() : "contact"

    let phase = rec.phase || "phase1"
    let phaseStatus: string | undefined = rec.phaseStatus
    let status = rec.status
    let pipelineStage: string | undefined, leadLost = false
    let contactStatut: string | undefined, contactLeadStatus: string | undefined, newTemp: string | undefined
    let lostReason: string | undefined, lostStage: string | undefined, task: "r1" | "rappel" | undefined
    let followUp = a.nextFollowUpAt
    let logEvent = `prospection.${action}`

    const toLost = (reason: string, ps?: string) => { status = "lost"; leadLost = true; contactStatut = "perdu"; contactLeadStatus = "non_qualifie"; lostReason = reason; lostStage = (rec.phase1Status || rec.phase2Status || rec.phase3Status) ? "conversation" : "nouveau-lead"; if (ps) phaseStatus = ps; logEvent = "lead.lost" }

    if (action === "r1_booke") {
      status = "handoff"; pipelineStage = "r1"; contactLeadStatus = "handoff"; task = "r1"; followUp = a.r1At ?? a.nextFollowUpAt; logEvent = "lead.r1_booked"
    } else if (action === "perdu") {
      toLost(a.lostReason ?? "autre")
    } else if (action === "negatif") {
      toLost("reponse_negative", "negatif")
    } else if (action === "mauvais_numero") {
      toLost("mauvais_numero", "mauvais_numero")
    } else if (action === "non_qualifie") {
      toLost("non_qualifie", "non_qualifie")
    } else if (action === "interesse") {
      phaseStatus = "interesse"; newTemp = "chaud"; pipelineStage = "conversation"
    } else if (action === "repondu") {
      phaseStatus = "repondu"; pipelineStage = "conversation"
    } else if (action === "appele") {
      phaseStatus = "appele"
    } else if (ATTEMPT.includes(action)) {
      // Une tentative ratée fait progresser la phase si la précédente était déjà une tentative
      if (ATTEMPT.includes(rec.phaseStatus ?? "")) {
        const nxt = PHASE_NEXT[phase] ?? phase
        if (nxt === "perdu") { toLost("pas_de_reponse_phase3", action); phase = "phase3" }
        else phase = nxt
      }
      if (status === "active") phaseStatus = action
      if (action === "a_rappeler") task = "rappel"
      if (!followUp) followUp = addDays(2)
    } else return

    const patch: Record<string, unknown> = { phase, phaseStatus, status, lastActionAt: now(), updatedAt: now() }
    if (lostReason) patch.lostReason = lostReason
    if (lostStage) patch.lostStage = lostStage
    if (newTemp) patch.temperature = newTemp
    if (followUp) patch.nextFollowUpAt = followUp
    if (a.note) patch.shortNote = a.note
    await ctx.db.patch(a.id, patch)

    // Pipeline sync
    if (rec.leadId) {
      if (leadLost) await ctx.db.patch(rec.leadId as Id<"crm_leads">, { status: "lost" })
      else if (pipelineStage) {
        await ctx.db.patch(rec.leadId as Id<"crm_leads">, { stageId: pipelineStage })
        await ctx.db.insert("lead_stage_history", { leadId: rec.leadId as Id<"crm_leads">, stageId: pipelineStage, stageName: pipelineStage, enteredAt: today() })
      }
    }
    // Contact sync
    if (contactStatut || contactLeadStatus || newTemp || leadLost) {
      const cp: Record<string, unknown> = { updatedAt: now() }
      if (contactStatut) cp.statut = contactStatut
      if (contactLeadStatus) cp.leadStatus = contactLeadStatus
      if (newTemp) cp.temperature = newTemp
      if (leadLost) { cp.lostStage = boardColumnOf(rec); if (lostReason) cp.lostReason = lostReason }   // colonne exacte au moment de la perte
      await ctx.db.patch(rec.contactId as Id<"crm_contacts">, cp)
    }
    // Tâches
    if (task === "r1") {
      await ctx.db.insert("os_tasks", { workspaceId: WORKSPACE, title: `Préparer R1 avec ${cName}`, description: a.r1At ? `R1 prévu le ${a.r1At}` : undefined, status: "todo", priority: "high", assigneeType: "human", source: "prospection", linkedClientId: rec.contactId, comments: [], createdBy: by, updatedBy: by, createdAt: now(), updatedAt: now() })
    } else if (task === "rappel") {
      await ctx.db.insert("os_tasks", { workspaceId: WORKSPACE, title: `Rappeler ${cName}`, description: followUp ? `À rappeler le ${followUp.slice(0, 10)}` : undefined, status: "todo", priority: "normal", assigneeType: "human", source: "prospection", linkedClientId: rec.contactId, comments: [], createdBy: by, updatedBy: by, createdAt: now(), updatedAt: now() })
    }
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: a.id, contactId: rec.contactId, eventType: action, phase, notes: a.note ?? lostReason, createdBy: by, createdAt: now() })
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: logEvent, summary: `${action} — ${cName}`, entityType: "prospection", entityId: a.id, source: "prospection" })
  },
})

// Met à jour une cellule de phase du tracker (Phase 1/2/3). Ne change JAMAIS la colonne (reste actif).
export const setPhaseCell = mutation({
  args: { id: v.id("prospection_records"), phase: v.string(), value: v.string(), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const rec = await ctx.db.get(a.id); if (!rec) return
    const by = a.createdBy ?? "human:thomas"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await ctx.db.get(rec.contactId as Id<"crm_contacts">) as any
    const cName = contact ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() : "contact"
    const field = a.phase === "phase2" ? "phase2Status" : a.phase === "phase3" ? "phase3Status" : "phase1Status"
    const val = a.value || undefined

    const patch: Record<string, unknown> = { [field]: val, phase: a.phase, phaseStatus: val ?? rec.phaseStatus, lastActionAt: now(), updatedAt: now() }
    if (val && ["pas_repondu", "a_rappeler"].includes(val) && !rec.nextFollowUpAt) patch.nextFollowUpAt = addDays(2)
    await ctx.db.patch(a.id, patch)

    // Sync Pipeline : dès qu'une phase est renseignée → "En conversation", sinon "Nouveau lead"
    const p1 = a.phase === "phase1" ? val : rec.phase1Status
    const p2 = a.phase === "phase2" ? val : rec.phase2Status
    const p3 = a.phase === "phase3" ? val : rec.phase3Status
    const targetStage = (p1 || p2 || p3) ? "conversation" : "nouveau-lead"
    if (rec.leadId) {
      const lead = await ctx.db.get(rec.leadId as Id<"crm_leads">)
      if (lead && lead.status === "open" && lead.stageId !== targetStage) {
        await ctx.db.patch(rec.leadId as Id<"crm_leads">, { stageId: targetStage })
        await ctx.db.insert("lead_stage_history", { leadId: rec.leadId as Id<"crm_leads">, stageId: targetStage, stageName: targetStage === "conversation" ? "En conversation" : "Nouveau lead", enteredAt: today() })
      }
    }

    if (val) {
      await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: a.id, contactId: rec.contactId, eventType: val, phase: a.phase, createdBy: by, createdAt: now() })
      await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: `prospection.${val}`, summary: `${a.phase} · ${val} — ${cName}`, entityType: "prospection", entityId: a.id, source: "prospection" })
    }
  },
})

export const remove = mutation({
  args: { id: v.id("prospection_records") },
  handler: async (ctx, { id }) => {
    const rec = await ctx.db.get(id)
    const evs = await ctx.db.query("prospection_events").withIndex("by_record", q => q.eq("prospectionRecordId", id)).collect()
    for (const e of evs) await ctx.db.delete(e._id)
    await ctx.db.delete(id)
    // Ferme le lead associé pour éviter un orphelin ouvert dans le Pipeline
    if (rec) {
      const lead = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", rec.contactId as Id<"crm_contacts">)).first()
      if (lead && lead.status === "open") await ctx.db.patch(lead._id, { status: "lost" })
    }
  },
})

export const setTemperature = mutation({
  args: { id: v.id("prospection_records"), temperature: v.string(), createdBy: v.optional(v.string()) },
  handler: async (ctx, { id, temperature, createdBy }) => {
    const r = await ctx.db.get(id); if (!r) return
    await ctx.db.patch(id, { temperature, updatedAt: now() })
    await ctx.db.patch(r.contactId as Id<"crm_contacts">, { temperature, updatedAt: now() })   // sync Contact/Pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = await ctx.db.get(r.contactId as Id<"crm_contacts">) as any
    const cName = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "contact"
    const by = createdBy ?? "human:thomas"
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "prospection.temperature", summary: `Température ${temperature} — ${cName}`, entityType: "prospection", entityId: id, source: "prospection" })
  },
})
export const setNextFollowUp = mutation({
  args: { id: v.id("prospection_records"), nextFollowUpAt: v.string() },
  handler: async (ctx, { id, nextFollowUpAt }) => { await ctx.db.patch(id, { nextFollowUpAt, updatedAt: now() }) },
})
export const addNote = mutation({
  args: { id: v.id("prospection_records"), note: v.string() },
  handler: async (ctx, { id, note }) => {
    const r = await ctx.db.get(id); if (!r) return
    await ctx.db.patch(id, { shortNote: note, updatedAt: now() })
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: id, contactId: r.contactId, eventType: "note", notes: note, createdBy: "human:thomas", createdAt: now() })
  },
})

// ── Objectifs du jour ──
export const goalToday = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(g => g.date === today()) ?? null,
})
export const setGoal = mutation({
  args: { targetCalls: v.optional(v.number()), targetMessages: v.optional(v.number()), targetFollowUps: v.optional(v.number()), targetR1Booked: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const existing = (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(g => g.date === today())
    if (existing) await ctx.db.patch(existing._id, { ...a, updatedAt: now() })
    else await ctx.db.insert("prospection_goals", { workspaceId: WORKSPACE, date: today(), ...a, createdAt: now(), updatedAt: now() })
  },
})

// ── KPI strip (rôle setter) ──
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const recsAll = await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    // Cohérence avec le board : on exclut les leads convertis en clients (statut contact = "client"),
    // et on compte par COLONNE RÉELLE (boardColumnOf) et non par status legacy (columnOf).
    const recs: typeof recsAll = []
    for (const r of recsAll) {
      const c = await ctx.db.get(r.contactId as Id<"crm_contacts">)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((c as any)?.statut !== "client") recs.push(r)
    }
    const td = today()
    const tomorrow = new Date(Date.parse(td + "T00:00:00Z") + 86400000).toISOString().slice(0, 10)
    const evs = await ctx.db.query("prospection_events")
      .withIndex("by_workspace_created", q => q.eq("workspaceId", WORKSPACE).gte("createdAt", td).lt("createdAt", tomorrow))
      .collect()
    const evToday = evs.filter(e => e.createdAt.startsWith(td))
    const goal = (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(g => g.date === td)
    const WORKING_COLS = ["leads_a_traiter", "leads_interne", "nrp1", "nrp2", "nrp3", "nrp4"]
    const working  = recs.filter(r => WORKING_COLS.includes(boardColumnOf(r)))   // leads encore à travailler (1ʳᵉ colonne + relances)
    const aTraiter = recs.filter(r => boardColumnOf(r) === "leads_a_traiter")    // strictement la colonne "Leads à traiter"
    const callsMessagesDone = evToday.filter(e => ["appele", "message_laisse", "pas_repondu"].includes(e.eventType)).length
    const target = goal?.targetCalls ?? 0
    return {
      leadsToWork: working.length,
      leadsAtraiter: aTraiter.length,
      leadsToCall: working.filter(r => ["a_appeler", "pas_repondu", "a_rappeler", "message_laisse"].includes(r.phaseStatus ?? "")).length,
      callsMessagesToday: callsMessagesDone,
      answersToday: evToday.filter(e => e.eventType === "repondu").length,
      messagesLeftToday: evToday.filter(e => e.eventType === "message_laisse").length,
      callbacksScheduled: working.filter(r => !!r.nextFollowUpAt).length,
      hotLeads: working.filter(r => r.temperature === "chaud").length,
      r1Booked: recs.filter(r => boardColumnOf(r) === "rdv_booke").length,
      r1BookedToday: evToday.filter(e => e.eventType === "r1_booke").length,
      lostLeads: recs.filter(r => boardColumnOf(r) === "perdu").length,
      target, remaining: Math.max(0, target - callsMessagesDone),
    }
  },
})

// ── Données de démo (vrais records backend, pas de mock front) ──
const DEMO = [
  { fn: "Marc", ln: "Dupuis", company: "Dupuis Finance", phone: "+41 79 123 45 67", email: "marc@dupuisfinance.ch", canton: "GE", niche: "Finance", channel: "appel", temp: "tiede", phase: "phase2", ps: "a_rappeler", st: "active" },
  { fn: "Sophie", ln: "Berger", company: "Berger Architecture", phone: "+41 78 222 11 90", email: "sophie@berger-archi.ch", canton: "VD", niche: "Architecture", channel: "linkedin", temp: "chaud", phase: "phase1", ps: "interesse", st: "active" },
  { fn: "Julien", ln: "Moreau", company: "Moreau Consulting", phone: "+41 76 444 33 21", email: "j.moreau@moreau.ch", canton: "VS", niche: "Conseil", channel: "appel", temp: "froid", phase: "phase1", ps: "a_appeler", st: "active" },
  { fn: "Camille", ln: "Roux", company: "Roux Immobilier", phone: "+41 79 888 77 66", email: "camille@roux-immo.ch", canton: "FR", niche: "Immobilier", channel: "appel", temp: "tiede", phase: "phase3", ps: "pas_repondu", st: "active" },
  { fn: "Thomas", ln: "Girard", company: "Girard Avocats", phone: "+41 78 555 12 34", email: "t.girard@girard-law.ch", canton: "GE", niche: "Juridique", channel: "email", temp: "froid", phase: "phase1", ps: "message_laisse", st: "active" },
  { fn: "Léa", ln: "Fontaine", company: "Fontaine Santé", phone: "+41 76 321 09 87", email: "lea@fontaine-sante.ch", canton: "NE", niche: "Santé", channel: "linkedin", temp: "chaud", phase: "phase2", ps: "repondu", st: "active" },
  { fn: "Nicolas", ln: "Lefebvre", company: "Lefebvre Digital", phone: "+41 79 654 32 10", email: "nico@lefebvre.digital", canton: "VD", niche: "Marketing", channel: "appel", temp: "tiede", phase: "phase1", ps: "appele", st: "active" },
  { fn: "Émilie", ln: "Garnier", company: "Garnier RH", phone: "+41 78 147 25 83", email: "emilie@garnier-rh.ch", canton: "GE", niche: "RH", channel: "appel", temp: "froid", phase: "phase2", ps: "pas_repondu", st: "active" },
  { fn: "Antoine", ln: "Faure", company: "Faure Construction", phone: "+41 76 963 85 27", email: "a.faure@faure-bat.ch", canton: "VS", niche: "BTP", channel: "appel", temp: "chaud", phase: "phase1", ps: "interesse", st: "active" },
  { fn: "Manon", ln: "Chevalier", company: "Chevalier Coaching", phone: "+41 79 258 14 70", email: "manon@chevalier-coach.ch", canton: "VD", niche: "Coaching", channel: "linkedin", temp: "tiede", phase: "phase1", ps: "a_appeler", st: "active" },
  { fn: "Lucas", ln: "Mercier", company: "Mercier Logistics", phone: "+41 78 741 96 32", email: "lucas@mercier-log.ch", canton: "FR", niche: "Logistique", channel: "appel", temp: "chaud", phase: "phase2", ps: "interesse", st: "handoff" },
  { fn: "Chloé", ln: "Blanc", company: "Blanc Studio", phone: "+41 76 852 74 19", email: "chloe@blanc-studio.ch", canton: "GE", niche: "Design", channel: "email", temp: "froid", phase: "phase3", ps: "non_qualifie", st: "lost", lostReason: "non_qualifie" },
]

export const seedProspectionDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const by = "human:thomas"
    let n = 0
    for (const d of DEMO) {
      const fullName = `${d.fn} ${d.ln}`
      const exists = (await ctx.db.query("crm_contacts").collect()).find(c => norm(c.phone) === norm(d.phone) || norm(c.email) === norm(d.email))
      if (exists) continue
      const contactId = await ctx.db.insert("crm_contacts", { firstName: d.fn, lastName: d.ln, email: d.email, phone: d.phone, companyName: d.company, source: "outbound", statut: d.st === "lost" ? "perdu" : "lead", leadStatus: d.st === "lost" ? "non_qualifie" : "active", canton: d.canton, niche: d.niche, temperature: d.temp, tags: [], isDemo: true, createdAt: now() })
      const lead = await linkInternal(ctx, contactId, { channel: d.channel, temperature: d.temp, by, isDemo: true })
      // Cellules tracker — uniquement repondu | pas_repondu | a_rappeler (vide = pas encore traité)
      const MAP: Record<string, string | undefined> = { interesse: "repondu", appele: "pas_repondu", message_laisse: "a_rappeler", a_appeler: undefined, non_qualifie: undefined }
      const cell = (s: string) => { const m = MAP[s] ?? s; return ["repondu", "pas_repondu", "a_rappeler"].includes(m as string) ? m : undefined }
      const cells: Record<string, string | undefined> = {}
      if (d.phase === "phase1") cells.phase1Status = cell(d.ps)
      else if (d.phase === "phase2") { cells.phase1Status = "pas_repondu"; cells.phase2Status = cell(d.ps) }
      else { cells.phase1Status = "pas_repondu"; cells.phase2Status = "a_rappeler"; cells.phase3Status = cell(d.ps) }
      const patch: Record<string, unknown> = { phase: d.phase, phaseStatus: d.ps, status: d.st, updatedAt: now(), ...cells }
      if (d.lostReason) patch.lostReason = d.lostReason
      if (d.ps === "a_rappeler" || d.phase === "phase3") patch.nextFollowUpAt = addDays(1)
      await ctx.db.patch(lead.recordId as Id<"prospection_records">, patch)
      if (d.st === "lost" && lead.leadId) await ctx.db.patch(lead.leadId as Id<"crm_leads">, { status: "lost" })
      if (d.st === "handoff" && lead.leadId) await ctx.db.patch(lead.leadId as Id<"crm_leads">, { stageId: "r1" })
      // Événements réels (alimentent le module Performance) — attribués au setter, aujourd'hui, avec la phase
      const evCells: [string, string | undefined][] = [["phase1", cells.phase1Status], ["phase2", cells.phase2Status], ["phase3", cells.phase3Status]]
      for (const [ph, val] of evCells) if (val) await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: lead.recordId, contactId, eventType: val, phase: ph, createdBy: "human:thomas", createdAt: now() })
      if (d.st === "handoff") await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: lead.recordId, contactId, eventType: "r1_booke", createdBy: "human:thomas", createdAt: now() })
      if (d.st === "lost") await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: lead.recordId, contactId, eventType: "perdu", createdBy: "human:thomas", createdAt: now() })
      n++
    }
    return { seeded: n }
  },
})

export const cleanupProspectionDemo = mutation({
  args: {},
  handler: async (ctx) => {
    let removed = 0
    const recs = (await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).filter(r => r.isDemo)
    for (const r of recs) {
      const evs = await ctx.db.query("prospection_events").withIndex("by_record", q => q.eq("prospectionRecordId", r._id)).collect()
      for (const e of evs) await ctx.db.delete(e._id)
      await ctx.db.delete(r._id)
    }
    const leads = (await ctx.db.query("crm_leads").collect()).filter(l => l.isDemo)
    for (const l of leads) {
      const hist = await ctx.db.query("lead_stage_history").withIndex("by_lead", q => q.eq("leadId", l._id)).collect()
      for (const h of hist) await ctx.db.delete(h._id)
      await ctx.db.delete(l._id)
    }
    const contacts = (await ctx.db.query("crm_contacts").collect()).filter(c => c.isDemo)
    for (const c of contacts) { await ctx.db.delete(c._id); removed++ }
    return { removed }
  },
})
