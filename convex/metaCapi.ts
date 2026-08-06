import { v } from "convex/values"
import { internalAction } from "./_generated/server"

/**
 * Conversions API Meta : les conversions que le navigateur ne peut pas prouver.
 *
 * Le pixel du navigateur rate systématiquement une part des événements —
 * bloqueurs de pub, iOS, page fermée trop vite. Et surtout, deux faits du tunnel
 * VividFlow ne se produisent PAS dans le navigateur du prospect : la réservation
 * iClosed nous arrive par webhook, la présence au rendez-vous se constate dans le
 * Data OS. Sans cette voie serveur, Meta ne les verrait jamais.
 *
 * Déduplication : `eventId` doit être IDENTIQUE à celui envoyé par la page
 * (go.vividflow.co/confirmation le construit à partir de l'email et de l'heure
 * du rendez-vous). Sans ça, chaque conversion compterait deux fois.
 *
 * Ne lève jamais : un échec Meta ne doit casser aucun webhook.
 */

const PIXEL_ID = "760381557750699"
const GRAPH = "v21.0"

// Meta exige du SHA-256 sur les données personnelles. La normalisation compte
// autant que le hachage : un email non normalisé ne correspondra jamais, et Meta
// ne remonte aucune erreur pour le signaler.
async function sha256(valeur: string) {
  const octets = new TextEncoder().encode(valeur)
  const empreinte = await crypto.subtle.digest("SHA-256", octets)
  return Array.from(new Uint8Array(empreinte)).map(b => b.toString(16).padStart(2, "0")).join("")
}

export const sendEvent = internalAction({
  args: {
    eventName:       v.string(),
    eventId:         v.optional(v.string()),
    email:           v.optional(v.string()),
    phone:           v.optional(v.string()),
    name:            v.optional(v.string()),
    eventSourceUrl:  v.optional(v.string()),
    value:           v.optional(v.number()),
    eventTime:       v.optional(v.number()),
  },
  handler: async (_ctx, a) => {
    const token = process.env.META_CAPI_TOKEN
    if (!token) return { ok: false, skipped: "no_token" }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user_data: any = {}
    const email = (a.email ?? "").trim().toLowerCase()
    if (email.includes("@")) user_data.em = [await sha256(email)]
    // E.164 sans le « + » : Meta veut les chiffres seuls.
    const tel = (a.phone ?? "").replace(/\D/g, "")
    if (tel.length >= 9) user_data.ph = [await sha256(tel)]
    const nom = (a.name ?? "").trim().toLowerCase()
    if (nom) user_data.fn = [await sha256(nom)]

    // Sans le moindre identifiant, Meta ne peut rattacher l'événement à personne.
    if (!user_data.em && !user_data.ph) return { ok: false, skipped: "no_identifier" }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evenement: any = {
      event_name: a.eventName,
      event_time: a.eventTime ?? Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data,
      custom_data: { value: a.value ?? 1000, currency: "CHF", content_category: "confirmation" },
    }
    if (a.eventId) evenement.event_id = a.eventId
    if (a.eventSourceUrl) evenement.event_source_url = a.eventSourceUrl

    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH}/${PIXEL_ID}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [evenement], access_token: token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) console.error("[MetaCAPI]", a.eventName, JSON.stringify(json).slice(0, 300))
      return { ok: res.ok, received: json?.events_received ?? 0 }
    } catch (e) {
      console.error("[MetaCAPI] envoi impossible:", e)
      return { ok: false }
    }
  },
})
