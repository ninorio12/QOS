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
