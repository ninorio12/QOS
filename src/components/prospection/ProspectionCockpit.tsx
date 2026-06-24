'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Modal } from '@/components/ui/Modal'
import {
  Target, Calendar, Eye, DollarSign, TrendingUp, Users, CalendarCheck,
  Phone, Trophy, Banknote, BarChart3, Megaphone, PhoneCall, Handshake, Sparkles,
  ArrowUpRight, X, Mail,
} from 'lucide-react'

// ── Période ───────────────────────────────────────────────────────────────
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// 3 périodes fixes (plus de calendrier libre). « Depuis le début » = tous les contacts jamais acquis,
// pour réconcilier le total de leads avec la pipeline actuelle (les convertis/perdus ont quitté la pipeline).
type Preset = '7j' | '30j' | 'all'
const PERIODS: { key: Preset; label: string }[] = [
  { key: '7j',  label: '7 jours' },
  { key: '30j', label: '30 jours' },
  { key: 'all', label: 'Tout' },
]
function rangeForPreset(p: Preset) {
  const to = new Date()
  if (p === 'all') return { from: '2000-01-01', to: isoDay(to) }
  const from = new Date(); from.setDate(to.getDate() - (p === '7j' ? 6 : 29))
  return { from: isoDay(from), to: isoDay(to) }
}
const TZ = -new Date().getTimezoneOffset()

// Garde la dernière valeur définie d'une query Convex pendant un refetch (changement de période) :
// évite que les cartes retombent à 0/skeleton (effet « ça saute »). Keep-previous-data.
function useKeep<T>(v: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(v)
  if (v !== undefined) ref.current = v
  return v !== undefined ? v : ref.current
}
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const pct1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

type Tone = 'bon' | 'surveillance' | 'critique'
const DOT: Record<Tone, string> = { bon: '#16A34A', surveillance: '#D97706', critique: '#DC2626' }
type Lucide = React.ElementType

// ── Card KPI (épurée : label + valeur + variant vs objectif, sans icône ni obj orange) ──
function KpiCard({ label, value, suffix, gap, gapOk }: {
  label: string; value: string; suffix?: string; gap?: string; gapOk?: boolean
}) {
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-4 md:p-5 flex flex-col justify-center gap-2 shadow-sm">
      <span className="text-[11px] font-medium text-soren-muted leading-none">{label}</span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[22px] md:text-[26px] font-bold text-soren-text leading-none tabular-nums">{value}{suffix && <span className="text-[13px] text-soren-muted font-semibold ml-0.5">{suffix}</span>}</span>
        {gap && <span className="text-[10.5px] font-semibold leading-none whitespace-nowrap" style={{ color: gapOk ? '#059669' : '#DC2626' }}>{gap}</span>}
      </div>
    </div>
  )
}

function RoleCard({ title, score, rows, onExpand }: { title: string; score?: TeamScore; rows: [string, string, string?][]; onExpand?: () => void }) {
  const tone = score?.tone ?? 'surveillance'
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-soren-text">{title}</p>
          {onExpand && <button onClick={onExpand} aria-label="Voir le détail" className="text-soren-muted hover:text-soren-accent transition-colors"><ArrowUpRight size={14} /></button>}
        </div>
        {score && <ScoreRing score={score.score} color={DOT[tone]} />}
      </div>
      <div className="flex flex-col">
        {rows.map(([k, val, c], i) => (
          <div key={k} className={`flex justify-between py-2 ${i < rows.length - 1 ? 'border-b border-soren-border/60' : ''}`}>
            <span className="text-[12.5px] text-soren-muted">{k}</span>
            <span className="text-[13px] font-semibold tabular-nums" style={c ? { color: c } : { color: 'var(--text)' }}>{val}</span>
          </div>
        ))}
      </div>
      {score && (
        <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-soren-border/60">
          <Sparkles size={12} className="flex-shrink-0 mt-0.5" style={{ color: DOT[tone] }} />
          <p className="text-[10.5px] leading-relaxed text-soren-muted">{score.diagnostic}</p>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function ProspectionCockpit() {
  const [preset, setPreset] = useState<Preset>('30j')
  const range = rangeForPreset(preset)
  const qa = { from: range.from, to: range.to, tzOffset: TZ }

  const funnelRaw = useQuery(api.performance.funnel, qa) as Funnel | undefined
  const funnel  = useKeep(funnelRaw)
  const summary = useKeep(useQuery(api.performance.summary, qa) as Summary | undefined)
  const media   = useKeep(useQuery(api.mediaBuyer.dashboard, { from: range.from, to: range.to, level: 'adset' }) as Media | undefined)
  const pay     = useKeep(useQuery(api.paiement.overview, { from: range.from, to: range.to, tzOffset: TZ }) as Pay | undefined)
  const obj     = useQuery(api.prospectionObjectives.get) as Obj | undefined
  const scorecards = useKeep(useQuery(api.prospectionCockpit.teamScorecards, qa) as Scorecards | undefined)
  const outbound = useKeep(useQuery(api.outboundEmailing.summary, qa) as OutboundSum | undefined)
  // En cours de rechargement (on a déjà d'anciennes données) → léger fondu, pas de saut.
  const refreshing = funnelRaw === undefined && funnel !== undefined
  const outboundList = useQuery(api.outboundLeads.list, {}) as OutboundLead[] | undefined
  const setObj  = useMutation(api.prospectionObjectives.set)

  const [objOpen, setObjOpen] = useState(false)
  const [objScope, setObjScope] = useState<'commerciale' | 'globale' | 'all'>('all')
  const [repliesOpen, setRepliesOpen] = useState(false)

  // Coût du module Budget (abonnements + usage) sur la période → entre dans le ROI (déf. Thomas 2026-06-21)
  const [budgetCost, setBudgetCost] = useState(0)
  useEffect(() => {
    let alive = true
    fetch(`/api/budget?from=${range.from}&to=${range.to}`).then(r => r.json())
      .then(d => { if (alive) setBudgetCost(typeof d?.total === 'number' ? d.total : 0) })
      .catch(() => { if (alive) setBudgetCost(0) })
    return () => { alive = false }
  }, [range.from, range.to])

  // ── Dérivations ──
  const spend = media?.kpis?.spend?.value ?? 0
  const ca    = pay?.encaisse ?? 0   // CA = encaissé (décision Thomas 2026-06-21), source unique = paiement.overview
  // ROI = CA encaissé ÷ (dépense pub Meta + coûts du module Budget). null si aucun coût → affiché "—".
  const coutTotal = spend + budgetCost
  const roi: number | null = coutTotal > 0 ? ca / coutTotal : null
  const roiStr = roi === null ? '—' : `×${fmt(roi)}`
  const roiOk = roi !== null && roi >= (obj?.roi ?? 5)
  const o = obj ?? { leadsR1: 30, tauxShow: 75, tauxClose: 30, ca: 30000, roi: 5, ventes: 30, cashContracte: 30000, panierMoyen: 2000 }
  const f = funnel ?? { leadsATraiter: 0, leadsTotal: 0, leadsInbound: 0, leadsOutbound: 0, r1Booked: 0, noShows: 0, shows: 0, ventes: 0, tauxLeadsR1: 0, tauxShow: 0, tauxClose: 0 }
  // Clients payants DE LA PÉRIODE (un contact ayant au moins une transaction encaissée sur la fenêtre).
  const payingClients = pay ? new Set((pay.transactions ?? []).filter(t => t.type === 'payment' && t.status === 'encaissé' && t.contactId).map(t => t.contactId)).size : 0
  // Panier moyen = encaissé période ÷ clients payants période (numérateur et dénominateur sur la même fenêtre).
  const panier = payingClients > 0 ? ca / payingClients : 0
  const ptsGap = (val: number, target: number) => `${val >= target ? '▲' : '▼'} ${pct1(Math.abs(val - target))}%`
  const pctGap = (val: number, target: number) => `${val >= target ? '▲' : '▼'} ${target > 0 ? Math.round(val / target * 100) : 0}%`
  const stepColor = (val: number, target: number) => val >= target ? '#16A34A' : val >= target * 0.8 ? '#D97706' : '#DC2626'
  // « Leads » (haut du funnel) = TOUS les leads actifs du Data OS, tous canaux (inbound + outbound). (déf. Thomas 2026-06-22)
  // 100% Data OS : on ne compte JAMAIS une source externe (Meta) ni un Google Sheet — uniquement crm_leads.
  const leadsATraiterTotal = f.leadsTotal ?? 0
  const tauxLeadsR1Total = leadsATraiterTotal > 0 ? Math.round((f.r1Booked / leadsATraiterTotal) * 1000) / 10 : 0

  return (
    <div className="flex-1 overflow-y-auto bg-soren-app px-6 py-6">
      <div className="max-w-[1180px] mx-auto">

        {/* ===== Performance (fusionné) ===== */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
          <h2 className="text-[15px] font-bold tracking-tight text-soren-text">Performance Équipe</h2>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-full p-0.5">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPreset(p.key)}
                  className={`text-[11.5px] font-semibold px-3 py-1 rounded-full transition-colors ${preset === p.key ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setObjScope('all'); setObjOpen(true) }} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-[#FF4D00] px-3 py-1.5 rounded-full shadow-sm"><Target size={12} /> Objectif</button>
          </div>
        </div>

        {/* Ligne 1 : Funnel (grand) + 6 cards 2×2 */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="lg:col-span-7 bg-soren-card border border-soren-border/60 rounded-2xl p-5 shadow-sm flex flex-col">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-4">Funnel de conversion</h3>
            <div className="flex flex-col items-center gap-0 flex-1 justify-center">
              <FunnelStep Icon={Users} label="Leads" val={leadsATraiterTotal} w={100} color="#6B7280"
                subTitle="Contacts acquis sur la période (Data OS uniquement, ni Meta ni Google Sheet)."
                sub={<>Inbound <span className="font-semibold text-soren-muted">{f.leadsInbound}</span> · Outbound <span className="font-semibold text-soren-muted">{f.leadsOutbound}</span></>} />
              <div className="h-1.5" />
              <FunnelConv pct={tauxLeadsR1Total} note="Leads → R1" ok={tauxLeadsR1Total >= o.leadsR1} />
              <FunnelStep Icon={CalendarCheck} label="R1 bookés" val={f.r1Booked} w={76} color={stepColor(tauxLeadsR1Total, o.leadsR1)} />
              <FunnelConv pct={f.tauxShow} note="Taux de show" ok={f.tauxShow >= o.tauxShow} />
              <FunnelStep Icon={Phone} label="Shows" val={f.shows} w={56} color={stepColor(f.tauxShow, o.tauxShow)} />
              <FunnelConv pct={f.tauxClose} note="Taux de closing" ok={f.tauxClose >= o.tauxClose} />
              <FunnelStep Icon={Trophy} label="Ventes" val={f.ventes} w={42} color={stepColor(f.tauxClose, o.tauxClose)} />
              <div className="mt-3 text-center text-[11px] text-soren-subtle">Résultat · <span className="font-bold text-soren-text">{fmt(ca)} CHF CA</span> · ROI <span className="font-bold" style={{ color: '#16A34A' }}>{roiStr}</span></div>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 grid-rows-3 gap-3">
            <KpiCard label="Leads → R1" value={pct1(tauxLeadsR1Total)} suffix="%" gap={ptsGap(tauxLeadsR1Total, o.leadsR1)} gapOk={tauxLeadsR1Total >= o.leadsR1} />
            <KpiCard label="Taux de show" value={pct1(f.tauxShow)} suffix="%" gap={ptsGap(f.tauxShow, o.tauxShow)} gapOk={f.tauxShow >= o.tauxShow} />
            <KpiCard label="Taux de closing" value={pct1(f.tauxClose)} suffix="%" gap={ptsGap(f.tauxClose, o.tauxClose)} gapOk={f.tauxClose >= o.tauxClose} />
            <KpiCard label="Encaissé" value={fmt(ca)} suffix="CHF" gap={pctGap(ca, o.ca)} gapOk={ca >= o.ca} />
            <KpiCard label="ROI" value={roiStr} gap={roiOk ? '▲' : '▼'} gapOk={roiOk} />
            <KpiCard label="Panier moyen" value={fmt(panier)} suffix="CHF" gap={pctGap(panier, o.panierMoyen)} gapOk={panier >= o.panierMoyen} />
          </div>
        </div>

        {/* Ligne 2 : métiers (anneau de score + diagnostic) */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <RoleCard title="Media Buying" score={scorecards?.publicite} rows={[
            ['Dépenses totales', `${fmt(spend)} CHF`],
            ['Impressions', fmt(media?.kpis?.impressions?.value ?? 0)],
            ['Clics', fmt(media?.kpis?.clicks?.value ?? 0)],
            ['Leads générés', fmt(media?.kpis?.leads?.value ?? 0)],
            ['Coût par lead', `${fmt(media?.kpis?.cpl?.value ?? 0)} CHF`, '#16A34A'],
          ]} />
          <RoleCard title="Setting" score={scorecards?.setters} rows={[
            ['Leads contactés', fmt(summary?.contactes ?? 0)],
            ['Réponses', fmt(summary?.reponses ?? 0)],
            ['Taux de réponse', `${summary?.tauxReponse ?? 0}%`, '#16A34A'],
            ['Calls bookés (R1)', fmt(f.r1Booked)],
            ['Taux Leads→R1', `${pct1(tauxLeadsR1Total)}%`, '#16A34A'],
          ]} />
          <RoleCard title="Closing" score={scorecards?.closers} rows={[
            ['Appels prévus', fmt(f.r1Booked)],
            ['Shows', fmt(f.shows), '#D97706'],
            ['No-shows', fmt(f.noShows), '#DC2626'],
            ['Ventes', fmt(f.ventes), '#16A34A'],
            ['Taux de closing', `${pct1(f.tauxClose)}%`, '#16A34A'],
          ]} />
          <RoleCard title="Emailing Outbound" onExpand={() => setRepliesOpen(true)} score={outbound ? { score: outbound.score, tone: outbound.tone, diagnostic: outbound.diagnostic, charge: null, metrics: [] } : undefined} rows={[
            ['Leads sourcés', fmt(outbound?.sourced ?? 0)],
            ['Decks générés', fmt(outbound?.decks ?? 0)],
            ['Emails envoyés', fmt(outbound?.envois ?? 0), '#16A34A'],
            ['Réponses', fmt(outbound?.reponses ?? 0), '#16A34A'],
            ['Taux de réponse', `${outbound?.tauxReponse ?? 0}%`, '#16A34A'],
          ]} />
        </div>


      </div>

      {objOpen && <ObjModal obj={o} scope={objScope} onClose={() => setObjOpen(false)} onSave={async (vals) => { await setObj(vals); setObjOpen(false) }} />}

      {repliesOpen && (
        <Modal onClose={() => setRepliesOpen(false)}>
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-soren-text flex items-center gap-2"><Mail size={16} style={{ color: '#16A34A' }} /> Suivi des réponses outbound</h2>
                <p className="text-xs text-soren-subtle mt-0.5">{outbound?.envois ?? 0} email(s) envoyé(s) · {outbound?.reponses ?? 0} réponse(s) · {outbound?.tauxReponse ?? 0}% de réponse</p>
              </div>
              <button onClick={() => setRepliesOpen(false)} aria-label="Fermer" className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-soren-border transition-colors"><X size={14} className="text-soren-muted" /></button>
            </div>
            <div className="overflow-y-auto px-2 py-2">
              {(() => {
                const sent = (outboundList ?? []).filter(l => ['email_envoye', 'relance', 'importe'].includes(l.etape))
                  .sort((a, b) => (b.repondu_le ?? '').localeCompare(a.repondu_le ?? ''))
                if (sent.length === 0) return <p className="text-center text-[13px] text-soren-subtle py-10">Aucun email envoyé pour l&apos;instant.</p>
                return (
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10px] uppercase tracking-wide text-soren-subtle">
                      <th className="text-left font-semibold px-3 py-2">Contact</th>
                      <th className="text-left font-semibold px-3 py-2">Email</th>
                      <th className="text-left font-semibold px-3 py-2">Réponse</th>
                    </tr></thead>
                    <tbody>
                      {sent.map(l => (
                        <tr key={l.id} className="border-t border-soren-border/60">
                          <td className="px-3 py-2"><span className="font-semibold text-soren-text">{[l.firstName, l.lastName].filter(Boolean).join(' ') || '—'}</span>{l.company && <span className="text-soren-subtle"> · {l.company}</span>}</td>
                          <td className="px-3 py-2 text-soren-muted">{l.email ?? '—'}</td>
                          <td className="px-3 py-2">
                            {l.repondu_le
                              ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Répondu · {new Date(l.repondu_le).toLocaleDateString('fr-FR')}</span>
                              : <span className="text-[11px] text-soren-subtle">En attente</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sous-composants ─────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 42 }: { score: number; color: string; size?: number }) {
  const sw = size >= 60 ? 6 : 4
  const c = size / 2, r = c - sw / 2 - 1, circ = 2 * Math.PI * r
  const off = circ * (1 - Math.max(0, Math.min(100, score)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-soren-elevated" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.3} fontWeight="700" fill={color}>{Math.round(score)}</text>
    </svg>
  )
}
function TeamCard({ name, color, card }: { name: string; color: string; card?: TeamScore }) {
  const tone = card?.tone ?? 'surveillance'
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-soren-text">{name}</p>
        <ScoreRing score={card?.score ?? 0} color={DOT[tone]} />
      </div>
      <div className="flex flex-col gap-1.5">
        {(card?.metrics ?? []).map(mt => (
          <div key={mt.label} className="flex items-center justify-between text-[11.5px]">
            <span className="text-soren-muted">{mt.label}</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold tabular-nums text-soren-text">{mt.value}</span>
              {mt.delta && <span className="text-[9.5px] font-semibold" style={{ color: mt.deltaGood ? '#059669' : '#DC2626' }}>{mt.delta}</span>}
            </span>
          </div>
        ))}
      </div>
      {card?.charge != null && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-soren-subtle">
          <span>Charge obj.</span>
          <span className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < Math.round((card.charge ?? 0) * 5) ? color : '#D1D5DB' }} />)}
          </span>
        </div>
      )}
      <p className="text-[10.5px] mt-2 pt-2 border-t border-soren-border/60 font-medium" style={{ color: DOT[tone] }}>→ {card?.diagnostic ?? '…'}</p>
    </div>
  )
}
function FunnelStep({ Icon, label, val, w, color, sub, subTitle }: { Icon: Lucide; label: string; val: number; w: number; color: string; sub?: ReactNode; subTitle?: string }) {
  return (
    <div className="rounded-xl flex items-center justify-between px-4 py-3 border" style={{ width: `${w}%`, background: color + '0d', borderColor: color + '33' }}>
      <span className="flex items-center gap-2.5 text-[12.5px] font-medium text-soren-text">
        <Icon size={15} style={{ color }} />
        <span className="flex flex-col leading-tight">
          <span>{label}</span>
          {sub && <span className="text-[9.5px] font-normal text-soren-subtle mt-0.5" title={subTitle}>{sub}</span>}
        </span>
      </span>
      <span className="text-[17px] font-bold tabular-nums" style={{ color }}>{fmt(val)}</span>
    </div>
  )
}
function FunnelConv({ pct, note, ok }: { pct: number; note: string; ok: boolean }) {
  const c = ok ? '#059669' : '#D97706'
  return <div className="flex items-center gap-1.5 py-1.5"><span style={{ color: c, fontSize: 12 }}>{ok ? '▲' : '▼'}</span><span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full" style={{ color: c, background: c + '14' }}>{pct1(pct)}%</span><span className="text-[10.5px] text-soren-subtle">{note}</span></div>
}
function SalesKpi({ label, value, dot }: { label: string; value: string; dot: string }) {
  const isChf = value.endsWith(' CHF')
  const num = isChf ? value.slice(0, -4) : value
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        <p className="text-[10px] font-medium text-soren-muted uppercase tracking-wide leading-none truncate">{label}</p>
      </div>
      <p className="flex items-baseline gap-1 leading-none">
        <span className="text-[15px] font-bold tabular-nums text-soren-text">{num}</span>
        {isChf && <span className="text-[10px] font-semibold text-soren-muted">CHF</span>}
      </p>
    </div>
  )
}
function FinCard({ label, Icon, color, value, obj, ok, gap, unit }: { label: string; Icon: Lucide; color: string; value: string; obj: string; ok: boolean; gap: string; unit?: string }) {
  return (
    <div className="rounded-2xl p-4 pb-5 border relative shadow-sm" style={{ background: color + '0d', borderColor: color + '26' }}>
      <div className="flex items-start justify-between mb-1"><span className="text-[10px] font-bold tracking-wide" style={{ color }}>{label}</span><span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={13} /></span></div>
      <div className="flex items-baseline gap-1.5"><p className="text-[20px] font-bold tabular-nums text-soren-text">{value}</p><span className="text-[9px] font-semibold" style={{ color: ok ? '#059669' : '#DC2626' }}>{gap}</span></div>
      {unit && <p className="text-[11px] text-soren-subtle mt-0.5">{unit}</p>}
      <span className="absolute bottom-2 right-3 text-[9px] font-semibold flex items-center gap-0.5" style={{ color: '#FF4D00' }}><Target size={9} />{obj}</span>
    </div>
  )
}

type Obj = { leadsR1: number; tauxShow: number; tauxClose: number; ca: number; roi: number; ventes: number; cashContracte: number; panierMoyen: number }
function ObjModal({ obj, scope, onClose, onSave }: { obj: Obj; scope: 'commerciale' | 'globale' | 'all'; onClose: () => void; onSave: (v: Partial<Obj>) => void }) {
  const [v, setV] = useState<Obj>(obj)
  const field = (key: keyof Obj, label: string, unit: string) => (
    <div key={key}><p className="text-[11px] text-soren-muted mb-1">{label} ({unit})</p>
      <input value={v[key]} inputMode="decimal" onChange={e => setV({ ...v, [key]: parseFloat(e.target.value.replace(',', '.').replace(/[^\d.]/g, '')) || 0 })}
        className="w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[14px] font-semibold tabular-nums text-soren-text outline-none focus:border-[#FF4D00]" /></div>
  )
  const showComm = scope === 'commerciale' || scope === 'all'
  const showFin = scope === 'globale' || scope === 'all'
  const title = scope === 'all' ? 'tous les objectifs' : scope === 'commerciale' ? 'Performance commerciale' : 'Performance financière'
  return (
    <Modal onClose={onClose}>
      <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-4"><span className="w-7 h-7 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center"><Target size={15} className="text-[#FF4D00]" /></span><p className="text-[15px] font-bold text-soren-text">Objectifs · {title}</p></div>
        <div className="grid grid-cols-2 gap-3">
          {showComm && <>
            {scope === 'all' && <div className="col-span-2 text-[10.5px] font-bold uppercase tracking-wide text-soren-subtle">Performance commerciale</div>}
            {field('leadsR1', 'Leads → R1', '%')}{field('tauxShow', 'Taux de show', '%')}
            {field('tauxClose', 'Taux de closing', '%')}{field('ca', "Encaissé (objectif)", 'CHF')}{field('roi', 'ROI', '×')}
          </>}
          {showFin && <>
            {scope === 'all' && <div className="col-span-2 text-[10.5px] font-bold uppercase tracking-wide text-soren-subtle mt-1">Performance financière</div>}
            {field('ventes', 'Total ventes', 'nb')}{field('cashContracte', 'Cash contracté', 'CHF')}{field('panierMoyen', 'Panier moyen', 'CHF')}
          </>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-[13px] font-semibold text-soren-muted border border-soren-border rounded-xl px-4 py-2 hover:bg-soren-elevated">Annuler</button>
          <button onClick={() => onSave(v)} className="text-[13px] font-semibold text-white bg-[#FF4D00] rounded-xl px-4 py-2 shadow-sm">Appliquer →</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Types des queries ───────────────────────────────────────────────────────
type Funnel = { leadsATraiter: number; leadsTotal: number; leadsInbound: number; leadsOutbound: number; r1Booked: number; noShows: number; shows: number; ventes: number; tauxLeadsR1: number; tauxShow: number; tauxClose: number }
type Summary = { contactes: number; reponses: number; tauxReponse: number }
type Media = { kpis?: { spend?: { value: number }; impressions?: { value: number }; clicks?: { value: number }; leads?: { value: number }; cpl?: { value: number } } }
type Pay = { encaisse: number; attente: number; enRetard: number; caTotal: number; clientsCount: number; transactions?: { contactId: string; type: string; status: string }[] }
type Health = { score: number; ev7: number | null; ev30: number | null }
type TeamMetric = { label: string; value: string; delta: string | null; deltaGood: boolean }
type TeamScore = { score: number; tone: Tone; charge: number | null; metrics: TeamMetric[]; diagnostic: string }
type Scorecards = { setters: TeamScore; closers: TeamScore; publicite: TeamScore }
type OutboundSum = { sourced: number; validated: number; decks: number; envois: number; reponses: number; aCorriger: number; rejetes: number; r1: number; tauxValideEnvoi: number; tauxReponse: number; score: number; tone: Tone; diagnostic: string }
type OutboundLead = { id: string; firstName: string; lastName: string | null; email: string | null; company: string | null; etape: string; repondu_le: string | null; lastActivity: string }
