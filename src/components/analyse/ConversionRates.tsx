'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CalendarDays } from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'

function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

type Conv = { clients: number; total: number; pct: number }
type Overview = { conversions: { global: Conv; inbound: Conv; outbound: Conv } }

function defaultRange() {
  const to = new Date(); to.setHours(0,0,0,0)
  const from = new Date(to); from.setDate(to.getDate() - 29)
  return { from: localDate(from), to: localDate(to), label: '30 derniers jours' }
}

export default function ConversionRates() {
  const [range, setRange] = useState(defaultRange)
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const data = useQuery(api.paiement.overview, { from: range.from, to: range.to }) as Overview | undefined
  const c = data?.conversions ?? { global: { clients: 0, total: 0, pct: 0 }, inbound: { clients: 0, total: 0, pct: 0 }, outbound: { clients: 0, total: 0, pct: 0 } }

  const best = c.inbound.pct === c.outbound.pct ? null : (c.inbound.pct > c.outbound.pct ? 'inbound' : 'outbound')

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-[14px] font-black text-soren-text">Taux de conversion</h2>
          <p className="text-[11px] text-soren-subtle">Clients convertis par rapport aux leads — {range.label}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ConvCard label="Conversion globale" conv={c.global} color="#FF4D00" sub="clients / contacts" />
        <ConvCard label="Conversion Inbound" conv={c.inbound} color="#059669" sub={best === 'inbound' ? '★ meilleure source' : 'inbound'} highlight={best === 'inbound'} />
        <ConvCard label="Conversion Outbound" conv={c.outbound} color="#D97706" sub={best === 'outbound' ? '★ meilleure source' : 'outbound'} highlight={best === 'outbound'} />
      </div>
    </div>
  )
}

function ConvCard({ label, conv, color, sub, highlight }: { label: string; conv: Conv; color: string; sub: string; highlight?: boolean }) {
  return (
    <div className="bg-soren-card border rounded-2xl p-4 shadow-sm flex flex-col gap-1" style={{ borderColor: highlight ? color : 'var(--border)' }}>
      <span className="text-[11px] font-medium text-soren-muted">{label}</span>
      <div className="flex items-baseline gap-2">
        <p className="text-[28px] font-black tabular-nums leading-none" style={{ color }}>{conv.pct}%</p>
        <span className="text-[11px] text-soren-subtle">{conv.clients}/{conv.total}</span>
      </div>
      <span className="text-[10px] font-semibold" style={{ color: highlight ? color : '#9CA3AF' }}>{sub}</span>
    </div>
  )
}
