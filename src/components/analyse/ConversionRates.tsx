'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CalendarDays } from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'

function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

type Conv = { clients: number; total: number; pct: number }
type Overview = { conversions: { global: Conv; inbound: Conv; outbound: Conv; recommandation: Conv } }

function defaultRange() {
  const to = new Date(); to.setHours(0,0,0,0)
  const from = new Date(to); from.setDate(to.getDate() - 29)
  return { from: localDate(from), to: localDate(to), label: '30 derniers jours' }
}

export default function ConversionRates({ showHeader = true, variant = 'filled', from, to }: { showHeader?: boolean; variant?: 'filled' | 'plain'; from?: string; to?: string }) {
  const [range, setRange] = useState(defaultRange)
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  // Si un range externe est fourni (ex: calendrier Période du dashboard), il pilote les données.
  const queryFrom = from ?? range.from
  const queryTo = to ?? range.to
  // Conversion = clients / TOTAL du module Contacts (leads + clients + perdus), prod ET démo.
  const data = useQuery(api.paiement.overview, { from: queryFrom, to: queryTo, allContacts: true }) as Overview | undefined
  const c = data?.conversions ?? { global: { clients: 0, total: 0, pct: 0 }, inbound: { clients: 0, total: 0, pct: 0 }, outbound: { clients: 0, total: 0, pct: 0 }, recommandation: { clients: 0, total: 0, pct: 0 } }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-[14px] font-black text-soren-text">Taux de conversion</h2>
            <p className="text-[11px] text-soren-subtle">Clients / contacts, par source · {range.label}</p>
          </div>
          <div className="relative" ref={calRef}>
            <button onClick={() => setCalOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${calOpen ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
              <CalendarDays size={13} /> {range.label ?? 'Période'}
            </button>
            {calOpen && (
              <div className="absolute right-0 z-50">
                <DateRangePicker onClose={() => setCalOpen(false)} onApply={(s, e, label) => { setRange({ from: localDate(s), to: localDate(e), label }); setCalOpen(false) }} />
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ConvCard variant={variant} label="Conversion globale"        conv={c.global}         sub="clients / contacts" bg="#FF4D00" text="#fff" muted="rgba(255,255,255,0.65)" />
        <ConvCard variant={variant} label="Conversion Inbound"        conv={c.inbound}        sub="clients / contacts inbound" bg="#1C1C1E" text="#fff" muted="#888" />
        <ConvCard variant={variant} label="Conversion Outbound"       conv={c.outbound}       sub="clients / contacts outbound" bg="#3462EE" text="#fff" muted="rgba(255,255,255,0.65)" />
        <ConvCard variant={variant} label="Conversion Recommandation" conv={c.recommandation} sub="clients / contacts recommandation" bg="#1C1C1E" text="#fff" muted="#888" />
      </div>
    </div>
  )
}

function ConvCard({ label, conv, sub, bg, text, muted, variant }: { label: string; conv: Conv; sub: string; bg: string; text: string; muted: string; variant: 'filled' | 'plain' }) {
  // Variante "plain" : même harmonie que les cartes KPI du tableau de bord (carte claire, libellé muted, valeur sombre)
  if (variant === 'plain') {
    return (
      <div className="bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60">
        <span className="text-[11px] font-medium text-soren-muted leading-none">{label}</span>
        <div className="flex items-baseline gap-2">
          <p className="text-[20px] md:text-[22px] font-bold text-soren-text leading-none tabular-nums">{conv.total > 0 ? `${conv.pct}%` : '—'}</p>
          <span className="text-[11px] text-soren-subtle">{conv.clients}/{conv.total}</span>
        </div>
        <span className="text-[10px] font-semibold text-[#FF4D00]/70">{sub}</span>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: bg, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)' }}>
      <span className="text-[11px] font-medium" style={{ color: muted }}>{label}</span>
      <div className="flex items-baseline gap-2">
        <p className="text-[18px] font-bold tabular-nums leading-none" style={{ color: text }}>{conv.total > 0 ? `${conv.pct}%` : '—'}</p>
        <span className="text-[11px]" style={{ color: muted }}>{conv.clients}/{conv.total}</span>
      </div>
      <span className="text-[10px] font-semibold" style={{ color: muted }}>{sub}</span>
    </div>
  )
}
