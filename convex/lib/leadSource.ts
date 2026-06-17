// ───────────────────────────────────────────────────────────────────────────
// Normalisation du 'source' d'un LEAD / CONTACT (PUR, sans I/O → testable).
//
// Règle métier (Thomas) : un lead vient TOUJOURS de l'une de ces 3 catégories,
// et UNIQUEMENT celles-ci :
//   - outbound        (prospection sortante : web-search, scraping, LinkedIn, cold…)
//   - inbound         (le lead vient à nous : formulaire, site, ads, organic…)
//   - recommandation  (bouche-à-oreille / referral / parrainage)
//
// ⚠️ NE PAS confondre avec le 'source' TECHNIQUE des activités/événements/tâches
// (dataos | telegram | slack | mcp | system | prospection…), qui décrit la
// provenance de l'écriture et n'est pas concerné par cette normalisation.
// ───────────────────────────────────────────────────────────────────────────

export type LeadSource = "outbound" | "inbound" | "recommandation"

// Signaux "inbound" explicites (le prospect est venu à nous).
const INBOUND_SET = new Set([
  "inbound", "form", "formulaire", "confirmation-form", "website", "web", "site",
  "webform", "landing", "landing-page", "ads", "ad", "meta", "meta-ads",
  "facebook", "facebook-ads", "instagram", "instagram-ads", "google-ads",
  "paid", "organic", "seo", "content", "newsletter", "typeform", "tally",
  "calendly", "webinar", "webinaire", "lead-magnet", "leadmagnet",
])

// Signaux "recommandation" (referral / bouche-à-oreille).
const RECO_RE = /(recommand|recommend|referr|referen|parrain|bouche|word-?of-?mouth)/

/**
 * Ramène n'importe quelle valeur vers l'une des 3 catégories autorisées.
 * Tout ce qui n'est ni inbound ni recommandation (web-search, scraping, vide,
 * marqueurs techniques/agent : agent-e2e, test, mcp, ai, system, demo…) → outbound.
 */
export function normalizeLeadSource(raw?: string | null): LeadSource {
  const s = (raw ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-")
  if (s === "outbound" || s === "inbound" || s === "recommandation") return s
  if (!s) return "outbound"
  if (RECO_RE.test(s) || s === "reco" || s === "wom") return "recommandation"
  if (INBOUND_SET.has(s)) return "inbound"
  return "outbound"
}
