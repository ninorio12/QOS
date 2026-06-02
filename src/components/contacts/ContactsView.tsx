'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClickOutside } from '@/hooks/useClickOutside'
import { Search, Download, SlidersHorizontal, ArrowUpDown, Settings2, Check, ChevronDown, FileSpreadsheet, Trash2, RefreshCw, Filter } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { fetchJSON } from '@/lib/fetchJSON'
import { getAvatarColor, formatDate, formatRelative, type ContactAttribution } from './types'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

const NewLeadWidget   = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const ImportModal     = dynamic(() => import('./ImportModal'),     { ssr: false })
const NewContactModal = dynamic(() => import('./NewContactModal'), { ssr: false })

const COL_HEADER = 'px-4 py-3 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide whitespace-nowrap'

const SWISS_CANTONS = [
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR',
  'JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG',
  'TI','UR','VD','VS','ZG','ZH',
]

// ─── Avatar ────────────────────────────────────────────────────
function Avatar({ contact }: { contact: GHLContact }) {
  const rawName  = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const name     = rawName.split(' ').map((w: string) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: color + '22', color }}>
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
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: color + '18', color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

// ─── Source badge ─────────────────────────────────────────────
function SourceBadge({ value, onClick }: { value: 'inbound' | 'outbound'; onClick: (e: React.MouseEvent) => void }) {
  const cfg = value === 'inbound'
    ? { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0', label: 'inbound'  }
    : { bg: '#FEF9C3', color: '#CA8A04', border: '#FDE68A', label: 'outbound' }
  return (
    <span onClick={onClick} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

// ─── Statut badge ─────────────────────────────────────────────
function StatutBadge({ value, onClick }: { value: 'lead' | 'client' | 'perdu'; onClick: (e: React.MouseEvent) => void }) {
  const cfg =
    value === 'client' ? { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'client'  } :
    value === 'perdu'  ? { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'perdu'   } :
                         { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', label: 'lead'    }
  return (
    <span onClick={onClick} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

// ─── Canton badge ─────────────────────────────────────────────
function CantonBadge({ value, onClick }: { value: string | null; onClick: (e: React.MouseEvent) => void }) {
  if (!value) return (
    <span onClick={onClick} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap cursor-pointer text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors border border-dashed border-[#E5E7EB]">
      + canton
    </span>
  )
  return (
    <span onClick={onClick} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
      {value}
    </span>
  )
}

// ─── Canton picker popup ──────────────────────────────────────
function CantonPicker({ onSelect, onClose }: { onSelect: (c: string | null) => void; onClose: () => void }) {
  const ref = useClickOutside<HTMLDivElement>(onClose)
  return (
    <div ref={ref} className="absolute z-30 top-full left-0 mt-1 bg-white border border-soren-border rounded-xl shadow-lg p-2 w-48" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-1">
        {SWISS_CANTONS.map(c => (
          <button key={c} onClick={() => { onSelect(c); onClose() }} className="text-[10px] font-semibold px-1.5 py-1 rounded-lg hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors text-[#374151]">
            {c}
          </button>
        ))}
      </div>
      <button onClick={() => { onSelect(null); onClose() }} className="mt-1 w-full text-[10px] text-[#9CA3AF] hover:text-red-500 py-1">
        Effacer
      </button>
    </div>
  )
}

// ─── Column filter dropdown ────────────────────────────────────
function ColFilterDropdown({ values, active, onSelect, onClose }: {
  values:   string[]
  active:   string | null
  onSelect: (v: string | null) => void
  onClose:  () => void
}) {
  const ref = useClickOutside<HTMLDivElement>(onClose)
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 bg-white border border-soren-border rounded-xl shadow-lg z-30 py-1 min-w-[140px] max-h-52 overflow-y-auto" onClick={e => e.stopPropagation()}>
      <button onClick={() => { onSelect(null); onClose() }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-soren-muted hover:bg-soren-elevated">
        Tous
      </button>
      {values.map(v => (
        <button key={v} onClick={() => { onSelect(v); onClose() }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-soren-text hover:bg-soren-elevated">
          {active === v && <Check size={10} className="text-[#FF4D00]" />}
          <span className={active === v ? 'font-semibold' : ''}>{v}</span>
        </button>
      ))}
    </div>
  )
}

const ALL_COLS = ['Téléphone', 'E-mail', "Nom de l'entreprise", 'Source', 'Statut', 'Canton', 'Créé', 'Dernière activité', 'Balises'] as const
type ColName = typeof ALL_COLS[number]

type ColFilter = Partial<Record<ColName | 'Nom de Contact', string>>

// ─── Table row ────────────────────────────────────────────────
function ContactRow({
  contact, checked, onCheck, onClick, visibleCols,
  source, statut, canton,
  onSourceToggle, onStatutToggle, onCantonChange,
}: {
  contact:         GHLContact
  checked:         boolean
  onCheck:         (id: string) => void
  onClick:         () => void
  visibleCols:     Set<ColName>
  source:          'inbound' | 'outbound'
  statut:          'lead' | 'client' | 'perdu'
  canton:          string | null
  onSourceToggle:  (id: string, e: React.MouseEvent) => void
  onStatutToggle:  (id: string, e: React.MouseEvent) => void
  onCantonChange:  (id: string, c: string | null) => void
}) {
  const rawName = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  const name = rawName === '—' ? '—' : rawName.split(' ').map((w: string) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
  const v = (col: ColName) => visibleCols.has(col)
  const [showCantonPicker, setShowCantonPicker] = useState(false)

  return (
    <tr className="border-b border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors group cursor-pointer" onClick={onClick}>
      <td className="pl-4 pr-2 py-3 w-10" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={() => onCheck(contact.id)} className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer" />
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-sm font-semibold text-soren-text truncate">{name}</span>
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
      {v('Source') && <td className="px-4 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
        <SourceBadge value={source} onClick={e => onSourceToggle(contact.id, e)} />
      </td>}
      {v('Statut') && <td className="px-4 py-3 min-w-[100px]" onClick={e => e.stopPropagation()}>
        <StatutBadge value={statut} onClick={e => onStatutToggle(contact.id, e)} />
      </td>}
      {v('Canton') && <td className="px-4 py-3 min-w-[100px] relative" onClick={e => e.stopPropagation()}>
        <CantonBadge value={canton} onClick={e => { e.stopPropagation(); setShowCantonPicker(v => !v) }} />
        {showCantonPicker && (
          <CantonPicker
            onSelect={c => onCantonChange(contact.id, c)}
            onClose={() => setShowCantonPicker(false)}
          />
        )}
      </td>}
      {v('Créé') && <td className="px-4 py-3 min-w-[130px]"><span className="text-sm text-soren-muted">{formatDate(contact.dateAdded)}</span></td>}
      {v('Dernière activité') && <td className="px-4 py-3 min-w-[150px]"><span className="text-sm text-soren-muted">{formatRelative(contact.dateUpdated ?? contact.dateAdded)}</span></td>}
      {v('Balises') && <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-1 flex-wrap">{contact.tags.map(t => <TagPill key={t} label={t} />)}</div>
      </td>}
    </tr>
  )
}

// ─── Column header with filter ─────────────────────────────────
function ColHeader({
  col, sortCol, sortDir, onSort, filterValues, activeFilter, onFilter,
}: {
  col:          string
  sortCol:      string | null
  sortDir:      'asc' | 'desc'
  onSort:       (col: string) => void
  filterValues: string[]
  activeFilter: string | null
  onFilter:     (col: string, val: string | null) => void
}) {
  const [showFilter, setShowFilter] = useState(false)
  const SORTABLE = ['Nom de Contact', 'Créé', 'Dernière activité', "Nom de l'entreprise"]
  const sortable = SORTABLE.includes(col)
  const active   = sortCol === col
  const filtered = !!activeFilter

  return (
    <th className={COL_HEADER + ' group/th'}>
      <div className="flex items-center gap-1">
        <span
          className={sortable ? 'cursor-pointer select-none flex items-center gap-1' : 'flex items-center gap-1'}
          onClick={() => sortable && onSort(col)}
        >
          {col}
          {sortable && (active
            ? <ChevronDown size={10} className={`text-soren-text transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
            : <ArrowUpDown size={10} className="text-[#D1D5DB]" />
          )}
        </span>
        {filterValues.length > 0 && (
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowFilter(v => !v) }}
              className={`ml-0.5 p-0.5 rounded transition-colors ${filtered ? 'text-[#FF4D00]' : 'text-[#D1D5DB] opacity-0 group-hover/th:opacity-100 hover:text-soren-muted'}`}
            >
              <Filter size={9} />
            </button>
            {showFilter && (
              <ColFilterDropdown
                values={filterValues}
                active={activeFilter}
                onSelect={v => onFilter(col, v)}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>
        )}
      </div>
    </th>
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
  const tableRef = useRef<HTMLDivElement>(null)
  const { toasts, toast, dismiss } = useToast()
  const [contacts,     setContacts]     = useState<GHLContact[]>(initial)
  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [query,          setQuery]          = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    void refreshContacts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const [showImport,    setShowImport]    = useState(false)
  const [allChecked,    setAllChecked]    = useState(false)
  const [sortCol,       setSortCol]       = useState<string|null>(null)
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>('asc')
  const [showFieldsMenu, setShowFieldsMenu] = useState(false)
  const [visibleCols,   setVisibleCols]  = useState<Set<ColName>>(new Set(ALL_COLS))
  const [colFilters,    setColFilters]   = useState<ColFilter>({})
  const [filterPipeline, setFilterPipeline] = useState(false)

  const [sourceMap, setSourceMap] = useState<Map<string, 'inbound' | 'outbound'>>(new Map())
  const [statutMap, setStatutMap] = useState<Map<string, 'lead' | 'client' | 'perdu'>>(new Map())
  const [cantonMap, setCantonMap] = useState<Map<string, string>>(new Map())

  // Load metadata from Convex when contacts load
  useEffect(() => {
    if (!contacts.length) return
    const ids = contacts.map(c => c.id).join(',')
    fetch(`/api/contact/meta?ids=${ids}`)
      .then(r => r.json())
      .then((d: { meta?: { ghl_contact_id: string; source?: string; statut?: string; canton?: string }[] }) => {
        if (!d.meta) return
        const src = new Map<string, 'inbound' | 'outbound'>()
        const sta = new Map<string, 'lead' | 'client' | 'perdu'>()
        const can = new Map<string, string>()
        for (const m of d.meta) {
          if (m.source) src.set(m.ghl_contact_id, m.source as 'inbound' | 'outbound')
          if (m.statut) sta.set(m.ghl_contact_id, m.statut as 'lead' | 'client' | 'perdu')
          if (m.canton) can.set(m.ghl_contact_id, m.canton)
        }
        setSourceMap(src)
        setStatutMap(sta)
        setCantonMap(can)
      })
      .catch(() => {})
  }, [contacts])

  function handleSourceToggle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSourceMap(prev => {
      const next = new Map(prev)
      const newVal = next.get(id) === 'outbound' ? 'inbound' : 'outbound'
      next.set(id, newVal)
      fetch('/api/contact/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ghl_contact_id: id, source: newVal }) }).catch(() => {})
      return next
    })
  }
  function handleStatutToggle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setStatutMap(prev => {
      const next = new Map(prev)
      const cur = next.get(id) ?? 'lead'
      const newVal = cur === 'lead' ? 'client' : cur === 'client' ? 'perdu' : 'lead'
      next.set(id, newVal as 'lead' | 'client' | 'perdu')
      fetch('/api/contact/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ghl_contact_id: id, statut: newVal }) }).catch(() => {})
      return next
    })
  }
  function handleCantonChange(id: string, c: string | null) {
    setCantonMap(prev => {
      const next = new Map(prev)
      if (c === null) next.delete(id)
      else next.set(id, c)
      fetch('/api/contact/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ghl_contact_id: id, canton: c ?? '' }) }).catch(() => {})
      return next
    })
  }

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

  function handleColFilter(col: string, val: string | null) {
    setColFilters(prev => {
      const next = { ...prev }
      if (val === null) delete next[col as keyof ColFilter]
      else next[col as keyof ColFilter] = val
      return next
    })
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
    return () => { el.removeEventListener('wheel', onWheel); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Contact IDs présents dans le pipeline (chargés une fois)
  const [pipelineContactIds, setPipelineContactIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    fetch('/api/pipeline-opps').then(r => r.json()).then((d: { opps?: { contactId: string }[] }) => {
      if (d.opps) setPipelineContactIds(new Set(d.opps.map(o => o.contactId).filter(Boolean)))
    }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    let result = contacts

    if (filterPipeline) result = result.filter(c => pipelineContactIds.has(c.id))

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(c =>
        `${c.contactName} ${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''} ${c.phone ?? ''} ${c.companyName ?? ''} ${c.tags.join(' ')}`
          .toLowerCase().includes(q)
      )
    }

    // Column filters
    for (const [col, val] of Object.entries(colFilters)) {
      if (!val) continue
      result = result.filter(c => {
        if (col === 'Nom de Contact') return (c.contactName ?? '').toLowerCase().includes(val.toLowerCase())
        if (col === 'Source')         return (sourceMap.get(c.id) ?? 'inbound') === val
        if (col === 'Statut')         return (statutMap.get(c.id) ?? 'lead') === val
        if (col === 'Canton')         return (cantonMap.get(c.id) ?? null) === val
        if (col === "Nom de l'entreprise") return (c.companyName ?? '').toLowerCase().includes(val.toLowerCase())
        if (col === 'Balises')        return c.tags.includes(val)
        return true
      })
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let va = '', vb = ''
        if (sortCol === 'Nom de Contact')         { va = a.contactName ?? ''; vb = b.contactName ?? '' }
        else if (sortCol === 'Créé')              { va = a.dateAdded; vb = b.dateAdded }
        else if (sortCol === 'Dernière activité') { va = a.dateUpdated ?? a.dateAdded; vb = b.dateUpdated ?? b.dateAdded }
        else if (sortCol === "Nom de l'entreprise") { va = a.companyName ?? ''; vb = b.companyName ?? '' }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }

    return result
  }, [contacts, debouncedQuery, colFilters, sortCol, sortDir, sourceMap, statutMap, cantonMap, filterPipeline, pipelineContactIds])

  // Unique values per filterable column (for dropdowns)
  const filterOptions = useMemo(() => ({
    'Source':              ['inbound', 'outbound'],
    'Statut':              ['lead', 'client', 'perdu'],
    'Canton':              SWISS_CANTONS.filter(c => contacts.some(ct => cantonMap.get(ct.id) === c)),
    'Balises':             [...new Set(contacts.flatMap(c => c.tags))].sort(),
    "Nom de l'entreprise": [...new Set(contacts.map(c => c.companyName).filter(Boolean) as string[])].sort(),
    'Nom de Contact':      [] as string[],
    'Téléphone':           [] as string[],
    'E-mail':              [] as string[],
    'Créé':                [] as string[],
    'Dernière activité':   [] as string[],
  }), [contacts, cantonMap])

  function toggleCheck(id: string) {
    setChecked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    if (allChecked) { setChecked(new Set()); setAllChecked(false) }
    else { setChecked(new Set(filtered.map(c => c.id))); setAllChecked(true) }
  }

  const [deleting,         setDeleting]         = useState(false)
  const [refreshing,       setRefreshing]       = useState(false)
  const [selectedContact,  setSelectedContact]  = useState<GHLContact | null>(null)

  async function refreshContacts() {
    setRefreshing(true)
    try {
      const data = await fetchJSON<{ contacts: GHLContact[] }>('/api/contact', { cache: 'no-store' })
      if (data.contacts) setContacts(data.contacts)
    } catch {
      toast('Impossible de rafraîchir les contacts', 'error')
    } finally { setRefreshing(false) }
  }

  function handleAdd(_c: GHLContact) { void refreshContacts() }

  async function handleDeleteSelected() {
    if (checked.size === 0) return
    setDeleting(true)
    try {
      const results = await Promise.allSettled([...checked].map(id => fetch(`/api/contact/${id}`, { method: 'DELETE' })))
      const failed = results.filter(r => r.status === 'rejected').length
      setChecked(new Set()); setAllChecked(false)
      await refreshContacts()
      if (failed > 0) toast(`${failed} suppression(s) échouée(s)`, 'error')
      else toast(`${results.length} contact(s) supprimé(s)`, 'success')
    } catch { toast('Erreur lors de la suppression', 'error') }
    finally { setDeleting(false) }
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = filtered.map(c => ({
      'Nom':               c.contactName ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
      'Téléphone':         c.phone ?? '',
      'E-mail':            c.email ?? '',
      'Entreprise':        c.companyName ?? '',
      'Canton':            cantonMap.get(c.id) ?? '',
      'Source':            sourceMap.get(c.id) ?? 'inbound',
      'Statut':            statutMap.get(c.id) ?? 'lead',
      'Créé':              formatDate(c.dateAdded),
      'Dernière activité': formatRelative(c.dateUpdated ?? c.dateAdded),
      'Balises':           c.tags.join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, `contacts-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const activeFilterCount = Object.keys(colFilters).length

  return (
    <div className="h-full flex flex-col overflow-hidden bg-soren-app">
      <Toaster toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <div className="flex items-center gap-3">
          <span className="self-end mb-1 bg-[#FF4D00] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {contacts.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          {checked.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleting} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors">
              <Trash2 size={12} />
              {deleting ? 'Suppression…' : `Supprimer (${checked.size})`}
            </button>
          )}
          <button onClick={refreshContacts} disabled={refreshing} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-soren-elevated disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-soren-elevated transition-colors">
            <FileSpreadsheet size={12} />
            Exporter
          </button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3.5 py-2 rounded-full hover:bg-soren-elevated transition-colors">
            <Download size={12} />
            Importer
          </button>
          <NewLeadWidget onAddOpp={() => void refreshContacts()} label="Nouveau contact" />
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="relative z-10 px-6 pb-3 flex-shrink-0 flex items-center justify-between gap-4" style={{ animation: 'fadeSlideUp 400ms ease-out 70ms both' }}>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button onClick={() => setColFilters({})} className="flex items-center gap-1.5 text-xs font-semibold bg-[#FF4D00] text-white px-3 py-1.5 rounded-full transition-colors">
              <Filter size={11} />
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''} ×
            </button>
          )}
          {sortCol && (
            <button onClick={() => setSortCol(null)} className="flex items-center gap-1.5 text-xs font-semibold bg-soren-sidebar text-white px-3 py-1.5 rounded-full border border-[#111111] transition-colors">
              <ArrowUpDown size={11} />
              {sortCol} {sortDir === 'asc' ? '↑' : '↓'} ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
            <Search size={12} className="text-soren-subtle flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher contacts..."
              className="bg-transparent text-sm text-soren-text placeholder-[#9CA3AF] outline-none w-44"
            />
          </div>
          <div className="relative" ref={fieldsMenuRef}>
            <button
              onClick={() => setShowFieldsMenu(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${showFieldsMenu ? 'bg-soren-sidebar text-white border-[#111111]' : 'bg-soren-card text-soren-muted border-soren-border hover:bg-soren-elevated'}`}
            >
              <Settings2 size={11} />
              Gérer les champs
            </button>
            {showFieldsMenu && (
              <div className="absolute right-0 top-full mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-lg z-[200] py-2 min-w-[200px]">
                <p className="text-[10px] font-bold text-soren-subtle uppercase tracking-wide px-3 pb-1">Colonnes visibles</p>
                {ALL_COLS.map(col => (
                  <button key={col} onClick={() => toggleCol(col)} className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-soren-text hover:bg-soren-elevated">
                    <span>{col}</span>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleCols.has(col) ? 'bg-soren-sidebar border-[#111111]' : 'border-[#D1D5DB]'}`}>
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
      <div ref={tableRef} className="flex-1 overflow-auto mx-6 mb-6 bg-soren-card rounded-2xl border border-soren-border shadow-sm" style={{ animation: 'fadeSlideUp 400ms ease-out 140ms both' }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-soren-card z-10 border-b border-soren-border">
            <tr>
              <th className="pl-4 pr-2 py-3 w-10">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer" />
              </th>
              <ColHeader
                col="Nom de Contact"
                sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
                filterValues={filterOptions['Nom de Contact']}
                activeFilter={colFilters['Nom de Contact'] ?? null}
                onFilter={handleColFilter}
              />
              {ALL_COLS.filter(col => visibleCols.has(col)).map(col => (
                <ColHeader
                  key={col}
                  col={col}
                  sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
                  filterValues={filterOptions[col as keyof typeof filterOptions] ?? []}
                  activeFilter={colFilters[col as keyof ColFilter] ?? null}
                  onFilter={handleColFilter}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2 + visibleCols.size} className="px-4 py-16 text-center text-sm text-soren-subtle">
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
                  onClick={() => setSelectedContact(contact)}
                  visibleCols={visibleCols}
                  source={sourceMap.get(contact.id) ?? 'inbound'}
                  statut={statutMap.get(contact.id) ?? 'lead'}
                  canton={cantonMap.get(contact.id) ?? null}
                  onSourceToggle={handleSourceToggle}
                  onStatutToggle={handleStatutToggle}
                  onCantonChange={handleCantonChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={count => { setShowImport(false); if (count > 0) void refreshContacts() }}
        />
      )}

      {selectedContact && (
        <NewContactModal
          contact={selectedContact}
          initialCanton={cantonMap.get(selectedContact.id) ?? ''}
          initialStatut={statutMap.get(selectedContact.id) ?? 'lead'}
          onClose={() => setSelectedContact(null)}
          onSave={(updated, newCanton, newStatut) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
            if (newCanton !== undefined) {
              setCantonMap(prev => { const m = new Map(prev); newCanton ? m.set(updated.id, newCanton) : m.delete(updated.id); return m })
            }
            if (newStatut !== undefined) {
              setStatutMap(prev => { const m = new Map(prev); m.set(updated.id, newStatut); return m })
            }
            setSelectedContact(null)
          }}
        />
      )}
    </div>
  )
}
