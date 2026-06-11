import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"
import { localDay } from "./timeLib"

const now = () => new Date().toISOString()

// Familles d'événements (eventType des prospection_events)
const CONTACT  = ["appele", "message_laisse", "pas_repondu", "repondu", "a_rappeler", "interesse"]
const RESPONSE = ["repondu", "interesse"]
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
  const evs = await ctx.db.query("prospection_events").collect()
  const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
  const chanOf = new Map<string, string>(recs.map((r: any) => [r._id, r.channel ?? "appel"]))
  const from = a.from ?? "0000-00-00", to = a.to ?? "9999-99-99"
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
  args: { setter: v.optional(v.string()), from: v.optional(v.string()), to: v.optional(v.string()), channel: v.optional(v.string()), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const { list, recs, from, to, dayOf } = await loadEvents(ctx, a)
    const contactes = distinctLeads(list, e => CONTACT.includes(e.eventType))
    const reponses  = distinctLeads(list, e => RESPONSE.includes(e.eventType))
    const r1Booked  = distinctLeads(list, e => R1EV.includes(e.eventType))
    const perdus    = distinctLeads(list, e => LOST.includes(e.eventType))

    // à rappeler : leads avec action "à rappeler" sur la période + (si tous setters) records dont la relance est due
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rappel = new Set<string>(list.filter((e: any) => RAPPEL.includes(e.eventType)).map((e: any) => e.prospectionRecordId))
    if (!a.setter) for (const r of recs as any[]) { if (r.status === "active" && r.nextFollowUpAt) { const d = dayOf(r.nextFollowUpAt); if (d >= from && d <= to) rappel.add(r._id) } }
    const aRappeler = rappel.size

    const objectifR1 = (await goalsInRange(ctx, from, to)).reduce((s: number, g: any) => s + (g.targetR1Booked ?? 0), 0)

    // CA généré lié aux appels — placeholder tant qu'aucun montant n'est saisi sur les cartes prospection.
    // Commission setter = 2% des paiements ENCAISSÉS (échéances cochées payées) en onboarding,
    // UNIQUEMENT pour les clients issus de l'outbound. Respecte la période via paidDates.
    const COMMISSION_RATE = 0.02
    const onbs = await ctx.db.query("onboarding").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceById = new Map<string, string | undefined>(contacts.map((c: any) => [c._id.toString(), c.source]))
    let paidOutbound = 0
    for (const o of onbs as any[]) {
      if (sourceById.get(o.contactId) !== "outbound") continue
      const amounts: number[] = o.payment?.amounts ?? []
      const paid: boolean[] = o.paidStatus ?? []
      const dates: string[] = o.paidDates ?? []
      for (let i = 0; i < amounts.length; i++) {
        if (!paid[i]) continue
        if (dates[i]) { const d = dayOf(dates[i]); if (d < from || d > to) continue }  // hors période
        paidOutbound += amounts[i] ?? 0
      }
    }
    const commission = Math.round(paidOutbound * COMMISSION_RATE)

    return {
      contactes, reponses, aRappeler, r1Booked, perdus, objectifR1, commission,
      tauxReponse:   contactes ? Math.round((reponses / contactes) * 100) : 0,
      conversionR1:  contactes ? Math.round((r1Booked / contactes) * 100) : 0,
    }
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
