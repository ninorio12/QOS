'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, X, Save, Loader2, Bot, User, ChevronDown } from 'lucide-react'
import { type GHLContact, type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'
import { fetchJSON } from '@/lib/fetchJSON'
import { regionConfig, regionDisplay, COUNTRIES } from '@/lib/regions'
import { getAvatarColor, type ContactAttribution } from './types'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const BOT_COLORS: Record<string, string> = {
  Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
}

function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#FF4D00' || color === '#EFE347'
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
      style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
    >
      {initials}
    </div>
  )
}

function OriginBadge({ createdBy }: { createdBy: string }) {
  const isBot = createdBy !== 'Thomas' && createdBy !== 'Toi'
  const color = isBot ? (BOT_COLORS[createdBy] ?? '#6B7280') : '#111111'
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: color + '18', color }}
    >
      {isBot ? <Bot size={11} className="shrink-0" /> : <User size={11} className="shrink-0" />}{createdBy}
    </span>
  )
}

type EditableFields = {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  address1:    string
  city:        string
  postalCode:  string
  country:     string
  canton:      string
  // Deal (accompagnement) — durée saisie en mois (string côté formulaire, number côté Convex)
  dealStartDate:      string
  dealEndDate:        string
  dealDurationMonths: string
  paymentType:        string
}

function Field({
  label,
  name,
  value,
  editing,
  onChange,
  href,
  type = 'text',
}: {
  label:    string
  name:     keyof EditableFields
  value:    string
  editing:  boolean
  onChange: (k: keyof EditableFields, v: string) => void
  href?:    string
  type?:    string
}) {
  if (!editing && !value) return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{label}</p>
      <p className="text-sm text-[#D1D5DB] italic">—</p>
    </div>
  )
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-2 flex-shrink-0">
        {label}
      </p>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(name, e.target.value)}
          className="flex-1 text-sm text-soren-text bg-[#FAFAF8] border border-soren-border rounded-lg px-3 py-1.5 outline-none focus:border-[#3462EE] transition-colors"
        />
      ) : href ? (
        <a href={href} className="text-sm text-[#3462EE] hover:underline break-all pt-1.5">{value}</a>
      ) : (
        <p className="text-sm text-soren-text break-all pt-1.5">{value}</p>
      )}
    </div>
  )
}

// Champ « Canton / Région » cohérent selon le pays : liste de cantons (CH), de régions (FR),
// ou texte libre sinon. Même mise en page que <Field>.
function RegionField({ country, value, editing, onChange }: {
  country:  string
  value:    string
  editing:  boolean
  onChange: (v: string) => void
}) {
  const rc = regionConfig(country)
  if (!editing && !value) return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{rc.label}</p>
      <p className="text-sm text-[#D1D5DB] italic">—</p>
    </div>
  )
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-2 flex-shrink-0">{rc.label}</p>
      {editing ? (
        rc.options ? (
          <div className="flex-1"><CustomSelect value={value} onChange={onChange} options={[{ value: '', label: '— Choisir —' }, ...rc.options]} /></div>
        ) : (
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Canton, région…"
            className="flex-1 text-sm text-soren-text bg-[#FAFAF8] border border-soren-border rounded-lg px-3 py-1.5 outline-none focus:border-[#3462EE] transition-colors"
          />
        )
      ) : (
        <p className="text-sm text-soren-text break-all pt-1.5">{regionDisplay(country, value)}</p>
      )}
    </div>
  )
}

// Champ « Pays » = menu déroulant (Suisse/France en tête). Garde une valeur existante hors liste.
function CountryField({ value, editing, onChange }: {
  value:    string
  editing:  boolean
  onChange: (v: string) => void
}) {
  if (!editing && !value) return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Pays</p>
      <p className="text-sm text-[#D1D5DB] italic">—</p>
    </div>
  )
  const opts: SelectOption[] = [{ value: '', label: '— Choisir —' }, ...COUNTRIES.map(c => ({ value: c, label: c }))]
  if (value && !(COUNTRIES as readonly string[]).includes(value)) opts.splice(1, 0, { value, label: value })
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-2 flex-shrink-0">Pays</p>
      {editing ? (
        <div className="flex-1"><CustomSelect value={value} onChange={onChange} options={opts} /></div>
      ) : (
        <p className="text-sm text-soren-text break-all pt-1.5">{value}</p>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  open:      'Ouverte',
  won:       'Gagnée',
  lost:      'Perdue',
  abandoned: 'Abandonnée',
}
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open:      { bg: '#FF4D00', text: '#fff' },
  won:       { bg: '#D1FAE5', text: '#065F46' },
  lost:      { bg: '#FEE2E2', text: '#991B1B' },
  abandoned: { bg: '#F3F4F6', text: '#6B7280' },
}

const labelCls = "block text-xs text-soren-muted mb-1.5 font-medium"

function stripEmoji(str: string) {
  return Array.from(str)
    .filter(ch => { const cp = ch.codePointAt(0) ?? 0; return cp < 0x2600 || (cp > 0x27BF && cp < 0x1F000) || cp > 0x1FFFF })
    .join('')
    .trim()
}

type SelectOption = { value: string; label: string }

function CustomSelect({ value, onChange, options, placeholder = '— Choisir —' }: {
  value:       string
  onChange:    (v: string) => void
  options:     SelectOption[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 bg-soren-elevated rounded-xl px-3 py-2.5 text-sm text-soren-text hover:bg-[#EDEDEA] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={13} className="text-soren-subtle flex-shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-soren-card rounded-2xl shadow-xl border border-[#F0F0EE] overflow-hidden py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                opt.value === value
                  ? 'bg-soren-elevated text-soren-text font-medium'
                  : 'text-[#374151] hover:bg-[#FAFAF8]'
              }`}
            >
              {opt.value === value && <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0" />}
              {opt.value !== value && <span className="w-1.5 h-1.5 flex-shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PipelineCard({ opp, pipelines, editing }: { opp: GHLOpportunity; pipelines: GHLPipeline[]; editing: boolean }) {
  const [pipelineId, setPipelineId] = useState(opp.pipelineId)
  const [stageId,    setStageId]    = useState(opp.pipelineStageId)
  const [status,     setStatus]     = useState<GHLOpportunity['status']>(opp.status ?? 'open')
  const [value,      setValue]      = useState(opp.monetaryValue ?? 0)
  const [saving,     setSaving]     = useState(false)
  const isFirst   = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot des valeurs courantes accessible sans dépendance dans les callbacks
  const latest = useRef({ pipelineId, stageId, status, value })
  useEffect(() => { latest.current = { pipelineId, stageId, status, value } }, [pipelineId, stageId, status, value])

  const currentPipeline = pipelines.find(p => p.id === pipelineId)
  const currentStages   = currentPipeline?.stages ?? []
  const currentStage    = currentStages.find(s => s.id === stageId)
  const colors          = STATUS_COLORS[status] ?? STATUS_COLORS.open

  // Sauvegarde immédiate (sans attente debounce)
  const saveNow = useCallback(async () => {
    const { pipelineId: pid, stageId: sid, status: st, value: val } = latest.current
    setSaving(true)
    try {
      await fetch(`/api/opp/${opp.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pipelineId: pid, pipelineStageId: sid, status: st, monetaryValue: val }),
      })
      const bc = new BroadcastChannel('soren-opp-updates')
      bc.postMessage({ type: 'opp-updated', id: opp.id, pipelineId: pid, stageId: sid, status: st, value: val })
      bc.close()
    } finally {
      setSaving(false)
    }
  }, [opp.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save avec debounce pour les selects pipeline/stage/statut
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, 600)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [pipelineId, stageId, status, saveNow])

  return (
    <div className="border border-[#F0F0EE] rounded-2xl p-4 space-y-4">
      {saving && <p className="text-[10px] text-soren-subtle text-right">Sauvegarde…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pipeline */}
        <div>
          <label className={labelCls}>Pipeline</label>
          {editing ? (
            <CustomSelect
              value={pipelineId}
              onChange={v => { setPipelineId(v); setStageId('') }}
              options={pipelines.map(p => ({ value: p.id, label: p.name }))}
            />
          ) : (
            <p className="text-[13px] text-soren-text">{currentPipeline?.name ?? '—'}</p>
          )}
        </div>

        {/* Étape */}
        <div>
          <label className={labelCls}>Étape</label>
          {editing ? (
            <CustomSelect
              value={stageId}
              onChange={setStageId}
              options={currentStages.map(s => ({ value: s.id, label: stripEmoji(s.name) }))}
              placeholder="— Choisir —"
            />
          ) : (
            <p className="text-[13px] text-soren-text">{currentStage ? stripEmoji(currentStage.name) : '—'}</p>
          )}
        </div>

        {/* Statut */}
        <div>
          <label className={labelCls}>Statut</label>
          {editing ? (
            <CustomSelect
              value={status}
              onChange={v => setStatus(v as GHLOpportunity['status'])}
              options={[
                { value: 'open',      label: 'Ouverte' },
                { value: 'won',       label: 'Gagnée' },
                { value: 'lost',      label: 'Perdue' },
                { value: 'abandoned', label: 'Abandonnée' },
              ]}
            />
          ) : (
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: colors.bg, color: colors.text }}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          )}
        </div>

        {/* Valeur */}
        <div>
          <label className={labelCls}>Valeur de l&apos;opportunité</label>
          {editing ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle text-sm">CHF</span>
              <input
                type="number"
                min={0}
                value={value}
                onChange={e => setValue(Number(e.target.value))}
                onBlur={saveNow}
                className="w-full bg-soren-elevated border-0 rounded-xl pl-7 pr-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30"
              />
            </div>
          ) : (
            <p className="text-[13px] text-soren-text">
              {value > 0 ? `CHF\u202f${value.toLocaleString('fr-FR')}` : '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ContactDetailPage({
  contact,
  attribution,
  opportunities = [],
  pipelines = [],
}: {
  contact:        GHLContact
  attribution:    ContactAttribution | null
  opportunities?: GHLOpportunity[]
  pipelines?:     GHLPipeline[]
}) {
  const router = useRouter()
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [tags,     setTags]     = useState<string[]>(contact.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // Infos deal dérivées (montant pipeline_clients, plan Paiement, prochain RDV) — lecture seule.
  const dealMetaInfo = useQuery(api.crm_contacts.dealMeta, { contactId: contact.id as never }) as {
    totalAmount?: number; installments?: number; perInstallment?: number
    nextDueDate?: string; nextDueAmount?: number; nextCallDate?: string; nextCallTitle?: string
  } | null | undefined

  function addTag(val: string) {
    const t = val.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const [fields, setFields] = useState<EditableFields>({
    firstName:   contact.firstName   ?? '',
    lastName:    contact.lastName    ?? '',
    email:       contact.email       ?? '',
    phone:       contact.phone       ?? '',
    address1:    contact.address1    ?? '',
    city:        contact.city        ?? '',
    postalCode:  contact.postalCode  ?? '',
    country:     contact.country     ?? '',
    canton:      contact.canton      ?? '',
    dealStartDate:      contact.dealStartDate ?? '',
    dealEndDate:        contact.dealEndDate   ?? '',
    dealDurationMonths: contact.dealDurationMonths ? String(contact.dealDurationMonths) : '',
    paymentType:        contact.paymentType   ?? '',
  })

  const [original] = useState<EditableFields>({ ...fields })

  function handleChange(k: keyof EditableFields, v: string) {
    setFields(f => ({ ...f, [k]: v }))
  }

  function handleCancel() {
    setFields({ ...original })
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // dealDurationMonths est saisi en texte mais validé v.number() côté Convex.
      const { dealDurationMonths, ...rest } = fields
      const months = parseInt(dealDurationMonths, 10)
      await fetchJSON(`/api/contact/${contact.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...rest, dealDurationMonths: Number.isFinite(months) && months > 0 ? months : undefined, tags }),
      })
      // Synchronise le KanbanBoard et toutes les vues qui affichent ce contact
      const bc = new BroadcastChannel('soren-opp-updates')
      const contactName = [fields.firstName, fields.lastName].filter(Boolean).join(' ') || contact.contactName
      bc.postMessage({ type: 'contact-updated', contactId: contact.id, name: contactName, email: fields.email, phone: fields.phone })
      bc.close()
      setEditing(false)
      router.refresh()
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Erreur inconnue'
      try {
        const ghl = JSON.parse(msg) as { message?: string; meta?: { contactName?: string; matchingField?: string } }
        if (ghl.message?.includes('duplicated')) {
          const field = ghl.meta?.matchingField === 'phone' ? 'numéro de téléphone' : ghl.meta?.matchingField ?? 'champ'
          const who   = ghl.meta?.contactName ? ` (${ghl.meta.contactName})` : ''
          msg = `Ce ${field} est déjà utilisé par un autre contact${who}.`
        }
      } catch { /* pas du JSON GHL */ }
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const displayName = fields.firstName || fields.lastName
    ? `${fields.firstName} ${fields.lastName}`.trim()
    : contact.contactName || '—'

  const address = [fields.address1, fields.city, fields.postalCode, fields.country].filter(Boolean).join(', ')

  return (
    <div className="h-full overflow-y-auto bg-soren-app p-6">
      <div className="fiche-contact-fields max-w-2xl mx-auto">

        {/* Back */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1.5 text-sm text-soren-muted hover:text-soren-text transition-colors"
          >
            <ChevronLeft size={15} />
            Retour aux contacts
          </Link>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3462EE] hover:text-[#2451CC] transition-colors"
            >
              <Pencil size={14} />
              Modifier
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-soren-muted hover:text-soren-text transition-colors"
              >
                <X size={14} />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-soren-sidebar hover:bg-[#222222] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Sauvegarder
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Header card */}
        <div className="bg-soren-card rounded-2xl p-6 mb-4 flex items-start gap-4">
          <Avatar contact={contact} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-soren-text leading-tight">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-soren-elevated text-soren-muted border border-soren-border">
                  {t}
                  {editing && (
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-red-400 transition-colors leading-none">
                      <X size={9} />
                    </button>
                  )}
                </span>
              ))}
              {editing && (
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                  }}
                  onBlur={() => tagInput.trim() && addTag(tagInput)}
                  placeholder="+ tag"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-[#D1D5DB] bg-transparent text-soren-muted outline-none focus:border-[#3462EE] w-16"
                />
              )}
              {attribution && <OriginBadge createdBy={attribution.created_by} />}
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-soren-card rounded-2xl px-6 pt-4 pb-2 mb-4">
          <h3 className="text-[10px] font-bold text-soren-subtle uppercase tracking-widest mb-1">Coordonnées</h3>
          <Field label="Prénom"     name="firstName"   value={fields.firstName}   editing={editing} onChange={handleChange} />
          <Field label="Nom"        name="lastName"    value={fields.lastName}    editing={editing} onChange={handleChange} />
          <Field label="Email"      name="email"       value={fields.email}       editing={editing} onChange={handleChange} type="email" href={!editing && fields.email ? `mailto:${fields.email}` : undefined} />
          <Field label="Téléphone"  name="phone"       value={fields.phone}       editing={editing} onChange={handleChange} type="tel"   href={!editing && fields.phone ? `tel:${fields.phone}` : undefined} />
          {!editing && (
            <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
              <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Ajouté le</p>
              <p className="text-sm text-soren-text">
                {new Date(contact.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Adresse & Infos */}
        <div className="bg-soren-card rounded-2xl px-6 pt-4 pb-2 mb-4">
          <h3 className="text-[10px] font-bold text-soren-subtle uppercase tracking-widest mb-1">Adresse &amp; Infos</h3>
          <Field label="Adresse"    name="address1"    value={fields.address1}    editing={editing} onChange={handleChange} />
          <Field label="Ville"      name="city"        value={fields.city}        editing={editing} onChange={handleChange} />
          <Field label="Code postal" name="postalCode" value={fields.postalCode}  editing={editing} onChange={handleChange} />
          <CountryField value={fields.country} editing={editing} onChange={v => { if (v !== fields.country) handleChange('canton', ''); handleChange('country', v) }} />
          <RegionField country={fields.country} value={fields.canton} editing={editing} onChange={v => handleChange('canton', v)} />
        </div>

        {/* Deal — dates/durée/paiement éditables ; montants, mensualités, échéance & RDV dérivés
            des sources de vérité (pipeline_clients, module Paiement, RDV) via crm_contacts.dealMeta. */}
        <div className="bg-soren-card rounded-2xl px-6 pt-4 pb-2 mb-4">
          <h3 className="text-[10px] font-bold text-soren-subtle uppercase tracking-widest mb-1">Deal</h3>
          <Field label="Date de début" name="dealStartDate" value={fields.dealStartDate} editing={editing} onChange={handleChange} type="date" />
          <Field label="Date de fin"   name="dealEndDate"   value={fields.dealEndDate}   editing={editing} onChange={handleChange} type="date" />
          <Field label="Durée (mois)"  name="dealDurationMonths" value={fields.dealDurationMonths} editing={editing} onChange={handleChange} type="number" />
          <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
            <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-2 flex-shrink-0">Paiement</p>
            {editing ? (
              <div className="flex-1">
                <CustomSelect
                  value={fields.paymentType}
                  onChange={v => handleChange('paymentType', v)}
                  options={[{ value: '', label: '— Choisir —' }, { value: 'mensuel', label: 'Mensuel' }, { value: 'unique', label: 'Paiement en une fois' }]}
                />
              </div>
            ) : (
              <p className={`text-sm pt-1.5 ${fields.paymentType ? 'text-soren-text' : 'text-[#D1D5DB] italic'}`}>
                {fields.paymentType === 'mensuel' ? 'Mensuel' : fields.paymentType === 'unique' ? 'Paiement en une fois' : '—'}
              </p>
            )}
          </div>
          {dealMetaInfo && (
            <>
              {dealMetaInfo.totalAmount !== undefined && (
                <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Montant total</p>
                  <p className="text-sm font-semibold text-soren-text">CHF {dealMetaInfo.totalAmount.toLocaleString('fr-CH')}</p>
                </div>
              )}
              {dealMetaInfo.installments !== undefined && (
                <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Mensualités</p>
                  <p className="text-sm text-soren-text">
                    {dealMetaInfo.installments}×{dealMetaInfo.perInstallment ? ` · CHF ${dealMetaInfo.perInstallment.toLocaleString('fr-CH')} / mensualité` : ''}
                  </p>
                </div>
              )}
              {dealMetaInfo.nextDueDate && (
                <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Proch. échéance</p>
                  <p className="text-sm text-soren-text">
                    {new Date(dealMetaInfo.nextDueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {dealMetaInfo.nextDueAmount ? ` · CHF ${dealMetaInfo.nextDueAmount.toLocaleString('fr-CH')}` : ''}
                  </p>
                </div>
              )}
              {dealMetaInfo.nextCallDate && (
                <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Proch. RDV</p>
                  <p className="text-sm text-soren-text">
                    {new Date(dealMetaInfo.nextCallDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {' à '}{new Date(dealMetaInfo.nextCallDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {dealMetaInfo.nextCallTitle ? ` · ${dealMetaInfo.nextCallTitle}` : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pipeline / Opportunités */}
        {opportunities.length > 0 && (
          <div className="bg-soren-card rounded-2xl px-6 py-4 mb-4">
            <p className="text-[11px] font-bold text-soren-subtle uppercase tracking-wide mb-4">
              Pipeline · {opportunities.length} opportunité{opportunities.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {opportunities.map(opp => (
                <PipelineCard key={opp.id} opp={opp} pipelines={pipelines} editing={editing} />
              ))}
            </div>
          </div>
        )}

        {/* Custom fields — lecture seule */}
        {contact.customFields && contact.customFields.length > 0 && (
          <div className="bg-soren-card rounded-2xl px-6 py-2">
            <p className="text-[11px] font-bold text-soren-subtle uppercase tracking-wide py-3 border-b border-[#F0F0EE]">
              Champs personnalisés
            </p>
            {contact.customFields.map(f =>
              f.value ? (
                <div key={f.id} className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-soren-subtle uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{f.id}</p>
                  <p className="text-sm text-soren-text break-all">{String(f.value)}</p>
                </div>
              ) : null
            )}
          </div>
        )}

      </div>
    </div>
  )
}
