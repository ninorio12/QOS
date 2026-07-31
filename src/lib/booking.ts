// ════════════════════════════════════════════════════════════════════════════
// Moteur de créneaux (pur, sans I/O → testable). Calcule les créneaux libres à
// partir des disponibilités hebdo d'un lien + des intervalles occupés (FreeBusy
// Google + RDV natifs). Gère les fuseaux/DST via l'API Intl (aucune dépendance).
// ════════════════════════════════════════════════════════════════════════════

export type AvailabilityRule = { day: number; start: number; end: number } // day 0=dim..6=sam, minutes locales
export type BusyInterval = { start: string; end: string } // ISO UTC
export type Slot = { start: string; end: string } // ISO UTC

// Décalage (ms) du fuseau `tz` à l'instant `utcMs` (positif = à l'est de UTC).
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
  const parts = dtf.formatToParts(new Date(utcMs))
  const m: Record<string, number> = {}
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value)
  const asUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second)
  return asUtc - utcMs
}

// Instant UTC (ms) correspondant à une heure murale locale dans `tz`.
export function wallClockToUtcMs(y: number, mo: number, d: number, hh: number, mm: number, tz: string): number {
  const guess = Date.UTC(y, mo, d, hh, mm)
  // Deux passes suffisent pour converger, y compris aux bascules DST.
  const off1 = tzOffsetMs(guess, tz)
  const off2 = tzOffsetMs(guess - off1, tz)
  return guess - off2
}

// Composantes calendaires (année/mois/jour/heure/min + jour de semaine) d'un
// instant UTC, lues dans le fuseau `tz`.
function partsInTz(utcMs: number, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday)
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), weekday: wd }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

export type ComputeArgs = {
  availability: AvailabilityRule[]
  durationMin: number
  bufferMin?: number
  timezone: string
  fromMs: number   // borne basse absolue (ex: maintenant + minNotice)
  toMs: number     // borne haute absolue (ex: maintenant + maxDaysAhead)
  // busy[host] = intervalles occupés du host. Un créneau est offert si ≥1 host libre.
  busyByHost: Record<string, BusyInterval[]>
}

// Retourne les créneaux offerts (≥1 host libre), avec la liste des hosts libres.
export function computeSlots(args: ComputeArgs): { start: string; end: string; freeHosts: string[] }[] {
  const { availability, durationMin, timezone, fromMs, toMs, busyByHost } = args
  const buffer = (args.bufferMin ?? 0) * 60000
  const durMs = durationMin * 60000
  const hosts = Object.keys(busyByHost)
  if (hosts.length === 0 || availability.length === 0) return []

  // Pré-parse les busy en ms.
  const busyMs: Record<string, [number, number][]> = {}
  for (const h of hosts) {
    busyMs[h] = (busyByHost[h] ?? [])
      .map(b => [Date.parse(b.start), Date.parse(b.end)] as [number, number])
      .filter(([s, e]) => !isNaN(s) && !isNaN(e))
  }

  const out: { start: string; end: string; freeHosts: string[] }[] = []
  const step = durationMin * 60000 // pas = durée (créneaux jointifs)

  // On itère jour par jour sur la fenêtre, en heure locale du lien.
  const startParts = partsInTz(fromMs, timezone)
  // On part de minuit local du jour de `fromMs` puis on avance de 24h * N.
  let dayCursorMs = wallClockToUtcMs(startParts.year, startParts.month - 1, startParts.day, 0, 0, timezone)

  for (let d = 0; d < 62; d++) {
    if (dayCursorMs > toMs) break
    const dp = partsInTz(dayCursorMs + 12 * 3600000, timezone) // midi local = jour robuste
    const rules = availability.filter(r => r.day === dp.weekday)
    for (const r of rules) {
      const winStart = wallClockToUtcMs(dp.year, dp.month - 1, dp.day, Math.floor(r.start / 60), r.start % 60, timezone)
      const winEnd = wallClockToUtcMs(dp.year, dp.month - 1, dp.day, Math.floor(r.end / 60), r.end % 60, timezone)
      for (let s = winStart; s + durMs <= winEnd; s += step) {
        const e = s + durMs
        if (s < fromMs || e > toMs) continue
        const freeHosts = hosts.filter(h =>
          !busyMs[h].some(([bs, be]) => overlaps(s - buffer, e + buffer, bs, be)),
        )
        if (freeHosts.length > 0) {
          out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString(), freeHosts })
        }
      }
    }
    dayCursorMs = wallClockToUtcMs(dp.year, dp.month - 1, dp.day + 1, 0, 0, timezone)
  }

  out.sort((a, b) => a.start.localeCompare(b.start))
  return out
}

// Libellé "HH:MM" d'un instant UTC dans un fuseau donné.
export function fmtTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))
}
