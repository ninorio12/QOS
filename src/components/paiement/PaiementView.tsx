'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CreditCard, ArrowDownLeft, ArrowUpRight, ChevronRight, CalendarDays, X } from 'lucide-react'
import { DateRangePicker, getPresetRange } from '@/components/shared/DateRangePicker'

function fmt(n: number) { return `${Math.round(Math.abs(n)).toLocaleString('fr-FR')} €` }
function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

type Txn = { contactId: string; client: string; company: string; label: string; amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente' }
type Conv = { clients: number; total: number; pct: number }
type Overview = {
  encaisse: number; attente: number; rembourse: number; net: number; transactions: Txn[]
  clientsCount: number; caTotal: number; leadsCount: number
  conversions: { global: Conv; inbound: Conv; outbound: Conv }
}

function defaultRange() {
  const to = new Date(); to.setHours(0,0,0,0)
  const from = new Date(to); from.setDate(to.getDate() - 29)
  return { from: localDate(from), to: localDate(to), label: '30 derniers jours' }
}

export default function PaiementView() {
  const searchParams = useSearchParams()
  const filterContact = searchParams?.get('contact') ?? null
  const filterName = searchParams?.get('name') ? decodeURIComponent(searchParams.get('name')!) : null

  const [range, setRange] = useState(defaultRange)
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const data = useQuery(api.paiement.overview, { from: range.from, to: range.to }) as Overview | undefined
  const ov = data ?? { encaisse: 0, attente: 0, rembourse: 0, net: 0, transactions: [], clientsCount: 0, caTotal: 0, leadsCount: 0, conversions: { global: { clients: 0, total: 0, pct: 0 }, inbound: { clients: 0, total: 0, pct: 0 }, outbound: { clients: 0, total: 0, pct: 0 } } }

  const txns = useMemo(() => filterContact ? ov.transactions.filter(t => t.contactId === filterContact) : ov.transactions, [ov.transactions, filterContact])
  const filtEncaisse = filterContact ? txns.filter(t => t.type === 'payment' && t.status === 'encaissé').reduce((s, t) => s + t.amount, 0) : ov.encaisse
  const filtAttente = filterContact ? txns.filter(t => t.type === 'payment' && t.status === 'attente').reduce((s, t) => s + t.amount, 0) : ov.attente

  const c = ov.conversions

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header + period */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
            <CreditCard size={14} className="text-[#FF4D00]" />
            <span className="text-soren-subtle">VIVIDFLOW</span>
            <ChevronRight size={11} className="text-soren-subtle" />
            <span className="text-soren-text">PAIEMENT</span>
            {filterName && <><ChevronRight size={11} className="text-soren-subtle" /><span className="text-[#FF4D00]">{filterName}</span></>}
          </div>
          <p className="text-[11px] text-soren-subtle mt-1">Tour de contrôle — {range.label ?? `${range.from} → ${range.to}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {filterContact && (
            <a href="/paiement" className="flex items-center gap-1 text-[11px] font-semibold text-soren-muted hover:text-soren-text bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
              <X size={12} /> Tous les clients
            </a>
          )}
          <div className="relative" ref={calRef}>
            <button onClick={() => setCalOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${calOpen ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
              <CalendarDays size={13} /> Période
            </button>
            {calOpen && (
              <DateRangePicker
                onClose={() => setCalOpen(false)}
                onApply={(start, end, label) => { setRange({ from: localDate(start), to: localDate(end), label }); setCalOpen(false) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* KPI cards (same as dashboard) + conversions */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <Card label="Montant encaissé" value={fmt(filtEncaisse)} bg="#DCFCE7" color="#16A34A" />
        <Card label="Montant en attente" value={fmt(filtAttente)} bg="#FEF9C3" color="#CA8A04" />
        <Card label="Remboursé" value={fmt(ov.rembourse)} bg="#FEF2F2" color="#DC2626" />
        <Card label="Net encaissé" value={fmt(filterContact ? filtEncaisse - ov.rembourse : ov.net)} bg="#F3F4F6" color="#111111" />
      </div>

      {!filterContact && (
        <div className="px-6 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
          <ConvCard label="Taux de conversion" conv={c.global} color="#FF4D00" sub="clients / contacts" />
          <ConvCard label="Conversion Inbound" conv={c.inbound} color="#16A34A" sub="meilleure si élevée" />
          <ConvCard label="Conversion Outbound" conv={c.outbound} color="#CA8A04" sub="meilleure si élevée" />
        </div>
      )}

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-soren-border flex items-center justify-between">
            <span className="text-[12px] font-bold text-soren-text">Transactions</span>
            <span className="text-[11px] text-soren-subtle">{txns.length} mouvement{txns.length !== 1 ? 's' : ''}</span>
          </div>
          {txns.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-soren-subtle">Aucune transaction sur la période.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-soren-border/60">
                  {['', 'CLIENT', 'LIBELLÉ', 'DATE', 'MONTANT', 'STATUT'].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-left text-[9px] font-bold text-soren-subtle tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => (
                  <tr key={i} className="border-b border-soren-border/40 hover:bg-soren-elevated/40 transition-colors">
                    <td className="pl-4 py-2.5 w-8">
                      {t.type === 'refund'
                        ? <ArrowUpRight size={14} className="text-[#DC2626]" />
                        : <ArrowDownLeft size={14} className={t.status === 'encaissé' ? 'text-[#16A34A]' : 'text-[#CA8A04]'} />}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[12px] font-semibold text-soren-text">{t.client}</div>
                      {t.company && <div className="text-[10px] text-soren-subtle">{t.company}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-soren-muted">{t.label}</td>
                    <td className="px-4 py-2.5 text-[11px] text-soren-muted whitespace-nowrap">{t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums whitespace-nowrap" style={{ color: t.type === 'refund' ? '#DC2626' : (t.status === 'encaissé' ? '#16A34A' : '#374151') }}>
                      {t.type === 'refund' ? '−' : ''}{fmt(t.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={
                        t.type === 'refund' ? { background: '#FEF2F2', color: '#DC2626' }
                        : t.status === 'encaissé' ? { background: '#DCFCE7', color: '#16A34A' }
                        : { background: '#FEF9C3', color: '#CA8A04' }}>
                        {t.type === 'refund' ? 'remboursé' : t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: bg }}>
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      <p className="text-[24px] md:text-[26px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
    </div>
  )
}

function ConvCard({ label, conv, color, sub }: { label: string; conv: Conv; color: string; sub: string }) {
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 shadow-sm flex flex-col gap-1">
      <span className="text-[11px] font-medium text-soren-muted">{label}</span>
      <div className="flex items-baseline gap-2">
        <p className="text-[26px] font-black tabular-nums leading-none" style={{ color }}>{conv.pct}%</p>
        <span className="text-[11px] text-soren-subtle">{conv.clients}/{conv.total}</span>
      </div>
      <span className="text-[10px] text-soren-subtle">{sub}</span>
    </div>
  )
}
