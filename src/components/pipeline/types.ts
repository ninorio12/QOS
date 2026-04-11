// ─── Dynamic pipeline types (GHL-driven) ─────────────────────

export type GHLStage = {
  id:       string
  name:     string
  color:    string
  position: number
}

export type GHLPipelineData = {
  id:     string
  name:   string
  stages: GHLStage[]
}

export type Opportunity = {
  id:         string
  name:       string
  company:    string
  value:      number
  source:     string
  createdAt:  string
  initials:   string
  stageId:    string   // real GHL stage ID
  pipelineId: string   // real GHL pipeline ID
  email:      string
  phone:      string
  contactId:  string
  tags:       string[]
  status:     'open' | 'won' | 'lost' | 'abandoned'
}

// ─── Legacy types for KanbanBoard (deprecated) ──────────────
export type Lead = {
  id: string
  name: string
  company: string
  columnId: ColumnId
  email?: string
  phone?: string
  source: string
  createdAt: string
  value: number
  initials: string[]
}

export type Column = {
  id: ColumnId
  name: string
  label: string
  color: string
}

export type ColumnId = 'nouveau' | 'qualif' | 'proposition' | 'negociation' | 'gagne'

// Legacy data for KanbanBoard - should be replaced with dynamic GHL data
export const COLUMNS: Column[] = [
  { id: 'nouveau', name: 'Nouveau', label: 'Nouveau', color: '#3B82F6' },
  { id: 'qualif', name: 'Qualifié', label: 'Qualifié', color: '#F97316' },
  { id: 'proposition', name: 'Proposition', label: 'Proposition', color: '#8B5CF6' },
  { id: 'negociation', name: 'Négociation', label: 'Négociation', color: '#EC4899' },
  { id: 'gagne', name: 'Gagné', label: 'Gagné', color: '#22C55E' },
]

export const SOURCE_COLORS: Record<string, string> = {
  'web': '#3B82F6',
  'phone': '#8B5CF6',
  'email': '#EC4899',
  'referral': '#F97316',
  'partner': '#06B6D4',
}

export const INITIAL_LEADS: Lead[] = []

// ─── Stage color mapping ──────────────────────────────────────
export function stageColor(name: string): string {
  const n = name.toLowerCase()
  // Terminal negative states (check before generic "qualif")
  if (n.includes('non qualif') || n.includes('épuisé') || n.includes('froid') || n.includes('perdu')) return '#9CA3AF'
  if (n.includes('désinscrit') || n.includes('spam')   || n.includes('hors sujet') || n.includes('lost'))  return '#EF4444'
  // Positive terminal
  if (n.includes('résolu') || n.includes('signé') || n.includes('gagné') || n.includes('won')) return '#22C55E'
  // In-progress
  if (n.includes('séquence') || n.includes('ia en') || n.includes('conversation')) return '#8B5CF6'
  if (n.includes('répondu')  || n.includes('transféré'))  return '#EAB308'
  if (n.includes('qualif'))                               return '#F97316'
  if (n.includes('rdv')      || n.includes('booké'))      return '#1D4ED8'
  if (n.includes('devis'))                                return '#6366F1'
  // Default: nouveau / message / réactiver / contact → blue
  return '#3B82F6'
}
