'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Search, Check, Plus, Save, ClipboardList, CreditCard, FileText, Workflow, Send, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { type GHLContact } from '@/lib/ghl'
import { COUNTRIES as ADDR_COUNTRIES, regionConfig } from '@/lib/regions'
import { lostReasonLabel, lostReasonIcon, lostStageLabel, lostObjectionLabel, lostObjectionIcon } from '@/lib/lostReasons'
import { type GHLPipelineData, type Opportunity } from '@/components/pipeline/types'
import { type ContactPipelineInfo } from '@/app/contacts/page'
import { fetchJSON } from '@/lib/fetchJSON'
import Select from '@/components/ui/Select'

const inputCls = 'w-full bg-soren-elevated border-0 rounded-xl px-3 py-2 text-[12px] text-soren-text placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 transition-all'
const labelCls = 'block text-[11px] font-medium text-soren-muted mb-1'

// ─── Pays ──────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'FR', name: 'France',              dial: '+33',  flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique',            dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse',              dial: '+41',  flag: '🇨🇭' },
  { code: 'LU', name: 'Luxembourg',          dial: '+352', flag: '🇱🇺' },
  { code: 'MC', name: 'Monaco',              dial: '+377', flag: '🇲🇨' },
  { code: 'DE', name: 'Allemagne',           dial: '+49',  flag: '🇩🇪' },
  { code: 'AT', name: 'Autriche',            dial: '+43',  flag: '🇦🇹' },
  { code: 'ES', name: 'Espagne',             dial: '+34',  flag: '🇪🇸' },
  { code: 'IT', name: 'Italie',              dial: '+39',  flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal',            dial: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas',            dial: '+31',  flag: '🇳🇱' },
  { code: 'GB', name: 'Royaume-Uni',         dial: '+44',  flag: '🇬🇧' },
  { code: 'IE', name: 'Irlande',             dial: '+353', flag: '🇮🇪' },
  { code: 'DK', name: 'Danemark',            dial: '+45',  flag: '🇩🇰' },
  { code: 'SE', name: 'Suède',               dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norvège',             dial: '+47',  flag: '🇳🇴' },
  { code: 'FI', name: 'Finlande',            dial: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Pologne',             dial: '+48',  flag: '🇵🇱' },
  { code: 'CZ', name: 'Tchéquie',            dial: '+420', flag: '🇨🇿' },
  { code: 'HU', name: 'Hongrie',             dial: '+36',  flag: '🇭🇺' },
  { code: 'RO', name: 'Roumanie',            dial: '+40',  flag: '🇷🇴' },
  { code: 'GR', name: 'Grèce',               dial: '+30',  flag: '🇬🇷' },
  { code: 'TR', name: 'Turquie',             dial: '+90',  flag: '🇹🇷' },
  { code: 'RU', name: 'Russie',              dial: '+7',   flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine',             dial: '+380', flag: '🇺🇦' },
  { code: 'US', name: 'États-Unis',          dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',              dial: '+1',   flag: '🇨🇦' },
  { code: 'MX', name: 'Mexique',             dial: '+52',  flag: '🇲🇽' },
  { code: 'BR', name: 'Brésil',              dial: '+55',  flag: '🇧🇷' },
  { code: 'AR', name: 'Argentine',           dial: '+54',  flag: '🇦🇷' },
  { code: 'CO', name: 'Colombie',            dial: '+57',  flag: '🇨🇴' },
  { code: 'MA', name: 'Maroc',               dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie',             dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie',             dial: '+216', flag: '🇹🇳' },
  { code: 'EG', name: 'Égypte',              dial: '+20',  flag: '🇪🇬' },
  { code: 'SN', name: 'Sénégal',             dial: '+221', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire",       dial: '+225', flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroun',            dial: '+237', flag: '🇨🇲' },
  { code: 'NG', name: 'Nigeria',             dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'Afrique du Sud',      dial: '+27',  flag: '🇿🇦' },
  { code: 'SA', name: 'Arabie Saoudite',     dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'Émirats Arabes Unis', dial: '+971', flag: '🇦🇪' },
  { code: 'IN', name: 'Inde',                dial: '+91',  flag: '🇮🇳' },
  { code: 'CN', name: 'Chine',               dial: '+86',  flag: '🇨🇳' },
  { code: 'JP', name: 'Japon',               dial: '+81',  flag: '🇯🇵' },
  { code: 'SG', name: 'Singapour',           dial: '+65',  flag: '🇸🇬' },
  { code: 'AU', name: 'Australie',           dial: '+61',  flag: '🇦🇺' },
]

const SOURCES = ['Direct', 'Meta Ads', 'WhatsApp', 'LinkedIn', 'Téléphone', 'Site web', 'Referral', 'Email']

const SOURCE_OPTS = [
  { id: 'inbound',        color: '#16A34A', bg: '#DCFCE7', label: 'Inbound'        },
  { id: 'outbound',       color: '#EC4899', bg: '#FCE7F3', label: 'Outbound'       },
  { id: 'recommandation', color: '#7C3AED', bg: '#EDE9FE', label: 'Recommandation' },
] as const

const CLIENT_STAGES = [
  { id: 'nouveau-client',     name: 'Nouveau client'      },
  { id: 'onboarding-envoye',  name: 'Onboarding envoyé'   },
  { id: 'onboarding-complet', name: 'Onboarding complété' },
  { id: 'kickoff-booke',      name: 'Kickoff booké'       },
  { id: 'setup-cree',         name: 'Setup créé'          },
  { id: 'consulting',         name: 'Consulting'          },
]

const PIPELINE_KW: Record<'acquisition' | 'reactivation' | 'reception', string[]> = {
  acquisition:  ['acquisition'],
  reactivation: ['réactivation', 'reactivation', 'réactiv'],
  reception:    ['réception', 'reception', 'inbound'],
}

function classifyPipeline(name: string): 'acquisition' | 'reactivation' | 'reception' | null {
  const n = name.toLowerCase()
  for (const [type, kws] of Object.entries(PIPELINE_KW)) {
    if (kws.some(k => n.includes(k))) return type as 'acquisition' | 'reactivation' | 'reception'
  }
  return null
}

function buildPhone(dial: string, local: string): string {
  const trimmed = local.trim()
  if (!trimmed) return ''
  // Si l'utilisateur a déjà saisi un numéro international complet (+41…), ne pas
  // re-préfixer l'indicatif (évite des numéros invalides type "+33+41…").
  if (trimmed.startsWith('+')) return trimmed
  const cleaned = trimmed.replace(/^0/, '')
  return `${dial}${cleaned}`
}

// Extract local number from E.164 phone (strips dial code).
// Défaut Suisse (+41) : VividFlow cible les agences immobilières suisses.
function parsePhone(phone: string | null): { countryCode: string; local: string } {
  if (!phone) return { countryCode: 'CH', local: '' }
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (phone.startsWith(c.dial)) {
      return { countryCode: c.code, local: phone.slice(c.dial.length) }
    }
  }
  return { countryCode: 'CH', local: phone }
}

function friendlyError(raw: string): string {
  if (raw.includes('Invalid country calling code')) return 'Indicatif pays invalide — vérifiez le pays sélectionné'
  if (raw.includes('duplicate') || raw.includes('already exists') || raw.includes('duplicated')) return 'Ce contact existe déjà dans le CRM'
  if (raw.includes('Unauthorized')) return 'Clé API invalide — vérifiez vos paramètres'
  return raw || 'Une erreur est survenue'
}

// ─── Custom dropdown ──────────────────────────────────────────
function CustomSelect({
  label, value, options, onChange,
}: {
  label:    string
  value:    string
  options:  { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <label className={labelCls}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-soren-elevated rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 transition-all flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-soren-text' : 'text-soren-subtle'}>
          {selected?.label ?? 'Choisir…'}
        </span>
        <ChevronDown size={13} className={`text-soren-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm text-[#374151] hover:bg-soren-elevated transition-colors"
            >
              {o.label}
              {o.value === value && <Check size={13} className="text-[#3462EE]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Combobox (select existing OR create new) ─────────────────
function Combobox({
  label, value, onChange, options, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options
  const canCreate = query.trim() && !options.some(o => o.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={ref} className="relative">
      <label className={labelCls}>{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 transition-all flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-soren-text' : 'text-soren-subtle'}>{value || placeholder}</span>
        <ChevronDown size={13} className={`text-soren-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: 260 }}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-soren-border flex-shrink-0">
            <Search size={11} className="text-soren-subtle flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher ou créer…"
              className="flex-1 text-xs text-soren-text placeholder-[#9CA3AF] outline-none bg-transparent"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                className="w-full text-left px-4 py-2 text-xs text-soren-subtle hover:bg-soren-elevated">
                — Aucun —
              </button>
            )}
            {filtered.map(o => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
                className="w-full text-left flex items-center justify-between px-4 py-2 text-[12px] text-soren-text hover:bg-soren-elevated">
                {o}
                {o === value && <Check size={13} className="text-[#3462EE]" />}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={() => { onChange(query.trim()); setOpen(false) }}
                className="w-full text-left flex items-center gap-2 px-4 py-2 text-[12px] text-[#3462EE] font-semibold hover:bg-soren-elevated border-t border-soren-border">
                <Plus size={13} /> Créer « {query.trim()} »
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────
function Section({ title }: { title: string }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-soren-subtle">{title}</p>
}

// ─── Props ────────────────────────────────────────────────────
interface Props {
  onClose:        () => void
  onAdd?:         (c: GHLContact) => void
  onSave?:        (c: GHLContact, canton?: string, statut?: 'lead' | 'client' | 'perdu') => void
  onAddOpp?:      (opp: Opportunity) => void
  contact?:       GHLContact
  pipelineInfo?:  ContactPipelineInfo
  initialCanton?: string
  initialStatut?: 'lead' | 'client' | 'perdu'
  initialSource?: 'inbound' | 'outbound' | 'recommandation'   // défaut source à la création
  mode?:          'leads' | 'clients'   // locks pipeline + adapts form
}

// ─── Modal ────────────────────────────────────────────────────
export default function NewContactModal({ onClose, onAdd, onSave, onAddOpp, contact, pipelineInfo, initialCanton, initialStatut, initialSource, mode }: Props) {
  const isEdit = !!contact
  // Source = origine immuable : verrouillée dès qu'elle est posée (à la création). Plus modifiable en édition.
  const sourceLocked = isEdit && !!((contact as (Record<string, unknown> & { source?: string }) | undefined)?.source)
  const router = useRouter()

  function clientFullName() {
    return contact?.contactName || `${contact?.firstName ?? ''} ${contact?.lastName ?? ''}`.trim()
  }

  function goToModule(base: string) {
    if (!contact?.id) return
    onClose()
    router.push(`${base}?contact=${contact.id}&name=${encodeURIComponent(clientFullName())}`)
  }

  // Contrat: open the generated PDF if it exists, else go to onboarding to generate it
  async function openContract() {
    if (!contact?.id) return
    try {
      const ob = await fetch(`/api/onboarding?contactId=${contact.id}`).then(r => r.json()) as { onboarding?: { contractGenerated?: boolean; payment?: { installments: number; amounts: number[] } } }
      if (!ob.onboarding?.contractGenerated) { goToModule('/onboarding'); return }
      const amounts = ob.onboarding.payment?.amounts ?? []
      const amount  = amounts.reduce((s, a) => s + a, 0)
      const res = await fetch('/api/onboarding/contract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientFullName(), company: contact.companyName, address: contact.address1,
          phone: contact.phone, email: contact.email, representant: clientFullName(),
          amount, installments: ob.onboarding.payment?.installments ?? 1, amounts, currency: 'CHF', preview: true,
        }),
      })
      if (!res.ok) { goToModule('/onboarding'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      onClose()
    } catch { goToModule('/onboarding') }
  }

  const parsedPhone = useMemo(() => parsePhone(contact?.phone ?? null), [contact?.phone])

  // Determine current pipeline type for pre-selection in edit mode (réception excluded — auto IA only)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [countryCode,   setCountryCode]   = useState(parsedPhone.countryCode)
  const [showCountry,   setShowCountry]   = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [ghlLeadsPipeline,   setGhlLeadsPipeline]   = useState<GHLPipelineData | null>(null)
  const [selectedPipelineId, setSelectedPipelineId] = useState<'leads' | 'clients' | null>(null)
  const [selectedStageId,    setSelectedStageId]    = useState<string | null>(null)
  const [inoutbound, setInoutbound] = useState<'inbound' | 'outbound' | 'recommandation'>(((contact as (Record<string,unknown> & {source?:string}) | undefined)?.source as 'inbound'|'outbound'|'recommandation') ?? initialSource ?? 'inbound')
  const [clientValue,        setClientValue]        = useState('')
  // Préremplit le montant du deal depuis la fiche client existante (source de vérité = pipeline_clients).
  const clientRow = useQuery(api.pipeline_clients.getByContact, contact?.id ? { contactId: contact.id as never } : 'skip') as { value?: number } | null | undefined
  const valuePrefilled = useRef(false)
  useEffect(() => {
    if (valuePrefilled.current) return
    if (clientRow && typeof clientRow.value === 'number' && clientRow.value > 0) {
      setClientValue(String(clientRow.value))
      valuePrefilled.current = true
    }
  }, [clientRow])
  // Étape commerciale (agrégée Convex : prospection + pipeline + onboarding).
  const commercialStage = useQuery(api.crm_contacts.commercialStage, contact?.id ? { contactId: contact.id as never } : 'skip') as { lost: boolean; key: string; label: string } | null | undefined

  // ── Envoyer en prospection (colonne "Leads interne") — n'importe quelle fiche, sauf les clients. ──
  const sendToProspection = useMutation(api.osProspection.sendToInternalLeads)
  const [prospState, setProspState] = useState<'idle' | 'sending' | 'done'>('idle')
  async function handleSendToProspection() {
    if (!contact?.id) return
    setProspState('sending'); setError(null)
    try {
      await sendToProspection({ contactId: contact.id as never })
      setProspState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'envoi en prospection")
      setProspState('idle')
    }
  }
  const [tagInput,      setTagInput]      = useState('')
  const [tags,          setTags]          = useState<string[]>(contact?.tags ?? [])

  const [canton, setCanton]   = useState<string>(initialCanton ?? '')
  // Défaut Suisse (CRM Suisse romande) → le sélecteur de canton est dispo d'emblée sur toute
  // nouvelle fiche. Une fiche existante garde son pays.
  const [country, setCountry] = useState<string>(contact?.country || 'Suisse')
  const rc = regionConfig(country)  // libellé + options (Canton CH / Région FR / texte libre)
  const [statut, setStatut]   = useState<'lead' | 'client' | 'perdu'>(
    // Sans mode ni initialStatut explicite (ex. ouverture depuis Pipeline Clients), on lit le statut
    // RÉEL du contact (sinon défaut « lead » même pour un client → fiche fausse).
    mode === 'leads' ? 'lead' : mode === 'clients' ? 'client'
      : (initialStatut ?? (contact as (Record<string, unknown> & { statut?: 'lead' | 'client' | 'perdu' }) | undefined)?.statut ?? 'lead')
  )
  const [role,   setRole]     = useState<string>((contact as Record<string, unknown> & { role?: string } | undefined)?.role ?? '')
  const [niche,  setNiche]    = useState<string>((contact as Record<string, unknown> & { niche?: string } | undefined)?.niche ?? '')
  const [roleOptions,   setRoleOptions]   = useState<string[]>([])
  const [nicheOptions,  setNicheOptions]  = useState<string[]>([])

  useEffect(() => {
    fetch('/api/crm/contacts/options')
      .then(r => r.json())
      .then((d: { roles?: string[]; niches?: string[] }) => {
        setRoleOptions(d.roles ?? [])
        setNicheOptions(d.niches ?? [])
      })
      .catch(() => {})
  }, [])

  // ── Deal (accompagnement) — champs fiche : dates, durée, type de paiement ──
  const [dealStart,  setDealStart]  = useState<string>(contact?.dealStartDate ?? '')
  const [dealEnd,    setDealEnd]    = useState<string>(contact?.dealEndDate ?? '')
  const [dealMonths, setDealMonths] = useState<string>(contact?.dealDurationMonths ? String(contact.dealDurationMonths) : '')
  const [payType,    setPayType]    = useState<string>(contact?.paymentType ?? '')
  // Infos dérivées (montant pipeline_clients, plan Paiement, prochain RDV) — lecture seule sur la fiche.
  const dealMetaInfo = useQuery(api.crm_contacts.dealMeta, contact?.id ? { contactId: contact.id as never } : 'skip') as {
    totalAmount?: number; installments?: number; perInstallment?: number
    nextDueDate?: string; nextDueAmount?: number; nextCallDate?: string; nextCallTitle?: string
  } | null | undefined

  // Date de fin auto-remplie = début + durée (tant que l'utilisateur ne l'a pas fixée lui-même).
  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return ''
    d.setMonth(d.getMonth() + months)
    return d.toISOString().slice(0, 10)
  }
  function syncDealEnd(start: string, months: string, endTouched: boolean) {
    const m = parseInt(months, 10)
    if (!endTouched && start && Number.isFinite(m) && m > 0) setDealEnd(addMonths(start, m))
  }
  const dealEndTouched = useRef(false)
  const [form, setForm] = useState({
    firstName:   contact?.firstName   ?? '',
    lastName:    contact?.lastName    ?? '',
    email:       contact?.email       ?? '',
    localPhone:  parsedPhone.local,
    companyName: contact?.companyName ?? '',
    address1:    contact?.address1    ?? '',
    city:        contact?.city        ?? '',
    postalCode:  contact?.postalCode  ?? '',
    value:       '',
    source:      contact?.source      ?? 'Direct',
  })

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0]

  useEffect(() => {
    fetch('/api/crm/pipelines').then(r => r.json()).then((d: { pipelines?: { _id: string; name: string; stages: { id: string; name: string; color: string; position: number }[] }[] }) => {
      const first = (d.pipelines ?? [])[0]
      if (first) setGhlLeadsPipeline({ id: first._id, name: first.name, stages: first.stages.sort((a, b) => a.position - b.position) })
    }).catch(() => {})
  }, [])

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim()
    return q ? COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    ) : COUNTRIES
  }, [countrySearch])

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t))
  }

  // Suppression du contact depuis la fiche (cascade Convex : lead + client + historique + prospection).
  async function handleDelete() {
    if (!contact) return
    setDeleting(true); setError(null)
    try {
      const res = await fetch(`/api/contact/${contact.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onClose() // la liste se rafraîchit via la query live Convex
    } catch {
      setError('Suppression échouée.'); setDeleting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim()) { setError('Le prénom est requis.'); return }
    setSaving(true)
    setError(null)

    const phone = buildPhone(selectedCountry.dial, form.localPhone)

    try {
      if (isEdit && contact) {
        // ── Edit mode ── full contact update in Convex
        const res = await fetch(`/api/contact/${contact.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            firstName:   form.firstName,
            lastName:    form.lastName,
            email:       form.email,
            phone:       phone || contact.phone,
            companyName: form.companyName,
            address1:    form.address1,
            city:        form.city,
            postalCode:  form.postalCode,
            country:     country || undefined,
            canton:      canton || undefined,
            statut,
            source:      inoutbound,
            role:        role || undefined,
            niche:       niche  || undefined,
            dealStartDate:      dealStart || undefined,
            dealEndDate:        dealEnd   || undefined,
            dealDurationMonths: dealMonths && Number.isFinite(parseInt(dealMonths, 10)) ? parseInt(dealMonths, 10) : undefined,
            paymentType:        payType || undefined,
            tags,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))
        }

        // Passage en client → endpoint UNIFIÉ convertToClient (montant requis sauf "à définir").
        // Lead / perdu → sync normal.
        if (statut === 'client') {
          const raw = clientValue.replace(',', '.').trim()
          const parsed = parseFloat(raw)
          const hasValue = raw !== '' && Number.isFinite(parsed) && parsed > 0
          const res = await fetch('/api/crm/convert', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: contact.id, dealValue: hasValue ? parsed : undefined, amountTbd: !hasValue }),
          })
          if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; throw new Error(friendlyError(d.error ?? `Erreur ${res.status}`)) }
        } else {
          await fetch('/api/crm/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: contact.id, dealValue: undefined }),
          }).catch(() => {})
        }

        const updated: GHLContact = {
          ...contact,
          firstName:   form.firstName   || null,
          lastName:    form.lastName    || null,
          contactName: `${form.firstName} ${form.lastName}`.trim() || contact.contactName,
          email:       form.email       || null,
          phone:       phone            || contact.phone,
          companyName: form.companyName || null,
          address1:    form.address1    || null,
          city:        form.city        || null,
          postalCode:  form.postalCode  || null,
          country:     country          || null,
          role:        role             || null,
          niche:       niche            || null,
          dealStartDate:      dealStart || null,
          dealEndDate:        dealEnd   || null,
          dealDurationMonths: dealMonths ? parseInt(dealMonths, 10) : null,
          paymentType:        payType   || null,
          tags,
          dateUpdated: new Date().toISOString(),
        }
        onSave?.(updated, canton, statut)

      } else {
        // ── Create mode — ONE unified path everywhere ───────────
        // Always: create the contact, then sync it to the right pipeline based on statut.
        const contactName = `${form.firstName} ${form.lastName}`.trim()
        const res = await fetch('/api/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName, lastName: form.lastName || undefined,
            email: form.email || undefined, phone: phone || undefined,
            companyName: form.companyName || undefined,
            address1: form.address1 || undefined, city: form.city || undefined,
            postalCode: form.postalCode || undefined,
            source: inoutbound, statut, country: country || undefined, canton: canton || undefined,
            role: role || undefined, niche: niche || undefined,
            dealStartDate:      dealStart || undefined,
            dealEndDate:        dealEnd   || undefined,
            dealDurationMonths: dealMonths && Number.isFinite(parseInt(dealMonths, 10)) ? parseInt(dealMonths, 10) : undefined,
            paymentType:        payType || undefined,
            tags: [],
          }),
        })
        const data = await res.json().catch(() => ({})) as { contact?: { id: string; _id: string }; error?: string }
        if (!res.ok || data.error) throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))
        const newId = data.contact!._id ?? data.contact!.id
        // Passage en client → endpoint UNIFIÉ convertToClient (montant requis sauf "à définir") ; sinon sync normal.
        if (statut === 'client') {
          const raw = clientValue.replace(',', '.').trim()
          const parsed = parseFloat(raw)
          const hasValue = raw !== '' && Number.isFinite(parsed) && parsed > 0
          const res = await fetch('/api/crm/convert', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: newId, dealValue: hasValue ? parsed : undefined, amountTbd: !hasValue }),
          })
          if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; throw new Error(friendlyError(d.error ?? `Erreur ${res.status}`)) }
        } else {
          await fetch('/api/crm/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: newId, dealValue: undefined }),
          }).catch(() => {})
        }
        const newContact: GHLContact = {
          id: newId, contactName,
          firstName: form.firstName || null, lastName: form.lastName || null,
          email: form.email || null, phone: phone || null,
          companyName: form.companyName || null,
          role: role || null, niche: niche || null,
          dealStartDate: dealStart || null, dealEndDate: dealEnd || null,
          dealDurationMonths: dealMonths ? parseInt(dealMonths, 10) : null,
          paymentType: payType || null,
          dateAdded: new Date().toISOString(), dateUpdated: null, tags: [],
        }
        onAdd?.(newContact)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  // Fermeture clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-soren-card w-full sm:rounded-2xl sm:max-w-xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-soren-text">
              {isEdit ? 'Modifier le contact' : mode === 'clients' ? 'Nouveau client' : mode === 'leads' ? 'Nouveau lead' : 'Nouveau contact'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
            <X size={14} className="text-soren-muted" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* ── Contact ── */}
          <div className="flex flex-col gap-3">
            <Section title="Contact" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prénom *</label>
                <input value={form.firstName} onChange={set('firstName')} placeholder="Jean" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nom</label>
                <input value={form.lastName} onChange={set('lastName')} placeholder="Dupont" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Entreprise</label>
              <input value={form.companyName} onChange={set('companyName')} placeholder="Dupont Construction" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Combobox label="Rôle"   value={role}   onChange={setRole}   options={roleOptions}   placeholder="ex: CEO, Directeur" />
              <Combobox label="Niche"  value={niche}  onChange={setNiche}  options={nicheOptions}  placeholder="ex: Immobilier" />
            </div>

            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="jean@exemple.ch" className={inputCls} />
            </div>

            {/* Téléphone */}
            <div>
              <label className={labelCls}>Téléphone</label>
              <div className="flex gap-2">
                <div className="relative flex-shrink-0">
                  <button type="button" onClick={() => setShowCountry(s => !s)}
                    className="flex items-center gap-1.5 bg-soren-elevated rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 whitespace-nowrap">
                    <span>{selectedCountry.flag}</span>
                    <span className="font-medium text-soren-text">{selectedCountry.dial}</span>
                    <ChevronDown size={12} className={`text-soren-subtle transition-transform ${showCountry ? 'rotate-180' : ''}`} />
                  </button>
                  {showCountry && (
                    <div className="absolute top-full mt-1.5 left-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl w-64 flex flex-col" style={{ maxHeight: 240 }}>
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-soren-border">
                        <Search size={11} className="text-soren-subtle flex-shrink-0" />
                        <input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                          placeholder="Rechercher un pays…"
                          className="flex-1 text-xs text-soren-text placeholder-[#9CA3AF] outline-none bg-transparent" />
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {filteredCountries.map(c => (
                          <button key={c.code} type="button"
                            onClick={() => { setCountryCode(c.code); setShowCountry(false); setCountrySearch('') }}
                            className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-[12px] transition-colors hover:bg-soren-elevated ${c.code === countryCode ? 'bg-[#F0F0EC]' : ''}`}>
                            <span>{c.flag}</span>
                            <span className="flex-1 text-soren-text text-xs">{c.name}</span>
                            <span className="text-soren-subtle text-xs flex-shrink-0">{c.dial}</span>
                            {c.code === countryCode && <Check size={11} className="text-[#3462EE] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input type="tel" value={form.localPhone} onChange={set('localPhone')}
                  placeholder="6 12 34 56 78" className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Adresse & Détails ── */}
          <div className="flex flex-col gap-3 border-t border-soren-border pt-5">
            <Section title="Adresse & Infos" />

            <div>
              <label className={labelCls}>Adresse</label>
              <input value={form.address1} onChange={set('address1')} placeholder="Rue du Rhône 14" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ville</label>
                <input value={form.city} onChange={set('city')} placeholder="Genève" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Code postal</label>
                <input value={form.postalCode} onChange={set('postalCode')} placeholder="1204" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Pays</label>
              <Select
                value={country}
                onChange={v => { setCountry(v); setCanton('') }}
                placeholder="— Choisir —"
                options={ADDR_COUNTRIES.map(c => ({ value: c, label: c }))}
                className="w-full"
              />
            </div>

            {country && (
              <div>
                <label className={labelCls}>{rc.label}</label>
                {rc.options ? (
                  <Select
                    value={canton}
                    onChange={setCanton}
                    placeholder="— Choisir —"
                    options={rc.options}
                    className="w-full"
                  />
                ) : (
                  <input value={canton} onChange={e => setCanton(e.target.value)} placeholder="Canton, région…" className={inputCls} />
                )}
              </div>
            )}

          </div>

          {/* ── Statut + Source (même fiche partout) ── */}
          <div className="border-t border-soren-border pt-5 flex flex-col gap-4">
            {/* ── Étape commerciale — où en est le contact dans le funnel (bleu actif / rouge + croix si perdu). ── */}
            {commercialStage && (
              <div className="flex flex-col gap-2">
                <Section title="Étape commerciale" />
                <span className={`inline-flex w-fit items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border ${
                  commercialStage.lost
                    ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA] dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/25'
                    : 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25'
                }`}>
                  {commercialStage.lost && <X size={13} className="flex-shrink-0" strokeWidth={3} />}
                  {commercialStage.label}
                </span>
              </div>
            )}

            {/* Statut — locked depending on mode */}
            <div className="flex flex-col gap-2">
              <Section title="Statut" />
              <div className="flex gap-2">
                {([
                  { id: 'lead',   label: 'Lead',   color: '#374151' },
                  { id: 'client', label: 'Client', color: '#10B981' },
                  { id: 'perdu',  label: 'Perdu',  color: '#EF4444' },
                ] as { id: 'lead' | 'client' | 'perdu'; label: string; color: string }[]).map(opt => {
                  // mode='leads' locks to lead ; mode='clients' locks to client.
                  // « Perdu » n'est jamais un choix de création : un lead devient perdu via le pipeline.
                  // On le verrouille sauf si le contact est DÉJÀ perdu (affichage en édition).
                  const locked = (mode === 'leads' && opt.id !== 'lead')
                    || (mode === 'clients' && opt.id !== 'client')
                    || (opt.id === 'perdu' && statut !== 'perdu')
                  const isSelected = statut === opt.id
                  return (
                    <button key={opt.id} type="button"
                      disabled={locked}
                      title={opt.id === 'perdu' && locked ? 'Un contact ne peut pas être créé « perdu » : un lead devient perdu via le pipeline.' : undefined}
                      onClick={() => !locked && setStatut(opt.id)}
                      className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150 ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-soren-elevated hover:border-[#D1D5DB]'} ${isSelected ? '' : 'border-soren-border bg-soren-card'}`}
                      style={isSelected ? { borderColor: opt.color, background: opt.color + '12', boxShadow: `0 0 0 1px ${opt.color}` } : undefined}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                      <span className={`text-[11px] font-bold ${isSelected ? '' : 'text-soren-text'}`} style={isSelected ? { color: opt.color } : undefined}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-soren-subtle">
                {statut === 'lead'   && 'Le contact apparaîtra dans le pipeline Leads.'}
                {statut === 'client' && 'Le contact apparaîtra dans le pipeline Clients.'}
                {statut === 'perdu'  && 'Le contact apparaîtra dans les leads perdus.'}
              </p>
              {/* Perdu en (étape) + raison (+ objection si non qualifié) — renseignés depuis Prospection / Pipeline (lecture seule). */}
              {statut === 'perdu' && lostStageLabel(contact?.lostStage, contact?.lostReason) && (() => {
                const LostIcon = lostReasonIcon(contact?.lostReason)
                return (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-soren-muted">Perdu en&nbsp;:</span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-text">
                        {lostStageLabel(contact?.lostStage, contact?.lostReason)}
                      </span>
                    </div>
                    {lostReasonLabel(contact?.lostReason) && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-soren-muted">Raison&nbsp;:</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">
                          <LostIcon size={11} className="flex-shrink-0" />{lostReasonLabel(contact?.lostReason)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── Envoyer en prospection (colonne "Leads interne") — pill discrète, toute fiche non-client. ── */}
            {isEdit && contact?.id && statut !== 'client' && (
              <button type="button" onClick={handleSendToProspection} disabled={prospState !== 'idle'}
                title="Ajouter ce contact au board Prospection · colonne Leads interne"
                className={`self-start inline-flex items-center gap-1.5 h-7 pl-2.5 pr-3 rounded-full border text-[11px] font-semibold transition-colors disabled:cursor-default ${
                  prospState === 'done'
                    ? 'border-[#FF4D00]/40 bg-[#FF4D00]/10 text-[#C2410C]'
                    : 'border-soren-border text-soren-muted hover:border-[#FF4D00]/50 hover:text-[#FF4D00] hover:bg-[#FF4D00]/[0.06]'
                }`}>
                {prospState === 'done'
                  ? <><Check size={13} className="text-[#FF4D00]" /> Ajouté en leads interne</>
                  : prospState === 'sending'
                    ? <><Send size={13} className="animate-pulse" /> Envoi…</>
                    : <><Send size={13} /> Envoyer en leads interne</>}
              </button>
            )}

            {/* ── Deal — montant, dates, durée, paiement (only when client) ── */}
            {statut === 'client' && (
              <div className="flex flex-col gap-3">
                <Section title="Deal" />

                <div>
                  <label className={labelCls}>Montant total du deal (CHF)</label>
                  <input type="number" value={clientValue} onChange={e => setClientValue(e.target.value)} placeholder="ex: 3500" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Date de début</label>
                    <input type="date" value={dealStart}
                      onChange={e => { setDealStart(e.target.value); syncDealEnd(e.target.value, dealMonths, dealEndTouched.current) }}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Date de fin</label>
                    <input type="date" value={dealEnd}
                      onChange={e => { dealEndTouched.current = true; setDealEnd(e.target.value) }}
                      className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Durée (mois)</label>
                    <input type="number" min={1} value={dealMonths} placeholder="ex: 6"
                      onChange={e => { setDealMonths(e.target.value); syncDealEnd(dealStart, e.target.value, dealEndTouched.current) }}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Type de paiement</label>
                    <div className="flex gap-2">
                      {([
                        { id: 'mensuel', label: 'Mensuel' },
                        { id: 'unique',  label: 'Une fois' },
                      ] as const).map(opt => {
                        const isSelected = payType === opt.id
                        return (
                          <button key={opt.id} type="button" onClick={() => setPayType(isSelected ? '' : opt.id)}
                            className={`flex-1 py-2 px-2 rounded-xl border text-[11px] font-bold transition-all duration-150 ${
                              isSelected
                                ? 'border-[#3462EE] bg-[#3462EE]/10 text-[#3462EE]'
                                : 'border-soren-border bg-soren-card text-soren-text hover:bg-soren-elevated'
                            }`}>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Mensualités / échéances / prochain RDV — dérivés du module Paiement et des RDV (lecture seule). */}
                {(dealMetaInfo?.installments || dealMetaInfo?.nextDueDate || dealMetaInfo?.nextCallDate) && (
                  <div className="flex flex-col gap-1.5 bg-soren-elevated rounded-xl px-3 py-2.5">
                    {dealMetaInfo?.installments !== undefined && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-soren-muted">Mensualités</span>
                        <span className="font-semibold text-soren-text">
                          {dealMetaInfo.installments}×
                          {dealMetaInfo.perInstallment ? ` · CHF ${dealMetaInfo.perInstallment.toLocaleString('fr-CH')} / mois` : ''}
                        </span>
                      </div>
                    )}
                    {dealMetaInfo?.nextDueDate && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-soren-muted">Prochaine échéance</span>
                        <span className="font-semibold text-soren-text">
                          {new Date(dealMetaInfo.nextDueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {dealMetaInfo.nextDueAmount ? ` · CHF ${dealMetaInfo.nextDueAmount.toLocaleString('fr-CH')}` : ''}
                        </span>
                      </div>
                    )}
                    {dealMetaInfo?.nextCallDate && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-soren-muted">Prochain rendez-vous</span>
                        <span className="font-semibold text-soren-text">
                          {new Date(dealMetaInfo.nextCallDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          {' à '}{new Date(dealMetaInfo.nextCallDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {dealMetaInfo.nextCallTitle ? ` · ${dealMetaInfo.nextCallTitle}` : ''}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-soren-subtle">Gérés dans le module Paiement et les RDV — affichage seul ici.</p>
                  </div>
                )}
              </div>
            )}

            {/* Prochain RDV — visible aussi pour les leads (R1/R2 planifié). */}
            {statut !== 'client' && dealMetaInfo?.nextCallDate && (
              <div className="flex flex-col gap-2">
                <Section title="Prochain rendez-vous" />
                <span className="inline-flex w-fit items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  {new Date(dealMetaInfo.nextCallDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  {' à '}{new Date(dealMetaInfo.nextCallDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {dealMetaInfo.nextCallTitle ? ` · ${dealMetaInfo.nextCallTitle}` : ''}
                </span>
              </div>
            )}

            {/* Date de la transaction — renseignée à la conversion (lecture seule). */}
            {statut === 'client' && contact?.dealDate && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-soren-muted">Date de la transaction&nbsp;:</span>
                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-text">
                  {new Date(contact.dealDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}

            {/* ── Origine : quel lead ce client était avant sa conversion (source immuable + date d'acquisition). ── */}
            {statut === 'client' && (() => {
              const src = SOURCE_OPTS.find(o => o.id === (contact?.source as string))
              const acquired = (contact as (Record<string, unknown> & { createdAt?: string }) | undefined)?.createdAt
              return (
                <div className="flex flex-col gap-2">
                  <Section title="Origine (en tant que lead)" />
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-full"
                      style={src ? { background: src.bg, color: src.color } : undefined}>
                      {src && <span className="w-2 h-2 rounded-full" style={{ background: src.color }} />}
                      Lead {src?.label ?? contact?.source ?? '—'}
                    </span>
                    {acquired && (
                      <span className="text-soren-muted">acquis le {new Date(acquired).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── Module Objections — vert = surmontée (won), rouge = non surmontée (lost). Toutes fiches. ── */}
            {(lostObjectionLabel(contact?.wonObjection) || lostObjectionLabel(contact?.lostObjection)) && (() => {
              const WonIcon = lostObjectionIcon(contact?.wonObjection)
              const LostIcon = lostObjectionIcon(contact?.lostObjection)
              return (
                <div className="flex flex-col gap-2">
                  <Section title="Objections" />
                  <div className="flex flex-wrap gap-2">
                    {lostObjectionLabel(contact?.wonObjection) && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25">
                        <WonIcon size={12} className="flex-shrink-0" />{lostObjectionLabel(contact?.wonObjection)}
                        <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">surmontée</span>
                      </span>
                    )}
                    {lostObjectionLabel(contact?.lostObjection) && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/25">
                        <LostIcon size={12} className="flex-shrink-0" />{lostObjectionLabel(contact?.lostObjection)}
                        <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">non surmontée</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Raccourcis client — edit mode only (need a saved contact) */}
            {statut === 'client' && isEdit && contact?.id && (
              <div className="flex flex-col gap-2">
                <Section title="Suivi client" />
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Onboarding', Icon: ClipboardList, color: '#3462EE', action: () => goToModule('/onboarding') },
                    { label: 'Paiement',   Icon: CreditCard,   color: '#10B981', action: () => goToModule('/paiement') },
                    { label: 'Contrat',    Icon: FileText,     color: '#F97316', action: openContract },
                    { label: 'Process',    Icon: Workflow,     color: '#8B5CF6', action: () => goToModule('/bibliotheque/process') },
                  ].map(({ label, Icon, color, action }) => (
                    <button key={label} type="button" onClick={action}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 border-soren-border bg-soren-elevated hover:border-[#C8CBD0] transition-all"
                    >
                      <Icon size={16} style={{ color }} />
                      <span className="text-[10px] font-bold text-soren-text leading-tight text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            <div className="flex flex-col gap-2">
              <Section title="Source" />
              <div className="flex gap-2">
                {SOURCE_OPTS.map(opt => {
                  const isSelected = inoutbound === opt.id
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => { if (!sourceLocked) setInoutbound(opt.id) }}
                      disabled={sourceLocked}
                      className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150 ${isSelected ? '' : 'border-soren-border bg-soren-card hover:bg-soren-elevated hover:border-[#D1D5DB]'} ${sourceLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={isSelected ? { borderColor: opt.color, background: opt.bg, boxShadow: `0 0 0 1px ${opt.color}` } : undefined}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                      <span className={`text-[10px] font-bold leading-tight text-center ${isSelected ? '' : 'text-soren-text'}`} style={isSelected ? { color: opt.color } : undefined}>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {sourceLocked && <p className="text-[10px] text-soren-subtle">La source est l'origine du lead : définie à la création, elle ne peut plus être modifiée.</p>}
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#FEF2F2] rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-soren-border text-[12px] text-soren-muted hover:border-[#D1D5DB] hover:text-soren-text transition-colors">
              <X size={13} /> Annuler
            </button>
            <button type="submit" disabled={saving || !form.firstName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FF4D00] hover:brightness-110 disabled:opacity-50 text-white text-[12px] font-semibold transition-colors">
              {isEdit ? <Save size={14} /> : <Plus size={14} />}
              {saving
                ? (isEdit ? 'Enregistrement…' : 'Création en cours…')
                : (isEdit ? 'Enregistrer' : mode === 'leads' ? 'Créer le lead' : mode === 'clients' ? 'Créer le client' : 'Créer le contact')}
            </button>
          </div>

          {isEdit && (
            confirmDel ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="flex-1 text-[12px] text-soren-muted">Supprimer définitivement ce contact et tout ce qui y est lié ?</span>
                <button type="button" onClick={() => setConfirmDel(false)} className="text-[12px] font-semibold text-soren-muted px-3 py-1.5">Annuler</button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-full px-3 py-1.5 disabled:opacity-50">{deleting ? 'Suppression…' : 'Confirmer'}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDel(true)} className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-red-500 hover:text-red-600 transition-colors pt-1">
                <Trash2 size={13} /> Supprimer ce contact
              </button>
            )
          )}
        </form>
      </div>
    </div>,
    document.body
  )
}
