// convex/timeLib.ts
// Convertit un timestamp ISO UTC vers la date "YYYY-MM-DD" du jour LOCAL de l'utilisateur.
// tzOffsetMin = valeur de `new Date().getTimezoneOffset()` envoyée par le client
// (minutes à ajouter au local pour obtenir l'UTC ; CET hiver = -60). Sans offset → jour UTC.
export function localDay(isoUtc: string, tzOffsetMin?: number): string {
  if (isoUtc == null) return ""
  if (tzOffsetMin === undefined || tzOffsetMin === null) return isoUtc.slice(0, 10)
  const ms = new Date(isoUtc).getTime()
  return new Date(ms - tzOffsetMin * 60000).toISOString().slice(0, 10)
}

// Dernier dimanche d'un mois (month 0-based) à 01:00 UTC = instant de bascule DST en Europe.
function lastSundayUtc01(year: number, month: number): number {
  const d = new Date(Date.UTC(year, month + 1, 0))   // dernier jour du mois
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())        // recule au dimanche
  d.setUTCHours(1, 0, 0, 0)
  return d.getTime()
}

// Normalise une date/heure (ex. iClosed) en ISO UTC.
//  • déjà tz-aware (suffixe Z ou ±hh:mm) → renvoyée telle quelle en UTC.
//  • "naïve" (sans fuseau) → interprétée en heure locale Europe/Zurich (CET=+01:00 / CEST=+02:00)
//    puis convertie en UTC. Évite qu'une heure locale nue soit relue comme UTC (RDV décalé de 1-2 h).
export function zurichToUtcIso(s: string): string {
  if (!s) return s
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s).toISOString()
  const withT = s.includes("T") ? s : `${s}T00:00:00`
  const year = Number(withT.slice(0, 4))
  const probe = Date.parse(withT + "Z")   // approx pour décider DST (négligeable près de la bascule)
  const dst = !Number.isNaN(probe) && probe >= lastSundayUtc01(year, 2) && probe < lastSundayUtc01(year, 9)
  return new Date(withT + (dst ? "+02:00" : "+01:00")).toISOString()
}
