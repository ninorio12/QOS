import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"
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

    // Position actuelle dans la pipeline leads (stageId du lead du contact) → affichée en bas de fiche.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leads = await ctx.db.query("crm_leads").collect()
    const stageByContact = new Map<string, string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const l of leads as any[]) { if (l.contactId) stageByContact.set(String(l.contactId), l.stageId) }

    // Synthèse du R1 par contact (déjà captée par tl;dv/Fathom → record_notes, taggée r1).
    const r1SynthByContact = new Map<string, string>()
    for (const r of recNotes) {
      const tags = (r.tags ?? []).map((t) => String(t).toLowerCase())
      if (r.linkedContactId && tags.includes("r1") && r.synthesis && !r1SynthByContact.has(String(r.linkedContactId))) {
        r1SynthByContact.set(String(r.linkedContactId), r.synthesis)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactById = new Map<string, any>(contacts.map((c: any) => [String(c._id), c]))
    // RDV iClosed planifiés indexés par contact+étape → accrochés au lead correspondant.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callByKey = new Map<string, any>()
    for (const c of calls as any[]) {
      if (!c.contactId) continue
      const k = String(c.contactId) + "|" + (String(c.stage).toUpperCase() === "R2" ? "R2" : "R1")
      if (!callByKey.has(k)) callByKey.set(k, c)
    }

    // Fabrique une fiche Closing. `call` = RDV iClosed accroché (null si pas encore booké → « RDV à programmer »).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryFor = (contact: any, kind: string, call: any, id: string, pipelineStage: string | null) => {
      const cid = contact ? String(contact._id) : (call?.contactId ? String(call.contactId) : null)
      const intake = (cid && byContactId.get(cid)) || (contact?.email && byEmail.get(norm(contact.email))) || null
      const name = (contact ? fullNameOf(contact) : "") || call?.title || "Prospect"
      // Funnel Meta Ads : le lead a rempli le formulaire Meta → réponses captées dans contact.notes,
      // marqueur tag « Meta Ads ». Sert au brief R1 (pas de transcript) avec le quizz de confirmation.
      const tagsLc = (contact?.tags ?? []).map((t: any) => String(t).toLowerCase())
      const isMetaAds = tagsLc.includes("meta ads")
      return {
        id, callId: call?._id ?? null,
        title: call?.title ?? (contact ? `${kind} · ${fullNameOf(contact)}` : kind),
        date: call?.date ?? null, kind, contactId: cid, pipelineStage,
        contact: contact ? {
          id: contact._id, fullName: fullNameOf(contact), company: contact.companyName ?? null,
          email: contact.email ?? null, phone: contact.phone ?? null,
          role: contact.metier ?? null, niche: contact.niche ?? null, canton: contact.canton ?? null,
        } : null,
        name, company: contact?.companyName ?? intake?.company ?? null, initials: initials(name),
        prepReady: !!intake, intake: intake ?? null,
        objections: (call?.objections ?? []) as string[],
        wonObjection: contact?.wonObjection ?? null,
        r1Synthesis: cid ? (r1SynthByContact.get(cid) ?? null) : null,
        // Bio de l'appel si bookée, sinon repli sur le brief rédigé en amont sur le contact.
        bioMarkdown: call?.bioMarkdown ?? contact?.bioMarkdown ?? null,
        bioGeneratedAt: call?.bioGeneratedAt ?? contact?.bioGeneratedAt ?? null,
        bioBy: call?.bioBy ?? contact?.bioBy ?? null,
        meetLink: call?.meetLink ?? null,
        bookingAnswers: parseQuiz(call?.quizJson),
        quizAnswers: parseQuiz((intake as { answersJson?: string } | null)?.answersJson),
        // Signal de présence : le prospect a mis le RDV dans son agenda depuis la page de confirmation.
        addedToCalendar: (intake as { addedToCalendar?: boolean } | null)?.addedToCalendar ?? null,
        // Comment le questionnaire a été rattaché à ce contact (traçabilité du rapprochement).
        intakeMatchedBy: (intake as { matchedBy?: string } | null)?.matchedBy ?? null,
        // Funnel + quizz Meta Ads (R1 sans transcript : le brief se construit sur ces éléments).
        source: contact?.source ?? null,
        isMetaAds,
        metaAdsAnswers: isMetaAds ? (contact?.notes ?? null) : null,
        calendarLabel: call?.calendarLabel ?? null, calendarSlug: call?.calendarSlug ?? null, calendarColor: call?.calendarColor ?? null,
        notes: call?.notes ?? null,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = []
    const usedCallIds = new Set<string>()
    // 1) SOURCE = la pipeline : tout lead OUVERT en R1/R2 apparaît dans Closing (avec son RDV iClosed s'il existe).
    for (const l of leads as any[]) {
      if (l.status !== "open" || (l.stageId !== "r1" && l.stageId !== "r2")) continue
      const cid = l.contactId ? String(l.contactId) : null
      if (!cid) continue
      const kind = l.stageId === "r2" ? "R2" : "R1"
      const call = callByKey.get(cid + "|" + kind) ?? null
      if (call) usedCallIds.add(String(call._id))
      entries.push(entryFor(contactById.get(cid) ?? null, kind, call, call ? String(call._id) : `lead:${l._id}`, l.stageId))
    }
    // 2) Appels iClosed orphelins (contact pas/plus lead R1/R2, ex. email inconnu du CRM) : conservés, rien ne se perd.
    for (const c of calls as any[]) {
      if (usedCallIds.has(String(c._id))) continue
      const cid = c.contactId ? String(c.contactId) : null
      const contact = cid ? (contactById.get(cid) ?? null) : null
      const kind = String(c.stage).toUpperCase() === "R2" ? "R2" : "R1"
      const ps = cid ? (stageByContact.get(cid) ?? (contact?.statut === "client" ? "nouveau-client" : null)) : null
      entries.push(entryFor(contact, kind, c, String(c._id), ps))
    }
    // Tri : RDV datés en premier (chronologique), puis les « à programmer ».
    entries.sort((a, b) => (!!a.date !== !!b.date) ? (a.date ? -1 : 1) : String(a.date ?? "").localeCompare(String(b.date ?? "")))
    return entries
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

// Brief écrit AVANT qu'un RDV iClosed existe (fiche pilotée par le lead, pas d'os_sales_calls).
// On le stocke sur le CONTACT → repli affiché par upcomingCalls tant qu'aucun appel ne porte de bio.
// Évite de créer un appel placeholder (qui ferait doublon quand le vrai RDV iClosed arrive).
export const saveBioForContact = mutation({
  args: { contactId: v.id("crm_contacts"), bioMarkdown: v.string(), by: v.optional(v.string()) },
  handler: async (ctx, { contactId, bioMarkdown, by }) => {
    const now = new Date().toISOString()
    await ctx.db.patch(contactId, { bioMarkdown, bioGeneratedAt: now, bioBy: by ?? "manual", updatedAt: now })
    return { ok: true }
  },
})

// COHÉRENCE iClosed ⇄ pipeline : un R1/R2 booké (Closing) fait avancer le LEAD à la même étape
// (r1/r2) dans la pipeline + le funnel, et matérialise la carte Prospection en « RDV booké » (R1).
// → les R1 du Closing == les R1 du pipeline ; les R2 du Closing == les R2 du pipeline. Jamais en arrière.
const CALL_STAGE_RANK: Record<string, number> = { "nouveau-lead": 0, "conversation": 1, "r1": 2, "r2": 3, "nouveau-client": 4 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function advanceForCall(ctx: any, contactId: string | undefined, stage: string) {
  if (!contactId || (stage !== "R1" && stage !== "R2")) return
  const target = stage === "R2" ? "r2" : "r1"
  // 1) Lead pipeline → r1/r2 (source unique du funnel). Jamais de régression.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  // Un lead PERDU qui reprend rendez-vous n'est plus perdu : on rouvre le lead
  // et le contact, sinon le nouveau RDV reste invisible du pipeline et le
  // funnel continue de compter la personne comme perdue.
  if (lead && lead.status === "lost") {
    await ctx.db.patch(lead._id, { status: "open" })
    const c = await ctx.db.get(lead.contactId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (c && (c as any).statut === "perdu") await ctx.db.patch(lead.contactId, { statut: "lead", leadStatus: "active", lostStage: undefined, lostReason: undefined })
  }
  if (lead && (CALL_STAGE_RANK[lead.stageId] ?? -1) < CALL_STAGE_RANK[target]) {
    await ctx.db.patch(lead._id, { stageId: target })
    await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId: target, stageName: stage, enteredAt: new Date().toISOString().slice(0, 10) })
  }
  // 2) R1 → côté SETTING la carte passe en « Leads interne » avec le marqueur CADRAGE.
  //    Décision produit (Thomas, 28/07) : un lead qui a booké n'est plus à convertir, il est à
  //    CADRER avant le rendez-vous. Il rejoint donc les internes, mais la chip « Cadrage » le
  //    distingue de ceux qu'on envoie à la main depuis leur fiche.
  //    Côté PIPELINE, il est déjà passé en « RDV booké » au point 1 (stageId = r1).
  //    R2 = post-handoff, pas de changement côté prospection.
  if (target === "r1") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((r: any) => r.contactId === contactId && r.status !== "archived" && r.status !== "lost")
    const now2 = new Date().toISOString()
    // Rendez-vous DÉCROCHÉ PAR UN HUMAIN : le setter a glissé la carte en « RDV
    // booké » et pris le créneau dans iClosed. Il vient de parler au prospect,
    // l'appel de clarté n'a aucun sens. On ne touche donc pas à sa carte.
    const decrocheParUnHumain = rec?.status === "handoff" || rec?.boardColumn === "rdv_booke"
    if (rec && !decrocheParUnHumain) {
      if (rec.boardColumn !== "leads_interne") {
        await ctx.db.patch(rec._id, {
          boardColumn: "leads_interne", internalLead: true, cadrage: true,
          status: "active", updatedAt: now2,
        })
      }
    } else if (!rec) {
      // AUCUNE carte de prospection : le lead a réservé sans jamais passer par
      // le board (lien direct, import, réservation spontanée). Sans carte, il
      // n'apparaît nulle part dans la file d'appels et la puce de clarté ne peut
      // pas exister. On la crée donc, sinon le rendez-vous passe inaperçu.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead = (await ctx.db.query("crm_leads").collect()).find((l: any) => String(l.contactId) === String(contactId))
      await ctx.db.insert("prospection_records", {
        workspaceId: WORKSPACE,
        contactId: String(contactId),
        leadId: lead ? String(lead._id) : undefined,
        boardColumn: "leads_interne",
        phase: "phase1",
        internalLead: true,
        cadrage: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        origin: (lead as any)?.origin ?? undefined,
        temperature: "tiede",
        status: "active",
        createdAt: now2,
        updatedAt: now2,
      })
    }
  }
}

// Crée un appel R1/R2 planifié (porte serveur : webhook iClosed, seed, agent).
// `email` (optionnel) : résolu en contactId si non fourni (cas webhook iClosed → on n'a que l'email de l'invité).
export const scheduleCall = mutation({
  args: {
    title: v.string(), contactId: v.optional(v.string()), email: v.optional(v.string()), stage: v.string(), date: v.optional(v.string()),
    externalId: v.optional(v.string()), meetLink: v.optional(v.string()), quizJson: v.optional(v.string()),
    calendarLabel: v.optional(v.string()), calendarSlug: v.optional(v.string()), calendarColor: v.optional(v.string()),
    vfToken: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    // Jeton de parcours porté par les utm iClosed : c'est le rattachement le plus
    // sûr, il tient même si le lead réserve avec une autre adresse email.
    let tokenRow = null
    if (a.vfToken) {
      tokenRow = await ctx.db.query("os_lead_journey").withIndex("by_token", (q) => q.eq("token", a.vfToken!)).first()
      if (tokenRow && !a.contactId && tokenRow.contactId) a = { ...a, contactId: tokenRow.contactId }
      if (tokenRow && !a.email && tokenRow.email) a = { ...a, email: tokenRow.email }
    }
    // Résolution email → contactId (même logique que scheduleKickoff) si le webhook ne donne que l'email.
    let contactId = a.contactId
    if (!contactId && a.email) {
      const e = a.email.trim()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (await ctx.db.query("crm_contacts").withIndex("by_email", (q: any) => q.eq("email", e)).first())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?? (await ctx.db.query("crm_contacts").withIndex("by_email", (q: any) => q.eq("email", e.toLowerCase())).first())
      contactId = c?._id.toString()
    }
    // Repli par NOM : un lead outbound réserve souvent avec une autre adresse que celle qu'on
    // a en base. Sans ce repli, la carte ne passe jamais en « RDV booké » et la fiche R1 reste
    // orpheline. Le titre iClosed est de la forme « R1 · Prénom Nom ».
    if (!contactId) {
      const nm = (s?: string) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ")
      const who = nm(a.title.replace(/^R[12]\s*[·.\-]\s*/i, ""))
      if (who && who.includes(" ")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const all: any[] = await ctx.db.query("crm_contacts").collect()
        const hit = all.find((c: any) => nm([c.firstName, c.lastName].filter(Boolean).join(" ")) === who)
        if (hit) contactId = String(hit._id)
      }
    }
    a = { ...a, contactId }

    // Parcours du lead : le rendez-vous est la dernière étape visible du tunnel.
    // Sans cette trace, le setter voit qu'un lead vient de Facebook mais ignore
    // s'il a déjà réservé, donc il rappelle pour rien ou avec le mauvais discours.
    try {
      const journeys = await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect()
      const row = tokenRow
        ?? journeys.find((j) => (contactId && j.contactId === contactId) || (a.email && j.email?.toLowerCase() === a.email.trim().toLowerCase()))
      if (row && !row.steps.some((st) => st.step === "rdv_pris")) {
        await ctx.db.patch(row._id, {
          steps: [...row.steps, { step: "rdv_pris", at: now, meta: a.stage }],
          updatedAt: now,
        })
      }
    } catch { /* la trace ne doit jamais empêcher la création du rendez-vous */ }

    // R2 déguisé en R1 : le lien iClosed du R2 est le même événement que le R1
    // (« Audit IA offert »), la synchro annonce donc « R1 ». Si un R1 planifié
    // existe déjà pour ce contact sous un autre identifiant, ce nouveau
    // rendez-vous est en réalité le R2.
    if (a.stage === "R1" && contactId) {
      const others = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
      const existingR1 = others.find(o => String(o.contactId) === String(contactId) && o.stage === "R1" && o.status !== "cancelled" && o.externalId !== a.externalId)
      if (existingR1) a = { ...a, stage: "R2", title: a.title.replace(/^R1/, "R2") }
    }

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

// Annulation iClosed (webhook call.cancelled) : marque l'appel en `cancelled` via son externalId.
// status !== 'planned' → il disparaît du calendrier (calendarEvents filtre sur 'planned').
// Conservateur : on N'avance NI ne régresse la pipeline ici (décision humaine), on retire juste le RDV.
export const cancelCallByExternalId = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const call = await ctx.db.query("os_sales_calls").withIndex("by_external", q => q.eq("externalId", externalId)).first()
    if (!call) return { ok: false, reason: "introuvable" }
    await ctx.db.patch(call._id, { status: "cancelled", updatedAt: new Date().toISOString() })
    // Le RDV saute → le lead n'est plus « à cadrer ». On lève le marqueur CADRAGE et on le
    // renvoie au setting normal. On ne touche PAS aux internes envoyés à la main depuis leur
    // fiche (internalLead sans cadrage) : eux restent internes, ils n'ont jamais eu de RDV.
    // La pipeline n'est ni avancée ni régressée ici : c'est une décision humaine.
    if (call.contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((r: any) => r.contactId === String(call.contactId) && r.cadrage)
      if (rec) {
        if (rec.origin) {
          // Lead spontané (formulaire, emailing…) : retour en file de clarté,
          // marqueur conservé — l'appel sert maintenant à re-booker.
          await ctx.db.patch(rec._id, {
            boardColumn: "leads_interne", internalLead: true, cadrage: true,
            status: "active", updatedAt: new Date().toISOString(),
          })
        } else {
          await ctx.db.patch(rec._id, {
            cadrage: undefined, internalLead: undefined,
            boardColumn: "leads_a_traiter", status: "active",
            updatedAt: new Date().toISOString(),
          })
        }
      }
      // Le parcours note l'annulation : sans cette étape, la carte continuait
      // d'afficher « RDV booké » alors que le rendez-vous n'existait plus.
      const j = (await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect())
        .find((x) => x.contactId === String(call.contactId))
      if (j && !j.steps.some((st) => st.step === "rdv_annule")) {
        await ctx.db.patch(j._id, {
          steps: [...j.steps.filter((st) => st.step !== "rdv_pris"), { step: "rdv_annule", at: new Date().toISOString() }],
          updatedAt: new Date().toISOString(),
        })
      }
    }
    return { ok: true, id: call._id }
  },
})

// Statut de la connexion iClosed (pour le badge vert "connecté" du Calendrier).
// ⚠️ Ne dit PAS si la connexion iClosed fonctionne : compte seulement les RDV déjà importés.
// Une clé API révoquée laissait le badge au vert pendant des semaines (constaté le 28/07/2026).
// La santé réelle est portée par `lastSyncAt` / `lastSyncError`, écrits par le sync lui-même.
export const iclosedStatus = query({
  args: {},
  handler: async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const synced = calls.filter((c: any) => c.externalId || c.createdBy === "iclosed")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const health: any = await ctx.db.query("integrations").withIndex("by_key", (q: any) => q.eq("key", "iclosed")).first()
    const lastAt = health?.lastSyncAt ?? null
    const lastErr = health?.lastSyncError ?? null
    // Vert UNIQUEMENT si le dernier sync a réussi il y a moins de 24 h.
    const fresh = !!lastAt && (Date.now() - Date.parse(lastAt)) < 24 * 3600 * 1000
    return {
      connected: fresh && !lastErr,
      count: synced.length,
      lastSyncAt: lastAt,
      lastSyncError: lastErr,
      stale: !fresh,
    }
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
    callId:       v.optional(v.id("os_sales_calls")),  // RDV iClosed s'il existe ; sinon fiche pilotée par le lead
    contactId:    v.optional(v.string()),              // repli quand pas d'appel (fiche = lead R1/R2)
    stage:        v.optional(v.string()),              // 'R1' | 'R2' de la fiche (repli sans appel)
    outcome:      v.string(),                          // valide | gagne | perdu | no_show | reprogrammer
    dealValue:    v.optional(v.number()),
    amountTbd:    v.optional(v.boolean()),
    wonObjection: v.optional(v.string()),
    lostReason:   v.optional(v.string()),
    newDate:      v.optional(v.string()),
    by:           v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const call = a.callId ? await ctx.db.get(a.callId) : null
    const contactId = (call?.contactId ?? a.contactId) as string | undefined
    const by = a.by ?? "human:thomas"
    const now = new Date().toISOString()
    const lostStage = String(call?.stage ?? a.stage ?? "").toUpperCase() === "R2" ? "r2" : "r1"
    const entId = call ? String(call._id) : (contactId ?? "lead")
    // L'appel n'est patché que s'il existe (fiche sans RDV booké = action sur le lead/contact seulement).
    const patchCall = async (patch: Record<string, unknown>) => { if (call) await ctx.db.patch(call._id, patch) }
    const log = (summary: string) => logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "call.outcome", summary, entityType: "call", entityId: entId, source: "closing" })

    if (a.outcome === "valide") {
      // Validation d'un R1 : la carte AVANCE en R2 dans la pipeline (pas de conversion client ici).
      // L'objection surmontée au R1 est notée sur le contact → le brief R2 la retrouve.
      if (!contactId) throw new Error("Fiche sans contact lié.")
      await advanceForCall(ctx, contactId, "R2")
      if (a.wonObjection) await ctx.db.patch(contactId as Id<"crm_contacts">, { wonObjection: a.wonObjection })
      await patchCall({ status: "done", outcome: "valide", updatedAt: now })
      await log(`R1 validé : carte avancée en R2`)
      return { ok: true, outcome: "valide" }
    }

    if (a.outcome === "gagne") {
      if (!contactId) throw new Error("Fiche sans contact lié : impossible de convertir en client.")
      // La garde montant (rejet si pas de montant ni amountTbd) s'applique dans convertToClientLogic.
      await convertToClientLogic(ctx, { contactId, dealValue: a.dealValue, amountTbd: a.amountTbd, wonObjection: a.wonObjection, by })
      await patchCall({ status: "done", outcome: "gagne", updatedAt: now })
      await log(`Appel ${lostStage.toUpperCase()} clôturé : gagné`)
      return { ok: true, outcome: "gagne" }
    }

    if (a.outcome === "perdu") {
      // Chemin perdu le plus complet (lead + contact + record prospection + event), avec l'étape réelle.
      if (contactId) await markLost(ctx, contactId, { reason: a.lostReason ?? "autre", stage: lostStage, by })
      await patchCall({ status: "done", outcome: "perdu", updatedAt: now })
      await log(`Appel ${lostStage.toUpperCase()} clôturé : perdu`)
      return { ok: true, outcome: "perdu" }
    }

    if (a.outcome === "no_show") {
      // No-show RÉCUPÉRABLE : on NE marque PAS le lead perdu → la carte RESTE dans la pipeline (R1/R2)
      // avec son chip rouge. Si un RDV iClosed existe, on le passe no_show ; sinon on matérialise un
      // appel no_show (pour le chip pipeline + le taux no-show), le lead ne bouge pas d'étape.
      if (call) {
        await patchCall({ status: "no_show", outcome: "no_show", updatedAt: now })
      } else {
        if (!contactId) throw new Error("Fiche sans contact lié.")
        await ctx.db.insert("os_sales_calls", {
          workspaceId: WORKSPACE, title: `${lostStage.toUpperCase()} · no-show`, contactId,
          stage: lostStage === "r2" ? "R2" : "R1", status: "no_show", outcome: "no_show",
          createdBy: "closing", createdAt: now, updatedAt: now,
        })
      }
      await log(`Appel ${lostStage.toUpperCase()} : no-show`)
      return { ok: true, outcome: "no_show" }
    }

    if (a.outcome === "reprogrammer") {
      // Reprogrammé : exige un vrai RDV (on re-date l'appel). Ne clôt rien d'autre.
      if (!call) throw new Error("Pas de RDV booké à reprogrammer.")
      const patch: Record<string, unknown> = { status: "planned", outcome: "reprogramme", updatedAt: now }
      if (a.newDate) patch.date = a.newDate
      await patchCall(patch)
      await log(`Appel ${lostStage.toUpperCase()} reprogrammé${a.newDate ? " au " + a.newDate : ""}`)
      return { ok: true, outcome: "reprogramme" }
    }

    throw new Error(`Issue d'appel inconnue : ${a.outcome}`)
  },
})
