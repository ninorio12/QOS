import { v } from "convex/values"
import { query, internalMutation } from "./_generated/server"
import { WORKSPACE } from "./osLib"
import { localDay } from "./timeLib"
import { funnelCohort } from "./funnelCohort"
import { reconcileMoney } from "./moneyReconciliation"

// Cockpit Prospection — Score Santé Business + Heatmap Équipes.
// Source 100% réelle ; les seuils marqués "ajustable" sont des constantes à régler.
const EV_CONTACT = ["appele", "message_laisse", "pas_repondu", "repondu", "a_rappeler", "interesse"]
const EV_RESPONSE = ["repondu", "interesse"]
const EV_LOST = ["perdu", "negatif", "mauvais_numero", "non_qualifie"]
const TARGET_CPL = 30          // CHF — cible CPL pour le sous-score Publicité (ajustable)

// Prédicat objectif-auto (setter_tasks.metric) → eventType, identique à performance.ts.
function metricMatch(metric: string | undefined, eventType: string): boolean {
  switch (metric) {
    case "appels":   return EV_CONTACT.includes(eventType)
    case "messages": return eventType === "message_laisse"
    case "relances": return eventType === "a_rappeler"
    case "reponses": return EV_RESPONSE.includes(eventType)
    case "r1":       return eventType === "r1_booke"
    case "perdus":   return EV_LOST.includes(eventType)
    default:         return false
  }
}

type Status = "bon" | "surveillance" | "critique"
const statusUp = (actual: number, target: number): Status =>
  target <= 0 ? "surveillance" : actual >= target ? "bon" : actual >= target * 0.8 ? "surveillance" : "critique"
const statusDownLow = (actual: number, target: number): Status => // plus bas = mieux (CPL)
  actual <= 0 ? "surveillance" : actual <= target ? "bon" : actual <= target * 1.25 ? "surveillance" : "critique"

function shiftDate(d: string, days: number): string {
  const dt = new Date(d + "T00:00:00Z")
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function coreMetrics(ctx: any, from: string, to: string, tz?: number) {
  const dayOf = (iso: string) => localDay(iso, tz)
  const inWin = (iso?: string) => { if (!iso) return false; const d = dayOf(iso); return d >= from && d <= to }

  // Bornes d'index (period ± 2 jours pour le fuseau) → pas de scan full-table (limite Convex 8192).
  const shift = (d: string, days: number) => { const t = Date.parse(d + "T00:00:00Z"); return Number.isNaN(t) ? d : new Date(t + days * 86400000).toISOString().slice(0, 10) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = await ctx.db.query("prospection_events")
    .withIndex("by_workspace_created", (q: any) => q.eq("workspaceId", WORKSPACE).gte("createdAt", shift(from, -2)).lt("createdAt", shift(to, 3)))
    .collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evWin = events.filter((e: any) => { const d = dayOf(e.createdAt); return d >= from && d <= to })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const distinct = (pred: (e: any) => boolean) => new Set(evWin.filter(pred).map((e: any) => e.prospectionRecordId)).size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Contactés = leads RÉELLEMENT travaillés = distinct avec AU MOINS un événement (toute action),
  // identique au module Suivi Setting → réponses ⊆ contactés, taux de réponse ≤ 100%.
  const contactes = new Set(evWin.map((e: any) => e.prospectionRecordId)).size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Réponse = même définition que le module affiché (performance.summary) : répondu/intéressé + R1 booké (l'appel a eu lieu) + perdu « pas intéressé ».
  const reponses = distinct((e: any) => EV_RESPONSE.includes(e.eventType) || e.eventType === "r1_booke" || (e.eventType === "perdu" && e.notes === "pas_interesse"))
  const tauxReponse = contactes ? Math.min(100, Math.round((reponses / contactes) * 100)) : 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = await ctx.db.query("crm_contacts").collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLeads = await ctx.db.query("crm_leads").collect()
  // R1 / shows / no-shows / ventes : SOURCE UNIQUE = la cohorte du funnel (funnelCohort.ts).
  // Les anneaux/scorecards consomment exactement les mêmes valeurs que le funnel affiché :
  // plus de double moteur (events vs cohorte), plus de taux >100% à l'écran.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesCalls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
  const fc = funnelCohort(contacts, allLeads, from, to, dayOf, salesCalls)
  const r1Booked = fc.r1Booked, noShows = fc.noShows, shows = fc.shows, ventes = fc.ventes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients = await ctx.db.query("pipeline_clients").collect()
  // CA = ENCAISSÉ réel sur [from,to] (même source de vérité que Dashboard + Paiement),
  // pas le montant contracté (pipeline_clients.value) qui surévaluait le Score Santé.
  const obs = await ctx.db.query("onboarding").collect()
  const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
  const externalPayments = await ctx.db.query("external_payments").collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fxRows = await ctx.db.query("fx_rates").collect()
  const fxToChf: Record<string, number> = { chf: 1 }; for (const r of fxRows) fxToChf[r.currency] = r.rate
  const ca = reconcileMoney({ obs, clients, contacts, stripePayments, externalPayments, from, to, tzOffset: tz, fxToChf }).encaisse

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = await ctx.db.query("meta_daily").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md = meta.filter((m: any) => m.date >= from && m.date <= to)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sum = (k: string) => md.reduce((s: number, m: any) => s + (m[k] ?? 0), 0)
  const spend = sum("spend"), mleads = sum("leads"), impressions = sum("impressions"), clicks = sum("clicks")
  const cpl = mleads > 0 ? spend / mleads : 0
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

  // Complétion des objectifs auto du Cockpit Setter (setter_tasks) sur la fenêtre.
  // Signal de fatigue humaine : objectifs qui se remplissent = sain ; qui stagnent = fatigue.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = await ctx.db.query("setter_tasks").withIndex("by_workspace_date", (q: any) => q.eq("workspaceId", WORKSPACE).gte("date", from).lte("date", to)).collect()
  const groups = new Map<string, { metric: string; target: number }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of tasks.filter((t: any) => t.metric)) {
    const g = groups.get(t.title) ?? { metric: t.metric, target: 0 }
    g.target += t.targetNumber
    groups.set(t.title, g)
  }
  let totTarget = 0, totProgress = 0
  for (const g of groups.values()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progress = evWin.filter((e: any) => metricMatch(g.metric, e.eventType)).length
    totTarget += g.target
    totProgress += Math.min(progress, g.target)
  }
  const objCompletion = totTarget > 0 ? totProgress / totTarget : 1

  return {
    // Taux issus de la cohorte du funnel (bornés ≤100% par construction).
    leadsR1: fc.tauxLeadsR1,
    showRate: fc.tauxShow,
    tauxShowR2: fc.tauxShowR2,
    closeRate: fc.tauxClose,
    cpl, ctr, ca, objCompletion, spend,
    r1Booked, shows, noShows, ventes, mleads, contactes, reponses, tauxReponse,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function objectives(ctx: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = await ctx.db.query("prospection_objectives").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).first()
  return {
    leadsR1: doc?.leadsR1 ?? 50, tauxShow: doc?.tauxShow ?? 75, tauxShowR2: doc?.tauxShowR2 ?? 75,
    tauxClose: doc?.tauxClose ?? 30, tauxReponse: doc?.tauxReponse ?? 30, cpl: doc?.cpl ?? 30,
    ca: doc?.ca ?? 30000,
  }
}

// Score Santé Business /100 = moyenne pondérée de 4 sous-scores normalisés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeScore(m: any, obj: any): number {
  const clamp = (x: number) => Math.max(0, Math.min(100, x))
  // Un levier ne compte QUE s'il a de la vraie activité. Sinon il est EXCLU (jamais 100 « gratuit »)
  // et son poids est redistribué sur les leviers actifs. Aucune activité du tout → score 0.
  // 4 KPI, chacun = % de SON objectif (géré dans le bouton Objectif). Levier vide = exclu (poids redistribué).
  //  leads→R1 25% (actif si contactés>0) · taux réponse 25% (contactés>0) · closing 30% (R1>0) · CPL 20% inverse (dépense>0)
  const parts: { s: number; w: number }[] = []
  if ((m.contactes ?? 0) > 0) {
    parts.push({ s: clamp((m.leadsR1 / (obj.leadsR1 || 1)) * 100), w: 0.25 })          // taux conversion leads → R1
    parts.push({ s: clamp((m.tauxReponse / (obj.tauxReponse || 1)) * 100), w: 0.25 })  // taux de réponse
  }
  if ((m.r1Booked ?? 0) > 0) {
    parts.push({ s: clamp((m.closeRate / (obj.tauxClose || 1)) * 100), w: 0.30 })      // taux de closing
  }
  if ((m.spend ?? 0) > 0 && m.cpl > 0) {
    parts.push({ s: clamp(((obj.cpl || TARGET_CPL) / m.cpl) * 100), w: 0.20 })         // CPL (inverse : plus bas = mieux)
  }
  if (parts.length === 0) return 0
  const totalW = parts.reduce((s, p) => s + p.w, 0)
  return Math.round(parts.reduce((s, p) => s + p.s * (p.w / totalW), 0))
}

export const healthScore = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const m = await coreMetrics(ctx, a.from, a.to, a.tzOffset)
    const obj = await objectives(ctx)
    const score = computeScore(m, obj)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hist = (await ctx.db.query("prospection_health_history").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
      .sort((x: { date: string }, y: { date: string }) => x.date.localeCompare(y.date))
    const scoreAgo = (days: number): number | null => {
      const target = shiftDate(a.to, -days)
      let best: number | null = null
      for (const h of hist) if (h.date <= target) best = h.score
      return best
    }
    const ev7 = scoreAgo(7), ev30 = scoreAgo(30)
    return {
      score,
      showRate: Math.round(m.showRate * 10) / 10,
      closeRate: Math.round(m.closeRate * 10) / 10,
      cpl: Math.round(m.cpl),
      ca: Math.round(m.ca),
      ev7: ev7 != null ? score - ev7 : null,
      ev30: ev30 != null ? score - ev30 : null,
    }
  },
})

// Heatmap Équipes : Setters / Closers / Publicité × Performance / Fatigue / Qualité Leads.
export const heatmap = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const m = await coreMetrics(ctx, a.from, a.to, a.tzOffset)
    const obj = await objectives(ctx)
    // Fenêtre précédente (même durée) pour la creative fatigue (tendance CTR).
    const days = Math.max(1, Math.round((Date.parse(a.to) - Date.parse(a.from)) / 86400000) + 1)
    const prev = await coreMetrics(ctx, shiftDate(a.from, -days), shiftDate(a.from, -1), a.tzOffset)

    // Fatigue humaine = inverse de la complétion des objectifs auto du Cockpit Setter
    // (objectifs qui se remplissent vite = sain ; qui stagnent = fatigue).
    const humanFatigue: Status = m.objCompletion >= 0.9 ? "bon" : m.objCompletion >= 0.6 ? "surveillance" : "critique"
    // Fatigue Publicité = creative fatigue (baisse du CTR vs période précédente).
    const ctrFatigue: Status = prev.ctr <= 0 ? "surveillance"
      : m.ctr >= prev.ctr ? "bon" : m.ctr >= prev.ctr * 0.85 ? "surveillance" : "critique"

    return {
      setters:   { performance: statusUp(m.leadsR1, obj.leadsR1),    fatigue: humanFatigue, qualite: statusUp(m.showRate, obj.tauxShow) },
      closers:   { performance: statusUp(m.closeRate, obj.tauxClose), fatigue: humanFatigue, qualite: statusUp(m.closeRate, obj.tauxClose) },
      publicite: { performance: statusDownLow(m.cpl, TARGET_CPL),     fatigue: ctrFatigue,   qualite: statusUp(m.leadsR1, obj.leadsR1) },
    }
  },
})

// Scorecards par équipe : score /100 + KPI (valeur + tendance vs période préc.) + charge + diagnostic.
export const teamScorecards = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const m = await coreMetrics(ctx, a.from, a.to, a.tzOffset)
    const obj = await objectives(ctx)
    const days = Math.max(1, Math.round((Date.parse(a.to) - Date.parse(a.from)) / 86400000) + 1)
    const prev = await coreMetrics(ctx, shiftDate(a.from, -days), shiftDate(a.from, -1), a.tzOffset)

    const clampPct = (actual: number, target: number) => target > 0 ? Math.max(0, Math.min(100, (actual / target) * 100)) : 0
    const toneOf = (s: number): Status => s >= 75 ? "bon" : s >= 50 ? "surveillance" : "critique"
    const p1 = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",")
    // tendance "points" (plus haut = mieux)
    const dPts = (cur: number, pr: number) => { const d = Math.round((cur - pr) * 10) / 10; return { delta: `${d >= 0 ? "▲ +" : "▼ "}${p1(Math.abs(d))}`, deltaGood: d >= 0 } }
    // tendance CPL (plus bas = mieux)
    const dCpl = (cur: number, pr: number) => { const d = Math.round(cur - pr); return { delta: pr <= 0 ? null : `${d <= 0 ? "▼ " : "▲ +"}${Math.abs(d)} CHF`, deltaGood: d <= 0 } }

    // Scores cards = fonction des KPI AFFICHÉS de la card vs leurs objectifs (pas de formule figée).
    const avg = (...xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0
    // Setting : taux conversion leads→R1 + taux de réponse, chacun vs son objectif.
    // Aucune activité (0 lead contacté) = pas de données → N/A (null), jamais un score trompeur.
    const settersScore = m.contactes === 0 ? null : avg(clampPct(m.leadsR1, obj.leadsR1), clampPct(m.tauxReponse, obj.tauxReponse))
    const setters = {
      score: settersScore, tone: settersScore === null ? "vide" as const : toneOf(settersScore), charge: m.objCompletion,
      metrics: [
        { label: "Leads → R1", value: `${p1(m.leadsR1)}%`, ...dPts(m.leadsR1, prev.leadsR1) },
        { label: "Show-rate", value: `${p1(m.showRate)}%`, ...dPts(m.showRate, prev.showRate) },
      ],
      diagnostic: m.contactes === 0 ? `Pas encore d'activité de prospection cette période.`
        : m.leadsR1 < obj.leadsR1 ? `Trop peu de leads décrochent un rendez-vous, il faut pousser la prise de RDV.`
        : m.showRate < obj.tauxShow ? `Les rendez-vous sont pris, mais beaucoup de prospects ne se présentent pas.`
        : m.objCompletion < 0.6 ? `Les objectifs du jour prennent du retard, attention à la charge.`
        : `L'équipe tourne bien, les leads avancent comme il faut.`,
    }

    // Closing : taux de closing + taux de show R2 (le closer gère le R2), chacun vs son objectif.
    // Aucun R1 tenu = pas de matière à closer → N/A (null).
    const closersScore = m.r1Booked === 0 ? null : avg(clampPct(m.closeRate, obj.tauxClose), clampPct(m.tauxShowR2, obj.tauxShowR2))
    const closers = {
      score: closersScore, tone: closersScore === null ? "vide" as const : toneOf(closersScore), charge: m.objCompletion,
      metrics: [
        { label: "Taux de closing", value: `${p1(m.closeRate)}%`, ...dPts(m.closeRate, prev.closeRate) },
        { label: "Shows / No-shows", value: `${m.shows} / ${m.noShows}`, delta: null as string | null, deltaGood: true },
      ],
      diagnostic: m.r1Booked === 0 ? `Aucun rendez-vous tenu cette période.`
        : m.closeRate < obj.tauxClose ? `On signe trop peu après les rendez-vous, le closing est à renforcer.`
        : m.noShows > 0 ? `Le closing est correct, mais trop de prospects ne viennent pas au rendez-vous.`
        : m.r1Booked < 3 ? `Le closing fonctionne, mais il manque du volume de rendez-vous.`
        : `Le closing est solide, les ventes suivent.`,
    }

    // Media Buying : CPL vs objectif CPL (inverse : plus bas = mieux).
    // Pas de dépense = pas de données → N/A (null). Dépense MAIS 0 lead (cpl=0) = vraie contre-perf → 0 (critique).
    const pubScore = m.spend <= 0 ? null : (m.cpl > 0 ? Math.round(clampPct(obj.cpl || TARGET_CPL, m.cpl)) : 0)
    const publicite = {
      score: pubScore, tone: pubScore === null ? "vide" as const : toneOf(pubScore), charge: null as number | null,
      metrics: [
        { label: "CPL", value: `${Math.round(m.cpl).toLocaleString("fr-FR")} CHF`, ...dCpl(m.cpl, prev.cpl) },
        { label: "CTR", value: `${p1(m.ctr)}%`, ...dPts(m.ctr, prev.ctr) },
      ],
      diagnostic: m.spend <= 0 ? `Aucune publicité diffusée cette période.`
        : (m.mleads === 0) ? `Budget dépensé mais aucun lead généré, à corriger d'urgence.`
        : m.cpl > TARGET_CPL ? `La pub coûte trop cher pour ce qu'elle rapporte, à optimiser.`
        : (prev.ctr > 0 && m.ctr < prev.ctr * 0.85) ? `Les pubs s'essoufflent, il est temps de changer les visuels.`
        : `La pub tourne bien et ramène des leads au bon prix.`,
    }

    return { setters, closers, publicite }
  },
})

// Snapshot quotidien du Score Santé sur 30 jours glissants (cron) → Évolution 7j/30j.
export const snapshotHealth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const to = new Date().toISOString().slice(0, 10)
    const from = shiftDate(to, -29)
    const m = await coreMetrics(ctx, from, to, 0)
    const obj = await objectives(ctx)
    const score = computeScore(m, obj)
    const existing = await ctx.db.query("prospection_health_history")
      .withIndex("by_ws_date", (q) => q.eq("workspaceId", WORKSPACE).eq("date", to)).first()
    if (existing) await ctx.db.patch(existing._id, { score })
    else await ctx.db.insert("prospection_health_history", { workspaceId: WORKSPACE, date: to, score })
  },
})
