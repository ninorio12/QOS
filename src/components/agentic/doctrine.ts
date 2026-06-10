/**
 * VividFlow — Doctrine agentique partagée (modules Équipe IA / Tâches / Activités / Base de connaissance).
 *
 * Centralise le vocabulaire utilisateur, la gouvernance (santé, autonomie, scopes étanches, sources),
 * les helpers d'enrichissement (réel Convex → modèle agentique) et les jeux MOCK isolés
 * (skills, supermemory, gbrain, graphe mémoire) — voir BACKEND_BACKLOG.
 *
 * Règles : Supermemory = rappel sémantique (jamais source de vérité) ; scopes mémoire étanches
 * (Jonathan privé / Thomas privé / VividFlow partagé / Brvndlab) ; Process (SOP) ≠ Base de connaissance.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentHealth = 'ok' | 'attention' | 'blocked'
export type AutonomyLevel = 'read' | 'suggest' | 'execute_supervised'
export type MemoryScopeId = 'jonathan_prive' | 'thomas_prive' | 'vividflow_partage' | 'brvndlab'

export type AgenticAgent = {
  id: string
  name: string
  role: string
  status: string
  health: AgentHealth
  autonomy: AutonomyLevel
  channels: string[]
  connections: string[]      // systèmes connectés (Data OS, Slack, Supermemory, GBrain, …)
  allowedTools: string[]
  enabledSkills: string[]
  allowedMemoryScopes: MemoryScopeId[]
  lastRunAt?: string
  mission: string
  truthSources: string[]
  allowedActions: string[]
  forbiddenActions: string[]
  pendingApprovals: number
  recentCostEur?: number
  recentRuns: { at: string; summary: string; status: 'success' | 'attention' | 'error' }[]
  recentLogs: string[]
  errors: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Santé / Autonomie
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH: Record<AgentHealth, { label: string; color: string }> = {
  ok:        { label: 'OK',        color: '#16A34A' },
  attention: { label: 'Attention', color: '#D97706' },
  blocked:   { label: 'Bloqué',    color: '#DC2626' },
}

export const AUTONOMY: Record<AutonomyLevel, { label: string; short: string; color: string; help: string }> = {
  read:               { label: 'Lecture',              short: 'Lecture',  color: '#6B7280', help: 'Observe et lit. Ne propose ni n’exécute rien.' },
  suggest:            { label: 'Proposition',          short: 'Propose',  color: '#3462EE', help: 'Prépare des propositions soumises à validation humaine.' },
  execute_supervised: { label: 'Exécution supervisée', short: 'Exécute',  color: '#FF4D00', help: 'Peut exécuter des actions, sous supervision et traçabilité.' },
}

export function normAutonomy(raw?: string): AutonomyLevel {
  if (raw === 'read_only' || raw === 'read') return 'read'
  if (raw === 'execute' || raw === 'autonomous' || raw === 'execute_supervised') return 'execute_supervised'
  return 'suggest'
}
export function normHealth(raw?: string): AgentHealth {
  if (raw === 'attention' || raw === 'warning' || raw === 'warn') return 'attention'
  if (raw === 'blocked' || raw === 'error' || raw === 'down') return 'blocked'
  return 'ok'
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminologie : slugs techniques → noms humains
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_LABELS: Record<string, string> = {
  'arbitrage-priorites': 'Priorisation',
  'brief-quotidien':     'Brief quotidien',
  'delegation-agents':   'Délégation agents',
  'carousel-production': 'Production carrousel',
  'hook-writing':        'Rédaction de hooks',
  'audit-activites':     'Audit des activités',
  'detection-risque':    'Détection risque',
  'suivi-onboarding':    'Onboarding client',
  'qa-process':          'QA process',
}
export const skillLabel = (id: string) => SKILL_LABELS[id] ?? id

export const TOOL_LABELS: Record<string, string> = {
  tasks: 'Tâches', activities: 'Activités', knowledge: 'Connaissances',
  dataos: 'Data OS', slack: 'Slack', telegram: 'Telegram', email: 'Email',
}
export const toolLabel = (id: string) => TOOL_LABELS[id] ?? id

// Systèmes du système nerveux agentique (pour la rangée "Connecté à")
export const SYSTEMS = ['Data OS', 'Slack', 'Telegram', 'Supermemory', 'GBrain', 'Second Brain', 'Skills'] as const

/** Avatars officiels des agents (par nom). */
export const AGENT_AVATARS: Record<string, string> = {
  'COO': '/agents/coo.png',
  'AGENT ANALYSE': '/agents/analyse.png',
  'AGENT SUPPORT CLIENT': '/agents/support.png',
  'AGENT KB': '/agents/kb.png',
  'AGENT OPERATIONS': '/agents/operations.png',
}
export const agentAvatar = (name: string) => AGENT_AVATARS[name]

// ─────────────────────────────────────────────────────────────────────────────
// Scopes mémoire étanches
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryScope = {
  id: MemoryScopeId
  label: string
  confidentiality: 'Privé' | 'Partagé' | 'Cloisonné'
  color: string
  canRead: string[]
  canWrite: string[]
  agents: string[]
}

export const MEMORY_SCOPES: MemoryScope[] = [
  { id: 'jonathan_prive',   label: 'Jonathan privé',    confidentiality: 'Privé',     color: '#6366F1', canRead: ['Jonathan'],           canWrite: ['Jonathan'],           agents: ['COO'] },
  { id: 'thomas_prive',     label: 'Thomas privé',      confidentiality: 'Privé',     color: '#0F766E', canRead: ['Thomas'],             canWrite: ['Thomas'],             agents: ['COO', 'AGENT SUPPORT CLIENT'] },
  { id: 'vividflow_partage', label: 'VividFlow partagé', confidentiality: 'Partagé',  color: '#FF4D00', canRead: ['Jonathan', 'Thomas'], canWrite: ['Jonathan', 'Thomas'], agents: ['COO', 'AGENT ANALYSE', 'AGENT SUPPORT CLIENT', 'AGENT OPERATIONS', 'AGENT KB'] },
  { id: 'brvndlab',         label: 'Brvndlab',          confidentiality: 'Cloisonné', color: '#8B5CF6', canRead: ['Jonathan'],           canWrite: ['Jonathan'],           agents: ['COO'] },
]
export const scopeById = (id: MemoryScopeId) => MEMORY_SCOPES.find(s => s.id === id)

// ─────────────────────────────────────────────────────────────────────────────
// Sources de signal
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCES: Record<string, { label: string; color: string }> = {
  slack:    { label: 'Slack',    color: '#611f69' },
  telegram: { label: 'Telegram', color: '#229ED9' },
  email:    { label: 'Email',    color: '#0EA5E9' },
  dataos:   { label: 'Data OS',  color: '#FF4D00' },
  call:     { label: 'Appel',    color: '#16A34A' },
  document: { label: 'Document', color: '#6B7280' },
  manual:   { label: 'Manuel',   color: '#6B7280' },
  system:   { label: 'Système',  color: '#6B7280' },
}
export const sourceMeta = (s?: string) => SOURCES[s ?? 'dataos'] ?? { label: s ?? 'Data OS', color: '#6B7280' }

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulaire utilisateur (noms visibles) vs termes techniques (détail)
// ─────────────────────────────────────────────────────────────────────────────

export const VOCAB = {
  memory:       { label: 'Mémoire',            tech: 'Mémoire agentique' },
  skills:       { label: 'Méthodes',           tech: 'Skills' },
  gbrain:       { label: 'Contexte chargé',    tech: 'GBrain' },
  supermemory:  { label: 'Rappel sémantique',  tech: 'Supermemory' },
  secondBrain:  { label: 'Archives & preuves', tech: 'Second Brain' },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Enrichissement agents : os_agents (réel) → AgenticAgent
// ─────────────────────────────────────────────────────────────────────────────

type AgentGovernance = {
  mission: string
  truthSources: string[]
  allowedActions: string[]
  forbiddenActions: string[]
  memoryScopes: MemoryScopeId[]
  skills: string[]
  connections: string[]
  pendingApprovals: number
  recentCostEur: number
  health: AgentHealth
  recentRuns: { at: string; summary: string; status: 'success' | 'attention' | 'error' }[]
}

/** MOCK — gouvernance par agent (clé = nom). À brancher sur une future table os_agent_governance. */
const GOVERNANCE: Record<string, AgentGovernance> = {
  'COO': {
    mission: 'Coordination, priorisation, arbitrage, routage, validation finale.',
    truthSources: ['Data OS', 'Second Brain', 'Wiki validé'],
    allowedActions: ['Coordonner les agents', 'Prioriser', 'Arbitrer', 'Router le travail', 'Valider en dernier ressort'],
    forbiddenActions: ['Envoyer un paiement', 'Supprimer une donnée client', 'Agir hors supervision sur action sensible'],
    memoryScopes: ['vividflow_partage', 'jonathan_prive', 'thomas_prive', 'brvndlab'],
    skills: ['arbitrage-priorites', 'brief-quotidien', 'delegation-agents'],
    connections: ['Data OS', 'Slack', 'Telegram', 'Supermemory', 'GBrain', 'Second Brain', 'Skills'],
    pendingApprovals: 2, recentCostEur: 1.84, health: 'ok',
    recentRuns: [
      { at: '2026-06-06T08:12:00Z', summary: 'Brief quotidien — 3 priorités, 1 risque', status: 'success' },
      { at: '2026-06-05T18:02:00Z', summary: 'Délégation : relance client → AGENT SUPPORT CLIENT', status: 'success' },
    ],
  },
  'AGENT ANALYSE': {
    mission: 'Analyse, scraping, signaux, dashboards, insights, opportunités.',
    truthSources: ['Data OS', 'Activités'],
    allowedActions: ['Scraper des signaux', 'Analyser le business', 'Produire des dashboards & insights', 'Détecter des opportunités et anomalies'],
    forbiddenActions: ['Agir sur les données métier', 'Contacter des clients', 'Écrire hors scope VividFlow'],
    memoryScopes: ['vividflow_partage'],
    skills: ['detection-risque', 'audit-activites'],
    connections: ['Data OS', 'Second Brain', 'Skills'],
    pendingApprovals: 0, recentCostEur: 0.29, health: 'ok',
    recentRuns: [{ at: '2026-06-04T12:00:00Z', summary: 'Analyse signaux prospection — 2 opportunités détectées', status: 'success' }],
  },
  'AGENT SUPPORT CLIENT': {
    mission: 'Onboarding, suivi client, relances, satisfaction, risques, next steps.',
    truthSources: ['Data OS', 'Wiki validé'],
    allowedActions: ['Suivre l’onboarding', 'Relancer les clients', 'Détecter les risques', 'Préparer les next steps'],
    forbiddenActions: ['Promettre une remise', 'Modifier un contrat signé', 'Écrire hors scope VividFlow'],
    memoryScopes: ['vividflow_partage', 'thomas_prive'],
    skills: ['suivi-onboarding', 'detection-risque'],
    connections: ['Data OS', 'Telegram', 'Supermemory', 'Second Brain', 'Skills'],
    pendingApprovals: 0, recentCostEur: 0.41, health: 'ok',
    recentRuns: [{ at: '2026-06-06T07:05:00Z', summary: 'Relance client à risque — proposition envoyée', status: 'success' }],
  },
  'AGENT OPERATIONS': {
    mission: 'Exécution opérationnelle, emails, tâches externes, relances, actions administratives, mises à jour Data OS.',
    truthSources: ['Data OS', 'Activités'],
    allowedActions: ['Exécuter des tâches externes', 'Envoyer des emails / relances', 'Mettre à jour le Data OS', 'Exécuter une SOP', 'Faire un handoff'],
    forbiddenActions: ['Agir sans contexte complet', 'Valider une action sensible seul', 'Modifier un contrat signé'],
    memoryScopes: ['vividflow_partage'],
    skills: ['suivi-onboarding', 'qa-process'],
    connections: ['Data OS', 'Slack', 'Skills', 'Second Brain'],
    pendingApprovals: 0, recentCostEur: 0.55, health: 'attention',
    recentRuns: [{ at: '2026-06-05T17:40:00Z', summary: 'Relances email envoyées (3) — 1 en attente de validation', status: 'attention' }],
  },
  'AGENT KB': {
    mission: 'Base de connaissance, Wiki, Raw, Second Brain, GBrain, qualification des infos, liens Skills/SOPs/Playbooks, propreté mémoire.',
    truthSources: ['Data OS', 'Second Brain', 'Wiki validé'],
    allowedActions: ['Qualifier les infos captées', 'Mettre à jour le Wiki', 'Préparer le contexte (GBrain)', 'Lier Skills / SOPs / Playbooks', 'Garder la mémoire propre'],
    forbiddenActions: ['Publier une info non validée comme vérité', 'Mélanger les scopes mémoire', 'Supprimer des preuves'],
    memoryScopes: ['vividflow_partage'],
    skills: ['audit-activites', 'qa-process'],
    connections: ['Data OS', 'Second Brain', 'GBrain', 'Supermemory', 'Skills'],
    pendingApprovals: 1, recentCostEur: 0.63, health: 'ok',
    recentRuns: [{ at: '2026-06-06T06:30:00Z', summary: 'Qualification de 4 notes brutes → Wiki', status: 'success' }],
  },
}

const DEFAULT_GOV: AgentGovernance = {
  mission: 'Agent opérationnel du Data OS VividFlow.',
  truthSources: ['Data OS'],
  allowedActions: ['Lire les données autorisées', 'Proposer des actions'],
  forbiddenActions: ['Agir hors de son scope', 'Valider une action sensible sans supervision'],
  memoryScopes: ['vividflow_partage'], skills: [], connections: ['Data OS'],
  pendingApprovals: 0, recentCostEur: 0, health: 'ok', recentRuns: [],
}

export type RawAgent = {
  id: string; name: string; role: string; status: string; lane?: string
  autonomy?: string; channels?: string[]; tools?: string[]; health?: string; lastActiveAt?: string
}

export function enrichAgent(r: RawAgent): AgenticAgent {
  const gov = GOVERNANCE[r.name] ?? DEFAULT_GOV
  const health = normHealth(r.health) === 'ok' ? gov.health : normHealth(r.health)
  return {
    id: r.id, name: r.name, role: r.role, status: r.status,
    health,
    autonomy: normAutonomy(r.autonomy),
    channels: r.channels ?? ['dataos'],
    connections: gov.connections,
    allowedTools: r.tools ?? [],
    enabledSkills: gov.skills,
    allowedMemoryScopes: gov.memoryScopes,
    lastRunAt: r.lastActiveAt ?? gov.recentRuns[0]?.at,
    mission: gov.mission,
    truthSources: gov.truthSources,
    allowedActions: gov.allowedActions,
    forbiddenActions: gov.forbiddenActions,
    pendingApprovals: gov.pendingApprovals,
    recentCostEur: gov.recentCostEur,
    recentRuns: gov.recentRuns,
    recentLogs: [], errors: health === 'blocked' ? ['Action bloquée — validation requise'] : [],
  }
}

/** MOCK — agents de démonstration si la table os_agents est vide. */
export const DEMO_AGENTS: RawAgent[] = [
  { id: 'demo-coo',     name: 'COO',                  role: 'Coordination, priorisation, arbitrage, routage, validation finale',           autonomy: 'execute', channels: ['slack', 'telegram', 'dataos'], tools: ['tasks', 'activities', 'knowledge'], health: 'ok',        lastActiveAt: '2026-06-06T08:12:00Z' },
  { id: 'demo-analyse', name: 'AGENT ANALYSE',        role: 'Analyse, scraping, signaux, dashboards, insights, opportunités',              autonomy: 'suggest', channels: ['dataos'],                      tools: ['activities'],                       health: 'ok',        lastActiveAt: '2026-06-04T12:00:00Z' },
  { id: 'demo-support', name: 'AGENT SUPPORT CLIENT', role: 'Onboarding, suivi client, relances, satisfaction, risques, next steps',       autonomy: 'suggest', channels: ['dataos', 'telegram'],          tools: ['tasks', 'activities'],              health: 'ok',        lastActiveAt: '2026-06-06T07:05:00Z' },
  { id: 'demo-ops',     name: 'AGENT OPERATIONS',     role: 'Exécution opérationnelle, emails, tâches externes, relances, MAJ Data OS',    autonomy: 'execute', channels: ['dataos', 'slack'],             tools: ['tasks', 'activities'],              health: 'attention', lastActiveAt: '2026-06-05T17:40:00Z' },
  { id: 'demo-kb',      name: 'AGENT KB',             role: 'Base de connaissance, Wiki, Raw, Second Brain, GBrain, propreté mémoire',     autonomy: 'suggest', channels: ['dataos'],                      tools: ['knowledge', 'activities'],          health: 'ok',        lastActiveAt: '2026-06-06T06:30:00Z' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tâches — lecture d'exécutabilité agentique (dérivée des champs réels)
// ─────────────────────────────────────────────────────────────────────────────

export type ContextStatus = 'ready' | 'incomplete' | 'missing'

export type TaskReadiness = {
  contextStatus: ContextStatus
  agentReady: boolean
  approvalRequired: boolean
  sensitiveMemory: boolean
  skillRequired?: string       // nom humain
  memoryScope: MemoryScopeId
  proofUrl?: string
  nextAction?: string
}

type TaskLike = {
  title?: string; status: string; priority: string; assigneeType: string
  description?: string; linkedClientId?: string; source?: string; blockerReason?: string
}

/** Heuristique MOCK : déduit contexte/exécutabilité/skill/mémoire d'une tâche depuis ses champs réels. */
export function readiness(t: TaskLike): TaskReadiness {
  const hasContext = Boolean(t.description && t.description.trim().length > 12)
  const hasLink = Boolean(t.linkedClientId)
  const isAgent = t.assigneeType === 'agent'
  const sensitive = t.priority === 'urgent' || t.status === 'blocked'
  const title = (t.title ?? '').toLowerCase()

  let contextStatus: ContextStatus = 'missing'
  if (hasContext && hasLink) contextStatus = 'ready'
  else if (hasContext || hasLink) contextStatus = 'incomplete'

  // skill requis dérivé de l'intitulé (MOCK léger)
  let skillRequired: string | undefined
  if (/carrousel|contenu|post|hook/.test(title)) skillRequired = 'Production carrousel'
  else if (/relance|risque|churn|rétention/.test(title)) skillRequired = 'Détection risque'
  else if (/onboard|client|kickoff/.test(title)) skillRequired = 'Onboarding client'
  else if (/priorit|arbitr|brief/.test(title)) skillRequired = 'Priorisation'
  else if (/qa|process|audit|bug/.test(title)) skillRequired = 'QA process'

  const sensitiveMemory = sensitive || /contrat|paiement|privé|salaire|facture/.test(title)
  const memoryScope: MemoryScopeId = sensitiveMemory ? 'jonathan_prive' : 'vividflow_partage'

  const agentReady = isAgent && contextStatus === 'ready' && t.status !== 'blocked'
  const approvalRequired = sensitive || (isAgent && t.priority === 'high')

  let nextAction: string | undefined
  if (t.status === 'blocked') nextAction = t.blockerReason ? `Lever le blocage : ${t.blockerReason}` : 'Lever le blocage'
  else if (contextStatus !== 'ready') nextAction = 'Compléter le contexte (description + lien client/projet)'
  else if (approvalRequired) nextAction = 'Obtenir la validation avant exécution'
  else if (isAgent) nextAction = 'Exécutable par l’agent'

  return { contextStatus, agentReady, approvalRequired, sensitiveMemory, skillRequired, memoryScope, nextAction }
}

export const CONTEXT_STATUS: Record<ContextStatus, { label: string; color: string }> = {
  ready:      { label: 'Contexte complet',  color: '#16A34A' },
  incomplete: { label: 'Contexte partiel',  color: '#D97706' },
  missing:    { label: 'Contexte manquant', color: '#DC2626' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Activités — méta événement (type / résultat / mémoire / statut)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityKind = 'run' | 'task' | 'decision' | 'memory' | 'validation' | 'error'
export type ActivityStatus = 'success' | 'attention' | 'error'

export function activityMeta(eventType: string): {
  kind: ActivityKind; label: string; color: string; status: ActivityStatus; memoryUpdated: boolean
} {
  const ev = eventType
  if (ev.startsWith('task'))   return { kind: 'task',       label: 'Tâche',      color: '#3462EE', status: 'success',   memoryUpdated: false }
  if (ev === 'agent.proposed') return { kind: 'run',        label: 'Run proposé', color: '#D97706', status: 'attention', memoryUpdated: false }
  if (ev === 'agent.executed' || ev === 'run') return { kind: 'run', label: 'Run', color: '#16A34A', status: 'success', memoryUpdated: false }
  if (ev === 'approval')       return { kind: 'validation', label: 'Validation', color: '#16A34A', status: 'success',   memoryUpdated: false }
  if (ev === 'rejection')      return { kind: 'validation', label: 'Refus',      color: '#DC2626', status: 'attention', memoryUpdated: false }
  if (ev === 'decision')       return { kind: 'decision',   label: 'Décision',   color: '#8B5CF6', status: 'success',   memoryUpdated: true }
  if (ev === 'memory.update')  return { kind: 'memory',     label: 'Mémoire',    color: '#8B5CF6', status: 'success',   memoryUpdated: true }
  if (ev === 'error' || ev === 'blocker') return { kind: 'error', label: 'Erreur', color: '#DC2626', status: 'error', memoryUpdated: false }
  return { kind: 'run', label: ev, color: '#6B7280', status: 'success', memoryUpdated: false }
}

export const ACTIVITY_FILTERS: { id: string; label: string; match: (ev: string) => boolean }[] = [
  { id: 'all',        label: 'Toutes',     match: () => true },
  { id: 'run',        label: 'Runs',       match: ev => ev.startsWith('agent') || ev === 'run' },
  { id: 'decision',   label: 'Décisions',  match: ev => ev === 'decision' },
  { id: 'memory',     label: 'Mémoire',    match: ev => ev === 'memory.update' || ev === 'decision' },
  { id: 'validation', label: 'Validations', match: ev => ev === 'approval' || ev === 'rejection' },
  { id: 'error',      label: 'Erreurs',    match: ev => ev === 'error' || ev === 'blocker' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Base de connaissance — MOCK datasets isolés
// ─────────────────────────────────────────────────────────────────────────────

export type SkillItem = { id: string; name: string; description: string; agents: string[]; lastUsed: string; status: 'active' | 'review' | 'obsolete' }
export const DEMO_SKILLS: SkillItem[] = [
  { id: 'arbitrage-priorites', name: 'Priorisation',        description: 'Classe et arbitre les priorités du jour selon impact et urgence.', agents: ['COO'],   lastUsed: '2026-06-06', status: 'active' },
  { id: 'brief-quotidien',     name: 'Brief quotidien',     description: 'Compile priorités, risques et tâches du jour en un brief lisible.', agents: ['COO'],   lastUsed: '2026-06-06', status: 'active' },
  { id: 'delegation-agents',   name: 'Délégation agents',   description: 'Répartit les tâches vers le bon agent selon rôle et charge.',       agents: ['COO'],   lastUsed: '2026-06-05', status: 'active' },
  { id: 'carousel-production', name: 'Production carrousel', description: 'Génère un carrousel LinkedIn/Instagram prêt pour Figma.',           agents: ['AGENT OPERATIONS'],    lastUsed: '2026-06-05', status: 'active' },
  { id: 'audit-activites',     name: 'Audit des activités', description: 'Parcourt le journal pour repérer anomalies et blocages.',           agents: ['AGENT OPERATIONS'],       lastUsed: '2026-04-19', status: 'obsolete' },
  { id: 'detection-risque',    name: 'Détection risque',    description: 'Score le risque de churn d’un client à partir des signaux.',        agents: ['AGENT SUPPORT CLIENT'],   lastUsed: '2026-05-28', status: 'review' },
  { id: 'suivi-onboarding',    name: 'Onboarding client',   description: 'Suit les étapes d’onboarding et déclenche les relances.',           agents: ['AGENT SUPPORT CLIENT'],   lastUsed: '2026-06-06', status: 'active' },
  { id: 'qa-process',          name: 'QA process',          description: 'Vérifie la conformité d’un process avant exécution.',               agents: ['AGENT OPERATIONS'],       lastUsed: '2026-06-03', status: 'active' },
]
export const SKILL_STATUS: Record<SkillItem['status'], { label: string; color: string }> = {
  active:   { label: 'Actif',    color: '#16A34A' },
  review:   { label: 'À revoir', color: '#D97706' },
  obsolete: { label: 'Obsolète', color: '#9CA3AF' },
}

export type SupermemoryStatus = 'useful' | 'review' | 'obsolete'
export type SupermemoryItem = { id: string; container: MemoryScopeId; theme: string; source: string; lastUsed: string; confidence: number; status: SupermemoryStatus }
export const DEMO_SUPERMEMORY: SupermemoryItem[] = [
  { id: 'sm-1', container: 'vividflow_partage', theme: 'Objections récurrentes en closing', source: 'Appels de vente', lastUsed: '2026-06-06', confidence: 0.82, status: 'useful' },
  { id: 'sm-2', container: 'vividflow_partage', theme: 'Préférences de ton éditorial',       source: 'Wiki validé',     lastUsed: '2026-06-04', confidence: 0.74, status: 'useful' },
  { id: 'sm-3', container: 'jonathan_prive',    theme: 'Arbitrages stratégiques passés',     source: 'Notes privées',   lastUsed: '2026-06-01', confidence: 0.66, status: 'review' },
  { id: 'sm-4', container: 'vividflow_partage', theme: 'Anciennes promos (périmées)',        source: 'Slack',           lastUsed: '2026-03-12', confidence: 0.34, status: 'obsolete' },
]
export const SUPERMEMORY_STATUS: Record<SupermemoryStatus, { label: string; color: string }> = {
  useful:   { label: 'Utile',    color: '#16A34A' },
  review:   { label: 'À valider', color: '#D97706' },
  obsolete: { label: 'Obsolète', color: '#9CA3AF' },
}

export type GbrainContext = { id: string; loadedFor: string; agent: string; sources: string[]; at: string }
export const DEMO_GBRAIN: GbrainContext[] = [
  { id: 'gb-1', loadedFor: 'Relance client à risque — Run #1284', agent: 'AGENT SUPPORT CLIENT', sources: ['Data OS', 'Wiki validé', 'Rappel sémantique'], at: '2026-06-06T07:05:00Z' },
  { id: 'gb-2', loadedFor: 'Brief quotidien — Run #1283',         agent: 'COO', sources: ['Activités', 'Tâches', 'Wiki validé'],          at: '2026-06-06T08:12:00Z' },
  { id: 'gb-3', loadedFor: 'Brouillon carrousel acquisition',     agent: 'AGENT OPERATIONS',  sources: ['Wiki validé', 'Second Brain'],                 at: '2026-06-05T17:40:00Z' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Graphe mémoire — MOCK (nœuds + liens), couleurs par scope
// ─────────────────────────────────────────────────────────────────────────────

export type GraphNodeType = 'agent' | 'skill' | 'memory' | 'document' | 'run' | 'proof'
export type GraphNode = {
  id: string; label: string; type: GraphNodeType; scope: MemoryScopeId
  source?: string; status?: string; x: number; y: number
}
export type GraphEdge = { from: string; to: string }

export const NODE_TYPE: Record<GraphNodeType, { label: string }> = {
  agent: { label: 'Agent' }, skill: { label: 'Méthode' }, memory: { label: 'Mémoire' },
  document: { label: 'Document' }, run: { label: 'Run' }, proof: { label: 'Preuve' },
}

/** MOCK — graphe du système nerveux (positions normalisées 0..1). */
export const MEMORY_GRAPH: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [
    { id: 'a-cos', label: 'COO', type: 'agent',    scope: 'vividflow_partage', x: 0.50, y: 0.16 },
    { id: 'a-cs',  label: 'AGENT SUPPORT CLIENT', type: 'agent',    scope: 'vividflow_partage', x: 0.18, y: 0.42 },
    { id: 'a-cmo', label: 'AGENT OPERATIONS',  type: 'agent',    scope: 'vividflow_partage', x: 0.82, y: 0.42 },
    { id: 's-prio', label: 'Priorisation',  type: 'skill',    scope: 'vividflow_partage', x: 0.50, y: 0.40 },
    { id: 's-risk', label: 'Détection risque', type: 'skill', scope: 'vividflow_partage', x: 0.20, y: 0.66 },
    { id: 's-caro', label: 'Production carrousel', type: 'skill', scope: 'vividflow_partage', x: 0.82, y: 0.66 },
    { id: 'm-obj',  label: 'Objections closing', type: 'memory', scope: 'vividflow_partage', x: 0.38, y: 0.84 },
    { id: 'm-priv', label: 'Arbitrages privés', type: 'memory', scope: 'jonathan_prive',   x: 0.66, y: 0.18 },
    { id: 'm-thom', label: 'Notes Thomas',    type: 'memory',   scope: 'thomas_prive',     x: 0.06, y: 0.24 },
    { id: 'd-wiki', label: 'Wiki validé',     type: 'document', scope: 'vividflow_partage', x: 0.62, y: 0.84 },
    { id: 'r-1284', label: 'Run #1284',       type: 'run',      scope: 'vividflow_partage', x: 0.08, y: 0.82 },
    { id: 'p-1284', label: 'Preuve relance',  type: 'proof',    scope: 'vividflow_partage', x: 0.30, y: 0.98 },
    { id: 'm-brvnd', label: 'Mémoire Brvndlab', type: 'memory', scope: 'brvndlab',         x: 0.92, y: 0.16 },
  ],
  edges: [
    { from: 'a-cos', to: 's-prio' }, { from: 'a-cos', to: 'm-priv' }, { from: 'a-cos', to: 'm-brvnd' }, { from: 'a-cos', to: 'm-thom' },
    { from: 'a-cs', to: 's-risk' }, { from: 'a-cs', to: 'r-1284' }, { from: 's-risk', to: 'm-obj' },
    { from: 'r-1284', to: 'p-1284' }, { from: 'r-1284', to: 'm-obj' },
    { from: 'a-cmo', to: 's-caro' }, { from: 's-caro', to: 'd-wiki' }, { from: 's-prio', to: 'd-wiki' },
    { from: 'a-cos', to: 'a-cs' }, { from: 'a-cos', to: 'a-cmo' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Backlog backend — champs actuellement MOCK à brancher
// ─────────────────────────────────────────────────────────────────────────────

export const BACKEND_BACKLOG = [
  'os_agents : allowedMemoryScopes, enabledSkills, forbiddenActions, truthSources, connections, pendingApprovals, recentCostEur, mission, recentRuns',
  'os_tasks : contextStatus, approvalRequired, skillRequired, memoryScope, sensitiveMemory, proofUrl, nextAction (sinon dérivés par readiness())',
  'os_activities : result, proofUrl, memoryUpdated, cost, status, linkedRunId (sinon dérivés par activityMeta())',
  'os_knowledge : category (wiki|skill|supermemory|gbrain), usedByAgents, confidence — sections Méthodes/Rappel sémantique/Contexte chargé/Graphe actuellement MOCK',
] as const
