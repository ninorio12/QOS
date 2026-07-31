'use client'

import { useSearchParams } from 'next/navigation'
import { configById, FUNNEL_CONFIGS, type FunnelConfig } from '@/lib/funnelConfigs'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Modal } from '@/components/ui/Modal'
import { Target, Calendar, Eye, DollarSign, TrendingUp, Users, CalendarCheck, Phone, Trophy, Banknote, BarChart3, Megaphone, PhoneCall, Handshake, Sparkles, ArrowUpRight, X, Mail, Send, MessageSquare } from 'lucide-react'

// ── Période ───────────────────────────────────────────────────────────────
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// 3 périodes fixes (plus de calendrier libre). « Depuis le début » = tous les contacts jamais acquis,
// pour réconcilier le total de leads avec la pipeline actuelle (les convertis/perdus ont quitté la pipeline).
type Preset = '7j' | '30j' | 'all'
// Icônes des étapes, référencées par nom depuis les configurations de parcours.
const STEP_ICONS = { users: Users, message: Send, chat: MessageSquare, calendar: CalendarCheck, phone: Phone, trophy: Trophy } as const

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

type Tone = 'bon' | 'surveillance' | 'critique' | 'vide'
const DOT: Record<Tone, string> = { bon: '#16A34A', surveillance: '#D97706', critique: '#DC2626', vide: '#9CA3AF' }
type Lucide = React.ElementType

// ── Card KPI (épurée : label + valeur + variant vs objectif, sans icône ni obj orange) ──
function KpiCard({ label, value, suffix, gap, gapOk, icon: Icon, color = '#FF4D00' }: {
  label: string; value: string; suffix?: string; gap?: string; gapOk?: boolean; icon?: Lucide; color?: string
}) {
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-xl p-2.5 flex flex-col justify-start gap-1.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        {Icon && <span className="flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0" style={{ background: color + '14', color }}><Icon size={12} strokeWidth={2.4} /></span>}
        <span className="text-[10px] font-medium tracking-wide text-soren-subtle leading-none">{label}</span>
      </div>
      <div className="flex-1 flex items-center justify-start gap-1.5 flex-wrap">
        <span className="text-[17px] md:text-[19px] font-bold text-soren-text leading-none tabular-nums">{value}{suffix && <span className="text-[11px] text-soren-muted font-semibold ml-0.5">{suffix}</span>}</span>
        {gap && <span className="text-[10.5px] font-semibold leading-none whitespace-nowrap" style={{ color: gapOk ? '#059669' : '#DC2626' }}>{gap}</span>}
      </div>
    </div>
  )
}

function RoleCard({ title, score, rows, onExpand }: { title: string; score?: TeamScore; rows: [string, string, string?][]; onExpand?: () => void }) {
  const tone = score?.tone ?? 'vide'
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

  // Configuration du parcours : le squelette ne change pas, seuls les noms suivent.
  const searchParams = useSearchParams()
  const [cfgId, setCfgId] = useState(() => searchParams?.get('funnel') ?? 'vsl')
  const cfg = configById(cfgId)
  const pickConfig = (id: string) => {
    setCfgId(id)
    const url = new URL(window.location.href)
    if (id === 'vsl') url.searchParams.delete('funnel'); else url.searchParams.set('funnel', id)
    window.history.replaceState(null, '', url.toString())
  }

  const [objOpen, setObjOpen] = useState(false)
  const [objScope, setObjScope] = useState<'commerciale' | 'globale' | 'all'>('all')
  const [repliesOpen, setRepliesOpen] = useState(false)

  // ── Dérivations ──
  const spend = media?.kpis?.spend?.value ?? 0
  const ca    = pay?.encaisse ?? 0   // CA = encaissé (décision Thomas 2026-06-21), source unique = paiement.overview
  // Coût par vente = dépense publicitaire ÷ ventes de la période. Il remplace le
  // ROI, qui mélangeait la pub et les abonnements du module Budget et n'était
  // donc comparable ni dans le temps ni entre parcours (le bénéfice ira dans Paiement).
  const coutParVente: number | null = funnel && funnel.ventes > 0 ? spend / funnel.ventes : null
  const cpvStr = coutParVente === null ? '-' : fmt(coutParVente)
  // Ici, plus bas vaut mieux : l'objectif est un plafond, pas un plancher.
  const cpvOk = coutParVente !== null && coutParVente <= (obj?.coutParVente ?? 500)
  // Levier « vide » = score N/A (null) côté back → on neutralise le vert trompeur et on affiche N/A sur ses taux.
  const pubEmpty   = (scorecards?.publicite?.score ?? null) === null
  const setEmpty   = (scorecards?.setters?.score ?? null) === null
  const closeEmpty = (scorecards?.closers?.score ?? null) === null
  const outEmpty   = (outbound?.score ?? null) === null
  const o = obj ?? { leadsR1: 50, leadsR2: 25, tauxShow: 75, tauxShowR2: 75, tauxClose: 30, tauxReponse: 30, cpl: 30, ca: 30000, roi: 5, coutParVente: 500, ventes: 30, cashContracte: 30000, panierMoyen: 2000 }
  const f = funnel ?? { leadsATraiter: 0, leadsTotal: 0, leadsInbound: 0, leadsOutbound: 0, r1Booked: 0, noShows: 0, shows: 0, ventes: 0, tauxLeadsR1: 0, tauxShow: 0, tauxClose: 0, r2Booked: 0, showsR1: 0, showsR2: 0, noShowsR1: 0, noShowsR2: 0, tauxShowR1: 0, tauxShowR2: 0, tauxR1R2: 0, tauxLeadsR2: 0, tauxR1ToR2: 0 }
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

  // Toutes les valeurs du parcours à plat : les étapes, les taux et les cartes
  // de rôles y puisent. `abonnes` reste null tant que personne ne l'enregistre :
  // le cockpit affiche N/A plutôt qu'un nombre emprunté à une autre étape.
  const D: Record<string, number | null> = {
    leads: leadsATraiterTotal,
    contactes: summary?.contactes ?? 0,
    reponses: summary?.reponses ?? 0,
    r1: f.r1Booked, showsR1: f.showsR1, noShowsR1: f.noShowsR1,
    r2: f.r2Booked, showsR2: f.showsR2, noShowsR2: f.noShowsR2,
    ventes: f.ventes,
    abonnes: null, abonnesOrganiques: null, coutParAbonne: null,
    spend, impressions: media?.kpis?.impressions?.value ?? 0, clicks: media?.kpis?.clicks?.value ?? 0,
    metaLeads: media?.kpis?.leads?.value ?? 0, cpl: media?.kpis?.cpl?.value ?? 0,
    tauxReponse: summary?.tauxReponse ?? 0, conversionR1: summary?.conversionR1 ?? 0,
    tauxClose: f.tauxClose,
  }
  // Un taux se recalcule à partir des deux étapes qu'il relie : si l'une manque, il manque aussi.
  const rateOf = (from: string, to: string): number | null => {
    const a = D[from], b = D[to]
    if (a == null || b == null || a === 0) return null
    return Math.round((b / a) * 1000) / 10
  }
  // Format d'une ligne de carte de rôle : monnaie, pourcentage ou nombre.
  const roleValue = (key: string): string => {
    const val = D[key]
    if (val == null) return 'N/A'
    if (key === 'spend' || key === 'cpl' || key === 'coutParAbonne') return `${fmt(val)} CHF`
    if (key.startsWith('taux') || key === 'conversionR1') return `${pct1(val)}%`
    return fmt(val)
  }
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

        {/* Choix du parcours : même squelette, autres noms d'étapes */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {FUNNEL_CONFIGS.map((c) => (
            <button key={c.id} onClick={() => pickConfig(c.id)} title={c.tagline}
              className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                c.id === cfg.id
                  ? 'bg-soren-sidebar text-white border-transparent'
                  : 'bg-soren-card text-soren-muted border-soren-border hover:text-soren-text'
              }`}>
              {c.label}
            </button>
          ))}
          <span className="text-[10.5px] text-soren-subtle ml-1">{cfg.tagline}</span>
        </div>


        {/* Ligne 1 : Funnel (grand) + 6 cards 2×2 */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="lg:col-span-7 bg-soren-card border border-soren-border/60 rounded-2xl p-3.5 shadow-sm flex flex-col">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-2">Funnel de conversion</h3>
            <div className="flex flex-col items-center gap-0 flex-1 justify-center">
              {cfg.steps.map((st, i) => {
                const rate = i > 0 ? cfg.rates.find(r => r.to === st.key) : null
                const target = rate ? (o[rate.obj] as number) : 0
                const val = rateOf(rate?.from ?? '', st.key)
                const w = 100 - i * (58 / Math.max(1, cfg.steps.length - 1))
                return (
                  <div key={st.key} className="w-full flex flex-col items-center">
                    {rate && <FunnelConv pct={val ?? 0} note={rate.label} ok={(val ?? 0) >= target} />}
                    <FunnelStep
                      Icon={STEP_ICONS[st.icon]} label={st.label}
                      val={D[st.key] ?? 0} w={w}
                      color={D[st.key] == null ? '#9CA3AF' : rate ? stepColor(val ?? 0, target) : '#6B7280'}
                      sub={D[st.key] == null
                        ? <span className="text-soren-subtle">Pas encore mesuré</span>
                        : i === 0 && st.key === 'leads'
                          ? <>Inbound <span className="font-semibold text-soren-muted">{f.leadsInbound}</span> · Outbound <span className="font-semibold text-soren-muted">{f.leadsOutbound}</span></>
                          : undefined}
                    />
                  </div>
                )
              })}
              <div className="mt-3 text-center text-[11px] text-soren-subtle">Résultat : <span className="font-bold text-soren-text">{fmt(ca)}</span> <span className="text-[9px] text-soren-muted font-semibold">CHF</span></div>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 auto-rows-fr gap-2">
            {cfg.rates.map((r) => {
              const val = rateOf(r.from, r.to)
              const target = o[r.obj] as number
              return (
                <KpiCard key={r.label} label={r.label}
                  value={val == null ? 'N/A' : pct1(val)} suffix={val == null ? undefined : '%'}
                  gap={val == null ? '—' : ptsGap(val, target)} gapOk={(val ?? 0) >= target}
                  icon={CalendarCheck} color="#3462EE" />
              )
            })}
            <KpiCard label="Encaissé" value={fmt(ca)} suffix="CHF" gap={pctGap(ca, o.ca)} gapOk={ca >= o.ca} icon={Banknote} color="#16A34A" />
            <KpiCard label="Coût par vente" value={cpvStr} suffix="CHF" gap={coutParVente === null ? '—' : `${cpvOk ? '▼' : '▲'} ${Math.round((coutParVente / (o.coutParVente || 1)) * 100)}%`} gapOk={cpvOk} icon={TrendingUp} color="#16A34A" />
            <KpiCard label="Panier moyen" value={fmt(panier)} suffix="CHF" gap={pctGap(panier, o.panierMoyen)} gapOk={panier >= o.panierMoyen} icon={DollarSign} color="#FF4D00" />
          </div>
        </div>

        {/* Ligne 2 : métiers (anneau de score + diagnostic) */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <RoleCard title={cfg.roles.media.title} score={scorecards?.publicite}
            rows={cfg.roles.media.rows.map(r => [r.label, pubEmpty && (r.key === 'cpl' || r.key === 'coutParAbonne') ? 'N/A' : roleValue(r.key)] as [string, string])} />
          <RoleCard title={cfg.roles.setting.title} score={scorecards?.setters}
            rows={cfg.roles.setting.rows.map(r => [r.label, setEmpty && r.key.startsWith('taux') ? 'N/A' : roleValue(r.key)] as [string, string])} />
          <RoleCard title={cfg.roles.closing.title} score={scorecards?.closers}
            rows={cfg.roles.closing.rows.map(r => [r.label, closeEmpty && r.key.startsWith('taux') ? 'N/A' : roleValue(r.key)] as [string, string])} />
          <RoleCard title="Emailing Outbound" onExpand={() => setRepliesOpen(true)} score={outbound ? { score: outbound.score, tone: outbound.tone, diagnostic: outbound.diagnostic, charge: null, metrics: [] } : undefined} rows={[
            ['Leads sourcés', fmt(outbound?.sourced ?? 0)],
            ['Decks générés', fmt(outbound?.decks ?? 0)],
            ['Emails envoyés', fmt(outbound?.envois ?? 0), outEmpty ? undefined : '#16A34A'],
            ['Réponses', fmt(outbound?.reponses ?? 0), outEmpty ? undefined : '#16A34A'],
            ['Taux de réponse', outEmpty ? 'N/A' : `${outbound?.tauxReponse ?? 0}%`, outEmpty ? undefined : '#16A34A'],
          ]} />
        </div>


      </div>

      {objOpen && <ObjModal obj={o} cfg={cfg} onClose={() => setObjOpen(false)} onSave={async (vals) => { await setObj(vals); setObjOpen(false) }} />}

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
function ScoreRing({ score, color, size = 42 }: { score: number | null; color: string; size?: number }) {
  const sw = size >= 60 ? 6 : 4
  const c = size / 2, r = c - sw / 2 - 1, circ = 2 * Math.PI * r
  const na = score === null || score === undefined
  const off = circ * (1 - Math.max(0, Math.min(100, na ? 0 : score)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-soren-elevated" />
      {!na && <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />}
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={size * (na ? 0.24 : 0.3)} fontWeight="700" fill={color}>{na ? 'N/A' : Math.round(score)}</text>
    </svg>
  )
}
function TeamCard({ name, color, card }: { name: string; color: string; card?: TeamScore }) {
  const tone = card?.tone ?? 'vide'
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-soren-text">{name}</p>
        <ScoreRing score={card?.score ?? null} color={DOT[tone]} />
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
    <div className="rounded-xl flex items-center justify-between px-3 py-1.5 border" style={{ width: `${w}%`, background: color + '0d', borderColor: color + '33' }}>
      <span className="flex items-center gap-2 text-[11px] font-medium text-soren-text">
        <Icon size={13} style={{ color }} />
        <span className="flex flex-col leading-tight">
          <span>{label}</span>
          {sub && <span className="text-[9px] font-normal text-soren-subtle" title={subTitle}>{sub}</span>}
        </span>
      </span>
      <span className="text-[14px] font-bold tabular-nums" style={{ color }}>{fmt(val)}</span>
    </div>
  )
}
function FunnelConv({ pct, note, ok }: { pct: number; note: string; ok: boolean }) {
  const c = ok ? '#059669' : '#D97706'
  return <div className="flex items-center gap-1.5 py-0.5"><span style={{ color: c, fontSize: 10 }}>{ok ? '▲' : '▼'}</span><span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full" style={{ color: c, background: c + '14' }}>{pct1(pct)}%</span><span className="text-[10px] text-soren-subtle">{note}</span></div>
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

type Obj = { leadsR1: number; leadsR2: number; tauxShow: number; tauxShowR2: number; tauxClose: number; tauxReponse: number; cpl: number; ca: number; roi: number; coutParVente: number; ventes: number; cashContracte: number; panierMoyen: number }
function ObjModal({ obj, cfg, onClose, onSave }: { obj: Obj; cfg: FunnelConfig; onClose: () => void; onSave: (v: Partial<Obj>) => void }) {
  const [v, setV] = useState<Obj>(obj)
  const field = (key: keyof Obj, label: string, unit: string) => (
    <div key={key}><p className="text-[11px] text-soren-muted mb-1">{label} ({unit})</p>
      <input value={v[key]} inputMode="decimal" onChange={e => setV({ ...v, [key]: parseFloat(e.target.value.replace(',', '.').replace(/[^\d.]/g, '')) || 0 })}
        className="w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[14px] font-semibold tabular-nums text-soren-text outline-none focus:border-[#FF4D00]" /></div>
  )
  return (
    <Modal onClose={onClose}>
      <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center"><Target size={15} className="text-[#FF4D00]" /></span>
          <p className="text-[15px] font-bold text-soren-text">Mes objectifs · {cfg.label}</p>
        </div>
        <p className="text-[11px] text-soren-subtle mb-4">Définit les seuils vert, orange et rouge de ce parcours.</p>
        <div className="grid grid-cols-2 gap-3">
          {cfg.objectives.map(ob => field(ob.key as keyof Obj, ob.label, ob.unit))}
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
type Funnel = { leadsATraiter: number; leadsTotal: number; leadsInbound: number; leadsOutbound: number; r1Booked: number; noShows: number; shows: number; ventes: number; tauxLeadsR1: number; tauxShow: number; tauxClose: number; r2Booked: number; showsR1: number; showsR2: number; noShowsR1: number; noShowsR2: number; tauxShowR1: number; tauxShowR2: number; tauxR1R2: number; tauxLeadsR2: number; tauxR1ToR2: number }
type Summary = { contactes: number; reponses: number; tauxReponse: number; r1Booked: number; conversionR1: number }
type Media = { kpis?: { spend?: { value: number }; impressions?: { value: number }; clicks?: { value: number }; leads?: { value: number }; cpl?: { value: number } } }
type Pay = { encaisse: number; attente: number; enRetard: number; caTotal: number; clientsCount: number; transactions?: { contactId: string; type: string; status: string }[] }
type Health = { score: number; ev7: number | null; ev30: number | null }
type TeamMetric = { label: string; value: string; delta: string | null; deltaGood: boolean }
type TeamScore = { score: number | null; tone: Tone; charge: number | null; metrics: TeamMetric[]; diagnostic: string }
type Scorecards = { setters: TeamScore; closers: TeamScore; publicite: TeamScore }
type OutboundSum = { sourced: number; validated: number; decks: number; envois: number; reponses: number; aCorriger: number; rejetes: number; r1: number; tauxValideEnvoi: number; tauxReponse: number; score: number | null; tone: Tone; diagnostic: string }
type OutboundLead = { id: string; firstName: string; lastName: string | null; email: string | null; company: string | null; etape: string; repondu_le: string | null; lastActivity: string }
