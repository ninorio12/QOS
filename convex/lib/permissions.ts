// ───────────────────────────────────────────────────────────────────────────
// Data OS — moteur de permissions (PUR, sans dépendance Convex/Node).
// Importé par : le serveur MCP (src/app/api/mcp), les fonctions Convex (enforce,
// seed) et les tests. Aucune I/O ici → entièrement testable.
//
// Modèle : un agent possède un ensemble de "scopes" `module:verb`.
//   - deny-by-default : sans scope correspondant → 'forbidden'.
//   - certains scopes sont marqués requiresApproval → 'approval' (pas d'exécution).
//   - `read` est impliqué par write/execute/approve ; `admin` implique tout le module.
// ───────────────────────────────────────────────────────────────────────────

export type Decision = "execute" | "approval" | "forbidden"
export type Role = "coo" | "kb" | "csm" | "ops" | "analyst" | "media-buyer" | "debug"

export type Grant = { scope: string; level: string; requiresApproval: boolean; resource?: string }

// `module:verb` requis par chaque outil MCP. approvalIfValue : l'outil ne passe
// en approval que si `args.value` est fourni (changement de montant client).
export type PolicyEntry = { module: string; verb: string; approvalIfValue?: boolean; criticalKnowledge?: boolean }

const scopeStr = (g: { scope: string; level: string }) => `${g.scope}:${g.level}`

// Un scope accordé satisfait-il le scope requis ? (avec implications)
export function scopeAllows(granted: Set<string>, required: string): boolean {
  if (granted.has(required)) return true
  const [mod, verb] = required.split(":")
  if (granted.has(`${mod}:admin`)) return true
  // Toute capacité sur un module implique la lecture de ce module.
  if (verb === "read") { for (const s of granted) if (s.startsWith(`${mod}:`)) return true }
  return false
}

// Décision finale pour un scope requis donné.
export function decide(granted: Set<string>, approvalRequired: Set<string>, required: string, forceApproval = false): Decision {
  if (!scopeAllows(granted, required)) return "forbidden"
  if (forceApproval || approvalRequired.has(required)) return "approval"
  return "execute"
}

// Résout le scope requis d'un appel d'outil (gère les cas dynamiques).
export function requiredScopeForCall(tool: string, args: Record<string, unknown> = {}): { scope: string; criticalKnowledge?: boolean } | null {
  const p = POLICY[tool]
  if (!p) return null // outil inconnu → deny-by-default côté appelant
  if (p.approvalIfValue && args.value !== undefined) return { scope: `${p.module}:value` }
  return { scope: `${p.module}:${p.verb}`, criticalKnowledge: p.criticalKnowledge }
}

// ── POLICY MAP : 56 outils MCP → module:verb ────────────────────────────────
export const POLICY: Record<string, PolicyEntry> = {
  // Contacts
  contacts_list: { module: "contacts", verb: "read" },
  contacts_get: { module: "contacts", verb: "read" },
  contacts_create: { module: "contacts", verb: "write" },
  contacts_update: { module: "contacts", verb: "write" },
  contacts_delete_or_archive: { module: "contacts", verb: "archive" },
  // Pipeline / leads
  pipeline_list: { module: "pipeline", verb: "read" },
  pipeline_get: { module: "pipeline", verb: "read" },
  pipeline_move: { module: "pipeline", verb: "move" },
  leads_create: { module: "pipeline", verb: "write" },
  leads_update: { module: "pipeline", verb: "write" },
  leads_convert_to_client: { module: "clients", verb: "convert" },
  leads_mark_lost: { module: "pipeline", verb: "write" },
  // Clients
  clients_list: { module: "clients", verb: "read" },
  clients_get: { module: "clients", verb: "read" },
  clients_create_or_convert: { module: "clients", verb: "convert" },
  clients_update: { module: "clients", verb: "write", approvalIfValue: true },
  clients_health_summary: { module: "clients", verb: "read" },
  // Sales calls
  sales_calls_list: { module: "sales_calls", verb: "read" },
  sales_calls_create: { module: "sales_calls", verb: "write" },
  sales_calls_update: { module: "sales_calls", verb: "write" },
  sales_calls_summary: { module: "sales_calls", verb: "read" },
  objections_extract_or_save: { module: "objections", verb: "write" },
  // Outreach
  outreach_list: { module: "outreach", verb: "read" },
  outreach_create: { module: "outreach", verb: "write" },
  outreach_update: { module: "outreach", verb: "write" },
  outreach_followup_due: { module: "outreach", verb: "read" },
  outreach_summary: { module: "outreach", verb: "read" },
  // Tasks
  tasks_list: { module: "tasks", verb: "read" },
  tasks_create: { module: "tasks", verb: "write" },
  tasks_update: { module: "tasks", verb: "write" },
  tasks_comment: { module: "tasks", verb: "write" },
  // Activities
  activities_list: { module: "activities", verb: "read" },
  activities_log: { module: "activities", verb: "write" },
  // Agents (lecture seule via MCP ; admin = routes Next.js humaines)
  agents_list: { module: "agents", verb: "read" },
  // Knowledge / memory
  knowledge_list: { module: "knowledge", verb: "read" },
  knowledge_propose: { module: "knowledge", verb: "write" },
  knowledge_approve: { module: "knowledge", verb: "approve", criticalKnowledge: true },
  objections_list: { module: "objections", verb: "read" },
  // Handoffs (transfert de responsabilité entre agents)
  handoffs_list: { module: "handoff", verb: "read" },
  handoffs_create: { module: "handoff", verb: "create" },
  handoffs_accept: { module: "handoff", verb: "accept" },
  handoffs_complete: { module: "handoff", verb: "route" },
  // Skills / SOPs persistants (procédures, playbooks)
  skills_list: { module: "skills", verb: "read" },
  skills_create: { module: "skills", verb: "write" },
  skills_remove: { module: "skills", verb: "archive" }, // destructif → APPROVAL_VERBS
  // Process
  processes_list: { module: "processes", verb: "read" },
  // Prospection
  prospection_list: { module: "prospection", verb: "read" },
  prospection_create_or_link_contact: { module: "prospection", verb: "write" },
  prospection_quick_action: { module: "prospection", verb: "action" },
  prospection_move: { module: "prospection", verb: "action" },
  prospection_mark_r1_booked: { module: "prospection", verb: "action" },
  prospection_mark_lost: { module: "prospection", verb: "action" },
  prospection_set_phase: { module: "prospection", verb: "write" },
  prospection_set_temperature: { module: "prospection", verb: "write" },
  prospection_set_next_followup: { module: "prospection", verb: "write" },
  prospection_summary: { module: "prospection", verb: "read" },
  // Performance
  performance_summary: { module: "performance", verb: "read" },
  performance_activity_calendar: { module: "performance", verb: "read" },
  performance_set_r1_objective: { module: "performance", verb: "write" },
  performance_daily_tasks_list: { module: "performance", verb: "read" },
  performance_daily_tasks_create: { module: "performance", verb: "write" },
  performance_daily_tasks_update: { module: "performance", verb: "write" },
  // Devis
  devis_list:   { module: "devis", verb: "read" },
  devis_get:    { module: "devis", verb: "read" },
  devis_create: { module: "devis", verb: "write" },
  devis_update: { module: "devis", verb: "write" },
  devis_delete: { module: "devis", verb: "delete" },
  // Media buyer
  media_buyer_board:  { module: "media_buyer", verb: "read" },
  media_buyer_upsert: { module: "media_buyer", verb: "write" },
  media_buyer_remove: { module: "media_buyer", verb: "delete" },
  // Onboarding
  onboarding_list:               { module: "onboarding", verb: "read" },
  onboarding_get_by_contact:     { module: "onboarding", verb: "read" },
  onboarding_payments_overview:  { module: "onboarding", verb: "read" },
  onboarding_save_progress:      { module: "onboarding", verb: "write" },
  // Closing (prép R1/R2 + confirmation)
  closing_upcoming_calls:        { module: "closing", verb: "read" },
  closing_save_call_note:        { module: "closing", verb: "write" },
  confirmation_list_for_contact: { module: "closing", verb: "read" },
  confirmation_create:           { module: "closing", verb: "write" },
  confirmation_link:             { module: "closing", verb: "write" },
  // Records (bibliothèque/records — méta des records)
  records_list:   { module: "records", verb: "read" },
  records_get:    { module: "records", verb: "read" },
  records_patch:  { module: "records", verb: "write" },
  records_remove: { module: "records", verb: "delete" },
  // Library (bibliothèque/data)
  library_list:          { module: "library", verb: "read" },
  library_folders_list:  { module: "library", verb: "read" },
  library_add_link:      { module: "library", verb: "write" },
  library_update_item:   { module: "library", verb: "write" },
  library_remove:        { module: "library", verb: "delete" },
  library_create_folder: { module: "library", verb: "write" },
  library_rename_folder: { module: "library", verb: "write" },
  library_delete_folder: { module: "library", verb: "delete" },
  // KB docs
  kb_docs_list:   { module: "kb_docs", verb: "read" },
  kb_docs_get:    { module: "kb_docs", verb: "read" },
  kb_docs_upsert: { module: "kb_docs", verb: "write" },
  // Process (écriture) — processes_list (read) déjà mappé plus haut
  processes_create:         { module: "processes", verb: "write" },
  processes_update:         { module: "processes", verb: "write" },
  process_category_create:  { module: "processes", verb: "write" },
  process_subfolder_create: { module: "processes", verb: "write" },
  // État COO global
  dataos_state: { module: "dataos", verb: "read" },
}

// ── Verbes qui requièrent une approbation quand ils sont accordés ───────────
// (le seed pose requiresApproval=true sur ces (module,verb) ; ici pour cohérence/tests)
// Zéro autorisation (décision Thomas 2026-06-16) : aucune action n'exige d'approbation.
// L'audit append-only (os_activities) reste la traçabilité. Le flux createPendingApproval/
// reviewApproval est conservé dans le code mais devient dormant.
export const APPROVAL_VERBS = new Set<string>([])

// ── ACCÈS COMPLET UNIFORME ──────────────────────────────────────────────────
// Décision produit (2026-06) : on ne cloisonne plus l'accès aux données par
// rôle. Chaque agent peut effectuer N'IMPORTE QUELLE action du Data OS ; c'est
// l'orchestrateur (COO/chief_of_staff) qui cible le travail via son brief.
// La machinerie de sécurité reste intacte : deny-by-default au niveau token
// (intersection credential ∩ permissions), audit append-only, et surtout les
// verbes sensibles (APPROVAL_VERBS : archive/convert/value/send) restent en
// approbation humaine/COO — l'autonomie ne lève pas le garde-fou irréversible.
const g = (scope: string, level: string, requiresApproval = false, resource?: string): Grant => ({ scope, level, requiresApproval, resource })

// Scopes d'orchestration/méta sans outil MCP dédié (pas dans POLICY).
const EXTRA_SCOPES: [string, string][] = [
  ["tasks", "assign"], ["processes", "write"],
  ["agents", "read"],
  ["clients", "archive"], ["outreach", "send"], // verbes sensibles sans outil dédié → approbation
  ["approvals", "read"], ["approvals", "review"],
  ["handoff", "read"], ["handoff", "create"], ["handoff", "accept"], ["handoff", "route"],
  ["memory", "read"], ["memory", "write"], ["memory", "approve"],
  ["dataos", "read"],
  ["runtime", "read"], ["runtime", "heartbeat"],
]

// FULL_GRANTS = tout module:verb mappé à un outil + les scopes méta ci-dessus.
// requiresApproval dérivé d'APPROVAL_VERBS → un seul endroit de vérité.
function buildFullGrants(): Grant[] {
  const byKey = new Map<string, Grant>()
  const add = (scope: string, level: string) => {
    const key = `${scope}:${level}`
    if (!byKey.has(key)) byKey.set(key, g(scope, level, APPROVAL_VERBS.has(level)))
  }
  for (const p of Object.values(POLICY)) {
    add(p.module, p.verb)
    if (p.approvalIfValue) add(p.module, "value") // scope dynamique « changement de montant »
  }
  for (const [scope, level] of EXTRA_SCOPES) add(scope, level)
  return [...byKey.values()]
}

export const FULL_GRANTS: Grant[] = buildFullGrants()

// Tous les rôles partagent le même jeu complet. Les clés de rôle restent (libellés
// UI / identité Hermes), mais ne différencient plus l'accès données.
export const ROLE_TEMPLATES: Record<Role, Grant[]> = {
  coo: FULL_GRANTS, kb: FULL_GRANTS, csm: FULL_GRANTS, ops: FULL_GRANTS, analyst: FULL_GRANTS,
  "media-buyer": FULL_GRANTS, debug: FULL_GRANTS,
}

// slug Data OS → rôle template
export const SLUG_TO_ROLE: Record<string, Role> = {
  coo: "coo",
  "agent-kb": "kb",
  "agent-support-client": "csm",
  "agent-operations": "ops",
  "agent-analyse": "analyst",
  "agent-media-buyer": "media-buyer",
  "agent-debug": "debug",
}

// Dérive les scopes (et ceux à approval) à partir d'une liste de grants.
export function scopesFromGrants(grants: Grant[]): { scopes: string[]; approvalScopes: string[] } {
  const scopes: string[] = []
  const approvalScopes: string[] = []
  for (const gr of grants) {
    const s = scopeStr(gr)
    scopes.push(s)
    if (gr.requiresApproval) approvalScopes.push(s)
  }
  return { scopes, approvalScopes }
}
