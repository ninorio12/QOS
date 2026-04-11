'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, X, Check, Loader2, Bot, User } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { fetchJSON } from '@/lib/fetchJSON'
import { getAvatarColor, type ContactAttribution } from './types'

const BOT_COLORS: Record<string, string> = {
  Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
}

function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
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
  companyName: string
  address1:    string
  city:        string
  postalCode:  string
  country:     string
  website:     string
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
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{label}</p>
      <p className="text-sm text-[#D1D5DB] italic">—</p>
    </div>
  )
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-2 flex-shrink-0">
        {label}
      </p>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(name, e.target.value)}
          className="flex-1 text-sm text-[#111111] bg-[#F9F9F7] border border-[#E5E7EB] rounded-lg px-3 py-1.5 outline-none focus:border-[#3462EE] transition-colors"
        />
      ) : href ? (
        <a href={href} className="text-sm text-[#3462EE] hover:underline break-all pt-1.5">{value}</a>
      ) : (
        <p className="text-sm text-[#111111] break-all pt-1.5">{value}</p>
      )}
    </div>
  )
}

export default function ContactDetailPage({
  contact,
  attribution,
}: {
  contact:     GHLContact
  attribution: ContactAttribution | null
}) {
  const router = useRouter()
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [tags,     setTags]     = useState<string[]>(contact.tags ?? [])
  const [tagInput, setTagInput] = useState('')

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
    companyName: contact.companyName ?? '',
    address1:    contact.address1    ?? '',
    city:        contact.city        ?? '',
    postalCode:  contact.postalCode  ?? '',
    country:     contact.country     ?? '',
    website:     contact.website     ?? '',
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
      await fetchJSON(`/api/contact/${contact.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...fields, tags }),
      })
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
    <div className="min-h-screen bg-[#EEF0EB] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111111] transition-colors"
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-[#111111] transition-colors"
              >
                <X size={14} />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#111111] hover:bg-[#222222] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
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
        <div className="bg-white rounded-2xl p-6 mb-4 flex items-start gap-4">
          <Avatar contact={contact} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#111111] leading-tight">{displayName}</h1>
            {fields.companyName && (
              <p className="text-sm text-[#6B7280] mt-0.5">{fields.companyName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F0] text-[#6B7280] border border-[#E5E7EB]">
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
                  className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-[#D1D5DB] bg-transparent text-[#6B7280] outline-none focus:border-[#3462EE] w-16"
                />
              )}
              {attribution && <OriginBadge createdBy={attribution.created_by} />}
            </div>
          </div>
        </div>

        {/* Infos card */}
        <div className="bg-white rounded-2xl px-6 py-2 mb-4">
          <Field label="Prénom"     name="firstName"   value={fields.firstName}   editing={editing} onChange={handleChange} />
          <Field label="Nom"        name="lastName"    value={fields.lastName}    editing={editing} onChange={handleChange} />
          <Field label="Email"      name="email"       value={fields.email}       editing={editing} onChange={handleChange} type="email" href={!editing && fields.email ? `mailto:${fields.email}` : undefined} />
          <Field label="Téléphone"  name="phone"       value={fields.phone}       editing={editing} onChange={handleChange} type="tel"   href={!editing && fields.phone ? `tel:${fields.phone}` : undefined} />
          <Field label="Entreprise" name="companyName" value={fields.companyName} editing={editing} onChange={handleChange} />
          <Field label="Adresse"    name="address1"    value={fields.address1}    editing={editing} onChange={handleChange} />
          <Field label="Ville"      name="city"        value={fields.city}        editing={editing} onChange={handleChange} />
          <Field label="Code postal" name="postalCode" value={fields.postalCode}  editing={editing} onChange={handleChange} />
          <Field label="Pays"       name="country"     value={fields.country}     editing={editing} onChange={handleChange} />
          <Field label="Site web"   name="website"     value={fields.website}     editing={editing} onChange={handleChange} href={!editing && fields.website ? fields.website : undefined} />
          {!editing && (
            <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">Ajouté le</p>
              <p className="text-sm text-[#111111]">
                {new Date(contact.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Custom fields — lecture seule */}
        {contact.customFields && contact.customFields.length > 0 && (
          <div className="bg-white rounded-2xl px-6 py-2">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wide py-3 border-b border-[#F0F0EE]">
              Champs personnalisés
            </p>
            {contact.customFields.map(f =>
              f.value ? (
                <div key={f.id} className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
                  <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{f.id}</p>
                  <p className="text-sm text-[#111111] break-all">{String(f.value)}</p>
                </div>
              ) : null
            )}
          </div>
        )}

      </div>
    </div>
  )
}
