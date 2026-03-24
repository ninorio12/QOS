'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import {
  type Contact,
  getInitials, getAvatarColor, getContactTags, MOCK_CONTACTS,
} from './types'
import ContactPanel from './ContactPanel'
import NewContactModal from './NewContactModal'

const FILTERS = ['Tous', 'Décideurs', 'Techniques', 'Nouveaux']

function filterContacts(contacts: Contact[], query: string, filter: string): Contact[] {
  let result = contacts

  if (query) {
    const q = query.toLowerCase()
    result = result.filter(c =>
      `${c.first_name} ${c.last_name} ${c.company ?? ''} ${c.job_title ?? ''} ${c.email ?? ''}`
        .toLowerCase().includes(q)
    )
  }

  if (filter === 'Décideurs') {
    result = result.filter(c => {
      const t = (c.job_title ?? '').toLowerCase()
      return t.includes('directeur') || t.includes('président') || t.includes('ceo') || t.includes('dg') || t.includes('gérant')
    })
  } else if (filter === 'Techniques') {
    result = result.filter(c => {
      const t = (c.job_title ?? '').toLowerCase()
      return t.includes('technique') || t.includes('conducteur') || t.includes('ingénieur')
    })
  } else if (filter === 'Nouveaux') {
    const weekAgo = Date.now() - 7 * 86400000
    result = result.filter(c => new Date(c.created_at).getTime() > weekAgo)
  }

  return result
}

// ─── Contact Row ─────────────────────────────────────────────
function ContactRow({
  contact,
  isSelected,
  onClick,
}: {
  contact: Contact
  isSelected: boolean
  onClick: () => void
}) {
  const initials = getInitials(contact)
  const avatarColor = getAvatarColor(initials)
  const tags = getContactTags(contact)
  const isDark = avatarColor === '#C8F135' || avatarColor === '#EFE347'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#1A2235] last:border-0
        ${isSelected ? 'bg-[#1A2235]' : 'hover:bg-[#1A2235]/50'}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}bb)`,
            color: isDark ? '#121721' : 'white',
          }}
        >
          {initials}
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] border-2 border-[#121721] rounded-full" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-semibold text-white truncate">
            {contact.first_name} {contact.last_name}
          </p>
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0" />
          )}
        </div>

        {contact.job_title && (
          <p className="text-[11px] text-[#8896AB] truncate leading-tight">
            {contact.job_title}{contact.company ? ` · ${contact.company}` : ''}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {contact.email && (
            <span className="text-[10px] text-[#3D4F6B] truncate max-w-[130px]">{contact.email}</span>
          )}
          {contact.phone && (
            <span className="text-[10px] text-[#3D4F6B]">{contact.phone}</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag.label}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ color: tag.color, background: tag.bg }}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

// ─── Main View ───────────────────────────────────────────────
export default function ContactsView({ dbContacts }: { dbContacts: Contact[] }) {
  // Merge real DB contacts (first) + mock contacts with different IDs
  const allContacts = useMemo(() => {
    const realIds = new Set(dbContacts.map(c => c.id))
    const mocks = MOCK_CONTACTS.filter(m => !realIds.has(m.id))
    return [...dbContacts, ...mocks]
  }, [dbContacts])

  const [selected, setSelected] = useState<Contact | null>(allContacts[0] ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(
    () => filterContacts(allContacts, query, filter),
    [allContacts, query, filter]
  )

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Left: List ── */}
      <div className="flex flex-col w-[380px] flex-shrink-0 border-r border-[#1A2235]">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-[#1A2235]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-white">Contacts</h1>
              <p className="text-xs text-[#8896AB]">{allContacts.length} contacts</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#3462EE] hover:bg-[#2a50d4] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Nouveau
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#1A2235] border border-[#232D3F] rounded-lg px-3 py-2 mb-3">
            <Search size={13} className="text-[#3D4F6B] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un contact..."
              className="flex-1 bg-transparent text-sm text-white placeholder-[#3D4F6B] outline-none"
            />
            <button className="text-[#3D4F6B] hover:text-white transition-colors">
              <SlidersHorizontal size={13} />
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                  ${filter === f
                    ? 'bg-[#3462EE]/20 text-[#3462EE]'
                    : 'text-[#8896AB] hover:text-white hover:bg-[#1A2235]'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-[#3D4F6B]">Aucun contact trouvé</p>
            </div>
          ) : (
            filtered.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isSelected={selected?.id === contact.id}
                onClick={() => setSelected(contact)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      <div className="flex-1 overflow-hidden relative">
        {selected ? (
          <div className="h-full w-full max-w-sm bg-[#1A2235] border-r border-[#232D3F] overflow-y-auto relative">
            <ContactPanel contact={selected} onClose={() => setSelected(null)} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A2235] flex items-center justify-center">
              <Search size={20} className="text-[#3D4F6B]" />
            </div>
            <p className="text-sm text-[#3D4F6B]">Sélectionnez un contact</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <NewContactModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
