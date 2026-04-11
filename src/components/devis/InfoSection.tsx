// src/components/devis/InfoSection.tsx
'use client'

import { useState, useRef } from 'react'

type TimelineEvent = {
  label:  string
  detail: string
  date:   string | null
  icon:   React.ReactNode
  done:   boolean
}

interface InfoSectionProps {
  devisId:         string
  contactId:       string | null
  contactName:     string | null
  conversationId:  string | null
  source:          string
  createdAt:       string
  envoyeLe:        string | null
  pdfUrl:          string | null
  montantHt:       number | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const IconCreate = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const IconPdf = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

const IconSend = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

export default function InfoSection({
  devisId, contactId, contactName, conversationId, source,
  createdAt, envoyeLe, pdfUrl, montantHt,
}: InfoSectionProps) {
  const [acompteRate, setAcompteRate] = useState(30)
  const [editing, setEditing]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acompteAmount = montantHt != null ? montantHt * (acompteRate / 100) : null

  function handleRateChange(raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 0 && n <= 100) setAcompteRate(n)
  }

  const timeline: TimelineEvent[] = [
    {
      label:  'Créé',
      detail: source === 'n8n' ? 'par IA · N8N' : 'manuellement',
      date:   createdAt,
      icon:   <IconCreate />,
      done:   true,
    },
    {
      label:  'PDF généré',
      detail: pdfUrl ? '2.3 Mo' : 'non généré',
      date:   pdfUrl ? createdAt : null,
      icon:   <IconPdf />,
      done:   !!pdfUrl,
    },
    {
      label:  'Envoyé',
      detail: envoyeLe ? 'par WhatsApp' : 'non envoyé',
      date:   envoyeLe,
      icon:   <IconSend />,
      done:   !!envoyeLe,
    },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* Méta infos */}
      <div className="flex flex-col gap-2">
        {contactName && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#9CA3AF] font-medium">Contact</span>
            <a
              href={contactId ? `/contacts/${contactId}` : '#'}
              className="text-[11px] font-semibold text-[#111] hover:text-[#3462EE] transition-colors"
            >
              {contactName} ↗
            </a>
          </div>
        )}
        {conversationId && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#9CA3AF] font-medium">Conversation</span>
            <a
              href={`/conversations?id=${conversationId}`}
              className="text-[11px] font-semibold text-[#111] hover:text-[#3462EE] transition-colors"
            >
              Voir dans GHL ↗
            </a>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#9CA3AF] font-medium">Source</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={source === 'n8n'
              ? { background: '#f3e8ff', color: '#7c3aed' }
              : { background: '#f3f4f6', color: '#6b7280' }
            }
          >
            {source === 'n8n' ? 'IA · N8N' : 'Manuel'}
          </span>
        </div>
        {acompteAmount != null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9CA3AF] font-medium">Acompte</span>
              <div className="flex items-center gap-0.5">
                {[20, 30, 50].map(p => (
                  <button
                    key={p}
                    onClick={() => setAcompteRate(p)}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all ${
                      acompteRate === p
                        ? 'bg-[#E2FF8D] text-[#111]'
                        : 'text-[#C8CCC6] hover:text-[#9CA3AF]'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
                <div className="flex items-center gap-0.5 bg-[#F3F4F6] rounded-md px-1.5 py-0.5">
                  <input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={100}
                    value={acompteRate}
                    onChange={e => handleRateChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
                    className="w-5 text-[10px] font-semibold text-[#111] text-center outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-semibold text-[#111]">%</span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#111]">{fmtEUR(acompteAmount)}</span>
          </div>
        )}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-[#f9f9f7] hover:bg-[#f0f0eb] border border-[#f0f0eb] rounded-xl px-3 py-2.5 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center flex-shrink-0 group-hover:border-[#3462EE]/30 transition-colors">
                <IconPdf />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#111] leading-none">Devis PDF</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Télécharger</p>
              </div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#3462EE] transition-colors flex-shrink-0">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-[#f0f0eb]" />

      {/* Timeline */}
      <div>
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Historique</p>
        <div className="flex flex-col">
          {timeline.map((ev, i) => {
            const isLast = i === timeline.length - 1
            return (
              <div key={ev.label} className="flex gap-3">
                {/* Colonne gauche : ligne + dot */}
                <div className="flex flex-col items-center" style={{ width: 20 }}>
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      width: 20, height: 20,
                      background: ev.done ? '#111' : '#f3f4f6',
                      color: ev.done ? 'white' : '#d1d5db',
                      marginTop: 1,
                    }}
                  >
                    {ev.icon}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: 16,
                        background: ev.done ? '#e5e7eb' : '#f3f4f6',
                        margin: '3px 0',
                      }}
                    />
                  )}
                </div>

                {/* Colonne droite : texte + date */}
                <div className="flex-1 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-[12px] font-semibold leading-tight"
                        style={{ color: ev.done ? '#111' : '#d1d5db' }}
                      >
                        {ev.label}
                      </p>
                      {ev.done && (
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{ev.detail}</p>
                      )}
                    </div>
                    {ev.date && (
                      <p className="text-[10px] text-[#9CA3AF] flex-shrink-0 mt-0.5">
                        {fmtDate(ev.date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
