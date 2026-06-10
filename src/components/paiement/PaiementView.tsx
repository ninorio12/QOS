'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CalendarDays, X, Search } from 'lucide-react'
import { DateRangePicker, getPresetRange } from '@/components/shared/DateRangePicker'

function fmt(n: number) { return `${Math.round(Math.abs(n)).toLocaleString('fr-FR')} CHF` }
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
  return { from: localDate(from), to: localDate(to), label: 'Période' }
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

  const [search, setSearch] = useState('')
  const tzOffset = new Date().getTimezoneOffset()
  const data = useQuery(api.paiement.overview, { from: range.from, to: range.to, tzOffset }) as Overview | undefined
  const ov = data ?? { encaisse: 0, attente: 0, rembourse: 0, net: 0, transactions: [], clientsCount: 0, caTotal: 0, leadsCount: 0, conversions: { global: { clients: 0, total: 0, pct: 0 }, inbound: { clients: 0, total: 0, pct: 0 }, outbound: { clients: 0, total: 0, pct: 0 } } }

  const txns = useMemo(() => {
    let t = filterContact ? ov.transactions.filter(x => x.contactId === filterContact) : ov.transactions
    // Mouvements réels de la période uniquement : on ne garde que les transactions
    // datées comprises dans [from, to] (retire les "en attente" sans date qui polluaient hors période).
    t = t.filter(x => x.date && x.date.slice(0, 10) >= range.from && x.date.slice(0, 10) <= range.to)
    const q = search.toLowerCase().trim()
    if (q) t = t.filter(x => `${x.client} ${x.company}`.toLowerCase().includes(q))
    return t
  }, [ov.transactions, filterContact, search, range.from, range.to])
  const filtEncaisse = filterContact ? txns.filter(t => t.type === 'payment' && t.status === 'encaissé').reduce((s, t) => s + t.amount, 0) : ov.encaisse
  const filtAttente = filterContact ? txns.filter(t => t.type === 'payment' && t.status === 'attente').reduce((s, t) => s + t.amount, 0) : ov.attente

  const c = ov.conversions

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative" ref={calRef}>
            <button onClick={() => setCalOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${calOpen ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
              <CalendarDays size={13} /> {range.label ?? 'Période'}
            </button>
            {calOpen && (
              <div className="absolute left-0 z-50">
                <DateRangePicker
                  onClose={() => setCalOpen(false)}
                  onApply={(start, end, label) => { setRange({ from: localDate(start), to: localDate(end), label }); setCalOpen(false) }}
                />
              </div>
            )}
          </div>
          {filterContact && (
            <a href="/paiement" className="flex items-center gap-1 text-[11px] font-semibold text-soren-muted hover:text-soren-text bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
              <X size={12} /> {filterName ?? 'Tous'}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 md:min-w-[200px] max-w-md bg-soren-card border border-soren-border rounded-full px-3.5 py-2">
          <Search size={13} className="text-soren-subtle flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…"
            className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <Card label="Montant encaissé" value={fmt(filtEncaisse)} variant="orange" />
        <Card label="Montant en attente" value={fmt(filtAttente)} variant="black" />
        <Card label="Remboursé" value={fmt(ov.rembourse)} variant="orange" />
        <Card label="Net encaissé" value={fmt(filterContact ? filtEncaisse - ov.rembourse : ov.net)} variant="white" />
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-soren-border flex items-center justify-between">
            <span className="text-[12px] font-bold text-soren-text">Transactions</span>
            <span className="text-[11px] text-soren-subtle">{txns.length} mouvement{txns.length !== 1 ? 's' : ''}</span>
          </div>
          {txns.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-soren-subtle">Aucune transaction sur la période.</div>
          ) : (
            <><div className="md:hidden divide-y divide-soren-border/40">
              {txns.map((t, i) => {
                const accent = t.type === 'refund' ? '#F43F5E' : (t.status === 'encaissé' ? '#10B981' : '#F59E0B')
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: `${accent}1A`, color: accent }}>{t.client?.trim().charAt(0).toUpperCase() || '?'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-soren-text truncate">{t.client}</div>
                      <div className="text-[10.5px] text-soren-subtle truncate">{t.label}{t.date ? ` · ${new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-bold tabular-nums" style={{ color: t.type === 'refund' ? '#F43F5E' : (t.status === 'encaissé' ? '#10B981' : '#374151') }}>{t.type === 'refund' ? '−' : ''}{fmt(t.amount)}</div>
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full mt-0.5" style={{ background: `${accent}14`, color: accent }}>{t.type === 'refund' ? 'remboursé' : t.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[480px]">
              <thead>
                <tr>
                  {['CLIENT', 'LIBELLÉ', 'DATE', 'MONTANT', 'STATUT'].map((h, i) => (
                    <th key={i} className={`px-5 py-2.5 text-[9px] font-semibold text-soren-subtle tracking-wider uppercase ${h === 'MONTANT' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => {
                  const accent = t.type === 'refund' ? '#F43F5E' : (t.status === 'encaissé' ? '#10B981' : '#F59E0B')
                  return (
                  <tr key={i} className="group border-t border-soren-border/40 hover:bg-soren-elevated/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: `${accent}1A`, color: accent }}>
                          {t.client?.trim().charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-soren-text truncate">{t.client}</div>
                          {t.company && <div className="text-[10px] text-soren-subtle truncate">{t.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[11px] text-soren-muted">{t.label}</td>
                    <td className="px-5 py-3 text-[11px] text-soren-muted whitespace-nowrap">{t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-5 py-3 text-[12px] font-bold tabular-nums whitespace-nowrap text-right" style={{ color: t.type === 'refund' ? '#F43F5E' : (t.status === 'encaissé' ? '#10B981' : '#374151') }}>
                      {t.type === 'refund' ? '−' : ''}{fmt(t.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${accent}14`, color: accent }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                        {t.type === 'refund' ? 'remboursé' : t.status}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table></div></>
          )}
        </div>
      </div>
    </div>
  )
}

const CARD_VARIANTS = {
  orange: { bg: '#FF4D00', text: '#FFFFFF', label: 'rgba(255,255,255,0.85)', border: '#FF4D00' },
  black:  { bg: '#111111', text: '#FFFFFF', label: 'rgba(255,255,255,0.70)', border: '#111111' },
  white:  { bg: 'var(--bg-card)', text: '#FF4D00', label: 'var(--subtle)',    border: 'var(--border)' },
} as const

function Card({ label, value, variant }: { label: string; value: string; variant: keyof typeof CARD_VARIANTS }) {
  const v = CARD_VARIANTS[variant]
  return (
    <div className="rounded-2xl p-4 border shadow-sm" style={{ background: v.bg, borderColor: v.border }}>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.text }} />
        <span className="text-[11px] font-medium" style={{ color: v.label }}>{label}</span>
      </div>
      <p className="mt-1.5 text-[24px] md:text-[26px] font-black tabular-nums leading-tight" style={{ color: v.text }}>{value}</p>
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
