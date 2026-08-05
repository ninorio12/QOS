// Meta Ads via ZERNIO — remplace le token Meta direct (meta_connection, mort
// depuis des semaines) par la connexion Facebook portée par Zernio.
//
// Deux appels, deux rôles :
//   1. /v1/ads/insights (passthrough Meta VERBATIM, level=ad) : les métriques
//      brutes, mêmes champs que l'ancien appel Graph. Les formules d'élite du
//      board (hook rate = vues 3s / impressions, hold = thruplay / vues 3s,
//      CPA, ROAS) restent identiques au caractère près.
//   2. /v1/ads (liste normalisée Zernio) : nom, statut, campagne, adset et le
//      bloc `creative` (visuels), fusionnés par id d'ad Meta.
//
// Prérequis : un compte FACEBOOK connecté dans l'espace Zernio avec l'add-on
// ads (le lien de connexion se génère via /v1/connect/facebook/ads). Sans lui,
// on renvoie { connected: false } : le board affiche son état déconnecté,
// jamais de donnée fabriquée.
import { action, internalAction, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { WORKSPACE } from "./osLib"

const BASE = "https://zernio.com/api/v1"
const LEAD_ACTION_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "leadgen_grouped"]
const PURCHASE_TYPES = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]
const r2 = (n: number) => Math.round(n * 100) / 100

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function actionVal(arr: any[] | undefined, types: string[]): number {
  if (!Array.isArray(arr)) return 0
  for (const t of types) { const a = arr.find((x) => x.action_type === t); if (a) { const n = parseFloat(a.value); if (!isNaN(n)) return n } }
  return 0
}

/**
 * Appel avec réessais. Zernio répond `temporarily_unavailable` quand plusieurs
 * requêtes arrivent en même temps : sans réessai, la journée passait pour vide
 * et l'historique se remplissait de trous silencieux.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zgetRetry(path: string, query: Record<string, string | undefined>, tries = 4): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    const res = await zget(path, query)
    if (res && !res.error) return res
    await new Promise((r) => setTimeout(r, 400 * (i + 1)))
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zget(path: string, query: Record<string, string | undefined>): Promise<any | null> {
  const key = process.env.ZERNIO_API_KEY
  if (!key) return null
  const url = new URL(BASE + path)
  for (const [k, val] of Object.entries(query)) if (val) url.searchParams.set(k, val)
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${key}` } })
  const text = await res.text()
  if (!res.ok || text.startsWith("<")) return null
  try { return JSON.parse(text) } catch { return null }
}

/** Compte Facebook connecté chez Zernio + premier ad account Meta accessible. */
async function resolveMetaAds(): Promise<{ fbAccountId: string; adAccountId: string } | null> {
  const accounts = await zget("/accounts", {})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb = (accounts?.accounts ?? []).find((a: any) => a.platform === "facebook")
  if (!fb) return null
  // Choix de l'ad account : ZERNIO_META_AD_ACCOUNT (déterministe) d'abord.
  // L'espace de Jonathan en expose 15, dont un DÉSACTIVÉ en tête de liste :
  // « prendre le premier » aurait branché le board sur un compte mort.
  const pinned = process.env.ZERNIO_META_AD_ACCOUNT
  if (pinned) return { fbAccountId: fb._id, adAccountId: pinned.startsWith("act_") ? pinned : `act_${pinned}` }
  const ad = await zget("/ads/accounts", { accountId: fb._id })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = (ad?.accounts ?? []).filter((x: any) => x.selectable !== false && x.accountStatus === 1)
  // Heuristique de secours : le compte VividFlow non-backup, sinon le premier actif.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viv = list.filter((x: any) => /vividflow/i.test(x.name ?? "")).sort((a: any, b: any) => (a.name?.length ?? 99) - (b.name?.length ?? 99))[0]
  const chosen = viv ?? list[0]
  if (!chosen?.id) return null
  return { fbAccountId: fb._id, adAccountId: String(chosen.id) }
}

/**
 * Statut réel + visuels des publicités, via /v1/ads/tree.
 *
 * La liste /v1/ads ne renvoie plus rien depuis le 04/08 (0 ligne quels que
 * soient les paramètres) : le board héritait donc de statuts figés et ne savait
 * plus distinguer une pub coupée d'une pub en cours. L'arbre, lui, descend
 * campagne → adset → publicité avec le statut de chaque étage et le bloc
 * `creative`. Une pub n'est EN DIFFUSION que si les trois étages le sont : un
 * adset en pause laisse ses pubs à « active » côté Meta alors qu'elles ne
 * tournent plus (le cas exact des trois « Quiz » du 03/08).
 *
 * L'arbre ignore le filtre objectId : on garde nous-mêmes les campagnes de
 * l'ad account visé, sinon les campagnes d'autres comptes du Business
 * s'inviteraient dans le board.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAdTree(target: { fbAccountId: string; adAccountId: string }): Promise<Map<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map<string, any>()
  const tree = await zgetRetry("/ads/tree", { accountId: target.fbAccountId, objectId: target.adAccountId })
  const on = (s: unknown) => String(s ?? "").toLowerCase() === "active"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (tree?.campaigns ?? []) as any[]) {
    if (c.platformAdAccountId && c.platformAdAccountId !== target.adAccountId) continue
    const campOn = on(c.status ?? c.platformCampaignStatus)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (c.adSets ?? []) as any[]) {
      const setOn = on(s.status)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const ad of (s.ads ?? []) as any[]) {
        const adOn = on(ad.status ?? ad.configuredStatus)
        const pid = ad.platformAdId ?? ad._id
        if (!pid) continue
        byId.set(String(pid), {
          name: ad.name,
          // Statut EFFECTIF, dans le vocabulaire déjà stocké en base.
          status: adOn ? (setOn ? (campOn ? "ACTIVE" : "CAMPAIGN_PAUSED") : "ADSET_PAUSED") : "PAUSED",
          creative: ad.creative ?? {},
          effectiveObjectStoryId: (ad.creative ?? {}).effectiveObjectStoryId,
          campaign: c.campaignName, adset: s.adSetName,
          createdAt: ad.platformCreatedAt ?? ad.createdAt ?? null,
        })
      }
    }
  }
  return byId
}

function presetToRange(preset: string): { fromDate: string; toDate: string } {
  // Forme generique last_Nd : le board envoie 7/14/30, un backfill peut demander
  // 365. Inconnu = 14 jours, le defaut historique du module.
  const m = /^last_(\d+)d$/.exec(preset)
  const days = m ? Math.min(parseInt(m[1], 10), 730) : 14
  const to = new Date()
  const from = new Date(Date.now() - days * 86400_000)
  const d = (x: Date) => x.toISOString().slice(0, 10)
  return { fromDate: d(from), toDate: d(to) }
}

// Créas + insights via Zernio, MÊME forme de sortie que metaAds.creatives :
// le board et l'agent Media Buyer ne voient aucune différence de contrat.
export const creatives = internalAction({
  args: { datePreset: v.optional(v.string()), limit: v.optional(v.number()), activeOnly: v.optional(v.boolean()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (_ctx, a): Promise<any> => {
    const target = await resolveMetaAds()
    if (!target) return { connected: false, creatives: [] }
    const { fromDate, toDate } = presetToRange(a.datePreset ?? "last_14d")

    // 1. Métriques : passthrough insights, rows Meta verbatim au niveau ad.
    const fields = [
      "ad_id", "ad_name", "campaign_name", "adset_name",
      "spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "frequency",
      "inline_link_clicks", "actions", "action_values",
      "video_play_actions", "video_thruplay_watched_actions",
      "quality_ranking", "engagement_rate_ranking", "conversion_rate_ranking",
    ].join(",")
    const ins = await zget("/ads/insights", {
      accountId: target.fbAccountId,
      objectId: target.adAccountId,
      level: "ad",
      fields,
      fromDate,
      toDate,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = ins?.data ?? ins?.rows ?? []

    // 2. Visuels + statut EFFECTIF : arbre Zernio (campagne → adset → pub),
    //    indexé par id d'ad Meta. Repli sur l'ancienne liste /ads si l'arbre
    //    ne répond pas, pour ne jamais perdre les visuels.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let byPlatformId = await fetchAdTree(target)
    if (byPlatformId.size === 0) {
      const adsList = await zget("/ads", {
        accountId: target.fbAccountId,
        adAccountId: target.adAccountId,
        source: "all",
        fromDate,
        toDate,
        limit: String(Math.min(a.limit ?? 100, 200)),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      byPlatformId = new Map<string, any>()
      for (const ad of adsList?.ads ?? adsList?.data ?? []) {
        const pid = ad.platformAdId ?? ad.platform_ad_id ?? ad.id
        if (pid) byPlatformId.set(String(pid), ad)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = []
    for (const r of rows) {
      const meta = byPlatformId.get(String(r.ad_id))
      const status: string | null = meta?.status ?? meta?.effectiveStatus ?? null
      if (a.activeOnly === true && status && status !== "ACTIVE") continue
      const cr = meta?.creative ?? {}
      const imp = parseFloat(r.impressions ?? "0") || 0
      const spend = parseFloat(r.spend ?? "0") || 0
      const clicks = parseFloat(r.clicks ?? "0") || 0
      const v3 = actionVal(r.actions, ["video_view"]) || actionVal(r.video_play_actions, ["video_view"])
      const thru = actionVal(r.video_thruplay_watched_actions, ["video_view"])
      const leads = actionVal(r.actions, LEAD_ACTION_TYPES)
      const purchases = actionVal(r.actions, PURCHASE_TYPES)
      const revenue = actionVal(r.action_values, PURCHASE_TYPES)
      const linkClicks = parseFloat(r.inline_link_clicks ?? "0") || 0
      const results = purchases > 0 ? purchases : leads
      out.push({
        adId: String(r.ad_id), name: r.ad_name ?? meta?.name ?? "Sans nom",
        status: status ?? undefined,
        campaign: r.campaign_name ?? undefined, adset: r.adset_name ?? undefined,
        imageUrl: cr.imageUrl ?? cr.image_url ?? cr.thumbnailUrl ?? cr.thumbnail_url ?? null,
        thumbnailUrl: cr.thumbnailUrl ?? cr.thumbnail_url ?? null,
        videoSource: cr.videoUrl ?? cr.video_url ?? null,
        videoThumb: cr.videoThumbnailUrl ?? cr.video_thumbnail_url ?? null,
        // Zernio ne livre pas le fichier vidéo : on reconstruit le lien de la
        // publication (page Facebook + id vidéo, sinon le post d'origine), que
        // le board ouvre dans le lecteur Facebook intégré.
        videoLien:
          (cr.videoId ?? cr.video_id) && (cr.pageId ?? cr.page_id)
            ? `https://www.facebook.com/${cr.pageId ?? cr.page_id}/videos/${cr.videoId ?? cr.video_id}`
            : meta?.effectiveObjectStoryId
              ? `https://www.facebook.com/${String(meta.effectiveObjectStoryId).replace("_", "/posts/")}`
              : cr.permalinkUrl ?? cr.permalink_url ?? cr.instagramPermalinkUrl ?? cr.videoUrl ?? null,
        spend: r2(spend), impressions: imp,
        reach: parseFloat(r.reach ?? "0") || 0,
        ctr: parseFloat(r.ctr ?? "0") || 0,
        ctrOutbound: imp > 0 && linkClicks ? r2((linkClicks / imp) * 100) : null,
        cpm: imp > 0 ? r2(parseFloat(r.cpm ?? "0") || (spend / imp) * 1000) : null,
        frequency: r2(parseFloat(r.frequency ?? "0") || 0),
        hookRate: imp > 0 && v3 ? r2((v3 / imp) * 100) : null,
        holdRate: v3 && thru ? r2((thru / v3) * 100) : null,
        cvr: clicks > 0 && results ? r2((results / clicks) * 100) : null,
        leads, purchases, results, cpa: results > 0 ? r2(spend / results) : null,
        roas: revenue > 0 && spend > 0 ? r2(revenue / spend) : null,
        qualityRanking: r.quality_ranking ?? null,
        engagementRanking: r.engagement_rate_ranking ?? null,
        conversionRanking: r.conversion_rate_ranking ?? null,
      })
    }
    out.sort((x, y) => (y.spend ?? 0) - (x.spend ?? 0))
    return { connected: true, account: target.adAccountId, source: "zernio", datePreset: a.datePreset ?? "last_14d", count: out.length, creatives: out }
  },
})

/**
 * Séries journalières via Zernio → meta_daily + meta_object_daily.
 *
 * C'est CE chemin qui alimente les KPI, les courbes, le Top 10 et le tableau
 * Détail du board (meta_creatives ne sert qu'aux visuels de créas). L'ancien
 * `mediaBuyer.syncInsights` passait par le token Meta direct, mort depuis des
 * semaines : le board restait donc à zéro même avec Zernio connecté.
 */
/** Efface les lignes des journées listées, avant de réécrire ce qu'on vient de lire. */
export const _purgeDays = internalMutation({
  args: { days: v.array(v.string()) },
  handler: async (ctx, a) => {
    const set = new Set(a.days)
    for (const r of await ctx.db.query("meta_daily").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      if (set.has(r.date)) await ctx.db.delete(r._id)
    for (const r of await ctx.db.query("meta_object_daily").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      if (set.has(r.date)) await ctx.db.delete(r._id)
    return { purged: set.size }
  },
})

export const syncDaily = action({
  args: { days: v.optional(v.number()), from: v.optional(v.string()), to: v.optional(v.string()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, a): Promise<any> => {
    const target = await resolveMetaAds()
    if (!target) return { ok: false, error: "Aucun compte Facebook connecté chez Zernio." }

    // Zernio IGNORE time_increment : une requête par période renvoie UNE ligne
    // agrégée. Les séries journalières se reconstruisent donc jour par jour.
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const until = a.to ?? toISO(new Date())
    const since = a.from ?? toISO(new Date(Date.parse(until) - ((a.days ?? 30) - 1) * 86400_000))
    const days: string[] = []
    for (let t = Date.parse(since); t <= Date.parse(until); t += 86400_000) days.push(toISO(new Date(t)))
    if (days.length > 120) return { ok: false, error: "Fenêtre trop large : 120 jours maximum par passe." }

    const num = (x: unknown) => Math.round(Number(x ?? 0)) || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadsOf = (r: any) => Math.round(actionVal(r.actions, LEAD_ACTION_TYPES))
    const failed: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pull = async (level: string, fields: string, day: string): Promise<any[] | null> => {
      const res = await zgetRetry("/ads/insights", {
        accountId: target.fbAccountId, objectId: target.adAccountId,
        level, fields, fromDate: day, toDate: day,
      })
      if (!res) { failed.push(`${day}/${level}`); return null }
      return res.data ?? res.rows ?? []
    }

    const LEVELS_MAP = [
      { meta: "campaign", stored: "campaign" },
      { meta: "adset", stored: "adset" },
      { meta: "ad", stored: "creative" },
    ]
    const OBJ_FIELDS = "spend,impressions,clicks,actions,campaign_name,campaign_id,adset_name,adset_id,ad_name,ad_id"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daily: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = []

    // Deux jours en vol : au-delà, Zernio renvoie des erreurs temporaires.
    const ok: string[] = []
    for (let i = 0; i < days.length; i += 2) {
      const slice = days.slice(i, i + 2)
      await Promise.all(slice.map(async (day) => {
        const accRows = await pull("account", "spend,impressions,clicks,actions", day)
        if (accRows === null) return          // journée non obtenue : on n'y touche pas
        ok.push(day)
        for (const r of accRows) {
          const spend = num(parseFloat(r.spend ?? "0")), imp = num(r.impressions)
          if (spend === 0 && imp === 0) continue   // journée sans diffusion : pas de ligne vide
          daily.push({ date: day, spend, impressions: imp, clicks: num(r.clicks), leads: leadsOf(r) })
        }
        for (const { meta, stored } of LEVELS_MAP) {
          for (const r of (await pull(meta, OBJ_FIELDS, day)) ?? []) {
            const spend = num(parseFloat(r.spend ?? "0")), imp = num(r.impressions)
            if (spend === 0 && imp === 0) continue
            const objectId = meta === "campaign" ? r.campaign_id : meta === "adset" ? r.adset_id : r.ad_id
            const name = meta === "campaign" ? r.campaign_name : meta === "adset" ? r.adset_name : r.ad_name
            objects.push({
              level: stored, objectId: String(objectId ?? "?"), name: name ?? "(sans nom)",
              campaign: meta === "campaign" ? undefined : r.campaign_name ?? undefined,
              adset: meta === "ad" ? r.adset_name ?? undefined : undefined,
              date: day, spend, impressions: imp, clicks: num(r.clicks), leads: leadsOf(r),
            })
          }
        }
      }))
    }

    if (ok.length === 0) return { ok: false, error: "Aucune journée obtenue de Zernio", daily: 0, objects: 0, missed: failed.length }

    // On n'efface QUE les journées effectivement récupérées : un jour manqué
    // garde ses anciennes lignes au lieu d'être vidé par erreur.
    await ctx.runMutation(internal.zernioAds._purgeDays, { days: ok })
    await ctx.runMutation(internal.mediaBuyer._insertBatch, { daily, objects: [] })
    const CHUNK = 1000
    for (let i = 0; i < objects.length; i += CHUNK) {
      await ctx.runMutation(internal.mediaBuyer._insertBatch, { daily: [], objects: objects.slice(i, i + CHUNK) })
    }
    await ctx.runMutation(internal.mediaBuyer._touchSync, {})
    return { ok: true, source: "zernio", account: target.adAccountId, since, until, days: ok.length, missed: failed.length, daily: daily.length, objects: objects.length }
  },
})

/** Sync vers meta_creatives (mêmes lignes que l'ancien chemin, même upsert). */
export const syncCreatives = action({
  args: { datePreset: v.optional(v.string()), limit: v.optional(v.number()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, a): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await ctx.runAction(internal.zernioAds.creatives, { datePreset: a.datePreset, limit: a.limit, activeOnly: false })
    if (!res?.connected) return { connected: false, synced: 0 }
    let synced = 0
    for (const c of res.creatives ?? []) { await ctx.runMutation(internal.metaAds._upsertOne, c); synced++ }
    return { connected: true, synced, account: res.account, source: "zernio" }
  },
})
