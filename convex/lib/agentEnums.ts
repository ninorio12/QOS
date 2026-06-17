// ───────────────────────────────────────────────────────────────────────────
// RÈGLE D'OR (Thomas) : un agent Hermes ne peut JAMAIS écrire une valeur
// hors-scope dans un champ à vocabulaire fermé. Il doit choisir dans la liste.
//
// Garde-fou PUR (sans I/O → testable), appliqué au point unique = serveur MCP
// (src/app/api/mcp/route.ts, dispatch tools/call). Valeur hors-liste → REFUS
// avec message « choisis parmi: … ». N'affecte que les agents (l'UI humaine
// passe par les mutations Convex directement, hors MCP).
//
// Portée = le vocabulaire DOCUMENTÉ dans les descriptions d'outils (le contrat
// que l'agent voit), + quelques valeurs réelles connues. On n'enforce QUE les
// enums sûrs (pas les champs data-driven comme stageId/pipelineId).
// ───────────────────────────────────────────────────────────────────────────

const LEAD_SOURCE       = ["outbound", "inbound", "recommandation"] as const
const CONTACT_STATUT    = ["lead", "client", "perdu", "archived"] as const
const OUTREACH_CHANNEL  = ["email", "linkedin", "sms", "whatsapp", "call"] as const
const TASK_STATUS       = ["todo", "in_progress", "blocked", "done"] as const
const ASSIGNEE_TYPE     = ["agent", "human"] as const
const KNOWLEDGE_KIND    = ["memory", "decision", "rule", "client_project", "pattern", "risk", "objection", "candidate"] as const
const PROSPECTION_ACTION= ["appele", "repondu", "pas_repondu", "message_laisse", "a_rappeler", "interesse", "negatif", "mauvais_numero", "non_qualifie", "r1_booke", "perdu"] as const
const TEMPERATURE       = ["chaud", "tiede", "froid"] as const
const PHASE             = ["phase1", "phase2", "phase3"] as const
const PHASE_VALUE       = ["repondu", "pas_repondu", "a_rappeler"] as const
const LOST_REASON       = ["reponse_negative", "pas_de_reponse_phase3", "mauvais_numero", "non_qualifie", "hors_cible", "autre"] as const
const MEDIA_LEVEL       = ["creative", "adset", "campaign"] as const
const VERDICT           = ["scale", "watch", "kill"] as const
const PERF_CHANNEL      = ["all", "appel", "linkedin", "email"] as const
const PERF_METRIC       = ["appels", "messages", "relances", "reponses", "r1"] as const
const CLOSING_SCOPE     = ["today", "week", "all"] as const

// (outil MCP → { champ → valeurs autorisées }). Seuls les champs listés sont gardés.
export const TOOL_ENUMS: Record<string, Record<string, readonly string[]>> = {
  leads_create:                       { source: LEAD_SOURCE },
  leads_update:                       { source: LEAD_SOURCE },
  contacts_create:                    { statut: CONTACT_STATUT },
  contacts_update:                    { statut: CONTACT_STATUT },
  outreach_create:                    { channel: OUTREACH_CHANNEL },
  tasks_create:                       { assigneeType: ASSIGNEE_TYPE },
  tasks_update:                       { status: TASK_STATUS, assigneeType: ASSIGNEE_TYPE },
  knowledge_propose:                  { kind: KNOWLEDGE_KIND },
  knowledge_list:                     { kind: KNOWLEDGE_KIND },
  prospection_create_or_link_contact: { temperature: TEMPERATURE },
  prospection_quick_action:           { action: PROSPECTION_ACTION },
  prospection_move:                   { action: PROSPECTION_ACTION },
  prospection_set_phase:              { phase: PHASE, value: PHASE_VALUE },
  prospection_set_temperature:        { temperature: TEMPERATURE },
  prospection_mark_lost:              { lostReason: LOST_REASON },
  media_buyer_board:                  { level: MEDIA_LEVEL },
  media_buyer_upsert:                 { level: MEDIA_LEVEL, verdictOverride: VERDICT },
  performance_summary:                { channel: PERF_CHANNEL },
  performance_daily_tasks_create:     { metric: PERF_METRIC },
  closing_upcoming_calls:             { scope: CLOSING_SCOPE },
}

export type EnumViolation = { field: string; value: string; allowed: string[] }

/**
 * Vérifie les champs à vocabulaire fermé d'un appel d'outil. Les valeurs
 * undefined / null / "" (champ optionnel non fourni) sont ignorées.
 * Retourne la liste des violations (vide si tout est conforme).
 */
export function checkToolEnums(tool: string, args: Record<string, unknown> = {}): EnumViolation[] {
  const rules = TOOL_ENUMS[tool]
  if (!rules) return []
  const out: EnumViolation[] = []
  for (const [field, allowed] of Object.entries(rules)) {
    const raw = args?.[field]
    if (raw === undefined || raw === null || raw === "") continue
    const val = String(raw).trim()
    if (!(allowed as readonly string[]).includes(val)) {
      out.push({ field, value: String(raw), allowed: [...allowed] })
    }
  }
  return out
}

/** Message d'erreur lisible pour l'agent (lui dit quoi choisir). */
export function enumViolationMessage(violations: EnumViolation[]): string {
  return "Valeur hors-scope refusée. " + violations
    .map(v => `'${v.field}'='${v.value}' invalide — choisis parmi: ${v.allowed.join(", ")}`)
    .join(" ; ")
}
