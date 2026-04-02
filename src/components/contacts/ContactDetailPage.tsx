import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { getAvatarColor, type ContactAttribution } from './types'

const BOT_COLORS: Record<string, string> = {
  Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
}

function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
      style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
    >
      {initials}
    </div>
  )
}

function Row({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{label}</p>
      {href ? (
        <a href={href} className="text-sm text-[#3462EE] hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-[#111111] break-all">{value}</p>
      )}
    </div>
  )
}

function OriginBadge({ createdBy }: { createdBy: string }) {
  const isBot  = createdBy !== 'Thomas' && createdBy !== 'Toi'
  const color  = isBot ? (BOT_COLORS[createdBy] ?? '#6B7280') : '#111111'
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: color + '18', color }}
    >
      {isBot ? '🤖 ' : '👤 '}{createdBy}
    </span>
  )
}

export default function ContactDetailPage({
  contact,
  attribution,
}: {
  contact:     GHLContact
  attribution: ContactAttribution | null
}) {
  const name    = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  const address = [contact.address1, contact.city, contact.postalCode, contact.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[#EEF0EB] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111111] mb-6 transition-colors"
        >
          <ChevronLeft size={15} />
          Retour aux contacts
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl p-6 mb-4 flex items-start gap-4">
          <Avatar contact={contact} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#111111] leading-tight">{name}</h1>
            {contact.companyName && (
              <p className="text-sm text-[#6B7280] mt-0.5">{contact.companyName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {contact.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F0] text-[#6B7280] border border-[#E5E7EB]">
                  {t}
                </span>
              ))}
              {attribution && <OriginBadge createdBy={attribution.created_by} />}
            </div>
          </div>
        </div>

        {/* Infos card */}
        <div className="bg-white rounded-2xl px-6 py-2 mb-4">
          <Row label="Téléphone"  value={contact.phone}   href={contact.phone ? `tel:${contact.phone}` : undefined} />
          <Row label="Email"      value={contact.email}   href={contact.email ? `mailto:${contact.email}` : undefined} />
          <Row label="Entreprise" value={contact.companyName} />
          <Row label="Adresse"    value={address || null} />
          <Row label="Site web"   value={contact.website} href={contact.website ?? undefined} />
          <Row label="Source"     value={contact.source} />
          <Row label="Type"       value={contact.type} />
          <Row label="Ajouté le"  value={new Date(contact.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </div>

        {/* Custom fields */}
        {contact.customFields && contact.customFields.length > 0 && (
          <div className="bg-white rounded-2xl px-6 py-2">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wide py-3 border-b border-[#F0F0EE]">
              Champs personnalisés
            </p>
            {contact.customFields.map(f => (
              f.value ? (
                <Row key={f.id} label={f.id} value={String(f.value)} />
              ) : null
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
