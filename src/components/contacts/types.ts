export type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  created_at: string
  updated_at: string
}

export type ContactTag = {
  label: string
  color: string
  bg: string
}

export function getContactTags(contact: Contact): ContactTag[] {
  const tags: ContactTag[] = []
  const title = (contact.job_title ?? '').toLowerCase()
  const daysOld = Math.floor((Date.now() - new Date(contact.created_at).getTime()) / 86400000)

  if (daysOld <= 7) tags.push({ label: 'nouveau', color: '#C8F135', bg: '#C8F135' + '18' })
  if (title.includes('directeur') || title.includes('président') || title.includes('ceo') || title.includes('dg'))
    tags.push({ label: 'décideur', color: '#EFE347', bg: '#EFE347' + '18' })
  if (title.includes('technique') || title.includes('conducteur') || title.includes('ingénieur'))
    tags.push({ label: 'technique', color: '#4A91A8', bg: '#4A91A8' + '18' })
  if (tags.length === 0)
    tags.push({ label: 'contact', color: '#8896AB', bg: '#8896AB' + '18' })

  return tags
}

export function getInitials(contact: Contact) {
  return `${contact.first_name[0] ?? ''}${contact.last_name[0] ?? ''}`.toUpperCase()
}

export function getAvatarColor(initials: string) {
  const palette = ['#3462EE', '#4A91A8', '#C8F135', '#EFE347', '#8B5CF6', '#EC4899']
  return palette[initials.charCodeAt(0) % palette.length]
}

export const SOURCES = [
  { label: 'WhatsApp', color: '#22c55e' },
  { label: 'LinkedIn', color: '#3462EE' },
  { label: 'Email',    color: '#4A91A8' },
  { label: 'Discord',  color: '#8B5CF6' },
  { label: 'Slack',    color: '#EFE347' },
]

// Mock contacts for UI demo (shown alongside real Supabase data)
export const MOCK_CONTACTS: Contact[] = [
  { id: 'm1', first_name: 'Thomas',  last_name: 'Mercier',   email: 'thomas.mercier@bouygues.com',   phone: '+33 6 12 34 56 78', company: 'Bouygues Immobilier',  job_title: 'Directeur Technique',       created_at: '2025-03-18T10:00:00Z', updated_at: '2025-03-18T10:00:00Z' },
  { id: 'm2', first_name: 'Sophie',  last_name: 'Laurent',   email: 'slaurent@vinci.fr',             phone: '+33 6 98 76 54 32', company: 'Vinci Construction',   job_title: 'Conductrice de Travaux',    created_at: '2025-03-15T09:00:00Z', updated_at: '2025-03-15T09:00:00Z' },
  { id: 'm3', first_name: 'Pierre',  last_name: 'Moreau',    email: 'p.moreau@moreau-btp.fr',        phone: '+33 6 45 67 89 01', company: 'Moreau BTP',           job_title: 'Gérant',                    created_at: '2025-03-12T14:00:00Z', updated_at: '2025-03-12T14:00:00Z' },
  { id: 'm4', first_name: 'Claire',  last_name: 'Fontaine',  email: 'cfontaine@fontaine-fils.com',   phone: '+33 7 11 22 33 44', company: 'Fontaine & Fils',      job_title: 'Présidente',                created_at: '2025-03-10T08:00:00Z', updated_at: '2025-03-10T08:00:00Z' },
  { id: 'm5', first_name: 'Julien',  last_name: 'Renard',    email: 'j.renard@rgc-groupe.fr',        phone: '+33 6 55 44 33 22', company: 'Renard Génie Civil',   job_title: 'Ingénieur Chantier',        created_at: '2025-03-08T11:00:00Z', updated_at: '2025-03-08T11:00:00Z' },
  { id: 'm6', first_name: 'Marie',   last_name: 'Chevalier', email: 'marie.chevalier@mch-renov.fr',  phone: '+33 6 78 90 12 34', company: 'MCh Rénovation',       job_title: 'Directrice Commerciale',    created_at: '2025-03-05T16:00:00Z', updated_at: '2025-03-05T16:00:00Z' },
  { id: 'm7', first_name: 'Lucas',   last_name: 'Girard',    email: 'lgirard@girard-immo.com',       phone: '+33 7 22 33 44 55', company: 'Girard Immobilier',    job_title: 'CEO',                       created_at: '2025-03-03T13:00:00Z', updated_at: '2025-03-03T13:00:00Z' },
  { id: 'm8', first_name: 'Emma',    last_name: 'Petit',     email: 'e.petit@petit-associes.fr',     phone: '+33 6 33 44 55 66', company: 'Petit & Associés',     job_title: 'Responsable Projets',       created_at: '2025-02-28T09:30:00Z', updated_at: '2025-02-28T09:30:00Z' },
]
