import 'server-only'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import { computeSlots, type BusyInterval } from '@/lib/booking'

// Helpers serveur du booking natif : chargent la config du lien, lisent le
// FreeBusy Google de chaque host (avec son propre refresh token) + les RDV
// natifs déjà pris, et calculent les créneaux libres. Réservés au serveur.

export type LinkConfig = {
  id: string
  slug: string
  title: string
  durationMin: number
  bufferMin: number
  minNoticeHours: number
  maxDaysAhead: number
  timezone: string
  stage: string
  hosts: string[]
  availability: { day: number; start: number; end: number }[]
}

function convex(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  return url ? new ConvexHttpClient(url) : null
}
function secret(): string {
  return process.env.INTERNAL_API_SECRET ?? ''
}

export async function getLinkConfig(slug: string): Promise<LinkConfig | null> {
  const cx = convex()
  if (!cx || !secret()) return null
  const cfg = await cx.query(api.booking.linkConfig, { slug, secret: secret() })
  return (cfg as LinkConfig | null) ?? null
}

// busyByHost = FreeBusy Google (fenêtre [from,to]) ∪ RDV natifs planifiés.
// Un host SANS Google connecté est exclu des créneaux dès qu'au moins un autre
// est connecté : son agenda est illisible et aucun event/invitation ne peut
// être créé chez lui — l'assigner produirait un RDV fantôme.
export async function getBusyByHost(allHosts: string[], fromIso: string, toIso: string): Promise<Record<string, BusyInterval[]>> {
  const cx = convex()
  const busyByHost: Record<string, BusyInterval[]> = {}
  if (!cx || !secret() || allHosts.length === 0) return busyByHost

  // Tokens Google des hosts (secret requis, jamais exposés au client).
  let accounts: { clerkUserId: string; refreshToken: string; email: string | null }[] = []
  try { accounts = await cx.query(api.googleAccounts.listConnected, { secret: secret() }) } catch { /* pas de Google configuré */ }
  const tokenByHost = new Map(accounts.map(a => [a.clerkUserId, a.refreshToken]))

  const connected = allHosts.filter(h => tokenByHost.has(h))
  const hosts = connected.length > 0 ? connected : allHosts
  for (const h of hosts) busyByHost[h] = []

  await Promise.all(hosts.map(async host => {
    const token = tokenByHost.get(host)
    if (!token) return
    try {
      const auth = getOAuth2Client()
      auth.setCredentials({ refresh_token: token })
      const cal = google.calendar({ version: 'v3', auth })
      const res = await cal.freebusy.query({ requestBody: { timeMin: fromIso, timeMax: toIso, items: [{ id: 'primary' }] } })
      const busy = (res.data.calendars?.primary?.busy ?? [])
        .filter(b => b.start && b.end)
        .map(b => ({ start: b.start as string, end: b.end as string }))
      busyByHost[host].push(...busy)
    } catch { /* host injoignable → considéré libre (le commit revérifie) */ }
  }))

  // RDV natifs déjà pris (barrière anti double-booking avant propagation Google).
  try {
    const planned = await cx.query(api.booking.plannedBusy, { hosts, fromIso, toIso, secret: secret() })
    for (const p of planned as { closerUserId: string; start: string; end: string }[]) {
      if (busyByHost[p.closerUserId]) busyByHost[p.closerUserId].push({ start: p.start, end: p.end })
    }
  } catch { /* pas bloquant */ }

  return busyByHost
}

// Créneaux libres pour un lien sur la fenêtre [fromMs, toMs] (bornée par les
// règles du lien : minNotice / maxDaysAhead).
export async function getAvailableSlots(cfg: LinkConfig, fromMs: number, toMs: number) {
  const lowerMs = Math.max(fromMs, Date.now() + cfg.minNoticeHours * 3600000)
  const upperMs = Math.min(toMs, Date.now() + cfg.maxDaysAhead * 24 * 3600000)
  if (lowerMs >= upperMs) return []
  const busyByHost = await getBusyByHost(cfg.hosts, new Date(lowerMs).toISOString(), new Date(upperMs).toISOString())
  return computeSlots({
    availability: cfg.availability,
    durationMin: cfg.durationMin,
    bufferMin: cfg.bufferMin,
    timezone: cfg.timezone,
    fromMs: lowerMs,
    toMs: upperMs,
    busyByHost,
  })
}
