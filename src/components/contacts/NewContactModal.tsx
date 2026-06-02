'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Search, Check, Plus, ClipboardList, CreditCard, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type GHLContact } from '@/lib/ghl'
import { type GHLPipelineData, type Opportunity } from '@/components/pipeline/types'
import { type ContactPipelineInfo } from '@/app/contacts/page'
import { fetchJSON } from '@/lib/fetchJSON'

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
  { id: 'outbound',       color: '#CA8A04', bg: '#FEF9C3', label: 'Outbound'       },
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
  const cleaned = local.trim().replace(/^0/, '')
  return cleaned ? `${dial}${cleaned}` : ''
}

// Extract local number from E.164 phone (strips dial code)
function parsePhone(phone: string | null): { countryCode: string; local: string } {
  if (!phone) return { countryCode: 'FR', local: '' }
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (phone.startsWith(c.dial)) {
      return { countryCode: c.code, local: phone.slice(c.dial.length) }
    }
  }
  return { countryCode: 'FR', local: phone }
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
  mode?:          'leads' | 'clients'   // locks pipeline + adapts form
}

// ─── Modal ────────────────────────────────────────────────────
export default function NewContactModal({ onClose, onAdd, onSave, onAddOpp, contact, pipelineInfo, initialCanton, initialStatut, mode }: Props) {
  const isEdit = !!contact
  const router = useRouter()

  function goToModule(base: string) {
    if (!contact?.id) return
    const name = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
    onClose()
    router.push(`${base}?contact=${contact.id}&name=${encodeURIComponent(name)}`)
  }

  const parsedPhone = useMemo(() => parsePhone(contact?.phone ?? null), [contact?.phone])

  // Determine current pipeline type for pre-selection in edit mode (réception excluded — auto IA only)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [countryCode,   setCountryCode]   = useState(parsedPhone.countryCode)
  const [showCountry,   setShowCountry]   = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [ghlLeadsPipeline,   setGhlLeadsPipeline]   = useState<GHLPipelineData | null>(null)
  const [selectedPipelineId, setSelectedPipelineId] = useState<'leads' | 'clients' | null>(null)
  const [selectedStageId,    setSelectedStageId]    = useState<string | null>(null)
  const [inoutbound, setInoutbound] = useState<'inbound' | 'outbound' | 'recommandation'>(((contact as (Record<string,unknown> & {source?:string}) | undefined)?.source as 'inbound'|'outbound'|'recommandation') ?? 'inbound')
  const [clientValue,        setClientValue]        = useState('')
  const [tagInput,      setTagInput]      = useState('')
  const [tags,          setTags]          = useState<string[]>(contact?.tags ?? [])

  const [canton, setCanton]   = useState<string>(initialCanton ?? '')
  const [statut, setStatut]   = useState<'lead' | 'client' | 'perdu'>(
    mode === 'leads' ? 'lead' : mode === 'clients' ? 'client' : (initialStatut ?? 'lead')
  )
  const [metier, setMetier]   = useState<string>((contact as Record<string, unknown> & { metier?: string } | undefined)?.metier ?? '')
  const [niche,  setNiche]    = useState<string>((contact as Record<string, unknown> & { niche?: string } | undefined)?.niche ?? '')
  const [metierOptions, setMetierOptions] = useState<string[]>([])
  const [nicheOptions,  setNicheOptions]  = useState<string[]>([])

  useEffect(() => {
    fetch('/api/crm/contacts/options')
      .then(r => r.json())
      .then((d: { metiers?: string[]; niches?: string[] }) => {
        setMetierOptions(d.metiers ?? [])
        setNicheOptions(d.niches ?? [])
      })
      .catch(() => {})
  }, [])
  const [form, setForm] = useState({
    firstName:   contact?.firstName   ?? '',
    lastName:    contact?.lastName    ?? '',
    email:       contact?.email       ?? '',
    localPhone:  parsedPhone.local,
    companyName: contact?.companyName ?? '',
    address1:    contact?.address1    ?? '',
    city:        contact?.city        ?? '',
    postalCode:  contact?.postalCode  ?? '',
    website:     contact?.website     ?? '',
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
            website:     form.website,
            canton:      canton || undefined,
            statut,
            source:      inoutbound,
            metier:      metier || undefined,
            niche:       niche  || undefined,
            tags,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))
        }

        // Sync to the right pipeline based on statut (lead → Leads, client → Clients)
        await fetch('/api/crm/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: contact.id, dealValue: statut === 'client' ? (parseFloat(clientValue.replace(',', '.')) || 0) : undefined }),
        }).catch(() => {})

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
          website:     form.website     || null,
          metier:      metier           || null,
          niche:       niche            || null,
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
            postalCode: form.postalCode || undefined, website: form.website || undefined,
            source: inoutbound, statut, canton: canton || undefined,
            metier: metier || undefined, niche: niche || undefined, tags: [],
          }),
        })
        const data = await res.json().catch(() => ({})) as { contact?: { id: string; _id: string }; error?: string }
        if (!res.ok || data.error) throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))
        const newId = data.contact!._id ?? data.contact!.id
        await fetch('/api/crm/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: newId, dealValue: statut === 'client' ? (parseFloat(clientValue.replace(',', '.')) || 0) : undefined }),
        }).catch(() => {})
        const newContact: GHLContact = {
          id: newId, contactName,
          firstName: form.firstName || null, lastName: form.lastName || null,
          email: form.email || null, phone: phone || null,
          companyName: form.companyName || null,
          metier: metier || null, niche: niche || null,
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-soren-card w-full sm:rounded-2xl sm:max-w-xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-soren-text">
              {isEdit ? 'Modifier le contact' : mode === 'clients' ? 'Nouveau client' : mode === 'leads' ? 'Nouveau lead' : 'Nouveau contact'}
            </h2>
            <p className="text-xs text-soren-subtle mt-0.5">
              {isEdit ? 'Les modifications sont synchronisées avec le CRM.' : 'Contact + opportunité synchronisés automatiquement'}
            </p>
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

            <div>
              <label className={labelCls}>Canton</label>
              <select value={canton} onChange={e => setCanton(e.target.value)} className={inputCls}>
                <option value="">— Choisir —</option>
                {Object.entries({AG:'Argovie',AI:'Appenzell Rh.-Int.',AR:'Appenzell Rh.-Ext.',BE:'Berne',BL:'Bâle-Campagne',BS:'Bâle-Ville',FR:'Fribourg',GE:'Genève',GL:'Glaris',GR:'Grisons',JU:'Jura',LU:'Lucerne',NE:'Neuchâtel',NW:'Nidwald',OW:'Obwald',SG:'Saint-Gall',SH:'Schaffhouse',SO:'Soleure',SZ:'Schwytz',TG:'Thurgovie',TI:'Tessin',UR:'Uri',VD:'Vaud',VS:'Valais',ZG:'Zoug',ZH:'Zurich'}).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Combobox label="Métier" value={metier} onChange={setMetier} options={metierOptions} placeholder="ex: Architecte" />
              <Combobox label="Niche"  value={niche}  onChange={setNiche}  options={nicheOptions}  placeholder="ex: Immobilier" />
            </div>

            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="jean@exemple.fr" className={inputCls} />
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
              <input value={form.address1} onChange={set('address1')} placeholder="12 rue de la Paix" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ville</label>
                <input value={form.city} onChange={set('city')} placeholder="Paris" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Code postal</label>
                <input value={form.postalCode} onChange={set('postalCode')} placeholder="75001" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Site web</label>
              <input type="url" value={form.website} onChange={set('website')} placeholder="https://exemple.fr" className={inputCls} />
            </div>
          </div>

          {/* ── Statut + Source (même fiche partout) ── */}
          <div className="border-t border-soren-border pt-5 flex flex-col gap-4">
            {/* Statut — locked depending on mode */}
            <div className="flex flex-col gap-2">
              <Section title="Statut" />
              <div className="flex gap-2">
                {([
                  { id: 'lead',   label: 'Lead',   color: '#374151' },
                  { id: 'client', label: 'Client', color: '#10B981' },
                  { id: 'perdu',  label: 'Perdu',  color: '#EF4444' },
                ] as { id: 'lead' | 'client' | 'perdu'; label: string; color: string }[]).map(opt => {
                  // mode='leads' locks to lead; mode='clients' locks to client
                  const locked = (mode === 'leads' && opt.id !== 'lead') || (mode === 'clients' && opt.id !== 'client')
                  const isSelected = statut === opt.id
                  return (
                    <button key={opt.id} type="button"
                      disabled={locked}
                      onClick={() => !locked && setStatut(opt.id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all ${locked ? 'opacity-30 cursor-not-allowed' : ''}`}
                      style={{ borderColor: isSelected ? opt.color : '#E5E7EB', background: isSelected ? opt.color + '14' : '#F9F9F7' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                      <span className="text-[11px] font-bold" style={{ color: isSelected ? opt.color : '#374151' }}>{opt.label}</span>
                      {isSelected && <Check size={11} style={{ color: opt.color }} />}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-soren-subtle">
                {statut === 'lead'   && 'Le contact apparaîtra dans le pipeline Leads.'}
                {statut === 'client' && 'Le contact apparaîtra dans le pipeline Clients.'}
                {statut === 'perdu'  && 'Le contact apparaîtra dans les leads perdus.'}
              </p>
            </div>

            {/* Montant du deal — only when client */}
            {statut === 'client' && (
              <div className="flex flex-col gap-2">
                <Section title="Montant du deal" />
                <input type="number" value={clientValue} onChange={e => setClientValue(e.target.value)} placeholder="ex: 3500" className={inputCls} />
              </div>
            )}

            {/* Raccourcis client — edit mode only (need a saved contact) */}
            {statut === 'client' && isEdit && contact?.id && (
              <div className="flex flex-col gap-2">
                <Section title="Suivi client" />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { base: '/onboarding', label: 'Onboarding', Icon: ClipboardList, color: '#3462EE' },
                    { base: '/paiement',   label: 'Paiement',   Icon: CreditCard,   color: '#10B981' },
                    { base: '/devis',      label: 'Contrat',    Icon: FileText,     color: '#F97316' },
                  ].map(({ base, label, Icon, color }) => (
                    <button key={base} type="button" onClick={() => goToModule(base)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 border-soren-border hover:border-[#C8CBD0] transition-all"
                      style={{ background: '#F9F9F7' }}
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
                      onClick={() => setInoutbound(opt.id)}
                      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all"
                      style={{ borderColor: isSelected ? opt.color : '#E5E7EB', background: isSelected ? opt.bg : '#F9F9F7' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                      <span className="text-[10px] font-bold leading-tight text-center" style={{ color: isSelected ? opt.color : '#374151' }}>{opt.label}</span>
                      {isSelected && <Check size={11} style={{ color: opt.color }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#FEF2F2] rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-soren-border text-sm text-soren-muted hover:border-[#D1D5DB] hover:text-soren-text transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving || !form.firstName.trim()}
              className="flex-1 py-2.5 rounded-full bg-soren-sidebar hover:bg-[#2a2a2a] disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving
                ? (isEdit ? 'Enregistrement…' : 'Création en cours…')
                : (isEdit ? 'Enregistrer' : mode === 'leads' ? 'Créer le lead' : mode === 'clients' ? 'Créer le client' : 'Créer le contact')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
