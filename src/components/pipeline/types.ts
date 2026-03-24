export type Lead = {
  id: string
  name: string
  company: string
  value: number
  source: 'Meta Ads' | 'WhatsApp' | 'LinkedIn' | 'Téléphone' | 'Site web' | 'Referral' | 'Email'
  createdAt: string
  initials: string[]
  columnId: ColumnId
}

export type ColumnId =
  | 'nouveau'
  | 'contact_ia'
  | 'conversation'
  | 'qualifie'
  | 'rdv'
  | 'non_qualifie'
  | 'perdu'

export type Column = {
  id: ColumnId
  label: string
  color: string
  textDark?: boolean
}

export const COLUMNS: Column[] = [
  { id: 'nouveau',       label: 'Nouveau Lead',     color: '#3D4F6B' },
  { id: 'contact_ia',    label: '1er Contact IA',   color: '#3462EE' },
  { id: 'conversation',  label: 'En Conversation',  color: '#4A91A8' },
  { id: 'qualifie',      label: 'Qualifié',         color: '#EFE347', textDark: true },
  { id: 'rdv',           label: 'RDV Booké',        color: '#C8F135', textDark: true },
  { id: 'non_qualifie',  label: 'Non Qualifié',     color: '#EF4444' },
  { id: 'perdu',         label: 'Perdu',            color: '#232D3F' },
]

export const SOURCE_COLORS: Record<Lead['source'], string> = {
  'Meta Ads':  '#3462EE',
  'WhatsApp':  '#22c55e',
  'LinkedIn':  '#0A66C2',
  'Téléphone': '#4A91A8',
  'Site web':  '#8B5CF6',
  'Referral':  '#EFE347',
  'Email':     '#8896AB',
}

export const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Martin Dupont',   company: 'Dupont Constructions', value: 87000,  source: 'Meta Ads',  createdAt: '2025-03-20', initials: ['MD'],       columnId: 'nouveau' },
  { id: '2', name: 'Sophie Laurent',  company: 'Laurent Immo',         value: 234000, source: 'LinkedIn',  createdAt: '2025-03-18', initials: ['SL', 'TM'], columnId: 'nouveau' },
  { id: '3', name: 'Pierre Moreau',   company: 'Moreau BTP',           value: 56000,  source: 'WhatsApp',  createdAt: '2025-03-17', initials: ['PM'],       columnId: 'contact_ia' },
  { id: '4', name: 'Claire Fontaine', company: 'Fontaine & Fils',      value: 142000, source: 'Meta Ads',  createdAt: '2025-03-15', initials: ['CF', 'AB'], columnId: 'contact_ia' },
  { id: '5', name: 'Julien Renard',   company: 'Renard Génie Civil',   value: 312000, source: 'Site web',  createdAt: '2025-03-14', initials: ['JR'],       columnId: 'conversation' },
  { id: '6', name: 'Marie Chevalier', company: 'MCh Rénovation',       value: 68000,  source: 'Referral',  createdAt: '2025-03-12', initials: ['MC'],       columnId: 'qualifie' },
  { id: '7', name: 'Thomas Bernard',  company: 'Bernard Travaux',      value: 512000, source: 'Téléphone', createdAt: '2025-03-10', initials: ['TB', 'JL'], columnId: 'qualifie' },
  { id: '8', name: 'Emma Petit',      company: 'Petit & Associés',     value: 178000, source: 'LinkedIn',  createdAt: '2025-03-08', initials: ['EP'],       columnId: 'rdv' },
  { id: '9', name: 'Lucas Girard',    company: 'Girard Immobilier',    value: 95000,  source: 'Meta Ads',  createdAt: '2025-03-06', initials: ['LG'],       columnId: 'non_qualifie' },
  { id: '10', name: 'Camille Roux',   company: 'Roux Construction',    value: 220000, source: 'WhatsApp',  createdAt: '2025-03-01', initials: ['CR', 'SC'], columnId: 'perdu' },
]
