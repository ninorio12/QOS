'use client'

import { useEffect, useState } from 'react'
import { X, Phone, Mail, Tag, ExternalLink, Loader2, MessageSquare, Building2, Euro, Calendar, MapPin, Globe } from 'lucide-react'
import { getAvatarColor } from '@/components/contacts/types'
import Link from 'next/link'
import { type Opportunity } from './types'

type GHLContact = {
  id:            string
  firstName:     string | null
  lastName:      string | null
  email:         string | null
  phone:         string | null
  companyName:   string | null
  address1?:     string | null
  city?:         string | null
  postalCode?:   string | null
  country?:      string | null
  website?:      string | null
  tags:          string[]
  source:        string | null
  dateAdded:     string
  customFields?: { id: string; value: string | null; fieldKey?: string; name?: string }[]
}

type Props = {
  opp:     Opportunity | null
  stage?:  string | null
  onClose: () => void
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <span className="text-soren-subtle flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-soren-subtle font-medium mb-0.5">{label}</p>
        <p className="text-[13px] text-soren-text font-medium break-all">{value}</p>
      </div>
    </div>
  )
}

export default function ContactModal({ opp, stage, onClose }: Props) {
  const [contact, setContact] = useState<GHLContact | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!opp?.contactId) { setContact(null); return }
    setLoading(true)
    fetch(`/api/contact/${opp.contactId}`)
      .then(r => r.json())
      .then((d: { contact?: GHLContact }) => setContact(d.contact ?? null))
      .catch(() => setContact(null))
      .finally(() => setLoading(false))
  }, [opp?.contactId])

  const visible = !!opp

  const name     = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(' ')
    : (opp?.name ?? '…')
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color    = getAvatarColor(initials)

  const address = [contact?.address1, contact?.city, contact?.postalCode, contact?.country]
    .filter(Boolean).join(', ') || null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-250 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Modal centré */}
      <div className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none
      `}>
        <div className={`
          w-full max-w-[560px] max-h-[85vh] bg-soren-card rounded-2xl shadow-2xl
          flex flex-col pointer-events-auto
          transition-all duration-250 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}>

          {/* ── Header ── */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#F0F0EE] flex-shrink-0">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                style={{ background: color + '22', color }}
              >
                {initials || '?'}
              </div>
              <div>
                <p className="text-[16px] font-bold text-soren-text leading-tight">{name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {contact?.companyName && (
                    <span className="text-[11px] text-soren-muted">{contact.companyName}</span>
                  )}
                  {stage && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE]" />
                      {stage}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Opportunité (toujours visible) ── */}
          {opp && (
            <div className="px-6 py-3 bg-[#FAFAF9] border-b border-[#F0F0EE] flex items-center flex-shrink-0">
              {[
                { label: 'Valeur',   value: opp.value > 0 ? `€${opp.value.toLocaleString('fr-FR')}` : '—', large: true },
                { label: 'Statut',   value: opp.status ?? '—' },
                { label: 'Source',   value: opp.source ?? '—' },
                { label: 'Créé le',  value: new Date(opp.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center flex-1">
                  <div className="flex-1 text-center px-2">
                    <p className="text-[10px] text-soren-subtle font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
                    <p className={`font-bold text-soren-text truncate ${item.large ? 'text-[18px]' : 'text-[12px]'}`}>
                      {item.value}
                    </p>
                  </div>
                  {i < 3 && <div className="w-px h-8 bg-[#E5E7EB] flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-[#C4C9D4] animate-spin" />
              </div>
            )}

            {!loading && contact && (
              <div className="divide-y divide-[#F3F4F6]">
                <DataRow icon={<Phone size={14} />}     label="Téléphone"  value={contact.phone} />
                <DataRow icon={<Mail size={14} />}      label="Email"      value={contact.email} />
                <DataRow icon={<Building2 size={14} />} label="Société"    value={contact.companyName} />
                <DataRow icon={<MapPin size={14} />}    label="Adresse"    value={address} />
                <DataRow icon={<Globe size={14} />}     label="Site web"   value={contact.website} />
                <DataRow icon={<Euro size={14} />}      label="Source"     value={contact.source} />
                <DataRow icon={<Calendar size={14} />}  label="Ajouté le"  value={new Date(contact.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />

                {/* Champs custom */}
                {contact.customFields?.filter(f => f.value).map(f => (
                  <DataRow
                    key={f.id}
                    icon={<Tag size={14} />}
                    label={f.name ?? f.fieldKey ?? f.id}
                    value={f.value}
                  />
                ))}

                {/* Tags */}
                {contact.tags?.length > 0 && (
                  <div className="py-2.5">
                    <p className="text-[10px] text-soren-subtle font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contact.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-soren-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-[#F0F0EE] flex gap-2">
            <Link
              href={`/contacts/${opp?.contactId}`}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-black text-white text-[12px] font-semibold hover:bg-[#111] transition-colors"
            >
              <ExternalLink size={13} />
              Fiche complète
            </Link>
            <Link
              href={`/conversations?contact=${opp?.contactId ?? ''}`}
              className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-black text-[12px] font-semibold transition-colors hover:opacity-90"
              style={{ background: '#FF4D00' }}
            >
              <MessageSquare size={13} />
              Messages
            </Link>
          </div>

        </div>
      </div>
    </>
  )
}
