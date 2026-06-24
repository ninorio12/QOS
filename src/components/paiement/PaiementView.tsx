'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CalendarDays, X, Search, CreditCard, RefreshCw, ArrowDownToLine, Clock, Undo2, Hourglass, AlertCircle, Plus, Landmark, type LucideIcon } from 'lucide-react'
import { DateRangePicker, getPresetRange } from '@/components/shared/DateRangePicker'

const StripeConnectModal = dynamic(() => import('./StripeConnectModal'), { ssr: false })

function fmt(n: number) { return `${Number.isFinite(n) ? Math.round(Math.abs(n)).toLocaleString('fr-FR') : '0'} CHF` }
function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

type Txn = { contactId: string; client: string; company: string; label: string; amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente'; source?: 'stripe' | 'revolut' | 'manual' }
const SRC_META: Record<string, { label: string; color: string }> = {
  stripe: { label: 'Stripe', color: '#635BFF' },
  revolut: { label: 'Revolut Pro', color: '#0A6CFF' },
  manual: { label: 'Virement', color: '#64748B' },
}
function SourceBadge({ source }: { source?: string }) {
  const m = source ? SRC_META[source] : null
  if (!m) return <span className="text-[11px] text-soren-subtle">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${m.color}14`, color: m.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />{m.label}
    </span>
  )
}
type Conv = { clients: number; total: number; pct: number }
type Overview = {
  encaisse: number; attente: number; rembourse: number; net: number; transactions: Txn[]
  pending: number; failed: number; disputes: number
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
  const [connectOpen, setConnectOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const stripeConn = useQuery(api.stripe.connectionStatus)
  const isAdmin = useQuery(api.users.me)?.isAdmin ?? false
  const syncStripe = useAction(api.stripeSync.syncStripe)
  const disconnectStripe = useMutation(api.stripe.disconnect)
  const revolutStatus = useQuery(api.externalPayments.revolutStatus)
  const createManual = useMutation(api.externalPayments.createManual)
  const [manualOpen, setManualOpen] = useState(false)
  const [connectRevolutOpen, setConnectRevolutOpen] = useState(false)
  const runSync = async () => {
    setSyncing(true); setSyncErr(null)
    try {
      const r = await syncStripe({})
      if (!r.ok) { setSyncErr(r.error ?? 'Erreur de synchronisation'); if (r.error?.toLowerCase().includes('connect')) setConnectOpen(true) }
    } catch (e) { setSyncErr(e instanceof Error ? e.message : 'Erreur de synchronisation') }
    finally { setSyncing(false) }
  }
  const tzOffset = new Date().getTimezoneOffset()
  const data = useQuery(api.paiement.overview, { from: range.from, to: range.to, tzOffset }) as Overview | undefined
  const ov = data ?? { encaisse: 0, attente: 0, rembourse: 0, net: 0, pending: 0, failed: 0, disputes: 0, transactions: [], clientsCount: 0, caTotal: 0, leadsCount: 0, conversions: { global: { clients: 0, total: 0, pct: 0 }, inbound: { clients: 0, total: 0, pct: 0 }, outbound: { clients: 0, total: 0, pct: 0 } } }

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
  // À collecter par contact : calculé sur TOUTES les transactions (les "attente" ont date='' → exclues du filtre date de txns).
  const filtAttente = filterContact ? ov.transactions.filter(t => t.contactId === filterContact && t.type === 'payment' && t.status === 'attente').reduce((s, t) => s + t.amount, 0) : ov.attente

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
          {/* Connexion Stripe (comme Meta) */}
          {stripeConn === undefined ? null : stripeConn.connected ? (
            <button
              onClick={isAdmin ? () => { if (confirm('Déconnecter Stripe ?')) disconnectStripe({}) } : undefined}
              title={isAdmin ? `${stripeConn.accountName ?? 'Compte Stripe'}${stripeConn.livemode === false ? ' · test' : ''} — cliquer pour déconnecter` : 'Compte société (géré par un admin)'}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-full transition-colors ${isAdmin ? 'hover:border-emerald-500/50' : 'cursor-default'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Stripe connecté
            </button>
          ) : isAdmin ? (
            <button
              onClick={() => setConnectOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-accent bg-soren-accent/10 border border-soren-accent/25 px-2.5 py-1.5 rounded-full hover:bg-soren-accent/15 transition-colors"
            >
              <CreditCard size={13} />Connecter Stripe
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border px-2.5 py-1.5 rounded-full cursor-default" title="Compte société — connexion réservée à un admin">
              <CreditCard size={13} />Stripe non connecté
            </span>
          )}
          {stripeConn?.connected && isAdmin && (
            <button onClick={runSync} disabled={syncing} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border rounded-full px-2.5 py-1.5 hover:text-soren-text transition-colors disabled:opacity-60">
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Sync…' : 'Sync Stripe'}
            </button>
          )}
          {/* Connexion Revolut Pro (virements reçus hors Stripe) */}
          {revolutStatus?.connected ? (
            <span title={`${revolutStatus.count} virement(s) Revolut importé(s)`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full" style={{ color: '#0A6CFF', background: '#0A6CFF14', border: '1px solid #0A6CFF40' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0A6CFF' }} />Revolut connecté
            </span>
          ) : (
            <button onClick={() => setConnectRevolutOpen(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full" style={{ color: '#0A6CFF', background: '#0A6CFF10', border: '1px solid #0A6CFF40' }}>
              <Landmark size={13} />Connecter Revolut
            </button>
          )}
          <button onClick={() => setManualOpen(true)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white rounded-full px-2.5 py-1.5 transition-opacity hover:opacity-90" style={{ background: '#FF4D00' }}>
            <Plus size={13} />Ajouter un virement
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 md:min-w-[200px] max-w-md bg-soren-card border border-soren-border rounded-full px-3.5 py-2">
          <Search size={13} className="text-soren-subtle flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…"
            className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
        </div>
      </div>

      {syncErr && (
        <div className="mx-6 mb-2 flex items-center gap-2 text-[12px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-none" />Échec de la synchronisation Stripe : {syncErr}
        </div>
      )}

      {/* KPI cards */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-3 gap-3 flex-shrink-0">
        <Card label="Encaissé" value={fmt(filtEncaisse)} variant="green" icon={ArrowDownToLine} />
        <Card label="À collecter" value={fmt(filtAttente)} variant="slate" icon={Clock} />
        <Card label="Remboursé" value={fmt(ov.rembourse)} variant="amber" icon={Undo2} />
      </div>

      {/* États spéciaux des paiements */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0 mt-3">
        <Card label="En cours de paiement" value={fmt(ov.pending)} variant="blue" icon={Hourglass} />
        <Card label="Paiements échoués" value={fmt(ov.failed)} variant="red" icon={AlertCircle} />
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
                  <div key={`${t.contactId}-${t.date}-${t.label}-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: `${accent}1A`, color: accent }}>{t.client?.trim().charAt(0).toUpperCase() || '?'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-soren-text truncate">{t.client}</div>
                      <div className="text-[10.5px] text-soren-subtle truncate">{t.label}{t.date ? ` · ${new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</div>
                      {t.source && <div className="mt-1"><SourceBadge source={t.source} /></div>}
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
                  {['CLIENT', 'LIBELLÉ', 'DATE', 'MONTANT', 'SOURCE', 'STATUT'].map(h => (
                    <th key={h} className={`px-5 py-2.5 text-[9px] font-semibold text-soren-subtle tracking-wider uppercase ${h === 'MONTANT' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => {
                  const accent = t.type === 'refund' ? '#F43F5E' : (t.status === 'encaissé' ? '#10B981' : '#F59E0B')
                  return (
                  <tr key={`${t.contactId}-${t.date}-${t.label}-${i}`} className="group border-t border-soren-border/40 hover:bg-soren-elevated/40 transition-colors">
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
                    <td className="px-5 py-3"><SourceBadge source={t.source} /></td>
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
      {connectOpen && <StripeConnectModal onClose={() => setConnectOpen(false)} />}
      {manualOpen && <ManualPaymentModal onClose={() => setManualOpen(false)} onSave={async (p) => { await createManual(p); setManualOpen(false) }} />}
      {connectRevolutOpen && <RevolutConnectModal onClose={() => setConnectRevolutOpen(false)} />}
    </div>
  )
}

const CARD_VARIANTS = {
  green: { accent: '#10B981', hero: false },
  slate: { accent: '#64748B', hero: false },
  amber: { accent: '#F59E0B', hero: false },
  hero:  { accent: '#FF4D00', hero: true },
  blue:  { accent: '#2563EB', hero: false },
  red:   { accent: '#EF4444', hero: false },
} as const

function Card({ label, value, variant, icon: Icon, hint }: { label: string; value: string; variant: keyof typeof CARD_VARIANTS; icon: LucideIcon; hint?: string }) {
  const v = CARD_VARIANTS[variant]
  const isChf = value.endsWith(' CHF')
  const num = isChf ? value.slice(0, -4) : value
  if (v.hero) {
    return (
      <div className="group relative overflow-hidden rounded-xl px-3.5 py-3 shadow-sm transition-all hover:shadow-md"
        style={{ background: 'linear-gradient(135deg, #FF4D00 0%, #FF6A1F 100%)' }}>
        <div className="absolute -right-3 -bottom-3 opacity-10" style={{ color: '#FFFFFF' }}><Icon size={56} strokeWidth={1.5} /></div>
        <div className="relative flex items-center gap-1.5">
          <Icon size={13} strokeWidth={2.2} style={{ color: 'rgba(255,255,255,0.9)' }} />
          <span className="text-[10.5px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.88)' }}>{label}</span>
        </div>
        <p className="relative mt-1 flex items-baseline gap-1">
          <span className="text-[16px] md:text-[17px] font-semibold tabular-nums tracking-tight leading-tight" style={{ color: '#FFFFFF' }}>{num}</span>
          {isChf && <span className="text-[11px] font-semibold leading-none" style={{ color: 'rgba(255,255,255,0.7)' }}>CHF</span>}
        </p>
        {hint && <p className="relative mt-1 text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.78)' }}>{hint}</p>}
      </div>
    )
  }
  return (
    <div className="group rounded-xl px-3.5 py-3 bg-soren-card border border-soren-border shadow-sm transition-all hover:shadow-md hover:border-soren-border/80">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0" style={{ background: `${v.accent}14`, color: v.accent }}><Icon size={12} strokeWidth={2.4} /></span>
        <span className="text-[10.5px] font-medium tracking-wide text-soren-subtle">{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[16px] md:text-[17px] font-semibold tabular-nums tracking-tight leading-tight text-soren-text">{num}</span>
        {isChf && <span className="text-[11px] font-semibold text-soren-muted leading-none">CHF</span>}
      </p>
      {hint && <p className="mt-1 text-[10px] leading-snug text-soren-subtle">{hint}</p>}
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

type ManualPayload = { amount: number; currency?: string; counterparty?: string; reference?: string; date?: string; method?: string; note?: string }
function ManualPaymentModal({ onClose, onSave }: { onClose: () => void; onSave: (p: ManualPayload) => Promise<void> }) {
  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [method, setMethod] = useState('revolut')
  const [date, setDate] = useState(localDate(new Date()))
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const valid = parseFloat(amount) > 0 && counterparty.trim().length > 0
  const save = async () => {
    if (!valid) return
    setSaving(true)
    try { await onSave({ amount: parseFloat(amount), counterparty: counterparty.trim(), method, date, reference: reference.trim() || undefined }) }
    finally { setSaving(false) }
  }
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-soren-card border border-soren-border rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-soren-text">Ajouter un virement reçu</h3>
          <button onClick={onClose} className="text-soren-subtle hover:text-soren-text"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-soren-muted">Client (émetteur)</label>
            <input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Nom du client" autoFocus
              className="mt-1 w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[13px] text-soren-text outline-none focus:border-soren-text/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-soren-muted">Montant (CHF)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="0"
                className="mt-1 w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[13px] text-soren-text outline-none focus:border-soren-text/30" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-soren-muted">Date</label>
              <input value={date} onChange={e => setDate(e.target.value)} type="date"
                className="mt-1 w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[13px] text-soren-text outline-none focus:border-soren-text/30" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-soren-muted">Source</label>
            <div className="mt-1 flex gap-2">
              {[['revolut', 'Revolut Pro'], ['virement', 'Virement'], ['manual', 'Autre']].map(([v, lbl]) => (
                <button key={v} onClick={() => setMethod(v)} className={`flex-1 text-[12px] font-semibold px-2 py-2 rounded-lg border transition-colors ${method === v ? 'border-soren-text/40 text-soren-text bg-soren-elevated' : 'border-soren-border text-soren-muted'}`}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-soren-muted">Référence (optionnel)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Libellé / facture"
              className="mt-1 w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[13px] text-soren-text outline-none focus:border-soren-text/30" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="text-[12px] font-semibold text-soren-muted px-3 py-2 rounded-lg hover:text-soren-text">Annuler</button>
          <button onClick={save} disabled={!valid || saving} className="text-[12px] font-bold text-white px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: '#FF4D00' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function RevolutConnectModal({ onClose }: { onClose: () => void }) {
  const webhookUrl = 'https://data-os.vividflow.co/api/webhooks/revolut'
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-soren-card border border-soren-border rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-soren-text flex items-center gap-2"><Landmark size={16} style={{ color: '#0A6CFF' }} />Connecter Revolut Pro</h3>
          <button onClick={onClose} className="text-soren-subtle hover:text-soren-text"><X size={16} /></button>
        </div>
        <p className="text-[12px] text-soren-muted mb-3">Les virements reçus de tes clients remonteront automatiquement (comme Stripe). On ne lit que les paiements entrants, rien de confidentiel.</p>
        <ol className="text-[12px] text-soren-text space-y-2 list-decimal list-inside">
          <li>Revolut Business → <b>Settings → API</b> → crée un certificat API (clé + Client ID).</li>
          <li>Crée un <b>webhook</b> (event <code className="text-[11px] bg-soren-elevated px-1 rounded">TransactionCreated</code>) pointant vers :</li>
        </ol>
        <div className="my-2 flex items-center gap-2 bg-soren-elevated border border-soren-border rounded-lg px-3 py-2">
          <code className="text-[11px] text-soren-text flex-1 truncate">{webhookUrl}</code>
          <button onClick={() => navigator.clipboard?.writeText(webhookUrl)} className="text-[10px] font-semibold text-soren-accent">Copier</button>
        </div>
        <p className="text-[11px] text-soren-subtle">Envoie-moi le Client ID + le token API Revolut (et le secret de signature du webhook) et je finalise la connexion. En attendant, tu peux saisir les virements à la main via « Ajouter un virement ».</p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="text-[12px] font-bold text-white px-4 py-2 rounded-lg" style={{ background: '#0A6CFF' }}>Compris</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
