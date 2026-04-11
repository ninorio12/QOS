export type AgentIcon = 'cpu' | 'users' | 'database'
export type AgentStatus = 'online' | 'offline'

export type EquipeAgent = {
  id: string
  name: string
  role: string
  roleShort: string
  icon: AgentIcon
  accentColor: string
  status: AgentStatus
  model: string
  lastHeartbeat: string
  description: string
  tools: string[]
  logs: string[]
}

export const EQUIPE_AGENTS: EquipeAgent[] = [
  {
    id: 'soren',
    name: 'Soren',
    role: 'COO / Orchestrateur Système',
    roleShort: 'COO · ORCHESTRATEUR',
    icon: 'cpu',
    accentColor: '#4A91A8',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      'Soren est le COO Digital de votre équipe IA. Il orchestre tous les agents, gère les priorités, et communique avec le CEO via Telegram.',
    tools: ['read_leads', 'send_telegram', 'delegate_kai', 'delegate_mia', 'analyze_pipeline'],
    logs: [],
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'CSM / Customer Success Manager',
    roleShort: 'CSM · CUSTOMER SUCCESS MANAGER',
    icon: 'users',
    accentColor: '#1A5C38',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      'Kai est le CSM Digital de l\'équipe. Il gère les leads entrants, qualifie les prospects, envoie les relances et assure le suivi client. Il reporte à Soren qui te transmet le compte rendu.',
    tools: ['send_whatsapp', 'update_opportunity', 'send_telegram', 'contact_lookup', 'book_appointment'],
    logs: [],
  },
  {
    id: 'mia',
    name: 'Mia',
    role: 'KB / Knowledge Base Manager',
    roleShort: 'KB · KNOWLEDGE BASE MANAGER',
    icon: 'database',
    accentColor: '#E8836A',
    status: 'offline',
    model: 'gemini-2.5-flash',
    lastHeartbeat: 'Jamais',
    description:
      'Mia est la KB Manager de l\'équipe. Elle génère les devis, maintient la base de connaissance client et archive les documents. Elle opère en interne et reporte à Soren qui te transmet le compte rendu.',
    tools: ['generate_quote', 'create_document', 'search_knowledge', 'update_contact', 'send_email'],
    logs: [],
  },
]

