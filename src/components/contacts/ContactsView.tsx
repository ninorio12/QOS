'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Download, SlidersHorizontal, ArrowUpDown, Settings2 } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { getAvatarColor, formatDate, formatRelative, type ContactAttribution } from './types'
import dynamic from 'next/dynamic'

const NewContactModal = dynamic(() => import('./NewContactModal'), { ssr: false })
const ImportModal     = dynamic(() => import('./ImportModal'),     { ssr: false })

const COL_HEADER = 'px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap'

// ─── Avatar ────────────────────────────────────────────────────
function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
    >
      {initials}
    </div>
  )
}

// ─── Tag pill ──────────────────────────────────────────────────
function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F0] text-[#6B7280] border border-[#E5E7EB] whitespace-nowrap">
      {label}
    </span>
  )
}

// ─── Origin badge ─────────────────────────────────────────────
const BOT_COLORS: Record<string, string> = {
  Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
}

function OriginBadge({ createdBy }: { createdBy: string | undefined }) {
  if (!createdBy) return <span className="text-sm text-[#D1D5DB]">—</span>
  const isBot = createdBy !== 'Thomas' && createdBy !== 'Toi'
  const color = isBot ? (BOT_COLORS[createdBy] ?? '#6B7280') : '#111111'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '18', color }}
    >
      {isBot ? '🤖 ' : ''}{createdBy}
    </span>
  )
}

// ─── Table row ────────────────────────────────────────────────
function ContactRow({
  contact,
  checked,
  onCheck,
  createdBy,
  onClick,
}: {
  contact:   GHLContact
  checked:   boolean
  onCheck:   (id: string) => void
  createdBy: string | undefined
  onClick:   () => void
}) {
  const name = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  return (
    <tr
      className="border-b border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors group cursor-pointer"
      onClick={onClick}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-10" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck(contact.id)}
          className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer"
        />
      </td>

      {/* Nom */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-sm font-semibold text-[#111111] truncate">{name}</span>
        </div>
      </td>

      {/* Téléphone */}
      <td className="px-4 py-3 min-w-[140px]">
        {contact.phone
          ? <span className="text-sm text-[#374151]">{contact.phone}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* E-mail */}
      <td className="px-4 py-3 min-w-[200px]">
        {contact.email
          ? <span className="text-sm text-[#374151]">{contact.email}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* Entreprise */}
      <td className="px-4 py-3 min-w-[160px]">
        {contact.companyName
          ? <span className="text-sm text-[#374151] truncate">{contact.companyName}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* Origine */}
      <td className="px-4 py-3 min-w-[120px]">
        <OriginBadge createdBy={createdBy} />
      </td>

      {/* Créé */}
      <td className="px-4 py-3 min-w-[130px]">
        <span className="text-sm text-[#6B7280]">{formatDate(contact.dateAdded)}</span>
      </td>

      {/* Dernière activité */}
      <td className="px-4 py-3 min-w-[150px]">
        <span className="text-sm text-[#6B7280]">{formatRelative(contact.dateUpdated ?? contact.dateAdded)}</span>
      </td>

      {/* Tags */}
      <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-1 flex-wrap">
          {contact.tags.map(t => <TagPill key={t} label={t} />)}
        </div>
      </td>
    </tr>
  )
}

// ─── Main view ───────────────────────────────────────────────
export default function ContactsView({
  contacts: initial,
  attributions,
}: {
  contacts:     GHLContact[]
  attributions: Map<string, string>
}) {
  const router = useRouter()
  const [contacts,   setContacts]   = useState<GHLContact[]>(initial)
  const [checked,    setChecked]    = useState<Set<string>>(new Set())
  const [query,      setQuery]      = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [allChecked, setAllChecked] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return contacts
    const q = query.toLowerCase()
    return contacts.filter(c =>
      `${c.contactName} ${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''} ${c.phone ?? ''} ${c.companyName ?? ''} ${c.tags.join(' ')}`
        .toLowerCase().includes(q)
    )
  }, [contacts, query])

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allChecked) {
      setChecked(new Set())
      setAllChecked(false)
    } else {
      setChecked(new Set(filtered.map(c => c.id)))
      setAllChecked(true)
    }
  }

  function handleAdd(c: GHLContact) {
    setContacts(prev => [c, ...prev])
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#EEF0EB]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-[#111111]">Contacts</h1>
          <span className="bg-[#E2FF8D] text-[#111111] text-xs font-bold px-2.5 py-1 rounded-full">
            {contacts.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-[#6B7280] text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-[#F5F5F0] transition-colors"
          >
            <Download size={12} />
            Importer
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#2a2a2a] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus size={12} />
            Ajouter Contact
          </button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="px-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full hover:bg-[#F5F5F0] transition-colors">
            <SlidersHorizontal size={11} />
            Filtres avancés
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full hover:bg-[#F5F5F0] transition-colors">
            <ArrowUpDown size={11} />
            Trier
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3 py-1.5">
            <Search size={12} className="text-[#9CA3AF] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher contacts..."
              className="bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none w-44"
            />
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full hover:bg-[#F5F5F0] transition-colors">
            <Settings2 size={11} />
            Gérer les champs
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto mx-6 mb-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white z-10 border-b border-[#E5E7EB]">
            <tr>
              <th className="pl-4 pr-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer"
                />
              </th>
              {[
                'Nom de Contact',
                'Téléphone',
                'E-mail',
                "Nom de l'entreprise",
                'Origine',
                'Créé',
                'Dernière activité',
                'Balises',
              ].map(col => (
                <th key={col} className={COL_HEADER}>
                  <span className="flex items-center gap-1">
                    {col}
                    <ArrowUpDown size={10} className="text-[#D1D5DB]" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-[#9CA3AF]">
                  Aucun contact trouvé
                </td>
              </tr>
            ) : (
              filtered.map(contact => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  checked={checked.has(contact.id)}
                  onCheck={toggleCheck}
                  createdBy={attributions.get(contact.id)}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewContactModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={count => {
            setShowImport(false)
            if (count > 0) window.location.reload()
          }}
        />
      )}
    </div>
  )
}
