"use node"
import { v } from "convex/values"
import { action, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

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
        data = platform === "instagram" ? await instagramInfo() : await linkedinInfo()
      } catch (e) {
        data = { connected: false, error: String(e).slice(0, 160) }
      }
      await ctx.runMutation(internal.socialProfileCache.upsert, { platform, ...data })
      results.push({ platform, connected: data.connected })
    }
    return results
  },
})

/** Rafraîchissement manuel (bouton / debug). */
export const refreshNow = action({
  args: {},
  handler: async (ctx): Promise<unknown> => await ctx.runAction(internal.socialProfile.refresh, {}),
})

async function linkedinInfo() {
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
    // followersCount volontairement absent : les connexions attendent l'app DMA.
  }
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
