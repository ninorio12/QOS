'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DollarSign, Eye, MousePointerClick, Users, Percent, Gauge,
  RefreshCw, CalendarDays, ArrowUpRight, Play, X,
} from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import MetaLogo from './MetaLogo'

const MetaCplChart = dynamic(() => import('./MetaCplChart'), { ssr: false })
const MetaLeadsChart = dynamic(() => import('./MetaLeadsChart'), { ssr: false })
const MetaConnectModal = dynamic(() => import('./MetaConnectModal'), { ssr: false })
const MetaLeadsModal = dynamic(() => import('./MetaLeadsModal'), { ssr: false })
const MetaGuide = dynamic(() => import('./MetaGuide'), { ssr: false })

type Delta = { pct: number; dir: 'up' | 'down'; good: boolean } | null
type Kpi = { value: number; delta: Delta }
type Series = { date: string; cpl: number; leads: number }
type Row = {
  id: string; name: string; campaign: string | null; adset: string | null
  spend: number; impressions: number; clicks: number; leads: number
  cpl: number; ctr: number; cr: number; perf: 'excellent' | 'moyen' | 'optimiser'
  imageUrl?: string | null; thumbnailUrl?: string | null; videoSource?: string | null; videoThumb?: string | null
}
type MediaView = { src: string; isVideo: boolean; name: string }
type Dash = {
  from: string; to: string; level: string; connected: boolean; currency: string; lastSyncAt: string | null
  kpis: { spend: Kpi; impressions: Kpi; clicks: Kpi; leads: Kpi; cpl: Kpi; ctr: Kpi; cr: Kpi }
  series: Series[]; topCampaigns: Row[]; detail: Row[]
}

const LEVELS = [{ k: 'campaign', label: 'Campagne' }, { k: 'adset', label: 'Adset' }, { k: 'creative', label: 'Publicité' }]
const isoDay = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
function defaultRange() { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 6); return { from: isoDay(from), to: isoDay(to) } }
const PERF: Record<string, { label: string; cls: string }> = {
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

function KpiCard({ icon: Icon, label, value, suffix, delta, color, onClick }: {
  icon: React.ElementType; label: string; value: string; suffix?: string; delta: Delta; color: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60 ${onClick ? 'cursor-pointer hover:border-soren-accent/40 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] font-medium text-soren-muted leading-none">
          {label}{onClick && <ArrowUpRight size={11} className="text-soren-accent" />}
        </span>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={13} /></span>
      </div>
      <div className="text-[16px] md:text-[18px] font-bold text-soren-text leading-none tabular-nums">
        {value}{suffix && <span className="text-[12px] text-soren-muted font-semibold ml-1">{suffix}</span>}
      </div>
      <Variance delta={delta} />
    </div>
  )
}

export default function MediaBuyerView() {
  const [range, setRange] = useState(() => defaultRange())
  const [level, setLevel] = useState('adset')
  const [syncing, setSyncing] = useState(false)
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [leadsOpen, setLeadsOpen] = useState(false)
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
          {isAdmin && conn?.connected && <button onClick={syncMeta} disabled={syncing} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border rounded-full px-2.5 py-1.5 hover:text-soren-text transition-colors disabled:opacity-60"><RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Sync…' : 'Sync Meta'}</button>}
        </div>
      </div>
      {connectOpen && <MetaConnectModal onClose={() => setConnectOpen(false)} />}
      {leadsOpen && <MetaLeadsModal onClose={() => setLeadsOpen(false)} />}

      <div className={`flex-1 overflow-y-auto p-7 transition-opacity duration-200 ${refreshing ? 'opacity-70' : 'opacity-100'}`}>
        {tab === 'guide' ? <MetaGuide /> : (<>
        {syncErr && (
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-none" />
            Échec de la synchronisation Meta : {syncErr}
          </div>
        )}
        {/* KPIs ligne 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-2 md:mb-3">
          <KpiCard icon={DollarSign}        label="Dépense"     value={loading ? v : chf(k!.spend.value)}        suffix={cur} delta={loading ? null : k!.spend.delta}       color="#16A34A" />
          <KpiCard icon={Eye}               label="Impressions" value={loading ? v : nf(k!.impressions.value)}   delta={loading ? null : k!.impressions.delta} color="#0EA5E9" />
          <KpiCard icon={MousePointerClick} label="Clics"       value={loading ? v : nf(k!.clicks.value)}        delta={loading ? null : k!.clicks.delta}      color="#8B5CF6" />
          <KpiCard icon={Users}             label="Leads"       value={loading ? v : nf(k!.leads.value)}         delta={loading ? null : k!.leads.delta}       color="#3462EE" onClick={() => setLeadsOpen(true)} />
        </div>
        {/* KPIs ligne 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 mb-5">
          <KpiCard icon={DollarSign} label="CPL" value={loading ? v : cpl(k!.cpl.value)} suffix={cur} delta={loading ? null : k!.cpl.delta} color="#FF4D00" />
          <KpiCard icon={Percent}    label="CTR" value={loading ? v : pct(k!.ctr.value)} suffix="%"   delta={loading ? null : k!.ctr.delta} color="#D97706" />
          <KpiCard icon={Gauge}      label="CR"  value={loading ? v : pct(k!.cr.value)}  suffix="%"   delta={loading ? null : k!.cr.delta} color="#14B8A6" />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-5">
          <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-3">Évolution CPL</h3>
            <div className="h-[180px]">
              {!loading && d!.series.length > 0 ? <MetaCplChart data={d!.series} /> : <EmptyChart />}
            </div>
          </div>
          <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-3">Leads générés</h3>
            <div className="h-[180px]">
              {!loading && d!.series.length > 0 ? <MetaLeadsChart data={d!.series} /> : <EmptyChart />}
            </div>
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
                    <td className="px-5 py-3 text-right"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full ${PERF[r.perf].cls}`}><span className="w-[6px] h-[6px] rounded-full bg-current" />{PERF[r.perf].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Détail par niveau */}
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-soren-text tracking-tight whitespace-nowrap">Détail par {level === 'campaign' ? 'campagne' : level === 'creative' ? 'publicité' : 'adset'}</h3>
            <div className="flex bg-soren-elevated border border-soren-border rounded-full p-[3px] text-[11px] font-medium">
              {LEVELS.map(l => <button key={l.k} onClick={() => setLevel(l.k)} className={`px-2.5 py-1 rounded-full transition-colors ${level === l.k ? 'bg-soren-accent text-white' : 'text-soren-muted hover:text-soren-text'}`}>{l.label}</button>)}
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
                {loading ? null : d!.detail.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-soren-muted text-[13px] py-10">Aucune donnée</td></tr>
                ) : d!.detail.map(r => (
                  <tr key={r.id} className="text-[11.5px] font-normal border-b border-soren-border last:border-0">
                    <td className="px-5 py-3 font-medium text-soren-text">
                      {dLvl === 'creative'
                        ? <div className="flex items-center gap-3"><CreaThumb r={r} onOpen={setMedia} /><span className="min-w-0">{r.name}</span></div>
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
            {media.isVideo
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

// Vignette cliquable d'une créa (photo, ou vidéo avec play) — ouvre la lightbox.
function CreaThumb({ r, onOpen }: { r: Row; onOpen: (m: MediaView) => void }) {
  const poster = r.videoThumb || r.thumbnailUrl || r.imageUrl || null
  const isVideo = !!r.videoSource
  const src = r.videoSource || r.imageUrl || r.thumbnailUrl || null
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
