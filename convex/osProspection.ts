import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE, logActivity } from "./osLib"
import { findDuplicateContact } from "./contactDedup"

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

function columnOf(status: string): "lead_a_traiter" | "r1_booke" | "perdu" {
  if (status === "handoff") return "r1_booke"
  if (status === "lost" || status === "archived") return "perdu"
  return "lead_a_traiter"
}

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
    if (f.column) rows = rows.filter(r => columnOf(r.status) === f.column)
    if (f.phase) rows = rows.filter(r => r.phase === f.phase)
    if (f.temperature) rows = rows.filter(r => r.temperature === f.temperature)
    if (f.channel) rows = rows.filter(r => r.channel === f.channel)
    if (f.ownerUserId) rows = rows.filter(r => r.ownerUserId === f.ownerUserId)
    const out = await Promise.all(rows.map(async r => ({ ...r, id: r._id, column: columnOf(r.status), contact: await contactCard(ctx, r.contactId) })))
    const q = norm(f.search)
    const filtered = q ? out.filter(o => `${o.contact.fullName} ${o.contact.companyName} ${o.contact.phone} ${o.contact.email} ${o.contact.linkedinUrl}`.toLowerCase().includes(q)) : out
    return filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },
})

export const get = query({
  args: { id: v.id("prospection_records") },
  handler: async (ctx, { id }) => { const r = await ctx.db.get(id); if (!r) return null; return { ...r, id: r._id, column: columnOf(r.status), contact: await contactCard(ctx, r.contactId) } },
})

export const events = query({
  args: { recordId: v.string() },
  handler: async (ctx, { recordId }) => (await ctx.db.query("prospection_events").withIndex("by_record", q => q.eq("prospectionRecordId", recordId)).collect()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
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
      contactId = await ctx.db.insert("crm_contacts", { firstName, lastName: rest.join(" ") || undefined, email: a.email, phone: a.phone, companyName: a.companyName, linkedinUrl: a.linkedinUrl, source: a.source, niche: a.niche, canton: a.canton, statut: "lead", leadStatus: "active", temperature: temp, tags: [], createdAt: now() })
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkInternal(ctx: any, contactId: string, o: { channel?: string; temperature: string; ownerUserId?: string; by: string; isDemo?: boolean }) {
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
    leadId = await ctx.db.insert("crm_leads", { contactId, name: cName, email: contact?.email, phone: contact?.phone, company: contact?.companyName, pipelineId, stageId: "nouveau-lead", status: "open", value: 0, source: contact?.source ?? "outbound", initials: initialsOf(cName), isDemo: o.isDemo, createdAt: now() })
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
    if (contactStatut || contactLeadStatus || newTemp) {
      const cp: Record<string, unknown> = { updatedAt: now() }
      if (contactStatut) cp.statut = contactStatut
      if (contactLeadStatus) cp.leadStatus = contactLeadStatus
      if (newTemp) cp.temperature = newTemp
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
    const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const evs = await ctx.db.query("prospection_events").collect()
    const td = today()
    const evToday = evs.filter(e => e.createdAt.startsWith(td))
    const goal = (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(g => g.date === td)
    const active = recs.filter(r => columnOf(r.status) === "lead_a_traiter")
    const callsMessagesDone = evToday.filter(e => ["appele", "message_laisse", "pas_repondu"].includes(e.eventType)).length
    const target = goal?.targetCalls ?? 0
    return {
      leadsToWork: active.length,
      leadsAtraiter: active.length,
      leadsToCall: active.filter(r => ["a_appeler", "pas_repondu", "a_rappeler", "message_laisse"].includes(r.phaseStatus ?? "")).length,
      callsMessagesToday: callsMessagesDone,
      answersToday: evToday.filter(e => e.eventType === "repondu").length,
      messagesLeftToday: evToday.filter(e => e.eventType === "message_laisse").length,
      callbacksScheduled: active.filter(r => !!r.nextFollowUpAt).length,
      hotLeads: active.filter(r => r.temperature === "chaud").length,
      r1Booked: recs.filter(r => columnOf(r.status) === "r1_booke").length,
      r1BookedToday: evToday.filter(e => e.eventType === "r1_booke").length,
      lostLeads: recs.filter(r => columnOf(r.status) === "perdu").length,
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
