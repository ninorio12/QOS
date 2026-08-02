"use node"
import { v } from "convex/values"
import { action } from "./_generated/server"

/**
 * Profil social du parcours « Profil » (cockpit Performance).
 *
 * Source : Zernio (espace jonathan, même clé que les ads). On y lit le compte
 * connecté (photo, nom, abonnés) et l'historique d'abonnés de la période.
 * Aucun chiffre inventé : plateforme absente = connected:false, l'écran
 * affiche l'état « non connecté » et des N/A.
 */

const BASE = "https://zernio.com/api/v1"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zernio(path: string): Promise<any> {
  const key = process.env.ZERNIO_API_KEY
  if (!key) throw new Error("ZERNIO_API_KEY manquant")
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`Zernio ${path} → ${res.status}`)
  return await res.json()
}

export const info = action({
  args: { platform: v.string(), days: v.optional(v.number()) },
  handler: async (_ctx, a) => {
    // LinkedIn n'est pas couvert par Zernio : l'écran l'affiche comme « à
    // connecter » tant que l'API officielle LinkedIn n'est pas branchée.
    if (a.platform === "linkedin") return { connected: false, platform: "linkedin" }
    try {
      const accounts = await zernio("/accounts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc = (accounts?.accounts ?? accounts?.data?.accounts ?? []).find((x: any) => x.platform === a.platform && x.isActive)
      if (!acc) return { connected: false, platform: a.platform }
      let gained: number | null = null
      try {
        const hist = await zernio(`/analytics/instagram/followers?accountId=${acc._id}&days=${a.days ?? 30}`)
        gained = hist?.gained ?? hist?.data?.gained ?? null
      } catch { /* l'historique peut ne pas exister encore : le total suffit */ }
      return {
        connected: true,
        platform: a.platform,
        username: acc.username ?? null,
        displayName: acc.displayName ?? null,
        profilePicture: acc.profilePicture ?? null,
        profileUrl: acc.profileUrl ?? null,
        followersCount: acc.followersCount ?? null,
        followersGained: gained,
      }
    } catch (e) {
      return { connected: false, platform: a.platform, error: String(e).slice(0, 120) }
    }
  },
})
