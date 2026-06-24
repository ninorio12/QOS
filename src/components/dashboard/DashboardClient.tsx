'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Users, CalendarDays,
  ArrowUpRight, X,
  Wallet,
  Clock, UserPlus, CalendarCheck,
} from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import MetaLogo from '@/components/media-buyer/MetaLogo'
const ClientTimelineChart   = dynamic(() => import('./ClientTimelineChart'),   { ssr: false })
import type { WeeklyDay, MonthlyPoint, ClientTimelinePoint, MetierBreakdown, Payment } from '@/lib/dashboard'
import { Modal } from '@/components/ui/Modal'
import ConversionRates from '@/components/analyse/ConversionRates'
import { PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MotionFade } from '@/components/ui/Motion'

const NewLeadWidget  = dynamic(() => import('@/components/shared/NewLeadWidget'),        { ssr: false })
const RollingNumber  = dynamic(() => import('@/components/dashboard/RollingNumber'),     { ssr: false })


// ─── Types ────────────────────────────────────────────────────
interface StageBreakdown {
  label: string
  count: number
  value: number
  color: string
  pct: number
}

interface RecentOpp {
  id: string
  contactName: string
  value: number
  stage: string
  tag: string
  date: string
  color: string
  textColor: string
}

interface DashboardProps {
  // New Convex-based props
  clientsCount:       number
  caEncaisse:         number
  caACollecter:       number
  leadsCount:         number
  r1Count:            number
  r2Count:            number
  metiersCount:       number
  nichesCount:        number
  clientTimeline:     { date: string; value: number; ca: number }[]
  metierBreakdown:    { label: string; niche: string; count: number; pct: number; color: string; contacts: { name: string; company: string }[] }[]
  nicheBreakdown:     { niche: string; metiers: { metier: string; count: number; contacts: { name: string; company: string }[] }[] }[]
  recentLeads:        { id: string; name: string; stageId: string; createdAt: string; value: number; source: string | null }[]
  totalContactsCount: number
  rangeFrom:          string
  rangeTo:            string
  onRangeChange:      (from: string, to: string) => void
  // Legacy props (unused, kept for compat)
  activeLeads?:      number
  pipelineValue?:    number
  wonLeads?:         number
  totalLeads?:       number
  stageBreakdown?:   StageBreakdown[]
  recentOpps?:       RecentOpp[]
  weeklyBreakdown?:  WeeklyDay[]
  monthlyPipeline?:  MonthlyPoint[]
  payments?:         Payment[]
  wonCA?:            number
}

// ─── Helpers ──────────────────────────────────────────────────
function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M CHF`
  return `${Math.round(value).toLocaleString('fr-FR')} CHF`
}


// ─── Main export ──────────────────────────────────────────────
export default function DashboardClient({
  clientsCount = 0, caEncaisse = 0, caACollecter = 0, leadsCount = 0, r1Count = 0, r2Count = 0,
  metiersCount = 0, nichesCount = 0,
  clientTimeline = [], metierBreakdown = [], nicheBreakdown = [], recentLeads = [],
  totalContactsCount = 0, rangeFrom, rangeTo, onRangeChange,
}: DashboardProps) {
  const payTzOffset = useMemo(() => new Date().getTimezoneOffset(), [])
  const payOverview = useQuery(api.paiement.overview, { from: rangeFrom, to: rangeTo, tzOffset: payTzOffset }) as { encaisse: number; attente: number; transactions: { client: string; company: string; label: string; amount: number; date: string; type: string; status: string }[] } | undefined
  const metaSummary = useQuery(api.mediaBuyer.summary, { from: rangeFrom, to: rangeTo }) as { connected: boolean; currency: string; lastSyncAt: string | null; spend: number; leads: number; cpl: number } | undefined
  const [showMetierModal, setShowMetierModal] = useState(false)
  const [calendarOpen,    setCalendarOpen]    = useState(false)
  const [activeRange,     setActiveRange]     = useState<{ start: Date; end: Date; label: string } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const MONTH_LABEL = activeRange?.label ?? '30 derniers jours'   // libellé du calendrier du graphe (local au graphe)

  // clientTimeline already filtered by period from API

  return (
    <>
      {/* ── Title ── */}
      <div className="flex items-center justify-end mb-3 flex-shrink-0 gap-2">
        <div className="flex-shrink-0"><NewLeadWidget compact label="Nouveau contact" /></div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <MotionFade
        delay={0}
        className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3"
      >
        {[
          { label: 'Clients',        value: String(clientsCount), sub: 'à ce jour',          Icon: Users,         color: '#3462EE', href: '/contacts?statut=client' },
          { label: 'Encaissé',       value: fmt(caEncaisse),      sub: 'à ce jour',          Icon: Wallet,        color: '#16A34A', href: '/paiement' },
          { label: 'À collecter',    value: fmt(caACollecter),    sub: 'à ce jour',          Icon: Clock,         color: '#D97706', href: '/paiement' },
          { label: 'Leads',          value: String(leadsCount),   sub: 'à ce jour',          Icon: UserPlus,      color: '#0EA5E9', href: '/contacts?statut=lead' },
          { label: 'En R1',          value: String(r1Count),      sub: 'à ce jour',   Icon: CalendarCheck, color: '#FF4D00', href: '/pipeline?col=r1' },
          { label: 'En R2',          value: String(r2Count),      sub: 'à ce jour',   Icon: CalendarDays,  color: '#8B5CF6', href: '/pipeline?col=r2' },
        ].map(({ label, value, Icon, color, href }) => {
          const isChf = value.endsWith(' CHF')
          const num   = isChf ? value.slice(0, -4) : value
          const cls = "bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60"
          const inner = (
            <>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={13} /></span>
                <span className="text-[10px] font-medium text-soren-muted leading-none truncate">{label}</span>
              </span>
              {href && <ArrowUpRight size={14} className="text-soren-subtle group-hover:text-[#FF4D00] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />}
            </div>
            <div className="flex items-baseline gap-1">
              <RollingNumber value={num} className="text-[16px] md:text-[18px] font-bold text-soren-text leading-none tabular-nums" />
              {isChf && <span className="text-[11px] font-semibold text-soren-muted leading-none">CHF</span>}
            </div>
            </>
          )
          return href
            ? <Link key={label} href={href} className={`${cls} hover:shadow-md hover:border-soren-border transition-all group`}>{inner}</Link>
            : <div key={label} className={cls}>{inner}</div>
        })}
      </MotionFade>

      {/* ── Taux de conversion (globale / inbound / outbound) ── */}
      <MotionFade delay={0.05} className="mt-3 md:mt-4">
        <ConversionRates showHeader={false} variant="plain" from={rangeFrom} to={rangeTo} />
      </MotionFade>

      {/* ── Acquisition Meta Ads ── */}
      <MotionFade delay={0.07} className="mt-3 md:mt-4">
        <Link href="/media-buyer" className="group block bg-soren-card rounded-2xl md:rounded-3xl shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-soren-elevated grid place-items-center flex-none"><MetaLogo size={18} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-jakarta text-[13px] font-semibold text-soren-text">Meta Ads</span>
                  {metaSummary?.connected
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Connecté</span>
                    : <span className="text-[10px] font-semibold text-soren-accent bg-soren-accent/10 px-2 py-0.5 rounded-full">À connecter</span>}
                </div>
                <p className="text-[10px] text-soren-subtle mt-0.5">Acquisition publicitaire · depuis le début</p>
              </div>
            </div>
            <ArrowUpRight size={14} className="text-soren-subtle group-hover:text-[#FF4D00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Dépense', value: metaSummary ? `${metaSummary.spend.toLocaleString('fr-CH')}` : '—', unit: metaSummary?.currency ?? 'CHF', color: '#16A34A' },
              { label: 'Leads',   value: metaSummary ? metaSummary.leads.toLocaleString('fr-CH') : '—', unit: '', color: '#3462EE' },
              { label: 'CPL',     value: metaSummary ? metaSummary.cpl.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—', unit: metaSummary?.currency ?? 'CHF', color: '#FF4D00' },
            ].map(s => (
              <div key={s.label} className="bg-soren-elevated/50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] font-medium text-soren-muted leading-none" style={{ color: s.color }}>{s.label}</div>
                <div className="text-[16px] md:text-[18px] font-bold text-soren-text leading-none tabular-nums mt-1.5">
                  {s.value}{s.unit && <span className="text-[11px] font-semibold text-soren-muted ml-1">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </Link>
      </MotionFade>

      {/* ── Clients sur la période + Métiers clients ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">

        {/* Clients sur la période */}
        <MotionFade
          delay={0.1}
          className="md:col-span-2 bg-soren-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
            <div>
              <span className="font-jakarta text-[13px] font-semibold text-soren-text">Encaissement et Clients</span>
              <p className="font-jakarta text-[10px] font-normal text-soren-subtle mt-0.5">{MONTH_LABEL}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-medium text-soren-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF4D00]" />Encaissé</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3462EE]" />Clients</span>
              </div>
              <div className="relative" ref={calendarRef}>
                <button onClick={() => setCalendarOpen(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${calendarOpen ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-text'}`}>
                  <CalendarDays size={13} /><span>Période</span>
                </button>
                {calendarOpen && (
                  <DateRangePicker
                    align="right"
                    onClose={() => setCalendarOpen(false)}
                    onApply={(start, end, label) => {
                      setActiveRange({ start, end, label })
                      setCalendarOpen(false)
                      const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                      onRangeChange(localDate(start), localDate(end))
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="h-[180px] md:h-[200px] px-2 pb-4">
            <ClientTimelineChart data={clientTimeline} />
          </div>
        </MotionFade>

        {/* Métiers clients */}
        <MotionFade
          delay={0.14}
          className="bg-soren-card rounded-2xl md:rounded-3xl p-5 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
        >
          <button className="flex items-center justify-between w-full group" onClick={() => setShowMetierModal(true)}>
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Métiers clients</span>
            <ArrowUpRight size={14} className="text-soren-subtle group-hover:text-[#FF4D00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
          {metierBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-soren-subtle">Aucune donnée</div>
          ) : (
            <>
              <div className="relative h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metierBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={54}
                      strokeWidth={0}
                    >
                      {metierBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <PieTooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, padding: '6px 10px' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[18px] font-bold text-soren-text">{metiersCount}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {metierBreakdown.slice(0, 4).map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    <span className="text-[11px] text-soren-muted flex-1 truncate">{m.label}</span>
                    <span className="text-[11px] font-semibold text-soren-text">{m.count}</span>
                    <span className="text-[10px] text-soren-subtle w-9 text-right">{m.pct}%</span>
                  </div>
                ))}
                {metierBreakdown.length > 4 && (
                  <button
                    onClick={() => setShowMetierModal(true)}
                    className="mt-0.5 self-start text-[11px] font-semibold text-[#FF4D00] hover:underline"
                  >
                    + {metierBreakdown.length - 4} autres — voir tout
                  </button>
                )}
              </div>
            </>
          )}
        </MotionFade>
      </div>

      {/* ── Paiements encaissés ── */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 mt-3 md:mt-4">

        {/* Paiements encaissés — pleine largeur */}
        <MotionFade
          delay={0.18}
          className="bg-soren-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
        >
          <Link href="/paiement" className="flex items-center justify-between px-5 py-3 border-b border-soren-border/60 flex-shrink-0 group">
            <span className="font-jakarta text-[12px] font-semibold text-soren-text">Paiements encaissés</span>
            <ArrowUpRight size={14} className="text-soren-subtle group-hover:text-[#FF4D00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>
          <div className="overflow-x-auto">
            {(payOverview?.transactions ?? []).length === 0 ? (
              <div className="px-5 py-6 text-center text-[11px] text-soren-subtle">Aucun paiement encore</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-soren-border/60">
                    {['DATE', 'CLIENT', 'ENTREPRISE', 'MONTANT', 'STATUT'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold text-soren-subtle tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(payOverview?.transactions ?? []).slice(0, 6).map((t, i) => (
                    <tr key={i} className="border-b border-soren-border/40 hover:bg-soren-elevated/50 transition-colors">
                      <td className="px-4 py-2 text-[11px] text-soren-muted whitespace-nowrap">{t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="px-4 py-2 text-[11px] font-medium text-soren-text whitespace-nowrap">{t.client}</td>
                      <td className="px-4 py-2 text-[11px] text-soren-muted whitespace-nowrap truncate max-w-[120px]">{t.company || '—'}</td>
                      <td className="px-4 py-2 text-[12px] font-bold tabular-nums whitespace-nowrap" style={{ color: t.type === 'refund' ? '#DC2626' : t.status === 'encaissé' ? '#059669' : '#374151' }}>{t.type === 'refund' ? '−' : ''}{fmt(Math.abs(t.amount))}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${t.type === 'refund' ? 'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-500/15 dark:text-rose-400' : t.status === 'encaissé' ? 'bg-[#F0FDF9] text-[#059669] dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-[#FFFBEB] text-[#D97706] dark:bg-amber-500/15 dark:text-amber-400'}`}>{t.type === 'refund' ? 'remboursé' : t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </MotionFade>
      </div>

      {/* ── Métier Detail Modal ──────────────────────────────── */}
      {showMetierModal && (
        <Modal onClose={() => setShowMetierModal(false)}>
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-soren-text">Métiers clients</h2>
                <p className="text-xs text-soren-subtle mt-0.5">Répartition par niche et métier · {nichesCount} niche{nichesCount !== 1 ? 's' : ''} · {metiersCount} métier{metiersCount !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowMetierModal(false)} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
                <X size={14} className="text-soren-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {nicheBreakdown.length === 0 ? (
                <div className="text-center py-8 text-sm text-soren-subtle">
                  Aucun client avec métier/niche renseigné.<br />
                  <span className="text-xs">Complète les fiches contacts.</span>
                </div>
              ) : nicheBreakdown.map(({ niche, metiers }) => (
                <div key={niche} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-soren-subtle">{niche}</span>
                    <div className="flex-1 h-px bg-soren-border" />
                  </div>
                  {metiers.map(({ metier, count, contacts }) => (
                    <div key={metier} className="bg-soren-elevated rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-normal text-soren-text">{metier}</span>
                        <span className="text-[11px] font-bold bg-[#FF4D00]/10 text-[#FF4D00] px-2 py-0.5 rounded-full">{count} client{count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contacts.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-soren-card border border-soren-border rounded-full px-2.5 py-1">
                            <span className="text-[11px] font-semibold text-soren-text">{c.name}</span>
                            {c.company && <span className="text-[10px] text-soren-subtle">· {c.company}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
