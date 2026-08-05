'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DollarSign, Eye, MousePointerClick, Users, Percent, Gauge,
  RefreshCw, CalendarDays, ArrowUpRight, Play, X, Info, ClipboardList,
} from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import MetaLogo from './MetaLogo'

const MetaCplChart = dynamic(() => import('./MetaCplChart'), { ssr: false })
const MetaLeadsChart = dynamic(() => import('./MetaLeadsChart'), { ssr: false })
const MetaConnectModal = dynamic(() => import('./MetaConnectModal'), { ssr: false })
const MetaLeadsModal = dynamic(() => import('./MetaLeadsModal'), { ssr: false })
const QuizSessionsModal = dynamic(() => import('./QuizSessionsModal'), { ssr: false })
const MetaGuide = dynamic(() => import('./MetaGuide'), { ssr: false })
const CreativeIntelligence = dynamic(() => import('./CreativeIntelligence'), { ssr: false })
const CardDrop = dynamic(() => import('./CardDrop'), { ssr: false })
const MediaDashboard = dynamic(() => import('./MediaDashboard'), { ssr: false })

type Delta = { pct: number; dir: 'up' | 'down'; good: boolean } | null
type Kpi = { value: number; delta: Delta }
type Series = { date: string; cpl: number; leads: number }
type Row = {
  id: string; name: string; campaign: string | null; adset: string | null
  spend: number; impressions: number; clicks: number; leads: number
  cpl: number; ctr: number; cr: number; perf: 'excellent' | 'moyen' | 'optimiser'
  premiereDiffusion?: string; derniereDiffusion?: string; statut?: string | null; enCours?: boolean
  imageUrl?: string | null; thumbnailUrl?: string | null; videoSource?: string | null; videoThumb?: string | null; videoLien?: string | null
}
type MediaView = { src: string; isVideo: boolean; name: string; integre?: boolean }
type Dash = {
  from: string; to: string; level: string; connected: boolean; currency: string; lastSyncAt: string | null
  kpis: { spend: Kpi; impressions: Kpi; clicks: Kpi; leads: Kpi; cpl: Kpi; ctr: Kpi; cr: Kpi }
  series: Series[]; topCampaigns: Row[]; detail: Row[]
}

const LEVELS = [{ k: 'campaign', label: 'Campagne' }, { k: 'adset', label: 'Adset' }, { k: 'creative', label: 'Publicité' }]
const isoDay = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
function defaultRange() { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 6); return { from: isoDay(from), to: isoDay(to) } }
// Une campagne trop jeune n'est pas mauvaise, elle est en apprentissage : chip
// neutre, jamais rouge, tant qu'il n'y a pas assez de leads pour juger (seuil
// côté serveur, mediaBuyer.perfOf).
const PERF: Record<string, { label: string; cls: string }> = {
  apprentissage: { label: 'En apprentissage', cls: 'bg-soren-elevated text-soren-muted' },
  excellent: { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700' },
  moyen:     { label: 'Moyen',     cls: 'bg-amber-100 text-amber-700' },
  optimiser: { label: 'À optimiser', cls: 'bg-red-100 text-red-700' },
}

const nf = (n: number) => n.toLocaleString('fr-CH', { maximumFractionDigits: 0 })
const chf = (n: number) => n.toLocaleString('fr-CH', { maximumFractionDigits: 0 })
const cpl = (n: number) => n.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n: number) => n.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Variance({ delta }: { delta: Delta }) {
  if (!delta) return <span className="text-[9px] font-semibold text-soren-subtle leading-none">—</span>
  return (
    <span className={`text-[9px] font-semibold leading-none ${delta.good ? 'text-emerald-600' : 'text-red-600'}`}>
      {delta.dir === 'up' ? '▲' : '▼'} {delta.pct}% <span className="text-soren-subtle font-medium">vs préc.</span>
    </span>
  )
}

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()} onMouseLeave={() => setShow(false)}>
      <button
        onClick={() => setShow((s) => !s)}
        onMouseEnter={() => setShow(true)}
        className="text-soren-subtle hover:text-soren-text transition-colors"
        title=""
      >
        <Info size={11} />
      </button>
      {show && (
        <span className="absolute left-0 top-full mt-1.5 z-30 w-60 bg-soren-card border border-soren-border rounded-xl shadow-lg px-3 py-2.5 text-[10.5px] font-normal text-soren-muted leading-relaxed normal-case">
          {text}
        </span>
      )}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, suffix, delta, color, onClick, drop, info }: {
  icon: React.ElementType; label: string; value: string; suffix?: string; delta: Delta; color: string; onClick?: () => void; drop?: string; info?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60 ${onClick ? 'cursor-pointer hover:border-soren-accent/40 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] font-medium text-soren-muted leading-none">
          {label}{info && <InfoTip text={info} />}{onClick && <ArrowUpRight size={11} className="text-soren-accent" />}
        </span>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={13} /></span>
      </div>
      <div className="text-[16px] md:text-[18px] font-bold text-soren-text leading-none tabular-nums">
        {value}{suffix && <span className="text-[12px] text-soren-muted font-semibold ml-1">{suffix}</span>}
      </div>
      <Variance delta={delta} />
      {drop && <CardDrop cardId={drop} />}
    </div>
  )
}

export default function MediaBuyerView() {
  const [range, setRange] = useState(() => defaultRange())
  const [level, setLevel] = useState('adset')
  const [enCoursSeul, setEnCoursSeul] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [leadsOpen, setLeadsOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [tab, setTab] = useState<'perf' | 'guide'>('perf')
  const [rangeLabel, setRangeLabel] = useState('7 derniers jours')
  const calendarRef = useRef<HTMLDivElement>(null)
  const [media, setMedia] = useState<MediaView | null>(null)
  // Anti-saut : on garde le dernier dashboard affiché pendant le rechargement (changement de niveau/date)
  // au lieu de retomber à vide (ce qui rétractait puis redéployait la page).
  const dRaw = useQuery(api.mediaBuyer.dashboard, { from: range.from, to: range.to, level }) as Dash | undefined
  const lastDash = useRef<Dash | null>(null)
  if (dRaw !== undefined) lastDash.current = dRaw
  const d = (dRaw ?? lastDash.current) as Dash | null
  const conn = useQuery(api.mediaBuyer.connectionStatus)
  const isAdmin = useQuery(api.users.me)?.isAdmin ?? false
  const sync = useAction(api.mediaBuyer.syncInsights)
  const disconnect = useMutation(api.mediaBuyer.disconnect)
  const loading = d === null
  const refreshing = dRaw === undefined && d !== null
  const dLvl = d?.level ?? level   // niveau réel des données affichées (≠ sélection en cours pendant un refetch)
  const k = d?.kpis
  const v = '—'
  const cur = d?.currency ?? 'CHF'

  const syncMeta = async () => {
    setSyncing(true); setSyncErr(null)
    try {
      const r = await sync({})
      if (!r.ok) { setSyncErr(r.error ?? 'Erreur de synchronisation'); if (r.error?.toLowerCase().includes('connect')) setConnectOpen(true) }
    } catch (e) {
      setSyncErr(e instanceof Error ? e.message : 'Erreur de synchronisation')
    } finally { setSyncing(false) }
  }

  useEffect(() => {
    if (!calendarOpen) return
    const onClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [calendarOpen])

  const detailHead = dLvl === 'campaign' ? ['Campagne', 'Adset'] : dLvl === 'creative' ? ['Publicité', 'Adset'] : ['Adset', 'Campagne']
  // Deux générations de créas cohabitent dès qu'on relance un test : même nom,
  // deux lignes. Le filtre montre par défaut ce qui tourne AUJOURD'HUI ; les
  // arrêtées restent à un clic, avec leur dernier jour de diffusion.
  const detailRows = (d?.detail ?? []).filter(r => dLvl !== 'creative' || !enCoursSeul || r.enCours !== false)
  const nbArretees = dLvl === 'creative' ? (d?.detail ?? []).filter(r => r.enCours === false).length : 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-7 pt-4 md:pt-5 pb-4 flex items-center justify-start md:justify-between flex-shrink-0 gap-2 md:gap-4 flex-wrap sticky top-0 z-20 bg-soren-app">
        {/* Onglets Performance / Guide */}
        <div className="flex bg-soren-elevated border border-soren-border rounded-full p-[3px] text-[11.5px] font-medium">
          {([['perf', 'Performance'], ['guide', 'Guide de connexion']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-full transition-colors ${tab === k ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'}`}>{label}</button>
          ))}
        </div>
        <div className={`flex items-center gap-2.5 flex-wrap ${tab === 'perf' ? '' : 'hidden'}`}>
          {/* Chip de connexion au compte Meta Ads */}
          {conn === undefined ? null : conn.connected ? (
            <button
              onClick={isAdmin ? () => { if (confirm('Déconnecter le compte Meta Business ?')) disconnect({}) } : undefined}
              title={isAdmin ? (conn.accountId ? `Compte ${conn.accountId} — cliquer pour déconnecter` : 'Cliquer pour déconnecter') : `Compte société${conn.accountId ? ` ${conn.accountId}` : ''} (géré par un admin)`}
              className={`group inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-full transition-colors ${isAdmin ? 'hover:border-emerald-500/50' : 'cursor-default'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connecté{conn.accountName ? ` · ${conn.accountName}` : ''}
            </button>
          ) : isAdmin ? (
            <button
              onClick={() => setConnectOpen(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-soren-accent bg-soren-accent/10 border border-soren-accent/25 px-2.5 py-1.5 rounded-full hover:bg-soren-accent/15 transition-colors"
            >
              <MetaLogo size={13} />Connecter Meta Ads
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border px-2.5 py-1.5 rounded-full cursor-default" title="Compte société — connexion réservée à un admin">
              <MetaLogo size={13} />Meta Ads non connecté
            </span>
          )}
          {/* Calendrier — sélection de période (même UX que le tableau de bord) */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setCalendarOpen(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
                calendarOpen
                  ? 'bg-soren-sidebar text-white border-soren-sidebar'
                  : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-border'
              }`}
            >
              <CalendarDays size={12} />
              <span>{rangeLabel}</span>
            </button>
            {calendarOpen && (
              <DateRangePicker
                onClose={() => setCalendarOpen(false)}
                onApply={(start, end, label) => {
                  setRange({ from: isoDay(start), to: isoDay(end) })
                  setRangeLabel(label)
                  setCalendarOpen(false)
                }}
              />
            )}
          </div>
          {/* Réponses du quiz, abandons compris : la seule vue qui montre ce que
              les gens répondent avant de partir. */}
          <button onClick={() => setQuizOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border rounded-full px-2.5 py-1.5 hover:text-soren-text transition-colors">
            <ClipboardList size={12} /> Réponses du quiz
          </button>
          {isAdmin && conn?.connected && <button onClick={syncMeta} disabled={syncing} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border rounded-full px-2.5 py-1.5 hover:text-soren-text transition-colors disabled:opacity-60"><RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Sync…' : 'Sync Meta'}</button>}
        </div>
      </div>
      {connectOpen && <MetaConnectModal onClose={() => setConnectOpen(false)} />}
      {leadsOpen && <MetaLeadsModal onClose={() => setLeadsOpen(false)} />}
      {quizOpen && <QuizSessionsModal onClose={() => setQuizOpen(false)} />}

      <div className={`flex-1 overflow-y-auto p-7 transition-opacity duration-200 ${refreshing ? 'opacity-70' : 'opacity-100'}`}>
        {tab === 'guide' ? <MetaGuide /> : (<>
        {syncErr && (
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-none" />
            Échec de la synchronisation Meta : {syncErr}
          </div>
        )}
        {/* KPIs + Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3 mb-5 items-stretch">
          <div className="lg:col-span-2 grid grid-cols-2 gap-2 md:gap-3 items-start content-start">
          <KpiCard icon={DollarSign}        label="Dépense"     value={loading ? v : chf(k!.spend.value)}        suffix={cur} delta={loading ? null : k!.spend.delta}       color="#16A34A" drop="spend" />
          <KpiCard icon={Eye}               label="Impressions" value={loading ? v : nf(k!.impressions.value)}   delta={loading ? null : k!.impressions.delta} color="#0EA5E9" drop="impressions" />
          <KpiCard icon={Users}             label="Leads"       value={loading ? v : nf(k!.leads.value)}         delta={loading ? null : k!.leads.delta}       color="#3462EE" onClick={() => setLeadsOpen(true)} drop="leads" />
          <KpiCard icon={MousePointerClick} label="Clics"       value={loading ? v : nf(k!.clicks.value)}        delta={loading ? null : k!.clicks.delta}      color="#8B5CF6" drop="clicks" />
          <KpiCard icon={DollarSign} label="CPL" value={loading ? v : cpl(k!.cpl.value)} suffix={cur} delta={loading ? null : k!.cpl.delta} color="#FF4D00" drop="cpl" info="Coût par lead : dépense ÷ leads, le prix payé pour un contact. Il ne se juge pas dans l'absolu mais contre la médiane du compte et contre ce qu'un lead rapporte une fois converti." />
          <KpiCard icon={Percent}    label="CTR" value={loading ? v : pct(k!.ctr.value)} suffix="%"   delta={loading ? null : k!.ctr.delta} color="#D97706" drop="ctr" info="Taux de clic : la part des impressions qui cliquent. C'est le signal de l'accroche : il se lit contre tes propres créas et se compare dans le temps, pas à une moyenne du marché." />
          <div className="col-span-2"><KpiCard icon={Gauge}      label="CR"  value={loading ? v : pct(k!.cr.value)}  suffix="%"   delta={loading ? null : k!.cr.delta} color="#14B8A6" drop="cr" info="Taux de conversion : la part des clics qui deviennent des leads. Il juge ce qui se passe après le clic, page et offre, pas la publicité : s'il décroche alors que le CTR tient, le problème est sur la page." /></div>
          </div>
          <div className="flex flex-col gap-2 md:gap-3 h-full">
            <MediaDashboard />
            <div className="flex-1 min-h-[220px]"><CreativeIntelligence /></div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
          <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-3">Évolution CPL</h3>
            <div className="h-[180px]">
              {!loading && d!.series.length > 0 ? <MetaCplChart data={d!.series} /> : <EmptyChart />}
            </div>
            <CardDrop cardId="chart_cpl" variant="panel" />
          </div>
          <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-3">Leads générés</h3>
            <div className="h-[180px]">
              {!loading && d!.series.length > 0 ? <MetaLeadsChart data={d!.series} /> : <EmptyChart />}
            </div>
            <CardDrop cardId="chart_leads" variant="panel" />
          </div>
        </div>

        {/* Top 10 Campagnes */}
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden mb-5">
          <div className="px-5 pt-4 pb-3"><h3 className="text-[13px] font-semibold text-soren-text tracking-tight">Top 10 Campagnes</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[820px]">
              <thead><tr className="text-[10.5px] font-medium text-soren-muted">
                <th className="text-left px-5 py-2.5 border-y border-soren-border">Campagne</th>
                <th className="text-left px-3 py-2.5 border-y border-soren-border">Adset</th>
                {[`Dépense (${cur})`, 'Impressions', 'Clics', 'Leads', `CPL (${cur})`, 'CTR (%)'].map(h => <th key={h} className="text-right px-3 py-2.5 border-y border-soren-border">{h}</th>)}
                <th className="text-right px-5 py-2.5 border-y border-soren-border">Performance</th>
              </tr></thead>
              <tbody>
                {loading ? null : d!.topCampaigns.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-soren-muted text-[13px] py-10">Aucune donnée</td></tr>
                ) : d!.topCampaigns.map(r => (
                  <tr key={r.id} className="text-[11.5px] font-normal border-b border-soren-border last:border-0">
                    <td className="px-5 py-3 font-medium text-soren-text">{r.name}</td>
                    <td className="px-3 py-3 text-soren-muted">{r.adset ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.spend)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.impressions)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.clicks)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.leads)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{cpl(r.cpl)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{pct(r.ctr)}</td>
                    <td className="px-5 py-3 text-right"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full ${(PERF[r.perf] ?? PERF.apprentissage).cls}`}><span className="w-[6px] h-[6px] rounded-full bg-current" />{(PERF[r.perf] ?? PERF.apprentissage).label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardDrop cardId="top_campaigns" variant="flush" />
        </div>

        {/* Détail par niveau */}
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-soren-text tracking-tight whitespace-nowrap">Détail par {level === 'campaign' ? 'campagne' : level === 'creative' ? 'publicité' : 'adset'}</h3>
            <div className="flex items-center gap-2">
              {dLvl === 'creative' && nbArretees > 0 && (
                <button
                  onClick={() => setEnCoursSeul(s => !s)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${enCoursSeul ? 'bg-soren-elevated border-soren-border text-soren-muted hover:text-soren-text' : 'bg-soren-accent border-soren-accent text-white'}`}
                >
                  {enCoursSeul ? `Voir les ${nbArretees} arrêtée${nbArretees > 1 ? 's' : ''}` : 'En diffusion seulement'}
                </button>
              )}
              <div className="flex bg-soren-elevated border border-soren-border rounded-full p-[3px] text-[11px] font-medium">
                {LEVELS.map(l => <button key={l.k} onClick={() => setLevel(l.k)} className={`px-2.5 py-1 rounded-full transition-colors ${level === l.k ? 'bg-soren-accent text-white' : 'text-soren-muted hover:text-soren-text'}`}>{l.label}</button>)}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead><tr className="text-[10.5px] font-medium text-soren-muted">
                <th className="text-left px-5 py-2.5 border-y border-soren-border">{detailHead[0]}</th>
                <th className="text-left px-3 py-2.5 border-y border-soren-border">{detailHead[1]}</th>
                {['Dépense', 'Impressions', 'Clics', 'Leads', 'CPL', 'CTR', 'CR'].map(h => <th key={h} className="text-right px-3 py-2.5 border-y border-soren-border last:px-5">{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? null : detailRows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-soren-muted text-[13px] py-10">Aucune donnée</td></tr>
                ) : detailRows.map(r => (
                  <tr key={r.id} className="text-[11.5px] font-normal border-b border-soren-border last:border-0">
                    <td className="px-5 py-3 font-medium text-soren-text">
                      {dLvl === 'creative'
                        ? <div className="flex items-center gap-3">
                            <CreaThumb r={r} onOpen={setMedia} />
                            <span className="min-w-0">
                              {r.name}
                              <Diffusion r={r} />
                            </span>
                          </div>
                        : r.name}
                    </td>
                    <td className="px-3 py-3 text-soren-muted">{(dLvl === 'adset' ? r.campaign : r.adset) ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.spend)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.impressions)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.clicks)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf(r.leads)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{cpl(r.cpl)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{pct(r.ctr)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{pct(r.cr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardDrop cardId="detail" variant="flush" />
        </div>
        <div className="h-4" />
        </>)}
      </div>

      {/* Lightbox média créa (photo / vidéo) */}
      {media && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMedia(null)} />
          <div className="relative max-w-3xl w-full flex flex-col items-center gap-3">
            <button onClick={() => setMedia(null)} className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center z-10 hover:bg-soren-elevated" aria-label="Fermer"><X size={16} className="text-soren-text" /></button>
            {/* Trois cas : le fichier vidéo quand Meta le donne, sinon son lecteur
                intégré (aucune fenêtre extérieure), sinon une image. Le lecteur est
                cadré en 9/16 : ce sont des reels, et Meta les pose sinon dans un
                carré où la vidéo flotte entre deux bandes noires. */}
            {media.integre
              ? <iframe
                  src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(media.src)}&show_text=false&autoplay=true&width=480&height=854`}
                  className="h-[80vh] aspect-[9/16] max-w-full rounded-2xl bg-black border-0"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  title={media.name}
                />
              : media.isVideo
              ? <video src={media.src} controls autoPlay className="max-h-[80vh] w-auto rounded-2xl bg-black" />
              : /* eslint-disable-next-line @next/next/no-img-element */ <img src={media.src} alt={media.name} className="max-h-[80vh] w-auto rounded-2xl object-contain" />}
            <p className="text-[12px] font-medium text-white text-center max-w-lg">{media.name}</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// Statut de diffusion d'une publicité, sous son nom : deux créas peuvent porter
// le même nom (« Quiz 1 » relancé), seul ce repère les distingue.
function Diffusion({ r }: { r: Row }) {
  if (r.enCours === undefined) return null
  const jour = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)
  return (
    <span className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium">
      <span className={`w-[5px] h-[5px] rounded-full ${r.enCours ? 'bg-emerald-500' : 'bg-soren-subtle'}`} />
      <span className={r.enCours ? 'text-emerald-600' : 'text-soren-subtle'}>
        {r.enCours
          ? `En diffusion${jour(r.premiereDiffusion) ? ` depuis le ${jour(r.premiereDiffusion)}` : ''}`
          : `Arrêtée${jour(r.derniereDiffusion) ? ` : dernière diffusion le ${jour(r.derniereDiffusion)}` : ''}`}
      </span>
    </span>
  )
}

// Vignette cliquable d'une créa (photo, ou vidéo avec play) — ouvre la lightbox.
function CreaThumb({ r, onOpen }: { r: Row; onOpen: (m: MediaView) => void }) {
  const poster = r.videoThumb || r.thumbnailUrl || r.imageUrl || null
  const isVideo = !!r.videoSource || !!r.videoLien
  const src = r.videoSource || r.imageUrl || r.thumbnailUrl || null
  // Meta ne livre le FICHIER vidéo qu'avec l'autorisation `ads_management`. Sans
  // elle, on ouvre la vidéo là où elle est publiée : un lecteur qui marche vaut
  // mieux qu'une vignette morte. Le lecteur interne sert dès que le fichier est là.
  if (!r.videoSource && r.videoLien) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onOpen({ src: r.videoLien!, isVideo: true, integre: true, name: r.name }) }}
        className="relative w-10 h-10 rounded-lg overflow-hidden bg-soren-elevated flex-shrink-0 ring-1 ring-soren-border hover:ring-soren-accent/60 transition block"
        title="Voir la vidéo"
      >
        {poster
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster} alt={r.name} className="w-full h-full object-cover" />
          : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/35"><Play size={12} className="text-white" fill="white" /></span>
      </button>
    )
  }
  if (!src) return <div className="w-10 h-10 rounded-lg bg-soren-elevated flex-shrink-0" />
  return (
    <button
      onClick={() => onOpen({ src, isVideo, name: r.name })}
      className="relative w-10 h-10 rounded-lg overflow-hidden bg-soren-elevated flex-shrink-0 ring-1 ring-soren-border hover:ring-soren-accent/60 transition"
      title="Voir la créa"
    >
      {poster
        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster} alt={r.name} className="w-full h-full object-cover" />
        : null}
      {isVideo && <span className="absolute inset-0 flex items-center justify-center bg-black/35"><Play size={12} className="text-white" fill="white" /></span>}
    </button>
  )
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-[12.5px] text-soren-subtle">Aucune donnée — clique sur « Sync Meta »</div>
}
