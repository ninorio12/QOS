'use client'

import { useState, useMemo, useRef, useEffect, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Download, SlidersHorizontal, ArrowUpDown, Settings2, X, RefreshCw, Sparkles, User } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { getAvatarColor, formatDate, formatRelative } from './types'
import dynamic from 'next/dynamic'
import { type ContactPipelineInfo } from '@/app/contacts/page'

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
const AI_AGENTS = ['kai', 'soren', 'mia', 'luc', 'eva']
const BOT_COLORS: Record<string, string> = {
  kai: '#3462EE', soren: '#22c55e', mia: '#8B5CF6', luc: '#F97316', eva: '#EC4899',
}

function OriginBadge({ createdBy }: { createdBy: string | undefined }) {
  if (!createdBy) return <span className="text-sm text-[#D1D5DB]">—</span>
  const key   = createdBy.toLowerCase()
  const isBot = AI_AGENTS.includes(key)
  const color = isBot ? (BOT_COLORS[key] ?? '#6B7280') : '#374151'
  const label = createdBy.charAt(0).toUpperCase() + createdBy.slice(1)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '14', color }}
    >
      {isBot
        ? <Sparkles size={9} strokeWidth={2.5} />
        : <User size={9} strokeWidth={2.5} />
      }
      {label}
    </span>
  )
}

// ─── Pipeline badge ───────────────────────────────────────────
const PIPELINE_BADGE: Record<string, { color: string; label: string }> = {
  acquisition:  { color: '#3462EE', label: 'Acquisition' },
  réactivation: { color: '#F97316', label: 'Réactivation' },
  réception:    { color: '#22c55e', label: 'Réception' },
}

function PipelineBadge({ info }: { info: ContactPipelineInfo | undefined }) {
  if (!info) return <span className="text-sm text-[#D1D5DB]">—</span>
  const key = info.pipelineName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const match = Object.entries(PIPELINE_BADGE).find(([k]) =>
    key.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  )
  const { color, label } = match?.[1] ?? { color: '#9CA3AF', label: info.pipelineName }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '18', color }}
    >
      {label}
    </span>
  )
}

// ─── Column definitions ───────────────────────────────────────
type ColKey = 'phone' | 'email' | 'company' | 'pipeline' | 'origin' | 'created' | 'activity' | 'tags'
const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: 'phone',    label: 'Téléphone' },
  { key: 'email',    label: 'E-mail' },
  { key: 'company',  label: 'Entreprise' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'origin',   label: 'Créé par' },
  { key: 'created',  label: 'Date' },
  { key: 'activity', label: 'Dernière activité' },
  { key: 'tags',     label: 'Balises' },
]

// ─── Table row (memoized below) ───────────────────────────────
function ContactRowBase({
  contact,
  checked,
  onCheck,
  createdBy,
  pipelineInfo,
  onClick,
  visibleCols,
}: {
  contact:      GHLContact
  checked:      boolean
  onCheck:      (id: string) => void
  createdBy:    string | undefined
  pipelineInfo: ContactPipelineInfo | undefined
  onClick:      () => void
  visibleCols:  Set<ColKey>
}) {
  const name = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  return (
    <tr
      className="border-b border-[#EDEDEA] hover:bg-[#F8F8F5] transition-colors duration-100 group cursor-pointer"
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

      {/* Nom — always visible */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-sm font-semibold text-[#111111] truncate">{name}</span>
        </div>
      </td>

      {visibleCols.has('phone') && (
        <td className="px-4 py-3 min-w-[140px]">
          {contact.phone
            ? <span className="text-sm text-[#374151]">{contact.phone}</span>
            : <span className="text-sm text-[#D1D5DB]">—</span>}
        </td>
      )}
      {visibleCols.has('email') && (
        <td className="px-4 py-3 min-w-[200px]">
          {contact.email
            ? <span className="text-sm text-[#374151]">{contact.email}</span>
            : <span className="text-sm text-[#D1D5DB]">—</span>}
        </td>
      )}
      {visibleCols.has('company') && (
        <td className="px-4 py-3 min-w-[160px]">
          {contact.companyName
            ? <span className="text-sm text-[#374151] truncate">{contact.companyName}</span>
            : <span className="text-sm text-[#D1D5DB]">—</span>}
        </td>
      )}
      {visibleCols.has('pipeline') && (
        <td className="px-4 py-3 min-w-[140px]">
          <PipelineBadge info={pipelineInfo} />
        </td>
      )}
      {visibleCols.has('origin') && (
        <td className="px-4 py-3 min-w-[120px]">
          <OriginBadge createdBy={createdBy} />
        </td>
      )}
      {visibleCols.has('created') && (
        <td className="px-4 py-3 min-w-[130px]">
          <span className="text-sm text-[#6B7280]">{formatDate(contact.dateAdded)}</span>
        </td>
      )}
      {visibleCols.has('activity') && (
        <td className="px-4 py-3 min-w-[150px]">
          <span className="text-sm text-[#6B7280]">{formatRelative(contact.dateUpdated ?? contact.dateAdded)}</span>
        </td>
      )}
      {visibleCols.has('tags') && (
        <td className="px-4 py-3 min-w-[160px]">
          <div className="flex items-center gap-1 flex-wrap">
            {contact.tags.map(t => <TagPill key={t} label={t} />)}
          </div>
        </td>
      )}
    </tr>
  )
}

// Memoized row to avoid re-renders when parent filters change
const ContactRow = memo(ContactRowBase)

// ─── Main view ───────────────────────────────────────────────
export default function ContactsView({
  contacts: initial,
  attributions: initialAttributions,
  pipelineInfo: initialPipelineInfo,
}: {
  contacts:      GHLContact[]
  attributions:  Map<string, string>
  pipelineInfo:  Map<string, ContactPipelineInfo>
}) {
  const [contacts,     setContacts]     = useState<GHLContact[]>(initial)
  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [query,        setQuery]        = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editContact,  setEditContact]  = useState<GHLContact | null>(null)
  const [showImport,   setShowImport]   = useState(false)
  const [refreshing,   setRefreshing]   = useState(false)
  const [userName,     setUserName]     = useState('Thomas')
  const [attributions, setAttributions] = useState<Map<string, string>>(initialAttributions)
  const [pipelineInfo] = useState<Map<string, ContactPipelineInfo>>(initialPipelineInfo)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) return
      const meta = data.user.user_metadata ?? {}
      const name = (meta.full_name ?? meta.name ?? data.user.email?.split('@')[0]) as string | undefined
      if (name) setUserName(name.split(' ')[0]) // prénom uniquement
    })
  }, [])
  const [allChecked, setAllChecked] = useState(false)
  const [sortBy,       setSortBy]       = useState<'name' | 'date' | 'company'>('date')
  const [showFilters,  setShowFilters]  = useState(false)
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null)
  const [filterTag,    setFilterTag]    = useState<string | null>(null)
  const [showColMgr,   setShowColMgr]   = useState(false)
  const [visibleCols,  setVisibleCols]  = useState<Set<ColKey>>(
    new Set<ColKey>(['phone', 'email', 'company', 'pipeline', 'origin', 'created', 'activity', 'tags'])
  )
  const filterRef = useRef<HTMLDivElement>(null)
  const colMgrRef = useRef<HTMLDivElement>(null)

  // Close panels on outside click
  useEffect(() => {
    if (!showFilters && !showColMgr) return
    function handleClick(e: MouseEvent) {
      if (showFilters && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
      if (showColMgr && colMgrRef.current && !colMgrRef.current.contains(e.target as Node)) {
        setShowColMgr(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilters, showColMgr])

  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Derived lists for filter chips
  const allOrigins = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach(c => { const o = attributions.get(c.id); if (o) s.add(o) })
    return Array.from(s).sort()
  }, [contacts, attributions])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach(c => c.tags.forEach(t => s.add(t)))
    return Array.from(s).sort()
  }, [contacts])

  const activeFiltersCount = [filterOrigin, filterTag].filter(Boolean).length

  const SORT_LABELS: Record<string, string> = { name: 'Nom', date: 'Date', company: 'Entreprise' }
  function cycleSort() {
    setSortBy(s => s === 'date' ? 'name' : s === 'name' ? 'company' : 'date')
  }

  const filtered = useMemo(() => {
    let list = contacts
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c =>
        `${c.contactName} ${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''} ${c.phone ?? ''} ${c.companyName ?? ''} ${c.tags.join(' ')}`
          .toLowerCase().includes(q)
      )
    }
    if (filterOrigin) {
      list = list.filter(c => attributions.get(c.id) === filterOrigin)
    }
    if (filterTag) {
      list = list.filter(c => c.tags.includes(filterTag))
    }
    if (sortBy === 'name') {
      list = [...list].sort((a, b) => {
        const na = (a.contactName || `${a.firstName ?? ''} ${a.lastName ?? ''}`).trim()
        const nb = (b.contactName || `${b.firstName ?? ''} ${b.lastName ?? ''}`).trim()
        return na.localeCompare(nb, 'fr')
      })
    } else if (sortBy === 'company') {
      list = [...list].sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? '', 'fr'))
    }
    return list
  }, [contacts, query, sortBy, filterOrigin, filterTag, attributions])

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
    setAttributions(prev => new Map(prev).set(c.id, userName))
    fetch('/api/contact/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghlContactId: c.id, createdBy: userName }),
    }).catch(() => {})
  }

  function handleSave(updated: GHLContact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditContact(null)
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res  = await fetch('/api/contact')
      const data = await res.json() as { contacts?: GHLContact[] }
      if (data.contacts) setContacts(data.contacts)
    } catch {}
    finally { setRefreshing(false) }
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
            onClick={handleRefresh}
            disabled={refreshing}
            data-tooltip="Rafraîchir"
            className="w-8 h-8 flex items-center justify-center bg-white border border-[#E5E7EB] text-[#6B7280] rounded-full hover:bg-[#F5F5F0] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
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
          {/* Filtres avancés with dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                activeFiltersCount > 0
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
              }`}
            >
              <SlidersHorizontal size={11} />
              Filtres avancés
              {activeFiltersCount > 0 && (
                <span className="bg-white text-[#111111] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute top-full mt-2 left-0 z-20 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 w-72">
                {/* Origin filter */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Créé par</p>
                    {filterOrigin && (
                      <button onClick={() => setFilterOrigin(null)} className="text-[10px] text-[#6B7280] hover:text-[#111111]">
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allOrigins.map(o => (
                      <button
                        key={o}
                        onClick={() => setFilterOrigin(filterOrigin === o ? null : o)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                          filterOrigin === o
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-[#F5F5F0] text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                    {allOrigins.length === 0 && <p className="text-xs text-[#9CA3AF]">Aucune origine</p>}
                  </div>
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Balise</p>
                      {filterTag && (
                        <button onClick={() => setFilterTag(null)} className="text-[10px] text-[#6B7280] hover:text-[#111111]">
                          Réinitialiser
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {allTags.map(t => (
                        <button
                          key={t}
                          onClick={() => setFilterTag(filterTag === t ? null : t)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            filterTag === t
                              ? 'bg-[#111111] text-white border-[#111111]'
                              : 'bg-[#F5F5F0] text-[#6B7280] border-[#E5E7EB] hover:border-[#9CA3AF]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setFilterOrigin(null); setFilterTag(null) }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#EF4444] py-2 rounded-xl bg-[#EF4444]/5 hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <X size={11} />
                    Tout réinitialiser
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={cycleSort}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full hover:bg-[#F5F5F0] transition-colors"
          >
            <ArrowUpDown size={11} />
            Trier par {SORT_LABELS[sortBy]}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#9CA3AF]/40 focus-within:border-[#9CA3AF] transition-all">
            <Search size={12} className="text-[#9CA3AF] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher contacts..."
              className="bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none w-44"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[#9CA3AF] hover:text-[#111111] transition-colors flex-shrink-0">
                <X size={12} />
              </button>
            )}
          </div>
          <div ref={colMgrRef} className="relative">
            <button
              onClick={() => setShowColMgr(s => !s)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                showColMgr
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
              }`}
            >
              <Settings2 size={11} />
              Gérer les champs
            </button>
            {showColMgr && (
              <div className="absolute top-full mt-2 right-0 z-20 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 w-52">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Colonnes visibles</p>
                <div className="flex flex-col gap-2">
                  {ALL_COLS.map(col => (
                    <label key={col.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="w-3.5 h-3.5 rounded accent-[#111111] cursor-pointer"
                      />
                      <span className="text-xs text-[#374151] group-hover:text-[#111111] transition-colors">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
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
              {/* Nom — always visible */}
              <th key="nom" className={COL_HEADER}>
                <span className="flex items-center gap-1">Nom de Contact<ArrowUpDown size={10} className="text-[#D1D5DB]" /></span>
              </th>
              {ALL_COLS.filter(c => visibleCols.has(c.key)).map(col => (
                <th key={col.key} className={COL_HEADER}>
                  <span className="flex items-center gap-1">
                    {col.label === 'Entreprise' ? "Nom de l'entreprise" : col.label}
                    <ArrowUpDown size={10} className="text-[#D1D5DB]" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2 + visibleCols.size} className="px-4 py-16 text-center text-sm text-[#9CA3AF]">
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
                  pipelineInfo={pipelineInfo.get(contact.id)}
                  onClick={() => setEditContact(contact)}
                  visibleCols={visibleCols}
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

      {editContact && (
        <NewContactModal
          contact={editContact}
          pipelineInfo={pipelineInfo.get(editContact.id)}
          onClose={() => setEditContact(null)}
          onSave={handleSave}
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
