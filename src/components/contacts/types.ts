export type Contact = {
  id:           string
  first_name:   string
  last_name:    string
  email:        string | null
  phone:        string | null
  company:      string | null
  job_title:    string | null
  created_at:   string
  updated_at:   string | null
  tags:         string[]
}

export function getInitials(contact: Contact) {
  const f = contact.first_name?.[0] ?? ''
  const l = contact.last_name?.[0]  ?? ''
  return (f + l).toUpperCase() || '?'
}

export function getAvatarColor(initials: string): string {
  const palette = ['#3462EE', '#4A91A8', '#C8F135', '#EFE347', '#8B5CF6', '#EC4899', '#F97316']
  return palette[(initials.charCodeAt(0) ?? 0) % palette.length]
}

export function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days  <  7) return `il y a ${days} jours`
  if (days  < 30) return `il y a ${Math.floor(days / 7)} sem.`
  if (days  < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
}

// ─── Legacy helpers (used by ContactPanel) ──────────────────
export type ContactTag = { label: string; color: string; bg: string }

export function getContactTags(contact: Contact): ContactTag[] {
  const tags: ContactTag[] = []
  const daysOld = Math.floor((Date.now() - new Date(contact.created_at).getTime()) / 86400000)
  if (daysOld <= 7) tags.push({ label: 'nouveau', color: '#C8F135', bg: '#C8F13518' })
  contact.tags.forEach(t => tags.push({ label: t, color: '#8896AB', bg: '#8896AB18' }))
  if (tags.length === 0) tags.push({ label: 'contact', color: '#8896AB', bg: '#8896AB18' })
  return tags
}

export const SOURCES = [
  { label: 'WhatsApp', color: '#22c55e' },
  { label: 'LinkedIn', color: '#3462EE' },
  { label: 'Email',    color: '#4A91A8' },
  { label: 'Discord',  color: '#8B5CF6' },
  { label: 'Slack',    color: '#EFE347' },
]

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export type ContactAttribution = {
  ghl_contact_id: string
  created_by:     string
  created_at:     string
}
