"use node"
import { v } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { api, internal } from "./_generated/api"

/**
 * Rafraîchissement des profils sociaux du parcours « Profil ».
 *
 * Sources : les connexions DÉJÀ posées côté Brvndlab (décision Jonathan
 * 2026-08-02, « avec ce qu'on a sur Brvndlab ») :
 *  - Instagram : IG Business @jonathanzekhe via token de PAGE Meta (type PAGE,
 *    sans expiration, vérifié via debug_token) → photo, nom, abonnés, gains
 *    d'abonnés (insights follower_count, fenêtre Meta max 30 jours).
 *  - LinkedIn : connexion Nango « linkedin » de Jonathan → identité OIDC
 *    (photo, nom). Le NOMBRE DE CONNEXIONS attend la réactivation de l'app
 *    LinkedIn DMA (désactivée côté LinkedIn au 2026-08-02, « DISABLED_APPLICATION ») ;
 *    d'ici là il reste absent, jamais un chiffre inventé.
 *
 * L'écran ne lit QUE le cache os_social_profiles (query socialProfileCache.get),
 * rempli ici par cron : zéro appel externe depuis le client.
 */

export const refresh = internalAction({
  args: {},
  handler: async (ctx) => {
    const results = []
    for (const platform of ["instagram", "linkedin"] as const) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prev: any = await ctx.runQuery(api.socialProfileCache.get, { platform })
        data = platform === "instagram" ? await instagramInfo() : await linkedinInfo(prev)
      } catch (e) {
        data = { connected: false, error: String(e).slice(0, 160) }
      }
      await ctx.runMutation(internal.socialProfileCache.upsert, { platform, ...data })
      // Photo du jour pour la courbe d'abonnés (idempotent par date).
      if (typeof data.followersCount === "number") {
        await ctx.runMutation(internal.socialProfileCache.snapshotFollowers, {
          platform, date: new Date().toISOString().slice(0, 10), followers: data.followersCount,
        })
      }
      results.push({ platform, connected: data.connected })
    }
    return results
  },
})

/** Rafraîchissement manuel (bouton / debug). Réservé aux admins : chaque appel
 *  brûle des quotas Meta/Nango avec NOS tokens (audit tribunal 2026-08-02). */
export const refreshNow = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Authentification requise")
    return await ctx.runAction(internal.socialProfile.refresh, {})
  },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkedinInfo(prev?: any) {
  const key = process.env.NANGO_SECRET_KEY
  const connId = process.env.LINKEDIN_NANGO_CONNECTION_ID
  if (!key || !connId) return { connected: false }
  const res = await fetch("https://api.nango.dev/proxy/v2/userinfo", {
    headers: { Authorization: `Bearer ${key}`, "Connection-Id": connId, "Provider-Config-Key": "linkedin" },
  })
  if (!res.ok) return { connected: false, error: `userinfo ${res.status}` }
  const me = (await res.json()) as { name?: string; given_name?: string; family_name?: string; picture?: string }
  return {
    connected: true,
    username: "jonathan-zekhe",
    displayName: me.name ?? [me.given_name, me.family_name].filter(Boolean).join(" "),
    profilePicture: me.picture ?? undefined,
    profileUrl: "https://www.linkedin.com/in/jonathan-zekhe",
    // Connexions : via l'app 3rd-party ACTIVE (l'app DMA « member » est
    // désactivée côté LinkedIn). Dès que Jonathan a autorisé linkedin-3p,
    // le snapshot CONNECTIONS donne le compte exact ; avant : absent (N/A).
    followersCount: await linkedinConnectionsCount(key),
    ...(await linkedinInboxStats(key, prev)),
  }
}

/**
 * Messagerie LinkedIn via le snapshot DMA INBOX (historique complet, ~1 ligne
 * par message : date, expéditeur, conversation). On en tire :
 *  - dmSent* : conversations où JONATHAN a écrit dans la fenêtre (DMs envoyés)
 *  - conv*   : conversations à DOUBLE sens dans la fenêtre (vraies conversations)
 * Le snapshot pèse ~20 pages : on ne le relit qu'une fois par 20 h (rate limits DMA).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkedinInboxStats(nangoKey: string, prev?: any) {
  const keep = {
    dmSent7: prev?.dmSent7, dmSent30: prev?.dmSent30, dmSentAll: prev?.dmSentAll,
    conv7: prev?.conv7, conv30: prev?.conv30, convAll: prev?.convAll,
    inboxFetchedAt: prev?.inboxFetchedAt,
  }
  if (prev?.inboxFetchedAt && Date.now() - prev.inboxFetchedAt < 20 * 3600_000) return keep
  const endUser = process.env.LINKEDIN_3P_ENDUSER
  if (!endUser) return keep
  try {
    const lc = await fetch(`https://api.nango.dev/connections?endUserId=${encodeURIComponent(endUser)}`, { headers: { Authorization: `Bearer ${nangoKey}` } })
    if (!lc.ok) return keep
    const lj = (await lc.json()) as { connections?: { connection_id: string; provider_config_key: string }[] }
    const c3p = (lj.connections ?? []).find((c) => c.provider_config_key === "linkedin-3p")
    if (!c3p) return keep
    const cr = await fetch(`https://api.nango.dev/connection/${c3p.connection_id}?provider_config_key=linkedin-3p`, { headers: { Authorization: `Bearer ${nangoKey}` } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = ((await cr.json()) as any)?.credentials?.access_token
    if (!token) return keep

    const ME = "/in/jonathan-zekhe"
    type Msg = { conv: string; ts: number; mine: boolean }
    const msgs: Msg[] = []
    let start = 0
    for (let page = 0; page < 30; page++) {
      const sr = await fetch(`https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=INBOX&start=${start}`, {
        headers: { Authorization: `Bearer ${token}`, "LinkedIn-Version": "202312", "X-Restli-Protocol-Version": "2.0.0" },
      })
      if (!sr.ok) break
      const sj = (await sr.json()) as { elements?: { snapshotData?: Record<string, string>[] }[]; paging?: { total?: number } }
      const els = sj.elements ?? []
      let rows = 0
      for (const el of els) {
        for (const r of el.snapshotData ?? []) {
          rows++
          const conv = r["CONVERSATION ID"] ?? ""
          const ts = Date.parse((r["DATE"] ?? "").replace(" UTC", "Z").replace(" ", "T"))
          if (!conv || Number.isNaN(ts)) continue
          msgs.push({ conv, ts, mine: (r["SENDER PROFILE URL"] ?? "").includes(ME) })
        }
      }
      if (rows === 0) break
      start += els.length
      if (typeof sj.paging?.total === "number" && start >= sj.paging.total) break
    }
    const windowStats = (days: number | null) => {
      const since = days == null ? 0 : Date.now() - days * 86400_000
      const sent = new Set<string>()
      const fromMe = new Set<string>(), fromThem = new Set<string>()
      for (const m of msgs) {
        if (m.ts < since) continue
        if (m.mine) { sent.add(m.conv); fromMe.add(m.conv) } else fromThem.add(m.conv)
      }
      const conv = [...fromMe].filter((c) => fromThem.has(c)).length
      return { sent: sent.size, conv }
    }
    const w7 = windowStats(7), w30 = windowStats(30), wa = windowStats(null)
    return {
      dmSent7: w7.sent, dmSent30: w30.sent, dmSentAll: wa.sent,
      conv7: w7.conv, conv30: w30.conv, convAll: wa.conv,
      inboxFetchedAt: Date.now(),
    }
  } catch { return keep }
}

/**
 * Compte les connexions via le Member Snapshot API (domaine CONNECTIONS) de
 * l'app linkedin-3p. Le snapshot peut mettre jusqu'à 24-48 h à se générer
 * après le consentement : 404 = pas encore prêt, on rend undefined (N/A).
 */
async function linkedinConnectionsCount(nangoKey: string): Promise<number | undefined> {
  const endUser = process.env.LINKEDIN_3P_ENDUSER
  if (!endUser) return undefined
  try {
    const lc = await fetch(`https://api.nango.dev/connections?endUserId=${encodeURIComponent(endUser)}`, {
      headers: { Authorization: `Bearer ${nangoKey}` },
    })
    if (!lc.ok) return undefined
    const lj = (await lc.json()) as { connections?: { connection_id: string; provider_config_key: string }[] }
    const c3p = (lj.connections ?? []).find((c) => c.provider_config_key === "linkedin-3p")
    if (!c3p) return undefined
    const cr = await fetch(`https://api.nango.dev/connection/${c3p.connection_id}?provider_config_key=linkedin-3p`, {
      headers: { Authorization: `Bearer ${nangoKey}` },
    })
    if (!cr.ok) return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = ((await cr.json()) as any)?.credentials?.access_token
    if (!token) return undefined
    let total = 0
    let start = 0
    for (let page = 0; page < 60; page++) {
      const sr = await fetch(`https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=CONNECTIONS&start=${start}`, {
        headers: { Authorization: `Bearer ${token}`, "LinkedIn-Version": "202312", "X-Restli-Protocol-Version": "2.0.0" },
      })
      if (sr.status === 404) return page === 0 ? undefined : total
      if (!sr.ok) return undefined
      const sj = (await sr.json()) as { elements?: { snapshotData?: unknown[] }[]; paging?: { total?: number } }
      const els = sj.elements ?? []
      for (const el of els) total += (el.snapshotData ?? []).length
      if (els.length === 0) break
      start += els.length
      if (typeof sj.paging?.total === "number" && start >= sj.paging.total) break
    }
    return total
  } catch { return undefined }
}

const FB_GRAPH = "https://graph.facebook.com/v23.0"

async function instagramInfo() {
  const token = process.env.IG_PAGE_TOKEN
  const igId = process.env.IG_USER_ID
  if (!token || !igId) return { connected: false }
  const res = await fetch(`${FB_GRAPH}/${igId}?fields=username,name,followers_count,profile_picture_url&access_token=${token}`)
  if (!res.ok) return { connected: false, error: `graph ${res.status}` }
  const p = (await res.json()) as { username?: string; name?: string; followers_count?: number; profile_picture_url?: string }

  const gainedOver = async (days: number): Promise<number | undefined> => {
    try {
      const until = Math.floor(Date.now() / 1000)
      const since = until - days * 86400
      const ir = await fetch(`${FB_GRAPH}/${igId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${token}`)
      if (!ir.ok) return undefined
      const ij = (await ir.json()) as { data?: { values?: { value?: number }[] }[] }
      const vals = ij.data?.[0]?.values ?? []
      return vals.reduce((s, x) => s + (x.value ?? 0), 0)
    } catch { return undefined }
  }

  return {
    connected: true,
    username: p.username ?? undefined,
    displayName: p.name ?? p.username ?? undefined,
    profilePicture: p.profile_picture_url ?? undefined,
    profileUrl: p.username ? `https://instagram.com/${p.username}` : undefined,
    followersCount: p.followers_count ?? undefined,
    gained7: await gainedOver(7),
    gained30: await gainedOver(30),
  }
}
