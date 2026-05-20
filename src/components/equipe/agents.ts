export type AgentIcon = 'cpu' | 'users' | 'database' | 'code' | 'megaphone' | 'chart'
export type AgentStatus = 'online' | 'offline'

export type AgentSkill = {
  label: string
  icon: string
}

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
  skills: AgentSkill[]
  logs: string[]
}

export const EQUIPE_AGENTS: EquipeAgent[] = [
  {
    id: 'soren',
    name: 'VividFlow',
    role: 'COO / Orchestrateur Système',
    roleShort: 'COO · ORCHESTRATEUR',
    icon: 'cpu',
    accentColor: '#FF4D00',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      'VividFlow est le COO Digital de votre équipe IA. Il orchestre tous les agents, gère les priorités, et communique avec vous via Telegram.',
    tools: ['read_leads', 'send_telegram', 'delegate_kai', 'delegate_mia', 'analyze_pipeline'],
    skills: [
      { label: 'Orchestration', icon: 'Cpu' },
      { label: 'Délégation', icon: 'Users' },
      { label: 'Analyse', icon: 'BarChart2' },
    ],
    logs: [],
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'CSM / Customer Success Manager',
    roleShort: 'CSM · CUSTOMER SUCCESS',
    icon: 'users',
    accentColor: '#1A5C38',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      "Kai est le CSM Digital de l'équipe. Il gère les leads entrants, qualifie les prospects, envoie les relances et assure le suivi client. Il reporte à VividFlow.",
    tools: ['send_whatsapp', 'update_opportunity', 'send_telegram', 'contact_lookup', 'book_appointment'],
    skills: [
      { label: 'Customer Success', icon: 'Users' },
      { label: 'Acquisition', icon: 'Target' },
      { label: 'Relance', icon: 'RefreshCw' },
      { label: 'Réception', icon: 'Inbox' },
    ],
    logs: [],
  },
  {
    id: 'alex',
    name: 'Alex',
    role: 'CMO / Chief Marketing Officer',
    roleShort: 'CMO · MARKETING',
    icon: 'megaphone',
    accentColor: '#E8836A',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      "Alex est le futur CMO Digital de l'équipe. Il pilotera la stratégie marketing, gérera les campagnes d'acquisition et optimisera le contenu client. Il reporte à VividFlow.",
    tools: ['generate_quote', 'create_campaign', 'search_knowledge', 'update_content', 'send_email'],
    skills: [
      { label: 'Analyse', icon: 'BarChart2' },
      { label: 'SEO', icon: 'Search' },
      { label: 'Community Manager', icon: 'MessageSquare' },
    ],
    logs: [],
  },
  {
    id: 'mia',
    name: 'Mia',
    role: 'CTO / Chief Technology Officer',
    roleShort: 'CTO · TECHNOLOGY',
    icon: 'code',
    accentColor: '#6366F1',
    status: 'offline',
    model: 'gemini-2.5-flash',
    lastHeartbeat: 'Jamais',
    description:
      "Mia est la CTO Digital de l'équipe. Elle supervise l'infrastructure technique, monitore les APIs, déploie les mises à jour et assure la sécurité des systèmes. Elle reporte à VividFlow.",
    tools: ['review_code', 'deploy_system', 'monitor_infra', 'optimize_api', 'security_audit'],
    skills: [
      { label: 'Tech & Innovation', icon: 'Cpu' },
      { label: 'Amélioration', icon: 'Wrench' },
      { label: 'Performance', icon: 'Zap' },
      { label: 'Compétences', icon: 'Brain' },
    ],
    logs: [],
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'CFO / Chief Financial Officer',
    roleShort: 'CFO · FINANCE',
    icon: 'chart',
    accentColor: '#0F766E',
    status: 'offline',
    model: 'claude-haiku-4-5-20251001',
    lastHeartbeat: 'Jamais',
    description:
      "Leo est le CFO Digital de l'équipe. Il analyse les revenus, prédit le MRR, génère les rapports financiers et optimise le ROI des campagnes. Il reporte à VividFlow.",
    tools: ['analyze_revenue', 'forecast_mrr', 'generate_report', 'track_costs', 'roi_analysis'],
    skills: [
      { label: 'Rapports', icon: 'FileText' },
      { label: 'Bilan', icon: 'BookOpen' },
      { label: 'Banque', icon: 'Landmark' },
    ],
    logs: [],
  },
]
