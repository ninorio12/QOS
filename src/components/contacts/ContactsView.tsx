'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useClickOutside } from '@/hooks/useClickOutside'
import { Search, Download, SlidersHorizontal, ArrowUpDown, Settings2, Check, ChevronDown, ChevronRight, FileSpreadsheet, Trash2, RefreshCw, Filter, X } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { fetchJSON } from '@/lib/fetchJSON'
import { getAvatarColor, formatDate, formatRelative, type ContactAttribution } from './types'
import { lostObjectionLabel, lostReasonLabel } from '@/lib/lostReasons'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'
import { MotionStagger, MotionItem } from '@/components/ui/Motion'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const NewLeadWidget   = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const ImportModal     = dynamic(() => import('./ImportModal'),     { ssr: false })
const NewContactModal = dynamic(() => import('./NewContactModal'), { ssr: false })

const COL_HEADER = 'px-3 py-2 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide whitespace-nowrap'

const SWISS_CANTONS = [
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR',
  'JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG',
  'TI','UR','VD','VS','ZG','ZH',
]

const CANTON_NAMES: Record<string, string> = {
  AG: 'Argovie', AI: 'Appenzell Rh.-Int.', AR: 'Appenzell Rh.-Ext.', BE: 'Berne',
  BL: 'Bâle-Campagne', BS: 'Bâle-Ville', FR: 'Fribourg', GE: 'Genève', GL: 'Glaris',
  GR: 'Grisons', JU: 'Jura', LU: 'Lucerne', NE: 'Neuchâtel', NW: 'Nidwald',
  OW: 'Obwald', SG: 'Saint-Gall', SH: 'Schaffhouse', SO: 'Soleure', SZ: 'Schwytz',
  TG: 'Thurgovie', TI: 'Tessin', UR: 'Uri', VD: 'Vaud', VS: 'Valais', ZG: 'Zoug', ZH: 'Zurich',
}
const cantonName = (code: string | null) => code ? (CANTON_NAMES[code] ?? code) : code

// ─── Avatar ────────────────────────────────────────────────────
function Avatar({ contact }: { contact: GHLContact }) {
  const rawName  = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const name     = rawName.split(' ').map((w: string) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: color + '22', color }}>
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
type SourceVal = 'inbound' | 'outbound' | 'recommandation'
function SourceBadge({ value, onClick }: { value: string; onClick: (e: React.MouseEvent) => void }) {
  // Affiche fidèlement la source d'acquisition (trace conservée même devenu client).
  const cfg =
    value === 'inbound'        ? { cls: 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20', label: 'inbound'  } :
    value === 'outbound'       ? { cls: 'bg-[#FCE7F3] text-[#EC4899] border-[#FBCFE8] dark:bg-pink-500/15 dark:text-pink-400 dark:border-pink-500/20', label: 'outbound' } :
    value === 'recommandation' || value === 'referral'
                               ? { cls: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/20', label: 'recommandation' } :
    value === 'onboarding'     ? { cls: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20', label: 'onboarding' } :
                                 { cls: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] dark:bg-white/10 dark:text-zinc-300 dark:border-white/10', label: value || '—' }
  return (
    <span onClick={onClick} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Statut badge ─────────────────────────────────────────────
function StatutBadge({ value, onClick }: { value: 'lead' | 'client' | 'perdu'; onClick: (e: React.MouseEvent) => void }) {
  const cfg =
    value === 'client' ? { cls: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20', label: 'client'  } :
    value === 'perdu'  ? { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20', label: 'perdu'   } :
                         { cls: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB] dark:bg-white/10 dark:text-zinc-300 dark:border-white/10', label: 'lead'    }
  return (
    <span onClick={onClick} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity border ${cfg.cls}`}>
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
    <span onClick={onClick} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity bg-[#F3F4F6] text-[#6B7280] dark:bg-white/10 dark:text-zinc-300">
      {cantonName(value)}
    </span>
  )
}

// ─── Canton picker popup ──────────────────────────────────────
function CantonPicker({ onSelect, onClose }: { onSelect: (c: string | null) => void; onClose: () => void }) {
  const ref = useClickOutside<HTMLDivElement>(onClose)
  return (
    <div ref={ref} className="absolute z-30 top-full left-0 mt-1 bg-white border border-soren-border rounded-xl shadow-lg p-1 w-52 max-h-64 overflow-y-auto" onClick={e => e.stopPropagation()}>
      {SWISS_CANTONS.map(c => (
        <button key={c} onClick={() => { onSelect(c); onClose() }} className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors text-[#374151] flex items-center justify-between">
          <span>{CANTON_NAMES[c]}</span>
          <span className="text-[9px] text-[#9CA3AF]">{c}</span>
        </button>
      ))}
      <button onClick={() => { onSelect(null); onClose() }} className="mt-1 w-full text-[10px] text-[#9CA3AF] hover:text-red-500 py-1.5 border-t border-soren-border">
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
  const [q, setQ] = useState('')
  const shown = q.trim() ? values.filter(v => v.toLowerCase().includes(q.toLowerCase())) : values
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 bg-white border border-soren-border rounded-xl shadow-lg z-30 w-[200px] flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Recherche type Excel */}
      <div className="p-2 border-b border-soren-border">
        <div className="flex items-center gap-1.5 bg-soren-elevated rounded-lg px-2 py-1.5">
          <Search size={11} className="text-soren-subtle flex-shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer…"
            className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none min-w-0" />
        </div>
      </div>
      <div className="py-1 max-h-52 overflow-y-auto">
        <button onClick={() => { onSelect(null); onClose() }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-soren-muted hover:bg-soren-elevated">
          {!active && <Check size={10} className="text-[#FF4D00]" />}<span className={!active ? 'font-semibold' : ''}>Tous</span>
        </button>
        {shown.map(v => (
          <button key={v} onClick={() => { onSelect(v); onClose() }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-soren-text hover:bg-soren-elevated text-left">
            {active === v && <Check size={10} className="text-[#FF4D00] flex-shrink-0" />}
            <span className={`truncate ${active === v ? 'font-semibold' : ''}`}>{v}</span>
          </button>
        ))}
        {shown.length === 0 && <p className="px-3 py-2 text-[11px] text-soren-subtle">Aucun résultat</p>}
      </div>
    </div>
  )
}

const ALL_COLS = ['Téléphone', 'E-mail', "Nom de l'entreprise", 'Métier', 'Niche', 'Source', 'Statut', 'Étape', 'Objections', 'Canton', 'Créé'] as const
type ColName = typeof ALL_COLS[number]

type ColFilter = Partial<Record<ColName | 'Nom de Contact', string>>

// ─── Table row ────────────────────────────────────────────────
function ContactRow({
  contact, checked, onCheck, onClick, visibleCols,
  source, statut, canton, stage,
  onSourceToggle, onStatutToggle, onCantonChange,
}: {
  contact:         GHLContact
  checked:         boolean
  onCheck:         (id: string) => void
  onClick:         () => void
  visibleCols:     Set<ColName>
  source:          SourceVal
  statut:          'lead' | 'client' | 'perdu'
  canton:          string | null
  stage:           { label: string; lost: boolean } | null
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
      <td className="pl-4 pr-2 py-2 w-10" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={() => onCheck(contact.id)} className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer" />
      </td>
      <td className="px-3 py-2 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-[12px] font-semibold text-soren-text truncate">{name}</span>
        </div>
      </td>
      {v('Téléphone') && <td className="px-3 py-2 min-w-[140px]">
        {contact.phone ? <span className="text-[12px] text-[#374151]">{contact.phone}</span> : <span className="text-[12px] text-[#D1D5DB]">—</span>}
      </td>}
      {v('E-mail') && <td className="px-3 py-2 min-w-[200px]">
        {contact.email ? <span className="text-[12px] text-[#374151]">{contact.email}</span> : <span className="text-[12px] text-[#D1D5DB]">—</span>}
      </td>}
      {v("Nom de l'entreprise") && <td className="px-3 py-2 min-w-[160px]">
        {contact.companyName ? <span className="text-[12px] text-[#374151] truncate">{contact.companyName}</span> : <span className="text-[12px] text-[#D1D5DB]">—</span>}
      </td>}
      {v('Métier') && <td className="px-3 py-2 min-w-[140px]">
        {contact.metier ? <span className="text-[12px] text-[#374151] truncate">{contact.metier}</span> : <span className="text-[12px] text-[#D1D5DB]">—</span>}
      </td>}
      {v('Niche') && <td className="px-3 py-2 min-w-[140px]">
        {contact.niche ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7280] dark:bg-white/10 dark:text-zinc-300 whitespace-nowrap">{contact.niche}</span> : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>}
      {v('Source') && <td className="px-3 py-2 min-w-[110px]" onClick={e => e.stopPropagation()}>
        <SourceBadge value={source} onClick={e => onSourceToggle(contact.id, e)} />
      </td>}
      {v('Statut') && <td className="px-3 py-2 min-w-[100px]" onClick={e => e.stopPropagation()}>
        <StatutBadge value={statut} onClick={e => onStatutToggle(contact.id, e)} />
      </td>}
      {v('Étape') && <td className="px-3 py-2 min-w-[130px]">
        {stage ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border ${
            stage.lost ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]' : 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
          }`}>
            {stage.lost && <X size={9} strokeWidth={3} className="flex-shrink-0" />}{stage.label}
          </span>
        ) : <span className="text-[12px] text-[#D1D5DB]">—</span>}
      </td>}
      {v('Objections') && <td className="px-3 py-2 min-w-[150px]">
        {(() => {
          const won  = lostObjectionLabel(contact.wonObjection)   // surmontée → vert
          // Perdu → rouge : l'objection R1/R2 si présente, sinon la raison de perte
          // (faux numéro, pas intéressé, jamais répondu, non qualifié…).
          const lost = statut === 'perdu'
            ? (lostObjectionLabel(contact.lostObjection) ?? lostReasonLabel(contact.lostReason))
            : null
          if (!won && !lost) return <span className="text-[12px] text-[#D1D5DB]">—</span>
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {won && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20">{won}</span>}
              {lost && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20">{lost}</span>}
            </div>
          )
        })()}
      </td>}
      {v('Canton') && <td className="px-3 py-2 min-w-[100px] relative" onClick={e => e.stopPropagation()}>
        <CantonBadge value={canton} onClick={e => { e.stopPropagation(); setShowCantonPicker(v => !v) }} />
        {showCantonPicker && (
          <CantonPicker
            onSelect={c => onCantonChange(contact.id, c)}
            onClose={() => setShowCantonPicker(false)}
          />
        )}
      </td>}
      {v('Créé') && <td className="px-3 py-2 min-w-[130px]"><span className="text-[12px] text-soren-muted">{formatDate(contact.dateAdded)}</span></td>}
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
  const SORTABLE = ['Nom de Contact', 'Créé', "Nom de l'entreprise"]
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
  // Persisted filter state (survives navigation until explicitly cleared)
  const readSaved = () => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('vividflow_contacts_filters') ?? 'null') as { query?: string; sortCol?: string | null; sortDir?: 'asc'|'desc'; colFilters?: ColFilter; filterPipeline?: boolean } | null } catch { return null }
  }

  const [contacts,     setContacts]     = useState<GHLContact[]>(initial)
  const [checked,      setChecked]      = useState<Set<string>>(new Set())

  // Réactivité live : toute modif d'un contact (fiche, badge, ajout, suppression) écrite
  // dans Convex resynchronise la liste automatiquement — plus besoin d'« Actualiser ».
  const liveContacts = useQuery(api.crm_contacts.list)
  // Étape commerciale de chaque contact (1 seul appel groupé).
  const stageMap = (useQuery(api.crm_contacts.commercialStagesAll) ?? {}) as Record<string, { label: string; lost: boolean; key: string }>
  const stageOf = (id: string) => stageMap[id] ?? null
  useEffect(() => {
    if (!liveContacts) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setContacts((liveContacts as any[]).map(c => ({
      id:          c._id,
      contactName: `${c.firstName} ${c.lastName ?? ''}`.trim(),
      firstName:   c.firstName   || null,
      lastName:    c.lastName    || null,
      email:       c.email       || null,
      phone:       c.phone       || null,
      companyName: c.companyName || null,
      address1:    c.address1    || null,
      city:        c.city        || null,
      postalCode:  c.postalCode  || null,
      website:     c.website     || null,
      source:      c.source      || null,
      statut:        c.statut        || null,
      lostStage:     c.lostStage     || null,
      lostReason:    c.lostReason    || null,
      lostObjection: c.lostObjection || null,
      wonObjection:  c.wonObjection  || null,
      dealDate:      c.dealDate      || null,
      canton:        c.canton        || null,
      metier:      c.metier      || null,
      niche:       c.niche       || null,
      tags:        c.tags        ?? [],
      dateAdded:   c.createdAt,
      dateUpdated: c.updatedAt   || null,
    })) as GHLContact[])
  }, [liveContacts])

  // La liste est live via useQuery(crm_contacts.list) ci-dessus → pas de router.refresh()
  // au montage (il forçait un re-fetch serveur bloquant redondant à chaque ouverture).
  useEffect(() => { setContacts(initial) }, [initial])

  const [query,          setQuery]          = useState(() => readSaved()?.query ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(() => readSaved()?.query ?? '')

  // (Plus de refresh REST au montage : la liste est live via useQuery ci-dessus.)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const [showImport,    setShowImport]    = useState(false)
  const [allChecked,    setAllChecked]    = useState(false)
  const [sortCol,       setSortCol]       = useState<string|null>(() => readSaved()?.sortCol ?? null)
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>(() => readSaved()?.sortDir ?? 'asc')
  const [showFieldsMenu, setShowFieldsMenu] = useState(false)
  const [visibleCols,   setVisibleCols]  = useState<Set<ColName>>(new Set(ALL_COLS))
  const [colFilters,    setColFilters]   = useState<ColFilter>(() => readSaved()?.colFilters ?? {})
  const [filterPipeline, setFilterPipeline] = useState(() => readSaved()?.filterPipeline ?? false)
  const [page,          setPage]          = useState(1)
  const PER_PAGE = 30

  // Persist filters whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vividflow_contacts_filters', JSON.stringify({ query, sortCol, sortDir, colFilters, filterPipeline }))
    } catch {}
  }, [query, sortCol, sortDir, colFilters, filterPipeline])

  const [sourceMap, setSourceMap] = useState<Map<string, SourceVal>>(new Map())
  const [statutMap, setStatutMap] = useState<Map<string, 'lead' | 'client' | 'perdu'>>(new Map())
  const [cantonMap, setCantonMap] = useState<Map<string, string>>(new Map())

  // Load source/statut/canton directly from the contact objects (crm_contacts fields)
  useEffect(() => {
    const src = new Map<string, SourceVal>()
    const sta = new Map<string, 'lead' | 'client' | 'perdu'>()
    const can = new Map<string, string>()
    for (const c of contacts) {
      const ext = c as GHLContact & { statut?: string | null; canton?: string | null }
      if (ext.source) src.set(c.id, ext.source as SourceVal)
      if (ext.statut) sta.set(c.id, ext.statut as 'lead' | 'client' | 'perdu')
      if (ext.canton) can.set(c.id, ext.canton)
    }
    setSourceMap(src)
    setStatutMap(sta)
    setCantonMap(can)
  }, [contacts])

  function handleSourceToggle(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSourceMap(prev => {
      const next = new Map(prev)
      const cur = next.get(id) ?? 'inbound'
      const newVal: SourceVal = cur === 'inbound' ? 'outbound' : cur === 'outbound' ? 'recommandation' : 'inbound'
      next.set(id, newVal)
      fetch(`/api/contact/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: newVal }) }).catch(() => {})
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
      // Persist statut then sync to the right pipeline
      fetch(`/api/contact/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: newVal }) })
        .then(() => fetch('/api/crm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: id }) }))
        .then(() => { if (newVal === 'lead') toast('Contact ajouté au pipeline Leads', 'success'); else if (newVal === 'client') toast('Contact ajouté au pipeline Clients', 'success') })
        .catch(() => {})
      return next
    })
  }
  function handleCantonChange(id: string, c: string | null) {
    setCantonMap(prev => {
      const next = new Map(prev)
      if (c === null) next.delete(id)
      else next.set(id, c)
      fetch(`/api/contact/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canton: c ?? '' }) }).catch(() => {})
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
        if (col === 'Téléphone')      return (c.phone ?? '').toLowerCase().includes(val.toLowerCase())
        if (col === 'E-mail')         return (c.email ?? '').toLowerCase().includes(val.toLowerCase())
        if (col === 'Source')         return (sourceMap.get(c.id) ?? 'inbound') === val
        if (col === 'Statut')         return (statutMap.get(c.id) ?? 'lead') === val
        if (col === 'Étape')          return (stageMap[c.id]?.label ?? '') === val
        if (col === 'Objections')     return [lostObjectionLabel(c.wonObjection), c.statut === 'perdu' ? (lostObjectionLabel(c.lostObjection) ?? lostReasonLabel(c.lostReason)) : null].filter(Boolean).includes(val)
        if (col === 'Canton')         return (cantonMap.get(c.id) ?? null) === val
        if (col === "Nom de l'entreprise") return (c.companyName ?? '').toLowerCase().includes(val.toLowerCase())
        if (col === 'Métier')         return (c.metier ?? '') === val
        if (col === 'Niche')          return (c.niche ?? '') === val
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
  }, [contacts, debouncedQuery, colFilters, sortCol, sortDir, sourceMap, statutMap, cantonMap, stageMap, filterPipeline, pipelineContactIds])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage    = Math.min(page, totalPages)
  const paginated   = useMemo(() => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [filtered, safePage])

  // Reset to page 1 when filters/search change
  useEffect(() => { setPage(1) }, [debouncedQuery, colFilters, sortCol, sortDir, filterPipeline])

  // Unique values per filterable column (for dropdowns)
  const filterOptions = useMemo(() => ({
    'Source':              ['inbound', 'outbound', 'recommandation'],
    'Statut':              ['lead', 'client', 'perdu'],
    'Canton':              SWISS_CANTONS.filter(c => contacts.some(ct => cantonMap.get(ct.id) === c)),
    'Métier':              [...new Set(contacts.map(c => c.metier).filter(Boolean) as string[])].sort(),
    'Niche':               [...new Set(contacts.map(c => c.niche).filter(Boolean) as string[])].sort(),
    "Nom de l'entreprise": [...new Set(contacts.map(c => c.companyName).filter(Boolean) as string[])].sort(),
    'Étape':               [...new Set(contacts.map(c => stageMap[c.id]?.label).filter(Boolean) as string[])].sort(),
    'Objections':          [...new Set(contacts.flatMap(c => [lostObjectionLabel(c.wonObjection), c.statut === 'perdu' ? (lostObjectionLabel(c.lostObjection) ?? lostReasonLabel(c.lostReason)) : null]).filter(Boolean) as string[])].sort(),
    'Nom de Contact':      [...new Set(contacts.map(c => c.contactName).filter(Boolean) as string[])].sort(),
    'Téléphone':           [...new Set(contacts.map(c => c.phone).filter(Boolean) as string[])].sort(),
    'E-mail':              [...new Set(contacts.map(c => c.email).filter(Boolean) as string[])].sort(),
    'Créé':                [] as string[],
    'Dernière activité':   [] as string[],
  }), [contacts, cantonMap, stageMap])

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

  // Ouverture directe d'une fiche via ?c=<id> (depuis la recherche globale).
  const searchParams = useSearchParams()
  useEffect(() => {
    const cid = searchParams.get('c')
    if (!cid) return
    const found = contacts.find(c => c.id === cid)
    if (found) setSelectedContact(found)
  }, [searchParams, contacts])

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
      'Objection surmontée': lostObjectionLabel(c.wonObjection) ?? '',
      'Objection perdante':  (c.statut === 'perdu' ? (lostObjectionLabel(c.lostObjection) ?? lostReasonLabel(c.lostReason)) : null) ?? '',
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
    <MotionStagger className="h-full flex flex-col overflow-hidden bg-soren-app">
      <Toaster toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────── */}
      <MotionItem className="px-4 pt-5 pb-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap gap-y-2">
        <div className="flex items-center gap-3">
          <span className="bg-[#FF4D00] text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {contacts.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {checked.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleting} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors">
              <Trash2 size={12} />
              {deleting ? 'Suppression…' : `Supprimer (${checked.size})`}
            </button>
          )}
          <button onClick={refreshContacts} disabled={refreshing} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-soren-elevated disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-soren-elevated transition-colors">
            <FileSpreadsheet size={12} />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-soren-elevated transition-colors">
            <Download size={12} />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <NewLeadWidget onAddOpp={() => void refreshContacts()} label="Nouveau contact" />
        </div>
      </MotionItem>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <MotionItem className="relative z-10 px-4 pb-3 flex-shrink-0 flex items-center justify-between gap-4">
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
          <div className="flex items-center gap-1.5 bg-soren-elevated/70 rounded-full px-2.5 py-1">
            <Search size={11} className="text-soren-subtle flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="bg-transparent text-[12px] text-soren-text placeholder-[#B7B7B2] outline-none w-36"
            />
          </div>
          <div className="relative" ref={fieldsMenuRef}>
            <button
              onClick={() => setShowFieldsMenu(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${showFieldsMenu ? 'bg-soren-sidebar text-white border-[#111111]' : 'bg-soren-card text-soren-muted border-soren-border hover:bg-soren-elevated'}`}
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
      </MotionItem>

      {/* ── Liste cartes (mobile) ─────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-soren-subtle">Aucun contact trouvé</div>
        ) : (
          paginated.map(contact => {
            const rawName = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
            const name = rawName === '—' ? '—' : rawName.split(' ').map((w: string) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ')
            const sub = contact.companyName || contact.phone || contact.email || '—'
            return (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="w-full text-left bg-soren-card rounded-2xl border border-soren-border shadow-sm p-3 flex items-center gap-3 active:bg-[#FAFAF8] transition-colors"
              >
                <Avatar contact={contact} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-soren-text truncate">{name}</p>
                  <p className="text-[11px] text-soren-muted truncate">{sub}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                    <StatutBadge value={statutMap.get(contact.id) ?? 'lead'} onClick={e => handleStatutToggle(contact.id, e)} />
                    <SourceBadge value={sourceMap.get(contact.id) ?? 'inbound'} onClick={e => handleSourceToggle(contact.id, e)} />
                  </div>
                </div>
                <ChevronRight size={16} className="text-soren-subtle flex-shrink-0" />
              </button>
            )
          })
        )}
      </div>

      {/* ── Table (desktop) ───────────────────────────────────── */}
      <MotionItem ref={tableRef} className="hidden md:block flex-1 overflow-auto mx-4 mb-4 bg-soren-card rounded-2xl border border-soren-border shadow-sm">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-soren-card z-10 border-b border-soren-border">
            <tr>
              <th className="pl-4 pr-2 py-2 w-10">
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
              paginated.map(contact => (
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
                  stage={stageOf(contact.id)}
                  onSourceToggle={handleSourceToggle}
                  onStatutToggle={handleStatutToggle}
                  onCantonChange={handleCantonChange}
                />
              ))
            )}
          </tbody>
        </table>
      </MotionItem>

      {/* ── Pagination footer ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-6 py-1.5 flex-shrink-0 border-t border-soren-border">
          <span className="text-[11px] text-soren-muted">
            {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-soren-border text-soren-muted hover:bg-soren-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-soren-subtle text-[11px]">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`min-w-[26px] px-1.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      p === safePage ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:bg-soren-elevated border border-soren-border'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-soren-border text-soren-muted hover:bg-soren-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

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
    </MotionStagger>
  )
}
