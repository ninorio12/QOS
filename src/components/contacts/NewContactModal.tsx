'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, Search, Check, Plus } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { type GHLPipelineData, type Opportunity } from '@/components/pipeline/types'
import { type ContactPipelineInfo } from '@/app/contacts/page'
import { fetchJSON } from '@/lib/fetchJSON'

const inputCls = 'w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 transition-all'
const labelCls = 'block text-xs font-medium text-soren-muted mb-1.5'

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
  contact?:       GHLContact          // present = edit mode
  pipelineInfo?:  ContactPipelineInfo
  initialCanton?: string
  initialStatut?: 'lead' | 'client' | 'perdu'
}

// ─── Modal ────────────────────────────────────────────────────
export default function NewContactModal({ onClose, onAdd, onSave, onAddOpp, contact, pipelineInfo, initialCanton, initialStatut }: Props) {
  const isEdit = !!contact

  const parsedPhone = useMemo(() => parsePhone(contact?.phone ?? null), [contact?.phone])

  // Determine current pipeline type for pre-selection in edit mode (réception excluded — auto IA only)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [countryCode,   setCountryCode]   = useState(parsedPhone.countryCode)
  const [showCountry,   setShowCountry]   = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [pipelines,          setPipelines]          = useState<GHLPipelineData[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(pipelineInfo?.pipelineId ?? null)
  const [selectedStageId,    setSelectedStageId]    = useState<string | null>(null)
  const [tagInput,      setTagInput]      = useState('')
  const [tags,          setTags]          = useState<string[]>(contact?.tags ?? [])

  const [canton, setCanton]   = useState<string>(initialCanton ?? '')
  const [statut, setStatut]   = useState<'lead' | 'client' | 'perdu'>(initialStatut ?? 'lead')
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
    fetch('/api/pipelines').then(r => r.json()).then((d: { pipelines?: GHLPipelineData[] }) => {
      setPipelines(d.pipelines ?? [])
    }).catch(() => {})
  }, [isEdit])

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
        // ── Edit mode ──────────────────────────────────────────
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
            tags,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))
        }

        if (selectedPipelineId && selectedStageId) {
          await fetch('/api/opp', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId:       contact.id,
              contactName:     `${form.firstName} ${form.lastName}`.trim() || contact.contactName,
              email:           form.email       || '',
              phone:           phone            || contact.phone || '',
              company:         form.companyName || '',
              pipelineId:      selectedPipelineId,
              pipelineStageId: selectedStageId,
              monetaryValue:   0,
              source:          '',
            }),
          })
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
          website:     form.website     || null,
          tags,
          dateUpdated: new Date().toISOString(),
        }
        try {
          const cm = new Map(Object.entries(JSON.parse(localStorage.getItem('vividflow_contact_canton') ?? '{}')))
          canton ? cm.set(contact.id, canton) : cm.delete(contact.id)
          localStorage.setItem('vividflow_contact_canton', JSON.stringify(Object.fromEntries(cm)))
        } catch {}
        try {
          const sm = new Map(Object.entries(JSON.parse(localStorage.getItem('vividflow_contact_statut') ?? '{}')))
          sm.set(contact.id, statut)
          localStorage.setItem('vividflow_contact_statut', JSON.stringify(Object.fromEntries(sm)))
        } catch {}
        onSave?.(updated, canton, statut)

      } else {
        // ── Create mode ────────────────────────────────────────
        const contactName = `${form.firstName} ${form.lastName}`.trim()

        if (selectedPipelineId && selectedStageId) {
          const res = await fetch('/api/opp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactName,
              email:           form.email,
              phone,
              company:         form.companyName,
              pipelineId:      selectedPipelineId,
              pipelineStageId: selectedStageId,
              monetaryValue:   parseFloat(form.value) || 0,
              source:          form.source === 'Direct' ? '' : form.source,
            }),
          })
          const data = await res.json().catch(() => ({})) as { opp?: Opportunity; error?: string }
          if (!res.ok || data.error) throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))

          const newContact: GHLContact = {
            id:          data.opp!.contactId,
            contactName,
            firstName:   form.firstName   || null,
            lastName:    form.lastName    || null,
            email:       form.email       || null,
            phone:       phone            || null,
            companyName: form.companyName || null,
            dateAdded:   new Date().toISOString(),
            dateUpdated: null,
            tags:        [],
          }
          onAdd?.(newContact)
          onAddOpp?.(data.opp!)
        } else {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone, companyName: form.companyName }),
          })
          const data = await res.json().catch(() => ({})) as { contact?: { id: string; dateAdded: string }; error?: string }
          if (!res.ok || data.error) throw new Error(friendlyError(data.error ?? `Erreur ${res.status}`))

          const newId = data.contact!.id
          if (canton) { try { const m = new Map(Object.entries(JSON.parse(localStorage.getItem('vividflow_contact_canton') ?? '{}')));m.set(newId, canton);localStorage.setItem('vividflow_contact_canton', JSON.stringify(Object.fromEntries(m))) } catch {} }
          if (statut !== 'lead') { try { const m = new Map(Object.entries(JSON.parse(localStorage.getItem('vividflow_contact_statut') ?? '{}')));m.set(newId, statut);localStorage.setItem('vividflow_contact_statut', JSON.stringify(Object.fromEntries(m))) } catch {} }
          const newContact: GHLContact = {
            id:          newId,
            contactName,
            firstName:   form.firstName   || null,
            lastName:    form.lastName    || null,
            email:       form.email       || null,
            phone:       phone            || null,
            companyName: form.companyName || null,
            dateAdded:   data.contact!.dateAdded,
            dateUpdated: null,
            tags:        [],
          }
          onAdd?.(newContact)
        }
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
              {isEdit ? 'Modifier le contact' : 'Nouveau lead'}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Canton</label>
                <select value={canton} onChange={e => setCanton(e.target.value)} className={inputCls}>
                  <option value="">— Choisir —</option>
                  {['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut</label>
                <select value={statut} onChange={e => setStatut(e.target.value as 'lead' | 'client' | 'perdu')} className={inputCls}>
                  <option value="lead">Lead</option>
                  <option value="client">Client</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>
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
                    className="flex items-center gap-1.5 bg-soren-elevated rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 whitespace-nowrap">
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
                            className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-soren-elevated ${c.code === countryCode ? 'bg-[#F0F0EC]' : ''}`}>
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

            <CustomSelect
              label="Source"
              value={form.source}
              onChange={v => setForm(f => ({ ...f, source: v }))}
              options={SOURCES.map(s => ({ value: s, label: s }))}
            />

            {/* Tags */}
            <div>
              <label className={labelCls}>Balises</label>
              <div className="bg-soren-elevated rounded-xl px-3 py-2.5 flex flex-wrap gap-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-[#3462EE]/40 transition-all">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-soren-card border border-soren-border text-[#374151]">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-[#EF4444] transition-colors">
                      <X size={9} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                      setTags(prev => prev.slice(0, -1))
                    }
                  }}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                  placeholder={tags.length === 0 ? 'Ajouter une balise…' : ''}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-soren-text placeholder-[#9CA3AF] outline-none"
                />
              </div>
              <p className="text-[10px] text-soren-subtle mt-1">Appuyez sur Entrée ou virgule pour valider</p>
            </div>
          </div>

          {/* ── Pipeline ── */}
          <div className="border-t border-soren-border pt-5 flex flex-col gap-3">
            <Section title="Pipeline" />
            {pipelines.length === 0 ? (
              <div className="flex gap-2">
                {[1, 2].map(i => <div key={i} className="flex-1 h-14 bg-soren-elevated rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setSelectedPipelineId(null); setSelectedStageId(null) }}
                    className="flex-1 min-w-[70px] flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all"
                    style={{ borderColor: selectedPipelineId === null ? '#374151' : '#E5E7EB', background: selectedPipelineId === null ? '#37415112' : '#F9F9F7' }}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                    <span className="text-[11px] font-bold text-soren-text">Aucun</span>
                    {selectedPipelineId === null && <Check size={11} className="text-[#374151]" />}
                  </button>
                  {pipelines.map((p, i) => {
                    const COLORS = ['#3462EE', '#F97316', '#8B5CF6', '#14B8A6']
                    const color = COLORS[i % COLORS.length]
                    const isSelected = selectedPipelineId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPipelineId(p.id); setSelectedStageId(null) }}
                        className="flex-1 min-w-[70px] flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all"
                        style={{ borderColor: isSelected ? color : '#E5E7EB', background: isSelected ? color + '12' : '#F9F9F7' }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-[11px] font-bold text-soren-text leading-tight text-center">{p.name}</span>
                        {isSelected && <Check size={11} style={{ color }} />}
                      </button>
                    )
                  })}
                </div>

                {selectedPipelineId && (() => {
                  const pipe = pipelines.find(p => p.id === selectedPipelineId)
                  if (!pipe?.stages.length) return null
                  return (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-semibold text-soren-muted uppercase tracking-wide">Quelle colonne ?</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pipe.stages.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedStageId(s.id)}
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border-2 transition-all"
                            style={{
                              borderColor: selectedStageId === s.id ? '#111' : '#E5E7EB',
                              background:  selectedStageId === s.id ? '#111' : '#fff',
                              color:       selectedStageId === s.id ? '#fff' : '#374151',
                            }}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}

            {selectedPipelineId && selectedStageId && !isEdit && (
              <div className="mt-1">
                <label className={labelCls}>Valeur estimée (€)</label>
                <input type="number" value={form.value} onChange={set('value')} placeholder="0" className={inputCls} />
              </div>
            )}
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
                : (isEdit ? 'Enregistrer' : selectedPipelineId && selectedStageId ? 'Créer le lead' : 'Créer le contact')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
