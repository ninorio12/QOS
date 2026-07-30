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
import { action, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

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

    // 2. Visuels + statut : liste normalisée Zernio, indexée par id d'ad Meta.
    const adsList = await zget("/ads", {
      accountId: target.fbAccountId,
      adAccountId: target.adAccountId,
      source: "all",
      fromDate,
      toDate,
      limit: String(Math.min(a.limit ?? 100, 200)),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byPlatformId = new Map<string, any>()
    for (const ad of adsList?.ads ?? adsList?.data ?? []) {
      const pid = ad.platformAdId ?? ad.platform_ad_id ?? ad.id
      if (pid) byPlatformId.set(String(pid), ad)
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
