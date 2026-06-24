import { action } from "./_generated/server"
import { api } from "./_generated/api"

const ICLOSED_BASE = "https://public.api.iclosed.io/v1"

// Connecteur iClosed natif (Data OS). Poll les eventCalls et matérialise les KICKOFFS réservés
// dans l'onboarding (date/heure + carte client → « Kickoff booké »). Les R1/R2 restent gérés
// par le sync existant ; ici on ne traite QUE l'event « Kick-off ». Idempotent (scheduleKickoff
// réécrit la même date ; la carte n'avance jamais en arrière). Gère le reschedule (date mise à jour).
export const syncKickoffs = action({
  args: {},
  handler: async (ctx) => {
    const key = process.env.ICLOSED_API_KEY
    if (!key) throw new Error("ICLOSED_API_KEY manquante (env Convex)")
    let synced = 0, scanned = 0
    for (const eventType of ["UPCOMING", "PAST"]) {
      const res = await fetch(`${ICLOSED_BASE}/eventCalls?limit=100&eventType=${eventType}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) continue
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls: any[] = json?.data?.eventCalls ?? []
      for (const c of calls) {
        scanned++
        const name = String(c?.event?.name ?? "").toLowerCase()
        const slug = String(c?.event?.linkPrefix ?? "").toLowerCase()
        const isKickoff = name.includes("kick") || slug.includes("kick")
        if (!isKickoff || c.cancelReason) continue   // pas un kickoff, ou annulé → ignoré
        const email = c.inviteeEmail
        const startTime = c.dateTimeUTC ?? c.dateTime
        if (!email || !startTime) continue
        await ctx.runMutation(api.onboarding.scheduleKickoff, {
          email, startTime, externalId: String(c.id ?? c.callId ?? ""),
        })
        synced++
      }
    }
    return { ok: true, scanned, synced }
  },
})
