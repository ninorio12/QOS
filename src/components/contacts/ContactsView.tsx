'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useClickOutside } from '@/hooks/useClickOutside'
import { Search, Download, SlidersHorizontal, ArrowUpDown, Settings2, Sparkles, Check, ChevronDown, FileSpreadsheet, Trash2, RefreshCw } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { fetchJSON } from '@/lib/fetchJSON'
import { getAvatarColor, formatDate, formatRelative, type ContactAttribution } from './types'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

const NewLeadWidget   = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const ImportModal     = dynamic(() => import('./ImportModal'),     { ssr: false })

const COL_HEADER = 'px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap'

// ─── Avatar ────────────────────────────────────────────────────
function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: color + '22', color }}
    >
      {initials}
    </div>
  )
}

// ─── Tag pill ──────────────────────────────────────────────────
const TAG_PALETTE = ['#3462EE','#8B5CF6','#14B8A6','#0EA5E9','#F97316','#EC4899']

function tagColor(label: string) {
  const hash = label.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return TAG_PALETTE[hash % TAG_PALETTE.length]
}

function TagPill({ label }: { label: string }) {
  const color = tagColor(label)
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '18', color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}

// ─── Origin badge ─────────────────────────────────────────────
const ORIGIN_COLORS: Record<string, string> = {
  Mia:    '#8B5CF6',
  Kai:    '#3462EE',
  Soren:  '#14B8A6',
  Thomas: '#0EA5E9',
  Toi:    '#0EA5E9',
  Luc:    '#F97316',
  Eva:    '#EC4899',
}

function OriginBadge({ createdBy }: { createdBy: string | undefined }) {
  if (!createdBy) return <span className="text-sm text-[#D1D5DB]">—</span>
  const isBot  = !['Thomas', 'Toi'].includes(createdBy)
  const color  = ORIGIN_COLORS[createdBy] ?? '#6B7280'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '20', color, border: `1px solid ${color}35` }}
    >
      {isBot && <Sparkles size={9} className="shrink-0" />}{createdBy}
    </span>
  )
}

const ALL_COLS = ['Téléphone', 'E-mail', "Nom de l'entreprise", 'Origine', 'Créé', 'Dernière activité', 'Balises'] as const
type ColName = typeof ALL_COLS[number]

// ─── Table row ────────────────────────────────────────────────
function ContactRow({
  contact, checked, onCheck, createdBy, onClick, visibleCols,
}: {
  contact:     GHLContact
  checked:     boolean
  onCheck:     (id: string) => void
  createdBy:   string | undefined
  onClick:     () => void
  visibleCols: Set<ColName>
}) {
  const name = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  const v = (col: ColName) => visibleCols.has(col)
  return (
    <tr className="border-b border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors group cursor-pointer" onClick={onClick}>
      <td className="pl-4 pr-2 py-3 w-10" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={() => onCheck(contact.id)}
          className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer" />
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-sm font-semibold text-[#111111] truncate">{name}</span>
        </div>
      </td>
      {v('Téléphone') && <td className="px-4 py-3 min-w-[140px]">
        {contact.phone ? <span className="text-sm text-[#374151]">{contact.phone}</span> : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>}
      {v('E-mail') && <td className="px-4 py-3 min-w-[200px]">
        {contact.email ? <span className="text-sm text-[#374151]">{contact.email}</span> : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>}
      {v("Nom de l'entreprise") && <td className="px-4 py-3 min-w-[160px]">
        {contact.companyName ? <span className="text-sm text-[#374151] truncate">{contact.companyName}</span> : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>}
      {v('Origine') && <td className="px-4 py-3 min-w-[120px]"><OriginBadge createdBy={createdBy} /></td>}
      {v('Créé') && <td className="px-4 py-3 min-w-[130px]"><span className="text-sm text-[#6B7280]">{formatDate(contact.dateAdded)}</span></td>}
      {v('Dernière activité') && <td className="px-4 py-3 min-w-[150px]"><span className="text-sm text-[#6B7280]">{formatRelative(contact.dateUpdated ?? contact.dateAdded)}</span></td>}
      {v('Balises') && <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-1 flex-wrap">{contact.tags.map(t => <TagPill key={t} label={t} />)}</div>
      </td>}
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
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tableRef = useRef<HTMLDivElement>(null)
  const { toasts, toast, dismiss } = useToast()
  const [contacts,     setContacts]     = useState<GHLContact[]>(initial)
  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [query,          setQuery]          = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])
  const [showImport,   setShowImport]   = useState(false)
  const [allChecked,   setAllChecked]   = useState(false)
  const [sortCol,      setSortCol]      = useState<string|null>(null)
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('asc')
  const [filterOrigin, setFilterOrigin] = useState<string|null>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showFieldsMenu, setShowFieldsMenu] = useState(false)
  const [visibleCols,  setVisibleCols]  = useState<Set<ColName>>(new Set(ALL_COLS))

  const filterMenuRef = useClickOutside<HTMLDivElement>(useCallback(() => setShowFilterMenu(false), []))
  const fieldsMenuRef = useClickOutside<HTMLDivElement>(useCallback(() => setShowFieldsMenu(false), []))

  function toggleCol(col: ColName) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(col) ? next.delete(col) : next.add(col)
      return next
    })
  }

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    let target = el.scrollLeft
    let raf: number | null = null

    function animate() {
      if (!el) return
      const diff = target - el.scrollLeft
      if (Math.abs(diff) < 0.5) { el.scrollLeft = target; raf = null; return }
      el.scrollLeft += diff * 0.12
      raf = requestAnimationFrame(animate)
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const rect = el.getBoundingClientRect()
      if (e.clientY <= rect.bottom - 80) return
      e.preventDefault()
      target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target + e.deltaY))
      if (!raf) raf = requestAnimationFrame(animate)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const filtered = useMemo(() => {
    let result = contacts

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(c =>
        `${c.contactName} ${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''} ${c.phone ?? ''} ${c.companyName ?? ''} ${c.tags.join(' ')}`
          .toLowerCase().includes(q)
      )
    }

    if (filterOrigin) {
      result = result.filter(c => (attributions.get(c.id) ?? 'Thomas') === filterOrigin)
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let va = '', vb = ''
        if (sortCol === 'Nom de Contact') {
          va = a.contactName ?? ''; vb = b.contactName ?? ''
        } else if (sortCol === 'Créé') {
          va = a.dateAdded; vb = b.dateAdded
        } else if (sortCol === 'Dernière activité') {
          va = a.dateUpdated ?? a.dateAdded; vb = b.dateUpdated ?? b.dateAdded
        } else if (sortCol === "Nom de l'entreprise") {
          va = a.companyName ?? ''; vb = b.companyName ?? ''
        }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }

    return result
  }, [contacts, debouncedQuery, filterOrigin, sortCol, sortDir, attributions])

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

  const [deleting,   setDeleting]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function refreshContacts() {
    setRefreshing(true)
    try {
      const data = await fetchJSON<{ contacts: GHLContact[] }>('/api/contact', { cache: 'no-store' })
      if (data.contacts) setContacts(data.contacts)
    } catch {
      toast('Impossible de rafraîchir les contacts', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  function handleAdd(_c: GHLContact) {
    void refreshContacts()
  }

  async function handleDeleteSelected() {
    if (checked.size === 0) return
    setDeleting(true)
    try {
      const results = await Promise.allSettled([...checked].map(id => fetch(`/api/contact/${id}`, { method: 'DELETE' })))
      const failed = results.filter(r => r.status === 'rejected').length
      setChecked(new Set())
      setAllChecked(false)
      await refreshContacts()
      if (failed > 0) toast(`${failed} suppression(s) échouée(s)`, 'error')
      else toast(`${results.length} contact(s) supprimé(s)`, 'success')
    } catch {
      toast('Erreur lors de la suppression', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = filtered.map(c => ({
      'Nom':               c.contactName ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      'Téléphone':         c.phone ?? '',
      'E-mail':            c.email ?? '',
      'Entreprise':        c.companyName ?? '',
      'Origine':           attributions.get(c.id) ?? 'Thomas',
      'Créé':              formatDate(c.dateAdded),
      'Dernière activité': formatRelative(c.dateUpdated ?? c.dateAdded),
      'Balises':           c.tags.join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, `contacts-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#EEF0EB]">
      <Toaster toasts={toasts} dismiss={dismiss} />
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-[#111111] leading-none">Contacts</h1>
          <span className="self-end mb-1 bg-[#E2FF8D] text-[#111111] text-xs font-bold px-2.5 py-1 rounded-full">
            {contacts.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checked.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
            >
              <Trash2 size={12} />
              {deleting ? 'Suppression…' : `Supprimer (${checked.size})`}
            </button>
          )}
          <button
            onClick={refreshContacts}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-[#6B7280] text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-[#F5F5F0] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-[#6B7280] text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-[#F5F5F0] transition-colors"
          >
            <FileSpreadsheet size={12} />
            Exporter
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-[#6B7280] text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-[#F5F5F0] transition-colors"
          >
            <Download size={12} />
            Importer
          </button>
          <NewLeadWidget onAddOpp={() => void refreshContacts()} />
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="px-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Filtres avancés */}
          <div className="relative" ref={filterMenuRef}>
            <button
              onClick={() => setShowFilterMenu(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filterOrigin ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'}`}
            >
              <SlidersHorizontal size={11} />
              {filterOrigin ?? 'Filtres avancés'}
              {filterOrigin && <button onClick={e => { e.stopPropagation(); setFilterOrigin(null) }} className="ml-1 text-white/70 hover:text-white">×</button>}
            </button>
            {showFilterMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-2xl shadow-lg z-20 py-1 min-w-[160px]">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide px-3 pt-2 pb-1">Origine</p>
                {['Thomas', 'Kai', 'Soren', 'Mia'].map(o => (
                  <button key={o} onClick={() => { setFilterOrigin(o); setShowFilterMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#111111] hover:bg-[#F5F5F0]">
                    {filterOrigin === o && <Check size={10} />}
                    <span className={filterOrigin === o ? 'font-semibold' : ''}>{o}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Trier — indicateur actif */}
          {sortCol && (
            <button onClick={() => { setSortCol(null) }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#111111] text-white px-3 py-1.5 rounded-full border border-[#111111] transition-colors">
              <ArrowUpDown size={11} />
              {sortCol} {sortDir === 'asc' ? '↑' : '↓'} ×
            </button>
          )}
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
          <div className="relative" ref={fieldsMenuRef}>
            <button
              onClick={() => setShowFieldsMenu(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${showFieldsMenu ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'}`}
            >
              <Settings2 size={11} />
              Gérer les champs
            </button>
            {showFieldsMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-2xl shadow-lg z-20 py-2 min-w-[200px]">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide px-3 pb-1">Colonnes visibles</p>
                {ALL_COLS.map(col => (
                  <button key={col} onClick={() => toggleCol(col)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#111111] hover:bg-[#F5F5F0]">
                    <span>{col}</span>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleCols.has(col) ? 'bg-[#111111] border-[#111111]' : 'border-[#D1D5DB]'}`}>
                      {visibleCols.has(col) && <Check size={10} className="text-white" />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div ref={tableRef} className="flex-1 overflow-auto mx-6 mb-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
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
              {(['Nom de Contact', ...ALL_COLS] as string[]).filter(col => col === 'Nom de Contact' || visibleCols.has(col as ColName)).map(col => {
                const sortable = ['Nom de Contact', 'Créé', 'Dernière activité', "Nom de l'entreprise"].includes(col)
                const active   = sortCol === col
                return (
                  <th key={col} className={COL_HEADER + (sortable ? ' cursor-pointer select-none' : '')}
                    onClick={() => sortable && handleSort(col)}>
                    <span className="flex items-center gap-1">
                      {col}
                      {sortable && (active
                        ? <ChevronDown size={10} className={`text-[#111111] transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                        : <ArrowUpDown size={10} className="text-[#D1D5DB]" />
                      )}
                    </span>
                  </th>
                )
              })}
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
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  visibleCols={visibleCols}
                />
              ))
            )}
          </tbody>
        </table>
      </div>


{showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={count => {
            setShowImport(false)
            if (count > 0) void refreshContacts()
          }}
        />
      )}
    </div>
  )
}
