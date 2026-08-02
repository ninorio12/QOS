import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"
import { localDay } from "./timeLib"
import { reconcileMoney } from "./moneyReconciliation"
import { funnelCohort } from "./funnelCohort"

const now = () => new Date().toISOString()

// Bornes d'index pour charger les events d'une période SANS scan full-table (limite Convex 8192).
// Élargi de 2 jours de chaque côté pour couvrir le décalage de fuseau (dayOf affine ensuite en JS).
// Sentinelles ("0000-00-00"/"9999-99-99") laissées telles quelles = plage ouverte (fallback).
function eventBounds(from: string, to: string) {
  const shift = (d: string, days: number) => {
    const t = Date.parse(d + "T00:00:00Z")
    return Number.isNaN(t) ? d : new Date(t + days * 86400000).toISOString().slice(0, 10)
  }
  return { lo: shift(from, -2), hiExcl: shift(to, 3) }
}

// Familles d'événements (eventType des prospection_events)
const CONTACT  = ["appele", "message_laisse", "pas_repondu", "repondu", "a_rappeler", "interesse"]
// Réponse = le prospect a répondu : Répondu / Intéressé, OU RDV booké (l'appel a eu lieu = réponse).
// (Le cas « Perdu avec raison pas intéressé » est ajouté à part dans summary, via la raison de l'événement.)
const RESPONSE = ["repondu", "interesse", "r1_booke"]
const RAPPEL   = ["a_rappeler"]
const R1EV     = ["r1_booke"]
const LOST     = ["perdu", "negatif", "mauvais_numero", "non_qualifie"]
const ADV_PHASE = ["phase2", "phase3"]  // remplir P2/P3 = avancée

// metric (objectifs quotidiens) → prédicat. "appels" = toute phase renseignée (Répondu/Pas répondu/À rappeler), tous canaux.
function metricMatch(metric: string | undefined, eventType: string): boolean {
  switch (metric) {
    case "appels":   return CONTACT.includes(eventType)
    case "messages": return eventType === "message_laisse"
    case "relances": return eventType === "a_rappeler"
    case "reponses": return RESPONSE.includes(eventType)
    case "r1":       return eventType === "r1_booke"
    case "perdus":   return LOST.includes(eventType)
    default:         return false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEvents(ctx: any, a: { setter?: string; from?: string; to?: string; channel?: string; tzOffset?: number }) {
  const from = a.from ?? "0000-00-00", to = a.to ?? "9999-99-99"
  const { lo, hiExcl } = eventBounds(from, to)
  const evs = await ctx.db.query("prospection_events")
    .withIndex("by_workspace_created", (q: any) => q.eq("workspaceId", WORKSPACE).gte("createdAt", lo).lt("createdAt", hiExcl))
    .collect()
  const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
  const chanOf = new Map<string, string>(recs.map((r: any) => [r._id, r.channel ?? "appel"]))
  const dayOf = (iso: string) => localDay(iso, a.tzOffset)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let list = evs.filter((e: any) => { const d = dayOf(e.createdAt); return d >= from && d <= to })
  if (a.setter) list = list.filter((e: any) => e.createdBy === a.setter)
  const chan = (e: any) => chanOf.get(e.prospectionRecordId) ?? "appel"
  if (a.channel && a.channel !== "all") list = list.filter((e: any) => chan(e) === a.channel)
  return { list, chan, recs, from, to, dayOf }
}

// nb de LEADS distincts correspondant au prédicat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const distinctLeads = (list: any[], pred: (e: any) => boolean) => new Set(list.filter(pred).map(e => e.prospectionRecordId)).size

async function goalsInRange(ctx: any, from: string, to: string) {
  return (await ctx.db.query("prospection_goals").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()).filter((g: any) => g.date >= from && g.date <= to)
}

export const summary = query({
  args: { setter: v.optional(v.string()), from: v.optional(v.string()), to: v.optional(v.string()), channel: v.optional(v.string()), tzOffset: v.optional(v.number()), funnel: v.optional(v.string()) },
  handler: async (ctx, a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { list, recs, from, to, dayOf } = await loadEvents(ctx, a)
    // Vue parcours : seuls comptent les événements des leads de la cohorte
    // (contactés/réponses/R1 du parcours affiché, pas du bureau entier).
    if (a.funnel) {
      const allContacts = await ctx.db.query("crm_contacts").collect()
      const { cohortContacts } = partitionCohort(allContacts, await ctx.db.query("crm_leads").collect(), a.funnel)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cohortIds = new Set(cohortContacts.map((c: any) => String(c._id)))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contactOfRec = new Map<string, string>((recs as any[]).map((r: any) => [String(r._id), String(r.contactId)]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list = list.filter((e: any) => cohortIds.has(contactOfRec.get(String(e.prospectionRecordId)) ?? ""))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recs = (recs as any[]).filter((r: any) => cohortIds.has(String(r.contactId)))
    }
    // « Contactés » = leads RÉELLEMENT travaillés sur la période = leads distincts ayant AU MOINS
    // un événement de prospection (toute action loggée). Garantit que réponses/R1/perdus ⊆ contactés
    // → les taux (réponse, conversion R1) sont bornés ≤ 100% par construction.
    const contactes = new Set(list.map((e: any) => e.prospectionRecordId)).size
    // Réponses = RESPONSE (répondu/intéressé/RDV booké) + perdu avec raison « pas intéressé » (l'appel a eu lieu).
    const reponses  = new Set<string>([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...list.filter((e: any) => RESPONSE.includes(e.eventType)).map((e: any) => e.prospectionRecordId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...list.filter((e: any) => e.eventType === "perdu" && e.notes === "pas_interesse").map((e: any) => e.prospectionRecordId),
    ]).size
    const r1Booked  = distinctLeads(list, e => R1EV.includes(e.eventType))
    const perdus    = distinctLeads(list, e => LOST.includes(e.eventType))

    // à rappeler : leads avec action "à rappeler" sur la période + (si tous setters) records dont la relance est due
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rappel = new Set<string>(list.filter((e: any) => RAPPEL.includes(e.eventType)).map((e: any) => e.prospectionRecordId))
    if (!a.setter) for (const r of recs as any[]) { if (r.status === "active" && r.nextFollowUpAt) { const d = dayOf(r.nextFollowUpAt); if (d >= from && d <= to) rappel.add(r._id) } }
    const aRappeler = rappel.size

    const objectifR1 = (await goalsInRange(ctx, from, to)).reduce((s: number, g: any) => s + (g.targetR1Booked ?? 0), 0)

    // Commission setter = 2% des paiements ENCAISSÉS, UNIQUEMENT pour les clients passés par la
    // colonne « RDV booké » de Prospection (R1 booké via le module Prospection), PAS tous les outbound.
    // Même filtre que nouveauxClients : prospection_record boardColumn=rdv_booke OU status=handoff.
    // Virements Revolut/manuels inclus (sinon commission 0 pour tout client payé hors Stripe).
    const COMMISSION_RATE = 0.02
    const onbs = await ctx.db.query("onboarding").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const clients = await ctx.db.query("pipeline_clients").collect()
    const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const externalPayments = await ctx.db.query("external_payments").collect()
    const fxRows = await ctx.db.query("fx_rates").collect()
    const fxToChf: Record<string, number> = { chf: 1 }; for (const r of fxRows) fxToChf[r.currency] = r.rate
    // « via appel » = funnel outbound : on EXCLUT les leads interne (ajoutés à la main depuis une fiche).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prospR1Contacts = new Set((recs as any[]).filter((r: any) => !r.internalLead && (r.boardColumn === "rdv_booke" || r.status === "handoff")).map((r: any) => String(r.contactId)))
    const money = reconcileMoney({ obs: onbs, clients, contacts, stripePayments, externalPayments, from, to, tzOffset: a.tzOffset, fxToChf })
    const paidProspR1 = money.transactions
      .filter(t => t.type === "payment" && t.status === "encaissé" && prospR1Contacts.has(String(t.contactId)))
      .reduce((s, t) => s + t.amount, 0)
    const commission = Math.round(paidProspR1 * COMMISSION_RATE)

    // Nouveaux clients obtenus via appel = leads passés par "RDV booké sur iClosed" (rdv_booke / handoff)
    // dont le contact est désormais "client". Daté par la conversion du contact (contact.updatedAt).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactById = new Map<string, any>(contacts.map((c: any) => [c._id.toString(), c]))
    const nouveauxClients = new Set(
      (recs as any[]).filter((r: any) => {
        const c = contactById.get(r.contactId)
        if (!c || c.statut !== "client") return false
        if (r.internalLead) return false   // lead interne ≠ client obtenu via appel
        if (!(r.boardColumn === "rdv_booke" || r.status === "handoff")) return false
        const d = dayOf(c.updatedAt ?? r.updatedAt)
        return d >= from && d <= to
      }).map((r: any) => r.contactId)
    ).size

    return {
      contactes, reponses, aRappeler, r1Booked, perdus, objectifR1, commission, nouveauxClients,
      tauxReponse:   contactes ? Math.min(100, Math.round((reponses / contactes) * 100)) : 0,
      conversionR1:  contactes ? Math.min(100, Math.round((r1Booked / contactes) * 100)) : 0,
    }
  },
})

// ── Funnel de conversion Prospection : Leads → R1 → Shows → Ventes ──────────
// Source 100% réelle, period-scopée. Règle métier (validée Thomas) :
//   shows   = R1 bookés − no-shows
//   no-show = contact passé en "perdu" au stade R1/R2 avec motif `non_presentation`
//             (cf. src/lib/lostReasons.ts > NONVENTE_REASONS)
//   taux de show  = shows ÷ R1 bookés
//   taux de close = ventes ÷ R1 bookés
// Partition des contacts/leads par parcours. Source UNIQUE de la règle :
// VSL = étiquette funnel:vsl STRICTE (posée par le futur tunnel VSL),
// Recommandation = inbound SANS étiquette (réseau, bouche-à-oreille, entrées
// directes), Emailing = source outbound (il n'étiquette pas), les autres =
// leur étiquette. Les cohortes ne se recouvrent jamais.
// (Décision Jonathan 2026-08-02 : le VSL n'est plus la voie par défaut ; les
//  inbound non tracés vivent dans Recommandation.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function partitionCohort(contacts: any[], leads: any[], funnel?: string): { cohortContacts: any[]; cohortLeads: any[] } {
  if (!funnel) return { cohortContacts: contacts, cohortLeads: leads }
  if (funnel === "recommandation") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyTag = (c: any) => Array.isArray(c.tags) && c.tags.some((t: string) => t.startsWith("funnel:"))
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cohortContacts: contacts.filter((c: any) => c.source !== "outbound" && !anyTag(c)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cohortLeads: leads.filter((l: any) => l.source !== "outbound" && !l.funnel),
    }
  }
  if (funnel === "emailing") {
    // Un contact outbound qui reçoit ensuite une étiquette de parcours (lead
    // Facebook rattaché à un contact déjà démarché) appartient à CE parcours,
    // plus à l'emailing : sinon il compte dans deux onglets et son encaissé est
    // attribué deux fois (audit tribunal 2026-08-02).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyTag = (c: any) => Array.isArray(c.tags) && c.tags.some((t: string) => t.startsWith("funnel:"))
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cohortContacts: contacts.filter((c: any) => c.source === "outbound" && !anyTag(c)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cohortLeads: leads.filter((l: any) => l.source === "outbound" && !l.funnel),
    }
  }
  // Parcours étiqueté : l'étiquette du CONTACT fait foi. Un contact déjà étiqueté
  // X n'entre pas dans le parcours Y même si un lead plus récent porte Y (premier
  // parcours gagnant, cohérent avec l'ingestion) : les cohortes restent disjointes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagOf = (c: any): string | null => {
    const t = (c.tags ?? []).find((x: string) => x.startsWith("funnel:"))
    return t ? String(t).slice(7) : null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagged = new Set(leads.filter((l: any) => l.funnel === funnel).map((l: any) => String(l.contactId)))
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cohortContacts: contacts.filter((c: any) => {
      const own = tagOf(c)
      if (own) return own === funnel                       // l'étiquette du contact tranche
      return tagged.has(String(c._id)) && c.source !== "outbound"  // sinon, le lead, sauf outbound
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cohortLeads: leads.filter((l: any) => l.funnel === funnel),
  }
}

export const funnel = query({
  args: { setter: v.optional(v.string()), from: v.optional(v.string()), to: v.optional(v.string()), channel: v.optional(v.string()), tzOffset: v.optional(v.number()), funnel: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const from = a.from ?? "0000-00-00", to = a.to ?? "9999-99-99"
    const dayOf = (iso: string) => localDay(iso, a.tzOffset)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts = await ctx.db.query("crm_contacts").collect()
    // FUNNEL = cohorte (source UNIQUE partagée avec le cockpit, cf. funnelCohort.ts).
    const { cohortContacts, cohortLeads: allLeads } = partitionCohort(contacts, await ctx.db.query("crm_leads").collect(), a.funnel)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salesCalls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
    const fc = funnelCohort(cohortContacts as any[], allLeads as any[], from, to, dayOf, salesCalls as any[])

    // Encaissé du PARCOURS : uniquement les paiements des contacts de cette
    // cohorte (décision Jonathan 2026-08-02). Sans ce filtre, chaque onglet
    // s'attribuait le chiffre global, donc le VSL comptait les ventes outbound.
    const onbs = await ctx.db.query("onboarding").collect()
    const clients = await ctx.db.query("pipeline_clients").collect()
    const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const externalPayments = await ctx.db.query("external_payments").collect()
    const fxRows = await ctx.db.query("fx_rates").collect()
    const fxToChf: Record<string, number> = { chf: 1 }; for (const r of fxRows) fxToChf[r.currency] = r.rate
    const money = reconcileMoney({ obs: onbs, clients, contacts, stripePayments, externalPayments, from, to, tzOffset: a.tzOffset, fxToChf })
    const cohortIds = new Set(cohortContacts.map((c) => String(c._id)))
    const encaisse = money.transactions
      .filter((t) => t.type === "payment" && t.status === "encaissé" && cohortIds.has(String(t.contactId)))
      .reduce((s, t) => s + t.amount, 0)

    // RDV DIRECTS (outbound) : le prospect a réservé SEUL via le lien du deck,
    // sans que le setter décroche. Détection : un R1 existe pour le contact mais
    // sa carte de prospection n'a JAMAIS reçu d'événement « R1 booké » (le geste
    // du setter). Quand les decks porteront le jeton, le rattachement par jeton
    // remplacera cette heuristique.
    let rdvDirects: number | null = null
    if (a.funnel === "emailing") {
      // MÊME cohorte que r1Booked : les contacts CRÉÉS dans la période (funnelCohort).
      // Sinon « RDV directs » pouvait dépasser « R1 bookés » alors qu'il en est
      // un sous-ensemble (audit tribunal 2026-08-02).
      const cohortIds = new Set(
        cohortContacts.filter((c) => { const d = dayOf(c.createdAt); return d >= from && d <= to }).map((c) => String(c._id)),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evs = await ctx.db.query("prospection_events").withIndex("by_workspace_created", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bookedBySetter = new Set((evs as any[]).filter((e: any) => e.eventType === "r1_booke").map((e: any) => String(e.prospectionRecordId)))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recOfContact = new Map<string, any>((recs as any[]).map((r: any) => [String(r.contactId), r]))
      rdvDirects = (salesCalls as unknown as { contactId?: string; stage: string; status: string; createdAt: string }[])
        .filter((cl) => cl.stage === "R1" && cl.status !== "cancelled" && cl.contactId && cohortIds.has(String(cl.contactId)))
        .filter((cl) => { const d = dayOf(cl.createdAt); return d >= from && d <= to })
        .filter((cl) => { const r = recOfContact.get(String(cl.contactId)); return !r || !bookedBySetter.has(String(r._id)) })
        .length
    }

    return { leadsATraiter: fc.leadsTotal, encaisse, rdvDirects, ...fc }
  },
})

export const activityCalendar = query({
  args: { setter: v.optional(v.string()), from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const { list, dayOf } = await loadEvents(ctx, { setter: a.setter, from: a.from, to: a.to, tzOffset: a.tzOffset })
    // Objectif R1 du jour = somme des cibles des objectifs auto "Booker X R1" (setter_tasks), source unique.
    const r1Tasks = await ctx.db.query("setter_tasks").withIndex("by_workspace_date", (q: any) => q.eq("workspaceId", WORKSPACE).gte("date", a.from).lte("date", a.to)).collect()
    const goalByDate = new Map<string, number>()
    for (const t of r1Tasks as any[]) if (t.metric === "r1") goalByDate.set(t.date, (goalByDate.get(t.date) ?? 0) + t.targetNumber)
    // group events by day
    const byDay = new Map<string, any[]>()
    for (const e of list as any[]) { const d = dayOf(e.createdAt); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d)!.push(e) }
    return [...byDay.entries()].map(([date, evs]) => {
      const r1 = distinctLeads(evs, e => R1EV.includes(e.eventType))
      const goal = goalByDate.get(date) ?? 0
      return {
        date,
        contactes: distinctLeads(evs, e => CONTACT.includes(e.eventType)),
        reponses:  distinctLeads(evs, e => RESPONSE.includes(e.eventType)),
        aRappeler: distinctLeads(evs, e => RAPPEL.includes(e.eventType)),
        r1, perdus: distinctLeads(evs, e => LOST.includes(e.eventType)),
        avancees:  distinctLeads(evs, e => (e.phase && ADV_PHASE.includes(e.phase)) || R1EV.includes(e.eventType) || LOST.includes(e.eventType)),
        goal, goalMet: goal > 0 && r1 >= goal,
      }
    }).sort((x, y) => (x.date < y.date ? -1 : 1))
  },
})

// ── Objectif R1 (éditable, persisté dans prospection_goals) ──
export const objectiveForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const g = (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(x => x.date === date)
    return g?.targetR1Booked ?? 0
  },
})

export const setR1Objective = mutation({
  args: { date: v.string(), target: v.number(), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const existing = (await ctx.db.query("prospection_goals").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()).find(g => g.date === a.date)
    if (existing) await ctx.db.patch(existing._id, { targetR1Booked: a.target, updatedAt: now() })
    else await ctx.db.insert("prospection_goals", { workspaceId: WORKSPACE, date: a.date, targetR1Booked: a.target, createdAt: now(), updatedAt: now() })
    const by = a.createdBy ?? "human:thomas"
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "performance.objective_set", summary: `Objectif R1 ${a.date} : ${a.target}`, entityType: "prospection_goal", entityId: a.date, source: "performance" })
    return { date: a.date, target: a.target }
  },
})

// ── Objectifs quotidiens du setter ──
export const dailyTasksList = query({
  args: { setter: v.optional(v.string()), date: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    let tasks = await ctx.db.query("setter_tasks").withIndex("by_workspace_date", q => q.eq("workspaceId", WORKSPACE).eq("date", a.date)).collect()
    if (a.setter) tasks = tasks.filter(t => t.setter === a.setter)
    const { list } = await loadEvents(ctx, { setter: a.setter, from: a.date, to: a.date, tzOffset: a.tzOffset })
    return tasks.map(t => {
      // progression auto = nb d'événements correspondant (ex. nb de phases renseignées aujourd'hui)
      const live = t.metric ? list.filter((e: any) => metricMatch(t.metric, e.eventType)).length : 0
      const progress = t.metric ? Math.max(live, t.currentProgress) : t.currentProgress
      const status = t.status === "done" || progress >= t.targetNumber ? "done" : progress > 0 ? "in_progress" : "todo"
      return { ...t, id: t._id, progress, status }
    }).sort((x, y) => x.createdAt < y.createdAt ? -1 : 1)
  },
})

// Objectifs sur une plage de dates : manuels indépendants, automatiques agrégés (X / somme des cibles)
export const objectivesForRange = query({
  args: { setter: v.optional(v.string()), from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    let tasks = await ctx.db.query("setter_tasks").withIndex("by_workspace_date", q => q.eq("workspaceId", WORKSPACE).gte("date", a.from).lte("date", a.to)).collect()
    if (a.setter) tasks = tasks.filter(t => t.setter === a.setter)
    const { list } = await loadEvents(ctx, { setter: a.setter, from: a.from, to: a.to, tzOffset: a.tzOffset })

    // Manuels : chacun identifié indépendamment
    const manual = tasks.filter(t => !t.metric).map(t => {
      const status = t.status === "done" ? "done" : t.currentProgress >= t.targetNumber ? "done" : t.currentProgress > 0 ? "in_progress" : "todo"
      return { id: t._id, ids: [t._id], title: t.title, targetNumber: t.targetNumber, progress: t.currentProgress, status, manual: true, date: t.date, createdAt: t.createdAt }
    })

    // Automatiques : agrégés par intitulé → X (total événements) / somme des cibles sur la plage
    const groups = new Map<string, { ids: string[]; title: string; metric: string; target: number; createdAt: string }>()
    for (const t of tasks.filter(t => t.metric)) {
      const g = groups.get(t.title) ?? { ids: [], title: t.title, metric: t.metric!, target: 0, createdAt: t.createdAt }
      g.ids.push(t._id); g.target += t.targetNumber
      if (t.createdAt < g.createdAt) g.createdAt = t.createdAt
      groups.set(t.title, g)
    }
    const auto = [...groups.values()].map(g => {
      const progress = list.filter((e: any) => metricMatch(g.metric, e.eventType)).length
      const status = progress >= g.target ? "done" : progress > 0 ? "in_progress" : "todo"
      return { id: g.ids[0], ids: g.ids, title: g.title, targetNumber: g.target, progress, status, metric: g.metric, manual: false, createdAt: g.createdAt }
    })

    return [...auto, ...manual].sort((x, y) => x.createdAt < y.createdAt ? -1 : 1)
  },
})

export const dailyTasksCreate = mutation({
  args: { setter: v.string(), date: v.string(), title: v.string(), targetNumber: v.number(), metric: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("setter_tasks", { workspaceId: WORKSPACE, date: a.date, setter: a.setter, title: a.title, metric: a.metric, targetNumber: a.targetNumber, currentProgress: 0, status: "todo", createdAt: now(), updatedAt: now() })
    const by = a.createdBy ?? a.setter
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "performance.task_created", summary: `Objectif : ${a.title} (${a.targetNumber})`, entityType: "setter_task", entityId: id, source: "performance" })
    return { id }
  },
})

export const dailyTasksUpdate = mutation({
  args: { id: v.id("setter_tasks"), increment: v.optional(v.number()), currentProgress: v.optional(v.number()), status: v.optional(v.string()), title: v.optional(v.string()), targetNumber: v.optional(v.number()), metric: v.optional(v.string()), createdBy: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const t = await ctx.db.get(a.id); if (!t) return
    const patch: Record<string, unknown> = { updatedAt: now() }
    if (a.title !== undefined) patch.title = a.title.trim() || t.title
    if (a.targetNumber !== undefined) patch.targetNumber = Math.max(1, a.targetNumber)
    if (a.metric !== undefined) patch.metric = a.metric || undefined
    const target = (patch.targetNumber as number) ?? t.targetNumber
    let progress = t.currentProgress
    if (a.increment) progress = Math.max(0, t.currentProgress + a.increment)
    if (a.currentProgress !== undefined) progress = Math.max(0, a.currentProgress)
    patch.currentProgress = progress
    let status = a.status ?? t.status
    if (a.status === undefined) status = progress >= target ? "done" : progress > 0 ? "in_progress" : "todo"
    patch.status = status
    await ctx.db.patch(a.id, patch)
    const by = a.createdBy ?? t.setter
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "performance.task_updated", summary: `${t.title} : ${progress}/${t.targetNumber}${status === "done" ? " ✓" : ""}`, entityType: "setter_task", entityId: a.id, source: "performance" })
    return { progress, status }
  },
})

export const dailyTasksRemove = mutation({
  args: { id: v.id("setter_tasks") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
