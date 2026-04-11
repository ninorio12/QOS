'use client'

import {
  Edit3, Mail, Phone, Plus, Calendar, Video,
  X, MapPin, Building2, ExternalLink,
} from 'lucide-react'
import {
  type Contact, getInitials, getAvatarColor, getContactTags, SOURCES,
} from './types'

// ─── Source icon SVGs ────────────────────────────────────────
function SourceIcon({ label, color }: { label: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    WhatsApp: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    LinkedIn: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    Email: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    Discord: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.114a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    Slack: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
  }

  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
      style={{ color, borderColor: color + '40', background: color + '12' }}>
      {icons[label] ?? null}
      {label}
    </span>
  )
}

// ─── Related Leads (mock for now) ────────────────────────────
const MOCK_LEADS = [
  { id: '1', title: 'Résidence Les Chênes', value: 87000,  status: 'RDV Booké',       color: '#E2FF8D', date: '20 mars' },
  { id: '2', title: 'Lot technique Vinci',  value: 312000, status: 'En Conversation',  color: '#4A91A8', date: '14 mars' },
]

// ─── Panel ───────────────────────────────────────────────────
export default function ContactPanel({
  contact,
  onClose,
}: {
  contact: Contact
  onClose: () => void
}) {
  const initials = getInitials(contact)
  const avatarColor = getAvatarColor(initials)
  const tags = getContactTags(contact)
  const isDark = avatarColor === '#E2FF8D' || avatarColor === '#EFE347'
  const createdDate = new Date(contact.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const actions = [
    { icon: Edit3,    label: 'Éditer',   color: '#3462EE' },
    { icon: Mail,     label: 'Email',    color: '#4A91A8' },
    { icon: Phone,    label: 'Appel',    color: '#E2FF8D' },
    { icon: Plus,     label: 'Ajouter',  color: '#3D4F6B' },
    { icon: Calendar, label: 'Agenda',   color: '#EFE347' },
    { icon: Video,    label: 'Réunion',  color: '#8896AB' },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Close on mobile */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#111111] transition-colors lg:hidden"
      >
        <X size={18} />
      </button>

      {/* ── Profile ── */}
      <div className="p-6 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div
            className="w-18 h-18 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              width: 72, height: 72,
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}bb)`,
              color: isDark ? '#121721' : 'white',
              boxShadow: `0 0 0 3px ${avatarColor}30, 0 0 0 6px ${avatarColor}10`
            }}
          >
            {initials}
          </div>
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#22c55e] border-2 border-[#1A2235] rounded-full" />
        </div>

        <div>
          <h2 className="text-base font-bold text-[#111111]">
            {contact.first_name} {contact.last_name}
          </h2>
          {contact.job_title && (
            <p className="text-xs text-[#6B7280] mt-0.5">{contact.job_title}</p>
          )}
          {contact.company && (
            <a href="#" className="text-xs text-[#3462EE] hover:underline mt-0.5 flex items-center justify-center gap-1">
              <Building2 size={10} />
              {contact.company}
              <ExternalLink size={9} />
            </a>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {tags.map(tag => (
            <span key={tag.label}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: tag.color, background: tag.bg, border: `1px solid ${tag.color}30` }}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-5">
        {actions.map(({ icon: Icon, label, color }) => (
          <button key={label}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-[#EEF0EB] transition-colors group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: color + '18' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <span className="text-[10px] text-[#6B7280] group-hover:text-[#111111] transition-colors">{label}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-[#E5E7EB]" />

      {/* ── Informations ── */}
      <div className="p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Informations</h3>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Prénom',    value: contact.first_name },
            { label: 'Nom',       value: contact.last_name },
            { label: 'Email',     value: contact.email },
            { label: 'Téléphone', value: contact.phone },
            { label: 'Ajouté le', value: createdDate },
          ].map(({ label, value }) => value && (
            <div key={label} className="flex flex-col gap-0.5">
              <p className="text-[10px] font-medium text-[#9CA3AF]">{label}</p>
              <p className="text-xs text-[#111111] font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#E5E7EB]" />

      {/* ── Sources ── */}
      <div className="p-5 flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Sources</h3>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map(s => (
            <SourceIcon key={s.label} label={s.label} color={s.color} />
          ))}
        </div>
      </div>

      <div className="border-t border-[#E5E7EB]" />

      {/* ── Leads liés ── */}
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Leads liés</h3>
          <button className="text-[10px] text-[#3462EE] hover:underline">Ajouter</button>
        </div>
        <div className="flex flex-col gap-2">
          {MOCK_LEADS.map(lead => (
            <div key={lead.id}
              className="flex items-center justify-between bg-[#EEF0EB] rounded-xl px-3 py-2.5 border border-[#E5E7EB] hover:border-[#3D4F6B] transition-colors cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111111] truncate">{lead.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: lead.color }} />
                  <span className="text-[10px] text-[#6B7280]">{lead.status} · {lead.date}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#111111] ml-2">
                €{lead.value.toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats bottom ── */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#EEF0EB] border border-[#E5E7EB] rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-[#111111]">{MOCK_LEADS.length}</p>
            <p className="text-[10px] text-[#6B7280]">Deals actifs</p>
          </div>
          <div className="bg-[#EEF0EB] border border-[#E5E7EB] rounded-xl p-3 text-center">
            <p className="text-sm font-bold" style={{ color: '#E2FF8D' }}>
              €{MOCK_LEADS.reduce((s, l) => s + l.value, 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-[10px] text-[#6B7280]">Pipeline</p>
          </div>
        </div>
      </div>
    </div>
  )
}
