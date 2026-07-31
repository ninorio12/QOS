// MCP maison Meta Ads — récupère les CRÉAS LIVE avec leurs VISUELS (image + vidéo source)
// + insights calculés (hook rate, hold rate, CTR, CPA, ROAS, fréquence). Lecture seule.
// La connexion (token + account) vient de la table meta_connection (jamais exposée au client).
import { action, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { internal, api } from "./_generated/api"
import { WORKSPACE } from "./osLib"

const META_API_VERSION = "v21.0"
const GRAPH = "https://graph.facebook.com"
const LEAD_ACTION_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "leadgen_grouped"]
const PURCHASE_TYPES = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]

const r2 = (n: number) => Math.round(n * 100) / 100
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function actionVal(arr: any[] | undefined, types: string[]): number {
  if (!Array.isArray(arr)) return 0
  for (const t of types) { const a = arr.find((x) => x.action_type === t); if (a) { const n = parseFloat(a.value); if (!isNaN(n)) return n } }
  return 0
}

// Créas Meta live + visuels + insights. datePreset: last_7d|last_14d|last_30d. status: ACTIVE par défaut.
export const creatives = action({
  args: { datePreset: v.optional(v.string()), limit: v.optional(v.number()), activeOnly: v.optional(v.boolean()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, a): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn: any = await ctx.runQuery(internal.mediaBuyer._connection, {})
    // Plus de connexion Meta directe (token mort ou jamais posé) : Zernio prend
    // le relais s'il a un compte Facebook connecté. Même contrat de sortie.
    if (!conn?.token || !conn?.accountId) return await ctx.runAction(internal.zernioAds.creatives, a)
    let act = String(conn.accountId).trim(); if (!act.startsWith("act_")) act = `act_${act.replace(/^act_?/, "")}`
    const token: string = conn.token
    const preset = a.datePreset ?? "last_14d"
    // Meta refuse les grandes pages dès qu'on demande créations ET insights
    // ensemble (« Please reduce the amount of data you're asking for ») : on
    // pagine par petites tranches plutôt que de tomber en repli Zernio.
    const wanted = Math.min(a.limit ?? 30, 200)
    const limit = Math.min(wanted, 10)
    const fields = [
      "name", "effective_status", "preview_shareable_link",
      "campaign{name}", "adset{name}",
      "creative{id,image_url,thumbnail_url,video_id,object_story_spec}",
      `insights.date_preset(${preset}){spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,inline_link_clicks,actions,action_values,video_play_actions,video_thruplay_watched_actions,video_avg_time_watched_actions,video_p100_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}`,
    ].join(",")
    let url: string | null = `${GRAPH}/${META_API_VERSION}/${act}/ads?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(token)}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ads: any[] = []
    for (let i = 0; i < 25 && url && ads.length < wanted; i++) {
      const res = await fetch(url); const json: any = await res.json()
      if (json.error) {
        // Token direct invalide/expiré : on retente par Zernio avant d'abandonner.
        const viaZernio: any = await ctx.runAction(internal.zernioAds.creatives, a)
        if (viaZernio?.connected) return viaZernio
        throw new Error(`Meta API: ${json.error.message ?? "erreur"}`)
      }
      if (Array.isArray(json.data)) ads.push(...json.data)
      url = json.paging?.next ?? null
    }
    // Les créations par annonce, lues sur l'edge du COMPTE. Quand le jeton n'a que
    // `ads_read`, Meta retire `creative{...}` de la réponse SANS erreur : cette
    // porte-là répond quand même, et rend les visuels que l'autre chemin perd.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creasParAd = new Map<string, any>()
    try {
      const cu = `${GRAPH}/${META_API_VERSION}/${act}/adcreatives?fields=${encodeURIComponent("id,video_id,thumbnail_url,image_url,object_story_spec")}&limit=100&access_token=${encodeURIComponent(token)}`
      const cres = await fetch(cu)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cj: any = await cres.json()
      for (const c of cj.data ?? []) {
        const vv = c.video_id ?? c.object_story_spec?.video_data?.video_id ?? null
        if (vv || c.thumbnail_url || c.image_url) {
          creasParAd.set(c.id, { video_id: vv, thumbnail_url: c.thumbnail_url, image_url: c.image_url, page_id: c.object_story_spec?.page_id })
        }
      }
    } catch { /* on continue sans : les statistiques restent justes */ }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = []
    for (const ad of ads) {
      if (a.activeOnly === true && ad.effective_status !== "ACTIVE") continue
      const cr = ad.creative ?? {}
      const crea = creasParAd.get(cr.id)
      let videoSource: string | null = null, videoThumb: string | null = null, videoLien: string | null = null
      // video_id à trois endroits : sur la création, dans object_story_spec, ou
      // via l'edge adcreatives du compte quand le jeton est limité à `ads_read`.
      const vid = cr.video_id ?? cr.object_story_spec?.video_data?.video_id ?? crea?.video_id ?? null
      if (vid) {
        try {
          const vr = await fetch(`${GRAPH}/${META_API_VERSION}/${vid}?fields=source,picture,permalink_url&access_token=${encodeURIComponent(token)}`)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vj: any = await vr.json()
          videoSource = vj.source ?? null
          videoThumb = vj.picture ?? null
          // `source` (le fichier lisible) demande ads_management. `permalink_url`
          // passe avec ads_read : il ouvre la vidéo là où elle est publiée, ce qui
          // vaut mieux qu'une vignette morte.
          if (vj.permalink_url) videoLien = `https://www.facebook.com${vj.permalink_url}`
          // Dernier repli de lien : la page de la vidéo reconstruite depuis la page Facebook.
          const pageId = cr.object_story_spec?.page_id ?? crea?.page_id
          if (!videoLien && pageId) videoLien = `https://www.facebook.com/${pageId}/videos/${vid}`
        } catch { /* vidéo inaccessible — on garde le reste */ }
      }
      // Dernier recours, RÉSERVÉ AUX VIDÉOS : l'aperçu partageable de l'annonce.
      // Une créa statique ne doit jamais recevoir de lien vidéo, sinon le board
      // lui colle un bouton lecture sur une image fixe.
      if (vid && !videoSource && !videoLien && ad.preview_shareable_link) videoLien = ad.preview_shareable_link
      const ins = ad.insights?.data?.[0] ?? {}
      const imp = parseFloat(ins.impressions ?? "0") || 0
      const spend = parseFloat(ins.spend ?? "0") || 0
      const clicks = parseFloat(ins.clicks ?? "0") || 0
      // Thumbstop d'élite = vues 3s / impressions. En Marketing API, l'action
      // `video_view` du tableau `actions` EST la vue 3s (le bon signal) ;
      // video_play_actions (lectures auto, plus large) gonfle le hook rate → fallback.
      const v3 = actionVal(ins.actions, ["video_view"]) || actionVal(ins.video_play_actions, ["video_view"])
      const thru = actionVal(ins.video_thruplay_watched_actions, ["video_view"])
      const leads = actionVal(ins.actions, LEAD_ACTION_TYPES)
      const purchases = actionVal(ins.actions, PURCHASE_TYPES)
      const revenue = actionVal(ins.action_values, PURCHASE_TYPES)
      const linkClicks = parseFloat(ins.inline_link_clicks ?? "0") || 0
      // Résultat = achats si funnel achat, sinon leads (lead-gen). CPA cohérent avec ce dénominateur.
      const results = purchases > 0 ? purchases : leads
      out.push({
        adId: ad.id, name: ad.name, status: ad.effective_status,
        campaign: ad.campaign?.name ?? null, adset: ad.adset?.name ?? null,
        imageUrl: cr.image_url ?? cr.thumbnail_url ?? crea?.image_url ?? crea?.thumbnail_url ?? null,
        thumbnailUrl: cr.thumbnail_url ?? crea?.thumbnail_url ?? null,
        videoSource, videoThumb, videoLien,
        spend: r2(spend), impressions: imp,
        reach: parseFloat(ins.reach ?? "0") || 0,
        ctr: parseFloat(ins.ctr ?? "0") || 0,                    // CTR total (tous clics)
        ctrOutbound: imp > 0 && linkClicks ? r2((linkClicks / imp) * 100) : null, // CTR lien sortant
        cpm: imp > 0 ? r2(parseFloat(ins.cpm ?? "0") || (spend / imp) * 1000) : null,
        frequency: r2(parseFloat(ins.frequency ?? "0") || 0),
        hookRate: imp > 0 && v3 ? r2((v3 / imp) * 100) : null,   // thumbstop : vues 3s / impressions
        holdRate: v3 && thru ? r2((thru / v3) * 100) : null,     // thruplay / vues 3s
        cvr: clicks > 0 && results ? r2((results / clicks) * 100) : null, // taux de conversion (résultat / clic)
        leads, purchases, results, cpa: results > 0 ? r2(spend / results) : null,
        roas: revenue > 0 && spend > 0 ? r2(revenue / spend) : null,
        tempsMoyenVideo: actionVal(ins.video_avg_time_watched_actions, ["video_view"]) || null,
        tauxCompletion: v3 ? r2((actionVal(ins.video_p100_watched_actions, ["video_view"]) / v3) * 100) : null,
        qualityRanking: ins.quality_ranking ?? null,
        engagementRanking: ins.engagement_rate_ranking ?? null,
        conversionRanking: ins.conversion_rate_ranking ?? null,
      })
    }
    out.sort((x, y) => (y.spend ?? 0) - (x.spend ?? 0))
    return { connected: true, account: act, datePreset: preset, count: out.length, creatives: out }
  },
})

// ── Persistance dans le Data OS (photos/vidéos accessibles + analysables par l'agent) ──
const numOrU = v.optional(v.union(v.number(), v.null()))

// Lecture des créas stockées (source Data OS). Utilisée par l'UI + l'agent Media Buyer.
export const listStored = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("meta_creatives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.map((r) => ({ ...r, id: r._id })).sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
  },
})

// Upsert d'une créa (par adId). null → undefined pour rester compatible schema.
export const _upsertOne = internalMutation({
  args: {
    adId: v.string(), name: v.string(), status: v.optional(v.string()),
    campaign: v.optional(v.string()), adset: v.optional(v.string()),
    imageUrl: v.optional(v.union(v.string(), v.null())), thumbnailUrl: v.optional(v.union(v.string(), v.null())),
    videoSource: v.optional(v.union(v.string(), v.null())), videoThumb: v.optional(v.union(v.string(), v.null())),
    videoLien: v.optional(v.union(v.string(), v.null())),
    tempsMoyenVideo: numOrU, tauxCompletion: numOrU,
    spend: v.optional(v.number()), impressions: v.optional(v.number()), reach: v.optional(v.number()),
    ctr: v.optional(v.number()), ctrOutbound: numOrU, cpm: numOrU,
    frequency: v.optional(v.number()), hookRate: numOrU, holdRate: numOrU, cvr: numOrU,
    leads: v.optional(v.number()), purchases: v.optional(v.number()), results: v.optional(v.number()),
    cpa: numOrU, roas: numOrU,
    qualityRanking: v.optional(v.union(v.string(), v.null())),
    engagementRanking: v.optional(v.union(v.string(), v.null())),
    conversionRanking: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const u = (x: unknown) => (x === null ? undefined : x)
    const row = {
      workspaceId: WORKSPACE, adId: a.adId, name: a.name, status: a.status,
      campaign: a.campaign, adset: a.adset,
      imageUrl: u(a.imageUrl) as string | undefined, thumbnailUrl: u(a.thumbnailUrl) as string | undefined,
      videoSource: u(a.videoSource) as string | undefined, videoThumb: u(a.videoThumb) as string | undefined,
      videoLien: u(a.videoLien) as string | undefined,
      tempsMoyenVideo: u(a.tempsMoyenVideo) as number | undefined,
      tauxCompletion: u(a.tauxCompletion) as number | undefined,
      spend: a.spend, impressions: a.impressions, reach: a.reach, ctr: a.ctr,
      ctrOutbound: u(a.ctrOutbound) as number | undefined, cpm: u(a.cpm) as number | undefined,
      frequency: a.frequency,
      hookRate: u(a.hookRate) as number | undefined, holdRate: u(a.holdRate) as number | undefined,
      cvr: u(a.cvr) as number | undefined,
      leads: a.leads, purchases: a.purchases, results: a.results,
      cpa: u(a.cpa) as number | undefined, roas: u(a.roas) as number | undefined,
      qualityRanking: u(a.qualityRanking) as string | undefined,
      engagementRanking: u(a.engagementRanking) as string | undefined,
      conversionRanking: u(a.conversionRanking) as string | undefined,
      syncedAt: new Date().toISOString(),
    }
    const ex = await ctx.db.query("meta_creatives")
      .withIndex("by_ws_ad", (q) => q.eq("workspaceId", WORKSPACE).eq("adId", a.adId)).first()
    if (ex) await ctx.db.patch(ex._id, row); else await ctx.db.insert("meta_creatives", row)
  },
})

// Sync : tire les créas live (avec visuels) et les écrit dans le Data OS.
export const syncCreatives = action({
  args: { datePreset: v.optional(v.string()), limit: v.optional(v.number()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, a): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await ctx.runAction(api.metaAds.creatives, { datePreset: a.datePreset, limit: a.limit ?? 25, activeOnly: false })
    if (!res?.connected) return { connected: false, synced: 0 }
    let synced = 0
    for (const c of res.creatives ?? []) { await ctx.runMutation(internal.metaAds._upsertOne, c); synced++ }
    return { connected: true, synced, account: res.account }
  },
})
