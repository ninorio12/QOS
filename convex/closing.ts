import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"
import { convertToClientLogic } from "./sync"
import { markLost } from "./leadSync"

// Closing — file de préparation d'appel (cockpit closer). Source = os_sales_calls (R1/R2 planifiés,
// créés par le webhook iClosed). Chaque appel est enrichi : fiche contact, réponses du quiz de
// confirmation (confirmation_intake), objections, synthèse du R1 (record_notes), et la BIO générée.

const norm = (s?: string) => (s ?? "").trim().toLowerCase()
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fullNameOf = (c: any) => [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim()
// Parse les réponses captées au booking iClosed (stockées en JSON sur l'appel).
function parseQuiz(s?: string): { q: string; a: string }[] {
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.isArray(arr) ? arr.filter((x: any) => x && x.q && x.a).map((x: any) => ({ q: String(x.q), a: String(x.a) })) : []
  } catch { return [] }
}

export const upcomingCalls = query({
  args: { scope: v.optional(v.string()) }, // 'today' | 'week' | 'all'
  handler: async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
      .filter((c: any) => (c.status ?? "planned") === "planned")
      .sort((a: any, b: any) => String(a.date ?? "").localeCompare(String(b.date ?? "")))

    const contacts = await ctx.db.query("crm_contacts").collect()
    const intakes = await ctx.db.query("confirmation_intake").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const recNotes = await ctx.db.query("record_notes").collect()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byContactId = new Map<string, any>(); const byEmail = new Map<string, any>()
    for (const it of intakes) { if (it.contactId) byContactId.set(String(it.contactId), it); if (it.email) byEmail.set(norm(it.email), it) }

    // Synthèse du R1 par contact (déjà captée par tl;dv/Fathom → record_notes, taggée r1).
    const r1SynthByContact = new Map<string, string>()
    for (const r of recNotes) {
      const tags = (r.tags ?? []).map((t) => String(t).toLowerCase())
      if (r.linkedContactId && tags.includes("r1") && r.synthesis && !r1SynthByContact.has(String(r.linkedContactId))) {
        r1SynthByContact.set(String(r.linkedContactId), r.synthesis)
      }
    }

    return calls.map((c: any) => {
      const contact = c.contactId ? contacts.find((x: any) => String(x._id) === String(c.contactId)) : null
      const intake = (c.contactId && byContactId.get(String(c.contactId))) || (contact?.email && byEmail.get(norm(contact.email))) || null
      const name = (contact ? fullNameOf(contact) : "") || c.title || "Prospect"
      const kind = (c.stage as string) || (/r2|closing/i.test(c.title ?? "") ? "R2" : "R1")
      return {
        id: c._id, title: c.title, date: c.date ?? null, kind,
        contactId: c.contactId ?? null,
        contact: contact ? {
          id: contact._id, fullName: fullNameOf(contact), company: contact.companyName ?? null,
          email: contact.email ?? null, phone: contact.phone ?? null,
          role: contact.metier ?? null, niche: contact.niche ?? null, canton: contact.canton ?? null,
        } : null,
        name, company: contact?.companyName ?? intake?.company ?? null, initials: initials(name),
        prepReady: !!intake, intake: intake ?? null,
        objections: (c.objections ?? []) as string[],
        wonObjection: contact?.wonObjection ?? null,
        r1Synthesis: c.contactId ? (r1SynthByContact.get(String(c.contactId)) ?? null) : null,
        bioMarkdown: c.bioMarkdown ?? null,
        bioGeneratedAt: c.bioGeneratedAt ?? null,
        bioBy: c.bioBy ?? null,
        meetLink: c.meetLink ?? null,
        bookingAnswers: parseQuiz(c.quizJson),
        quizAnswers: parseQuiz((intake as { answersJson?: string } | null)?.answersJson),
        calendarLabel: c.calendarLabel ?? null,
        calendarSlug: c.calendarSlug ?? null,
        calendarColor: c.calendarColor ?? null,
        notes: c.notes ?? null,
      }
    })
  },
})

// RDV closing (R1/R2) pour le module Calendrier, fenêtre [from, to].
export const calendarEvents = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()) },
  handler: async (ctx, { from, to }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const fromMs = from ? Date.parse(from) : -Infinity
    const toMs = to ? Date.parse(to) : Infinity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return calls.filter((c: any) => (c.status ?? "planned") === "planned" && c.date).flatMap((c: any) => {
      const t = Date.parse(c.date)
      if (isNaN(t) || t < fromMs || t > toMs) return []
      const contact = c.contactId ? contacts.find((x: any) => String(x._id) === String(c.contactId)) : null
      const name = (contact ? fullNameOf(contact) : "") || c.title || "RDV"
      const kind = (c.stage as string) || (/r2|closing/i.test(c.title ?? "") ? "R2" : "R1")
      return [{
        id: String(c._id), kind, contactName: name,
        startTime: new Date(t).toISOString(), endTime: new Date(t + 30 * 60000).toISOString(),
        meetLink: c.meetLink ?? null, contactId: c.contactId ?? null,
        calendarLabel: c.calendarLabel ?? null, calendarColor: c.calendarColor ?? null,
      }]
    })
  },
})

// Écrit la BIO générée par l'agent Operations sur l'appel (appelée via MCP closing_save_bio).
export const saveBio = mutation({
  args: { id: v.id("os_sales_calls"), bioMarkdown: v.string(), by: v.optional(v.string()) },
  handler: async (ctx, { id, bioMarkdown, by }) => {
    const now = new Date().toISOString()
    await ctx.db.patch(id, { bioMarkdown, bioGeneratedAt: now, bioBy: by ?? "agent-operations", updatedAt: now })
    return { ok: true }
  },
})

// COHÉRENCE iClosed ⇄ pipeline : un R1/R2 booké (Closing) fait avancer le LEAD à la même étape
// (r1/r2) dans la pipeline + le funnel, et matérialise la carte Prospection en « RDV booké » (R1).
// → les R1 du Closing == les R1 du pipeline ; les R2 du Closing == les R2 du pipeline. Jamais en arrière.
const CALL_STAGE_RANK: Record<string, number> = { "nouveau-lead": 0, "conversation": 1, "r1": 2, "r2": 3, "nouveau-client": 4 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceForCall(ctx: any, contactId: string | undefined, stage: string) {
  if (!contactId || (stage !== "R1" && stage !== "R2")) return
  const target = stage === "R2" ? "r2" : "r1"
  // 1) Lead pipeline → r1/r2 (source unique du funnel). Jamais de régression.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && (CALL_STAGE_RANK[lead.stageId] ?? -1) < CALL_STAGE_RANK[target]) {
    await ctx.db.patch(lead._id, { stageId: target })
    await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId: target, stageName: stage, enteredAt: new Date().toISOString().slice(0, 10) })
  }
  // 2) R1 → carte Prospection en « RDV booké » (status handoff). R2 = post-handoff, pas de changement prospection.
  if (target === "r1") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((r: any) => r.contactId === contactId && r.status !== "archived" && r.status !== "lost")
    if (rec && rec.status !== "handoff") {
      await ctx.db.patch(rec._id, { boardColumn: "rdv_booke", status: "handoff", updatedAt: new Date().toISOString() })
    }
  }
}

// Crée un appel R1/R2 planifié (porte serveur : webhook iClosed, seed, agent).
export const scheduleCall = mutation({
  args: {
    title: v.string(), contactId: v.optional(v.string()), stage: v.string(), date: v.optional(v.string()),
    externalId: v.optional(v.string()), meetLink: v.optional(v.string()), quizJson: v.optional(v.string()),
    calendarLabel: v.optional(v.string()), calendarSlug: v.optional(v.string()), calendarColor: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    // Dédup par externalId (iClosed eventCall) : un même RDV n'est jamais dupliqué.
    if (a.externalId) {
      const existing = await ctx.db.query("os_sales_calls").withIndex("by_external", q => q.eq("externalId", a.externalId)).first()
      if (existing) {
        await ctx.db.patch(existing._id, {
          date: a.date ?? existing.date, contactId: a.contactId ?? existing.contactId,
          stage: a.stage, meetLink: a.meetLink ?? existing.meetLink, quizJson: a.quizJson ?? existing.quizJson,
          calendarLabel: a.calendarLabel ?? existing.calendarLabel, calendarSlug: a.calendarSlug ?? existing.calendarSlug,
          calendarColor: a.calendarColor ?? existing.calendarColor, updatedAt: now,
        })
        await advanceForCall(ctx, a.contactId, a.stage)
        return { id: existing._id, created: false }
      }
    }
    const id = await ctx.db.insert("os_sales_calls", {
      workspaceId: WORKSPACE, title: a.title, contactId: a.contactId, stage: a.stage,
      status: "planned", date: a.date, externalId: a.externalId, meetLink: a.meetLink, quizJson: a.quizJson,
      calendarLabel: a.calendarLabel, calendarSlug: a.calendarSlug, calendarColor: a.calendarColor,
      createdBy: "iclosed", createdAt: now, updatedAt: now,
    })
    await advanceForCall(ctx, a.contactId, a.stage)
    return { id, created: true }
  },
})

// Supprime un appel R1/R2 (os_sales_calls). Utilisé pour le nettoyage + suppression manuelle.
export const removeCall = mutation({
  args: { id: v.id("os_sales_calls") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); return { ok: true } },
})

// Statut de la connexion iClosed (pour le badge vert "connecté" du Calendrier).
export const iclosedStatus = query({
  args: {},
  handler: async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const synced = calls.filter((c: any) => c.externalId || c.createdBy === "iclosed")
    return { connected: synced.length > 0, count: synced.length }
  },
})

// Ids iClosed déjà importés (le sync les saute avant tout appel réseau).
export const syncedExternalIds = query({
  args: {},
  handler: async (ctx) => {
    const calls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return calls.map((c: { externalId?: string }) => c.externalId).filter(Boolean) as string[]
  },
})

// Notes / prochain pas de prep (conservé).
export const saveCallNote = mutation({
  args: { id: v.id("os_sales_calls"), notes: v.optional(v.string()), nextStep: v.optional(v.string()) },
  handler: async (ctx, { id, notes, nextStep }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (notes !== undefined) patch.notes = notes
    if (nextStep !== undefined) patch.nextStep = nextStep
    await ctx.db.patch(id, patch)
    return { ok: true }
  },
})

// Issue d'un appel R1/R2 (cloture depuis le module Closing). Une seule porte → réutilise les chemins existants.
//  - "gagne"       : convertToClientLogic (garde montant : rejet si pas de montant ni amountTbd), puis appel done.
//  - "perdu"       : markLost (chemin perdu le plus complet : lead + contact + prospection + event), appel done. Pas de conversion.
//  - "no_show"     : appel outcome='no_show' / status='no_show'. NE FAIT PAS reculer le lead (aucune régression d'étape).
//  - "reprogrammer": appel re-daté (newDate), status reste 'planned'. Ne clôt rien d'autre.
export const recordOutcome = mutation({
  args: {
    callId:       v.id("os_sales_calls"),
    outcome:      v.string(),               // gagne | perdu | no_show | reprogrammer
    dealValue:    v.optional(v.number()),
    amountTbd:    v.optional(v.boolean()),
    wonObjection: v.optional(v.string()),
    lostReason:   v.optional(v.string()),
    newDate:      v.optional(v.string()),
    by:           v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const call = await ctx.db.get(a.callId)
    if (!call) throw new Error("Appel introuvable.")
    const contactId = call.contactId
    const by = a.by ?? "human:thomas"
    const now = new Date().toISOString()
    const lostStage = String(call.stage ?? "").toUpperCase() === "R2" ? "r2" : "r1"

    if (a.outcome === "gagne") {
      if (!contactId) throw new Error("Appel sans contact lié : impossible de convertir en client.")
      // La garde montant (rejet si pas de montant ni amountTbd) s'applique dans convertToClientLogic.
      await convertToClientLogic(ctx, { contactId, dealValue: a.dealValue, amountTbd: a.amountTbd, wonObjection: a.wonObjection, by })
      await ctx.db.patch(a.callId, { status: "done", outcome: "gagne", updatedAt: now })
      await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "call.outcome", summary: `Appel ${lostStage.toUpperCase()} clôturé : gagné`, entityType: "call", entityId: String(a.callId), source: "closing" })
      return { ok: true, outcome: "gagne" }
    }

    if (a.outcome === "perdu") {
      // Chemin perdu le plus complet (lead + contact + record prospection + event), avec l'étape réelle de l'appel.
      if (contactId) await markLost(ctx, contactId, { reason: a.lostReason ?? "autre", stage: lostStage, by })
      await ctx.db.patch(a.callId, { status: "done", outcome: "perdu", updatedAt: now })
      await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "call.outcome", summary: `Appel ${lostStage.toUpperCase()} clôturé : perdu`, entityType: "call", entityId: String(a.callId), source: "closing" })
      return { ok: true, outcome: "perdu" }
    }

    if (a.outcome === "no_show") {
      // Non-présentation : on marque l'appel, on NE touche PAS au lead (pas de régression d'étape).
      await ctx.db.patch(a.callId, { status: "no_show", outcome: "no_show", updatedAt: now })
      await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "call.outcome", summary: `Appel ${lostStage.toUpperCase()} : non-présentation`, entityType: "call", entityId: String(a.callId), source: "closing" })
      return { ok: true, outcome: "no_show" }
    }

    if (a.outcome === "reprogrammer") {
      // Reprogrammé : nouvelle date, l'appel reste planifié. Ne clôt rien d'autre.
      const patch: Record<string, unknown> = { status: "planned", outcome: "reprogramme", updatedAt: now }
      if (a.newDate) patch.date = a.newDate
      await ctx.db.patch(a.callId, patch)
      await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "call.outcome", summary: `Appel ${lostStage.toUpperCase()} reprogrammé${a.newDate ? " au " + a.newDate : ""}`, entityType: "call", entityId: String(a.callId), source: "closing" })
      return { ok: true, outcome: "reprogramme" }
    }

    throw new Error(`Issue d'appel inconnue : ${a.outcome}`)
  },
})
