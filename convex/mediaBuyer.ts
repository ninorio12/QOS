import { v } from "convex/values"
import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { WORKSPACE, requireAdmin, PROJECT_START_DATE } from "./osLib"

// Media Buyer — board de décision Meta. V1 : données alimentées par import CSV /
// saisie manuelle. Le verdict (scale / watch / kill) est recalculé à la lecture
// depuis des seuils (overridable par ligne via verdictOverride).

const TH = { targetRoas: 2.0, targetCpa: 60, freqMax: 3 }

function computeVerdict(m: any): "scale" | "watch" | "kill" {
  if (m.verdictOverride === "scale" || m.verdictOverride === "watch" || m.verdictOverride === "kill") return m.verdictOverride
  const roas = m.roas, cpa = m.cpa, freq = m.frequency
  if (roas != null) {
    if (roas < 1) return "kill"
    if (freq != null && freq >= TH.freqMax && roas < 1.5) return "kill"
    if (cpa != null && cpa > TH.targetCpa * 2) return "kill"
    if (roas >= TH.targetRoas && (cpa == null || cpa <= TH.targetCpa) && (freq == null || freq < 2.5)) return "scale"
  }
  return "watch"
}

// Board de décision LIVE : source = créas Meta réelles (table meta_creatives,
// synchronisée par metaAds.syncCreatives via cron). Plus aucune dépendance au seed.
// level 'creative' = 1 ligne/annonce ; 'adset'/'campaign' = agrégation.
const r10 = (n: number) => Math.round(n * 10) / 10
function wavg(rows: any[], key: string) {
  const w = rows.reduce((s, r) => s + (r.impressions ?? 0), 0)
  if (w <= 0) return null
  const v = rows.reduce((s, r) => s + (r[key] ?? 0) * (r.impressions ?? 0), 0) / w
  return r10(v)
}

export const board = query({
  args: { level: v.optional(v.string()) }, // défaut 'creative'
  handler: async (ctx, { level }) => {
    const lvl = level ?? "creative"
    const creatives = await ctx.db.query("meta_creatives")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()

    // Agrégation selon le niveau demandé.
    let rows: any[]
    if (lvl === "creative") {
      rows = creatives.map((r: any) => ({
        id: r._id, name: r.name, level: "creative",
        campaign: r.campaign, adset: r.adset, status: r.status, thumbUrl: r.imageUrl ?? r.thumbnailUrl,
        spend: r.spend ?? 0, impressions: r.impressions ?? 0, reach: r.reach,
        ctr: r.ctr, ctrOutbound: r.ctrOutbound, cpm: r.cpm, frequency: r.frequency,
        hookRate: r.hookRate, holdRate: r.holdRate, cvr: r.cvr,
        leads: r.leads ?? 0, purchases: r.purchases ?? 0, results: r.results ?? r.leads ?? 0,
        cpa: r.cpa, roas: r.roas,
        qualityRanking: r.qualityRanking, engagementRanking: r.engagementRanking, conversionRanking: r.conversionRanking,
      }))
    } else {
      const keyOf = (r: any) => (lvl === "adset" ? r.adset : r.campaign) ?? "(inconnu)"
      const groups = new Map<string, any[]>()
      for (const c of creatives) { const k = keyOf(c); (groups.get(k) ?? groups.set(k, []).get(k)!).push(c) }
      rows = [...groups.entries()].map(([name, g]) => {
        const spend = g.reduce((s, r) => s + (r.spend ?? 0), 0)
        const impressions = g.reduce((s, r) => s + (r.impressions ?? 0), 0)
        const results = g.reduce((s, r) => s + (r.results ?? r.leads ?? 0), 0)
        const revenue = g.reduce((s, r) => s + (r.roas ?? 0) * (r.spend ?? 0), 0)
        return {
          id: `${lvl}:${name}`, name, level: lvl,
          spend, impressions, results,
          leads: g.reduce((s, r) => s + (r.leads ?? 0), 0),
          purchases: g.reduce((s, r) => s + (r.purchases ?? 0), 0),
          ctr: wavg(g, "ctr"), ctrOutbound: wavg(g, "ctrOutbound"), cpm: wavg(g, "cpm"),
          frequency: wavg(g, "frequency"), hookRate: wavg(g, "hookRate"), holdRate: wavg(g, "holdRate"), cvr: wavg(g, "cvr"),
          cpa: results > 0 ? r10(spend / results) : null,
          roas: spend > 0 ? r10(revenue / spend) : null,
          count: g.length,
        }
      })
    }

    const enriched = rows
      .map((r) => ({ ...r, verdict: computeVerdict(r) }))
      .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))

    const spend = enriched.reduce((s, r) => s + (r.spend ?? 0), 0)
    const results = enriched.reduce((s, r) => s + (r.results ?? 0), 0)
    const roasAvg = spend > 0 ? enriched.reduce((s, r) => s + (r.roas ?? 0) * (r.spend ?? 0), 0) / spend : 0
    const counts = { scale: 0, watch: 0, kill: 0 } as Record<string, number>
    for (const r of enriched) counts[r.verdict]++

    return {
      rows: enriched,
      kpis: {
        spend: Math.round(spend),
        results,
        roasAvg: r10(roasAvg),
        cac: results > 0 ? Math.round(spend / results) : 0,
      },
      counts,
      thresholds: TH,
      source: "meta_creatives",
      empty: enriched.length === 0,
    }
  },
})

// Upsert d'une ligne (saisie manuelle / import). key = name+level (simple V1).
export const upsert = mutation({
  args: {
    id: v.optional(v.id("meta_ad_metrics")),
    level: v.string(), name: v.string(),
    campaign: v.optional(v.string()), adset: v.optional(v.string()), thumbUrl: v.optional(v.string()),
    periodFrom: v.optional(v.string()), periodTo: v.optional(v.string()),
    spend: v.number(), roas: v.optional(v.number()), cpa: v.optional(v.number()),
    ctr: v.optional(v.number()), hookRate: v.optional(v.number()), frequency: v.optional(v.number()),
    results: v.optional(v.number()), verdictOverride: v.optional(v.string()), source: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    const { id, ...fields } = a
    if (id) { await ctx.db.patch(id, { ...fields, updatedAt: now }); return { ok: true, id } }
    const newId = await ctx.db.insert("meta_ad_metrics", {
      workspaceId: WORKSPACE, active: true, createdAt: now, updatedAt: now, source: a.source ?? "manual", ...fields,
    })
    return { ok: true, id: newId }
  },
})

export const remove = mutation({
  args: { id: v.id("meta_ad_metrics") },
  handler: async (ctx, { id }) => { await ctx.db.patch(id, { active: false, updatedAt: new Date().toISOString() }); return { ok: true } },
})

// ───────────────────────── Meta Ads Dashboard ─────────────────────────
// Vue "performance publicitaire" : KPIs (Dépense, Impressions, Clics, Leads,
// CPL, CTR, CR) avec variance vs période précédente, séries pour les graphiques
// Évolution CPL & Leads générés, Top campagnes et détail par adset.
// Données : table meta_daily (séries) + meta_ad_metrics (lignes). V2 = sync API Meta.

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

// metrics dérivées d'agrégats bruts
function derive(d: { spend: number; impressions: number; clicks: number; leads: number }) {
  return {
    spend: Math.round(d.spend),
    impressions: Math.round(d.impressions),
    clicks: Math.round(d.clicks),
    leads: Math.round(d.leads),
    cpl: d.leads > 0 ? r2(d.spend / d.leads) : 0,
    ctr: d.impressions > 0 ? r2((d.clicks / d.impressions) * 100) : 0,
    cr: d.clicks > 0 ? r2((d.leads / d.clicks) * 100) : 0,
  }
}

// variance : { pct, dir, good }. lowerIsBetter => baisse = bon (ex. CPL).
function delta(cur: number, prev: number, lowerIsBetter = false) {
  if (prev <= 0) return null
  const pct = r1(((cur - prev) / prev) * 100)
  const dir = pct >= 0 ? "up" : "down"
  const good = lowerIsBetter ? pct < 0 : pct >= 0
  return { pct: Math.abs(pct), dir, good }
}

// helpers de dates (UTC, 'YYYY-MM-DD')
function todayISO() { return new Date().toISOString().slice(0, 10) }
function addDaysISO(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
function spanDaysISO(from: string, to: string) {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000) + 1
}

// Verdict de performance.
//
// Règle d'abord : on ne juge pas ce qu'on ne peut pas juger. Sous 5 leads, un
// CPL ne veut rien dire (un premier lead à 12 CHF ne prouve pas plus qu'un
// premier à 80), et l'ancien seuil nu envoyait toute campagne fraîche dans
// « À optimiser » puisqu'un CPL de 0 ne passait aucune borne. Une campagne qui
// démarre est donc EN APPRENTISSAGE, sans note.
//
// La suite (CPL cible dérivé de la valeur réelle d'un lead, verdict « à couper »
// quand la dépense dépasse plusieurs fois ce CPL sans un seul lead) est en
// attente : elle demande de fixer ce CPL cible. Les bornes 25/35 restent donc
// telles quelles au-delà du seuil d'apprentissage.
const MIN_LEADS_POUR_JUGER = 5
const perfOf = (cpl: number, leads: number) =>
  leads < MIN_LEADS_POUR_JUGER ? "apprentissage"
  : cpl > 0 && cpl <= 25 ? "excellent"
  : cpl > 0 && cpl <= 35 ? "moyen"
  : "optimiser"

// Parcours d'une campagne : la table os_campaign_funnels prime, sinon le nom
// décide (même philosophie que les formulaires Meta). Pas de correspondance =
// campagne hors parcours : elle ne compte dans AUCUN onglet filtré.
function guessCampaignFunnel(name: string | null | undefined): string | null {
  const n = (name ?? "").toLowerCase()
  if (!n) return null
  if (/vsl/.test(n)) return "vsl"
  if (/quiz/.test(n)) return "quiz"
  if (/linkedin/.test(n)) return "linkedin"
  if (/insta|abonn|follow|profil/.test(n)) return "instagram"
  return null
}

/** Correspondances campagne → parcours (pour l'écran de réglage et l'agent). */
export const campaignFunnels = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("os_campaign_funnels").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect(),
})

export const mapCampaign = mutation({
  args: { campaignId: v.string(), campaignName: v.optional(v.string()), funnel: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    const existing = await ctx.db.query("os_campaign_funnels").withIndex("by_campaign", (q) => q.eq("campaignId", a.campaignId)).first()
    if (existing) await ctx.db.patch(existing._id, { funnel: a.funnel, campaignName: a.campaignName ?? existing.campaignName, updatedAt: new Date().toISOString() })
    else await ctx.db.insert("os_campaign_funnels", { workspaceId: WORKSPACE, campaignId: a.campaignId, campaignName: a.campaignName, funnel: a.funnel, updatedAt: new Date().toISOString() })
    return { ok: true }
  },
})

/**
 * Filtre par parcours : on repart des lignes JOURNALIÈRES par campagne
 * (meta_object_daily), seules capables d'être découpées, au lieu du total
 * compte (meta_daily). Campagnes retenues : correspondance en table, sinon nom.
 * Réutilisé par le dashboard ET par les scorecards du cockpit Performance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function funnelCampaignFilter(ctx: any, funnel: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappings = await ctx.db.query("os_campaign_funnels").withIndex("by_ws", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map<string, string>(mappings.map((m: any) => [m.campaignId, m.funnel]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campRows = await ctx.db.query("meta_object_daily")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_ws_level_date", (q: any) => q.eq("workspaceId", WORKSPACE).eq("level", "campaign")).collect()
  const allowedCampaignIds = new Set<string>(), allowedCampaignNames = new Set<string>()
  for (const r of campRows) {
    const f = byId.get(r.objectId) ?? guessCampaignFunnel(r.name)
    if (f === funnel) { allowedCampaignIds.add(r.objectId); allowedCampaignNames.add(r.name) }
  }
  // Totaux journaliers du PARCOURS : somme des campagnes retenues, par date.
  const byDate = new Map<string, { date: string; spend: number; impressions: number; clicks: number; leads: number }>()
  for (const r of campRows) {
    if (!allowedCampaignIds.has(r.objectId)) continue
    const g = byDate.get(r.date) ?? { date: r.date, spend: 0, impressions: 0, clicks: 0, leads: 0 }
    g.spend += r.spend; g.impressions += r.impressions; g.clicks += r.clicks; g.leads += r.leads
    byDate.set(r.date, g)
  }
  const funnelDaily = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
  // Dates réellement couvertes au niveau campagne : les tableaux adset/créa sont
  // restreints à ces jours, sinon un sous-ensemble affiché dépasse son total
  // (jours synchronisés à un niveau et pas à l'autre — audit tribunal 2026-08-02).
  const funnelDates = new Set(byDate.keys())
  return { allowedCampaignIds, allowedCampaignNames, funnelDaily, funnelDates }
}

export const dashboard = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()), days: v.optional(v.number()), level: v.optional(v.string()), funnel: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const lvl = args.level ?? "campaign"

    let allowedCampaignIds: Set<string> | null = null
    let allowedCampaignNames: Set<string> | null = null
    let funnelDaily: { date: string; spend: number; impressions: number; clicks: number; leads: number }[] | null = null
    let funnelDates: Set<string> | null = null
    if (args.funnel) {
      const flt = await funnelCampaignFilter(ctx, args.funnel)
      allowedCampaignIds = flt.allowedCampaignIds
      allowedCampaignNames = flt.allowedCampaignNames
      funnelDaily = flt.funnelDaily
      funnelDates = flt.funnelDates
    }

    const conn = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()

    // Le départ projet borne la vue PAR DÉFAUT (comme iClosed) : il n'a jamais eu
    // vocation à masquer une période que l'utilisateur choisit lui-même au
    // calendrier. Dès qu'un `from` explicite arrive, on montre l'historique réel.
    // ⚠️ Le plancher borne la vue PAR DÉFAUT seulement. Il ne doit jamais couper
    // la période PRÉCÉDENTE (qui est, par construction, avant `from`) : sinon les
    // variations « vs période précédente » sont toujours vides dès qu'on choisit
    // une période au calendrier (audit tribunal 2026-08-02).
    const floor = args.from ? "0000-00-00" : PROJECT_START_DATE
    // Vue parcours : les totaux journaliers du parcours remplacent le total compte.
    const dailyAll = (funnelDaily ?? (await ctx.db.query("meta_daily")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()))
      .filter(d => d.date >= floor)
      .sort((a, b) => (a.date < b.date ? -1 : 1))

    // fenêtre de dates : from/to explicites (calendrier) sinon les `days` derniers jours
    const win = args.days ?? 7
    const to = args.to ?? (dailyAll[dailyAll.length - 1]?.date ?? todayISO())
    const from = args.from ?? addDaysISO(to, -(win - 1))
    const span = spanDaysISO(from, to)
    const prevTo = addDaysISO(from, -1)
    const prevFrom = addDaysISO(prevTo, -(span - 1))
    const inRange = (d: string, a: string, b: string) => d >= a && d <= b

    const curDaily = dailyAll.filter(d => inRange(d.date, from, to))
    const prevDaily = dailyAll.filter(d => inRange(d.date, prevFrom, prevTo))
    const agg = (rows: typeof dailyAll) => ({
      spend: rows.reduce((s, r) => s + r.spend, 0),
      impressions: rows.reduce((s, r) => s + r.impressions, 0),
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      leads: rows.reduce((s, r) => s + r.leads, 0),
    })
    const c = derive(agg(curDaily)), p = derive(agg(prevDaily))

    const kpis = {
      spend:       { value: c.spend,       delta: delta(c.spend, p.spend) },
      impressions: { value: c.impressions, delta: delta(c.impressions, p.impressions) },
      clicks:      { value: c.clicks,      delta: delta(c.clicks, p.clicks) },
      leads:       { value: c.leads,       delta: delta(c.leads, p.leads) },
      cpl:         { value: c.cpl,         delta: delta(c.cpl, p.cpl, true) },
      ctr:         { value: c.ctr,         delta: delta(c.ctr, p.ctr) },
      cr:          { value: c.cr,          delta: delta(c.cr, p.cr) },
    }

    const series = curDaily.map(d => ({
      date: d.date.slice(5),            // MM-DD
      cpl: d.leads > 0 ? r2(d.spend / d.leads) : 0,
      leads: Math.round(d.leads),
    }))

    // agrégation des objets (meta_object_daily) sur la fenêtre, regroupée par objectId
    const aggObjects = async (level: string) => {
      const rows = (await ctx.db.query("meta_object_daily")
        .withIndex("by_ws_level_date", q => q.eq("workspaceId", WORKSPACE).eq("level", level)).collect())
        .filter(r => r.date >= floor && inRange(r.date, from, to))
        // Vue parcours : campagnes retenues seulement (par id au niveau campagne,
        // par nom de campagne aux niveaux adset/publicité).
        .filter(r => !allowedCampaignIds
          || (level === "campaign" ? allowedCampaignIds.has(r.objectId) : allowedCampaignNames!.has(r.campaign ?? "")))
        // Vue parcours : mêmes JOURS que les KPI (niveau campagne), pour que le
        // détail ne dépasse jamais le total affiché juste au-dessus.
        .filter(r => !funnelDates || funnelDates.has(r.date))
      // Première et dernière journée de diffusion : deux publicités peuvent
      // porter le MÊME nom (« Quiz 1 » relancé dans un nouvel adset). Sans ces
      // dates, le tableau affiche deux lignes jumelles et rien ne dit laquelle
      // tourne encore.
      const byId = new Map<string, { id: string; name: string; campaign: string | null; adset: string | null; spend: number; impressions: number; clicks: number; leads: number; premiereDiffusion: string; derniereDiffusion: string }>()
      for (const r of rows) {
        const g = byId.get(r.objectId) ?? { id: r.objectId, name: r.name, campaign: r.campaign ?? null, adset: r.adset ?? null, spend: 0, impressions: 0, clicks: 0, leads: 0, premiereDiffusion: r.date, derniereDiffusion: r.date }
        g.spend += r.spend; g.impressions += r.impressions; g.clicks += r.clicks; g.leads += r.leads; g.name = r.name
        if (r.date < g.premiereDiffusion) g.premiereDiffusion = r.date
        if (r.date > g.derniereDiffusion) g.derniereDiffusion = r.date
        byId.set(r.objectId, g)
      }
      return [...byId.values()].map(g => {
        const m = derive(g)
        return { id: g.id, name: g.name, campaign: g.campaign, adset: g.adset, ...m, perf: perfOf(m.cpl, g.leads), premiereDiffusion: g.premiereDiffusion, derniereDiffusion: g.derniereDiffusion }
      }).sort((a, b) => b.spend - a.spend)
    }

    // Détail niveau "publicité" : métriques PÉRIODE-CORRECTES (meta_object_daily level "creative",
    // filtré [from,to] via aggObjects, comme campagne/adset) + visuels (image/vidéo) greffés depuis
    // meta_creatives par adId. Avant : on lisait meta_creatives (snapshot figé 14j) sans filtre date
    // → le tableau « Publicité » montrait une autre fenêtre que les KPI et ne réconciliait jamais (bug C3).
    const creativeDetail = async () => {
      const dernierJourDonnees = dailyAll[dailyAll.length - 1]?.date ?? null
      const metrics = await aggObjects("creative")   // période-correct, déjà agrégé + dérivé + trié par spend
      const creatives = await ctx.db.query("meta_creatives")
        .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
      const visById = new Map(creatives.map(c => [c.adId, c]))
      return metrics.map(m => {
        const v = visById.get(m.id)
        return {
          ...m,
          // Statut de diffusion : le statut effectif Meta quand on l'a (il tient
          // compte de l'adset et de la campagne), sinon la dernière journée de
          // diffusion connue. Une pub qui n'a rien dépensé le dernier jour
          // synchronisé est arrêtée, pas « en cours mais discrète ».
          statut: v?.status ?? null,
          enCours: v?.status ? v.status === "ACTIVE" : m.derniereDiffusion >= (dernierJourDonnees ?? m.derniereDiffusion),
          imageUrl: v?.imageUrl ?? null, thumbnailUrl: v?.thumbnailUrl ?? null,
          videoSource: v?.videoSource ?? null, videoThumb: v?.videoThumb ?? null,
        videoLien: v?.videoLien ?? null,
        tempsMoyenVideo: v?.tempsMoyenVideo ?? null, tauxCompletion: v?.tauxCompletion ?? null,
        }
      })
    }

    const topCampaigns = (await aggObjects("campaign")).slice(0, 10)
    const detail = lvl === "creative" ? await creativeDetail() : await aggObjects(lvl)

    return {
      from, to, level: lvl,
      connected: !!conn,
      currency: conn?.currency ?? "CHF",
      lastSyncAt: conn?.lastSyncAt ?? null,
      kpis, series, topCampaigns, detail,
    }
  },
})

// Seed démo (jusqu'à la connexion API Meta). Branché sur le bouton "Sync Meta".
// ⚠️ INTERNE (audit tribunal 2026-08-02) : cette mutation injecte des données
// FICTIVES dans meta_daily. Publique, n'importe qui pouvait fabriquer les KPI
// du Media Buying. Réservée aux appels serveur.
export const seedDashboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date()
    const iso = now.toISOString()
    // purge ancien seed
    for (const t of ["meta_daily", "meta_ad_metrics"] as const) {
      const old = await ctx.db.query(t).withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
      for (const d of old) if ((d as any).source === "seed") await ctx.db.delete(d._id)
    }
    // 28 jours avec légère tendance haussière (=> variances positives)
    for (let i = 27; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000)
      const date = day.toISOString().slice(0, 10)
      const t = (27 - i) / 27                  // 0→1 progression
      const wave = 0.85 + 0.3 * Math.abs(Math.sin(i * 1.1))
      const impressions = Math.round((26000 + 9000 * t) * wave)
      const clicks = Math.round(impressions * (0.021 + 0.004 * t))
      const leads = Math.round(clicks * (0.024 + 0.004 * t))
      const spend = Math.round(leads * (28 - 5 * t))   // CPL qui baisse avec le temps
      await ctx.db.insert("meta_daily", { workspaceId: WORKSPACE, date, spend, impressions, clicks, leads, source: "seed", createdAt: iso })
    }
    // campagnes + adsets démo
    const camps = [
      { name: "Lead Gen – CH Romandie", adset: "Dirigeants 35-55", spend: 4210, impressions: 312400, clicks: 7120, leads: 198 },
      { name: "Retargeting Site",        adset: "Visiteurs 30j",   spend: 2980, impressions: 148900, clicks: 4010, leads: 142 },
      { name: "Notoriété – Suisse",      adset: "Large 25-60",     spend: 3100, impressions: 268300, clicks: 5240, leads: 96 },
      { name: "Lookalike 1%",            adset: "LAL Leads",       spend: 2190, impressions: 112530, clicks: 2572, leads: 50 },
    ]
    for (const c of camps) {
      await ctx.db.insert("meta_ad_metrics", { workspaceId: WORKSPACE, level: "campaign", name: c.name, adset: c.adset, spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads, active: true, source: "seed", createdAt: iso, updatedAt: iso })
      await ctx.db.insert("meta_ad_metrics", { workspaceId: WORKSPACE, level: "adset", name: c.adset, campaign: c.name, spend: Math.round(c.spend * 0.62), impressions: Math.round(c.impressions * 0.6), clicks: Math.round(c.clicks * 0.6), leads: Math.round(c.leads * 0.61), active: true, source: "seed", createdAt: iso, updatedAt: iso })
    }
    return { ok: true }
  },
})

// ─── Connexion compte Meta Business (chip du header) ───────────────
export const connectionStatus = query({
  args: {},
  returns: v.object({
    connected:   v.boolean(),
    accountId:   v.union(v.string(), v.null()),
    accountName: v.union(v.string(), v.null()),
    lastSyncAt:  v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const c = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    return {
      connected:   !!c,
      accountId:   c?.accountId ?? null,
      accountName: c?.accountName ?? null,
      lastSyncAt:  c?.lastSyncAt ?? null,
    }
  },
})

export const connect = mutation({
  args: { accountId: v.string(), accountName: v.optional(v.string()), token: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    const iso = new Date().toISOString()
    const existing = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    const fields = { accountId: a.accountId.trim(), accountName: a.accountName?.trim() || undefined, token: a.token.trim() }
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert("meta_connection", { workspaceId: WORKSPACE, connectedAt: iso, ...fields })
    return { ok: true }
  },
})

export const disconnect = mutation({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const c = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (c) await ctx.db.delete(c._id)
    return { ok: true }
  },
})

// Résumé compact pour la card Meta Ads du dashboard principal.
export const summary = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()), days: v.optional(v.number()) },
  returns: v.object({
    connected: v.boolean(), currency: v.string(), lastSyncAt: v.union(v.string(), v.null()),
    spend: v.number(), leads: v.number(), cpl: v.number(),
  }),
  handler: async (ctx, args) => {
    const conn = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    const dailyAll = (await ctx.db.query("meta_daily")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const win = args.days ?? 30
    const to = args.to ?? (dailyAll[dailyAll.length - 1]?.date ?? todayISO())
    const from = args.from ?? addDaysISO(to, -(win - 1))
    // Jour 1 du projet : on ignore les dépenses Meta d'anciens projets (avant la date de départ).
    const start = from > PROJECT_START_DATE ? from : PROJECT_START_DATE
    const rows = dailyAll.filter(d => d.date >= start && d.date <= to)
    const spend = rows.reduce((s, r) => s + r.spend, 0)
    const leads = rows.reduce((s, r) => s + r.leads, 0)
    return {
      connected: !!conn,
      currency: conn?.currency ?? "CHF",
      lastSyncAt: conn?.lastSyncAt ?? null,
      spend: Math.round(spend), leads: Math.round(leads),
      cpl: leads > 0 ? r2(spend / leads) : 0,
    }
  },
})

// Liste des contacts INBOUND issus des formulaires Meta (tag « Meta Ads »),
// alimentée par le webhook leadgen → affichée depuis la card Leads du module.
export const metaInboundContacts = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(), name: v.string(),
    email: v.union(v.string(), v.null()), phone: v.union(v.string(), v.null()),
    company: v.union(v.string(), v.null()), statut: v.union(v.string(), v.null()),
    createdAt: v.string(),
    // true = soumission de test conservée pour expliquer l'écart avec le
    // compteur Meta. Pas de fiche derrière : la ligne n'est pas cliquable.
    test: v.boolean(),
  })),
  handler: async (ctx) => {
    const all = await ctx.db.query("crm_contacts").collect()
    // Le tag « Meta Ads » vient de l'ANCIENNE intégration Meta. L'ingestion
    // actuelle (webhook leadgen via Zernio, convex/leadIngest.ts) étiquette
    // « origine:facebook », donc ce filtre ne trouvait plus aucun lead : la
    // liste restait vide alors que les leads arrivaient bien. On accepte les
    // deux, l'ancien pour l'historique, le nouveau pour ce qui entre aujourd'hui.
    const contacts = all
      .filter(c => {
        const tags = c.tags ?? []
        return tags.includes("Meta Ads") || tags.includes("origine:facebook")
      })
      .map(c => ({
        id: String(c._id),
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Lead",
        email: c.email ?? null, phone: c.phone ?? null,
        company: c.companyName ?? null, statut: c.statut ?? null,
        createdAt: c.createdAt,
        test: false,
      }))

    // Soumissions de TEST : gardées hors CRM (aucun contact, aucun lead) mais
    // affichées ici, marquées, pour que la liste raconte la même histoire que
    // le compteur Meta. Voir la règle « marquer plutôt que supprimer ».
    const tests = (await ctx.db
      .query("os_lead_journey")
      .withIndex("by_ws", q => q.eq("workspaceId", WORKSPACE))
      .collect())
      .filter(j => j.isTest)
      .map(j => ({
        id: String(j._id),
        name: j.name ?? "Lead",
        email: j.email ?? null, phone: j.phone ?? null,
        company: null, statut: null,
        createdAt: j.createdAt,
        test: true,
      }))

    return [...contacts, ...tests]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 200)
  },
})

// Purge des données de démonstration (seed) — état propre avant connexion réelle.
export const purgeDemo = mutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx) => {
    let removed = 0
    for (const t of ["meta_daily", "meta_object_daily", "meta_ad_metrics"] as const) {
      for (const r of await ctx.db.query(t).withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()) {
        if ((r as any).source === "seed") { await ctx.db.delete(r._id); removed++ }
      }
    }
    return { removed }
  },
})

// ───────────────────── Ingestion Graph API (Meta Insights) ─────────────────────
// V2 : remplace le seed. À chaque sync (bouton + cron horaire), on lit les insights
// du compte connecté (time_increment=1) et on remplit meta_daily + meta_object_daily.
const META_API_VERSION = "v21.0"
const GRAPH = "https://graph.facebook.com"
// `leads` n'est PAS un champ natif : il vient de `actions[]`. Priorité pour éviter le double comptage.
const LEAD_ACTION_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "leadgen_grouped"]

function leadsFromActions(actions?: { action_type: string; value: string }[]) {
  if (!Array.isArray(actions)) return 0
  for (const t of LEAD_ACTION_TYPES) {
    const a = actions.find(x => x.action_type === t)
    if (a) { const n = parseFloat(a.value); if (!isNaN(n)) return Math.round(n) }
  }
  return 0
}

async function fetchInsights(act: string, token: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, access_token: token, limit: "500" })
  let url: string | null = `${GRAPH}/${META_API_VERSION}/${act}/insights?${qs.toString()}`
  const out: any[] = []
  for (let i = 0; i < 100 && url; i++) {
    const res = await fetch(url)
    const json: any = await res.json()
    if (json.error) throw new Error(`Meta API: ${json.error.message ?? "erreur"}`)
    if (Array.isArray(json.data)) out.push(...json.data)
    url = json.paging?.next ?? null
  }
  return out
}

/**
 * Horodate la connexion après une passe Zernio réussie.
 *
 * `lastSyncAt` n'était écrit que par l'ancien chemin Meta direct (mort) : le
 * board annonçait donc une synchro vieille de plusieurs jours alors que les
 * chiffres du jour étaient déjà là. Le sync Zernio le pose désormais lui-même.
 */
export const _touchSync = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (conn) await ctx.db.patch(conn._id, { lastSyncAt: new Date().toISOString() })
    return { ok: !!conn }
  },
})

// Lecture privée de la connexion (token inclus — jamais exposé au client).
export const _connection = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("meta_connection")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
  },
})

// Vérifie qu'un clerkUserId correspond à un admin (utilisé par syncInsights, une action sans ctx.db direct).
export const _isAdmin = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db.query("users").withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId)).first()
    return !!user && user.role === "admin"
  },
})

// Purge de la fenêtre (meta-api + reliquat seed) + maj méta de la connexion.
// Séparé de l'insert pour borner chaque transaction (limites Convex : 8192/array).
export const _purgeWindow = internalMutation({
  args: { since: v.string(), until: v.string(), currency: v.optional(v.string()), accountStatus: v.optional(v.number()), timezone: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const iso = new Date().toISOString()
    const inWin = (d: string) => d >= a.since && d <= a.until
    for (const r of await ctx.db.query("meta_daily").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()) {
      if (r.source === "seed" || (r.source === "meta-api" && inWin(r.date))) await ctx.db.delete(r._id)
    }
    for (const r of await ctx.db.query("meta_object_daily").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()) {
      if (r.source === "seed" || (r.source === "meta-api" && inWin(r.date))) await ctx.db.delete(r._id)
    }
    const conn = await ctx.db.query("meta_connection").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (conn) await ctx.db.patch(conn._id, {
      lastSyncAt: iso,
      ...(a.currency ? { currency: a.currency } : {}),
      ...(a.accountStatus != null ? { accountStatus: a.accountStatus } : {}),
      ...(a.timezone ? { timezone: a.timezone } : {}),
    })
    return { ok: true }
  },
})

// Insert d'un lot (appelé par chunks de ≤1000 depuis l'action → jamais de dépassement de limite).
export const _insertBatch = internalMutation({
  args: {
    daily: v.array(v.object({ date: v.string(), spend: v.number(), impressions: v.number(), clicks: v.number(), leads: v.number() })),
    objects: v.array(v.object({ level: v.string(), objectId: v.string(), name: v.string(), campaign: v.optional(v.string()), adset: v.optional(v.string()), date: v.string(), spend: v.number(), impressions: v.number(), clicks: v.number(), leads: v.number() })),
  },
  handler: async (ctx, a) => {
    const iso = new Date().toISOString()
    for (const d of a.daily) await ctx.db.insert("meta_daily", { workspaceId: WORKSPACE, ...d, source: "meta-api", createdAt: iso })
    for (const o of a.objects) await ctx.db.insert("meta_object_daily", { workspaceId: WORKSPACE, ...o, source: "meta-api", createdAt: iso })
    return { ok: true }
  },
})

// Action publique : synchronise les insights du compte connecté (bouton + cron).
export const syncInsights = action({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }): Promise<{ ok: boolean; error?: string; daily?: number; objects?: number; currency?: string }> => {
    // Sécurité : si déclenché par un utilisateur (UI), exiger admin. Le cron (sans identité) passe librement.
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      const isAdmin = await ctx.runQuery(internal.mediaBuyer._isAdmin, { clerkUserId: identity.subject })
      if (!isAdmin) return { ok: false, error: "Action réservée aux administrateurs." }
    }
    const conn = await ctx.runQuery(internal.mediaBuyer._connection, {})
    if (!conn) return { ok: false, error: "Aucun compte Meta connecté." }
    const token = conn.token
    let act = conn.accountId.trim()
    if (!act.startsWith("act_")) act = `act_${act.replace(/^act_?/, "")}`

    const until = todayISO()
    const since = addDaysISO(until, -((days ?? 90) - 1))
    const timeRange = JSON.stringify({ since, until })

    try {
      // infos compte (devise / statut / timezone)
      const accRes = await fetch(`${GRAPH}/${META_API_VERSION}/${act}?fields=currency,account_status,timezone_name&access_token=${encodeURIComponent(token)}`)
      const acc: any = await accRes.json()
      if (acc.error) return { ok: false, error: `Meta API: ${acc.error.message ?? "compte inaccessible"}` }
      const currency: string | undefined = acc.currency
      const accountStatus: number | undefined = acc.account_status
      const timezone: string | undefined = acc.timezone_name

      // séries journalières au niveau compte
      const accountRows = await fetchInsights(act, token, { level: "account", fields: "spend,impressions,clicks,actions", time_increment: "1", time_range: timeRange })
      const daily = accountRows.map((r: any) => ({
        date: r.date_start,
        spend: Math.round(parseFloat(r.spend ?? "0")),
        impressions: Math.round(Number(r.impressions ?? 0)),
        clicks: Math.round(Number(r.clicks ?? 0)),
        leads: leadsFromActions(r.actions),
      }))

      // insights par objet et par jour (campaign / adset / ad→creative)
      const LEVELS_MAP = [
        { meta: "campaign", stored: "campaign" },
        { meta: "adset", stored: "adset" },
        { meta: "ad", stored: "creative" },
      ]
      const objects: any[] = []
      for (const { meta, stored } of LEVELS_MAP) {
        const rows = await fetchInsights(act, token, {
          level: meta,
          fields: "spend,impressions,clicks,actions,campaign_name,campaign_id,adset_name,adset_id,ad_name,ad_id",
          time_increment: "1", time_range: timeRange,
        })
        for (const r of rows) {
          const objectId = meta === "campaign" ? r.campaign_id : meta === "adset" ? r.adset_id : r.ad_id
          const name = meta === "campaign" ? r.campaign_name : meta === "adset" ? r.adset_name : r.ad_name
          objects.push({
            level: stored,
            objectId: objectId ?? "?",
            name: name ?? "(sans nom)",
            campaign: meta === "campaign" ? undefined : r.campaign_name,
            adset: meta === "ad" ? r.adset_name : undefined,
            date: r.date_start,
            spend: Math.round(parseFloat(r.spend ?? "0")),
            impressions: Math.round(Number(r.impressions ?? 0)),
            clicks: Math.round(Number(r.clicks ?? 0)),
            leads: leadsFromActions(r.actions),
          })
        }
      }

      // Purge (1 transaction) puis insertions par lots de 1000 (sous la limite Convex 8192/array).
      await ctx.runMutation(internal.mediaBuyer._purgeWindow, { since, until, currency, accountStatus, timezone })
      await ctx.runMutation(internal.mediaBuyer._insertBatch, { daily, objects: [] })
      const CHUNK = 1000
      for (let i = 0; i < objects.length; i += CHUNK) {
        await ctx.runMutation(internal.mediaBuyer._insertBatch, { daily: [], objects: objects.slice(i, i + CHUNK) })
      }
      return { ok: true, daily: daily.length, objects: objects.length, currency }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Erreur de synchronisation Meta" }
    }
  },
})
