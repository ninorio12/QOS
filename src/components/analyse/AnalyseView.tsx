'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

const DailyBarChart  = dynamic(() => import('./AnalyseCharts').then(m => m.DailyBarChart),  { ssr: false })
const HourlyBarChart = dynamic(() => import('./AnalyseCharts').then(m => m.HourlyBarChart), { ssr: false })
import { type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'

// ─── Types ────────────────────────────────────────────────────
type Props = {
  opportunities: GHLOpportunity[]
  pipelines: GHLPipeline[]
  initialPipeline: string
  initialPeriod: number
}

const PERIODS = [
  { label: '7j',  days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
]

// ─── Helpers ────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Math.round(v / 1_000)}k`
  return `€${v.toLocaleString('fr-FR')}`
}

function cleanStageName(name: string) {
  return name.replace(/^[^\w\d]+\s*/, '').trim()
}

// ─── Dark tooltip ─────────────────────────────────────────────
// ─── SVG Donut ────────────────────────────────────────────────
function SvgDonut({
  data, centerNum, centerSub, centerColor, trackColor,
}: {
  data: { name: string; value: number; color: string; pct: number }[]
  centerNum: string
  centerSub: string
  centerColor: string
  trackColor: string
}) {
  const filtered = data.filter(d => d.value > 0)
  if (filtered.length === 0) {
    return (
      <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <span className="text-[10px] text-[#555]">—</span>
      </div>
    )
  }
  const R = 34; const SW = 11; const CX = 48; const CY = 48
  const circumference = 2 * Math.PI * R
  const total = filtered.reduce((s, d) => s + d.value, 0) || 1
  let offset = 0
  const slices = filtered.map(d => {
    const dash = (d.value / total) * circumference
    const slice = { ...d, dash, offset }
    offset += dash
    return slice
  })
  return (
    <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={trackColor} strokeWidth={SW} />
        {slices.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={s.color} strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={circumference / 4 - s.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[18px] font-black leading-none" style={{ color: centerColor }}>{centerNum}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: centerColor, opacity: 0.5 }}>{centerSub}</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function AnalyseView({ opportunities, pipelines, initialPipeline, initialPeriod }: Props) {
  const [selectedPipeline, setSelectedPipeline] = useState(initialPipeline)
  const [periodDays, setPeriodDays] = useState(initialPeriod)

  const pipelineTabs = useMemo(() => [
    { id: 'TOUS', label: 'Tous' },
    ...pipelines.map(p => ({ id: p.id, label: p.name })),
  ], [pipelines])

  const pipelineOpps = useMemo(() =>
    selectedPipeline === 'TOUS' ? opportunities : opportunities.filter(o => o.pipelineId === selectedPipeline),
    [opportunities, selectedPipeline]
  )

  const since = Date.now() - periodDays * 86400000
  const periodOpps = useMemo(() =>
    pipelineOpps.filter(o => new Date(o.createdAt).getTime() >= since),
    [pipelineOpps, since]
  )

  const stageNames = useMemo(() => {
    const map: Record<string, string> = {}
    pipelines.forEach(p => p.stages.forEach(s => { map[s.id] = cleanStageName(s.name) }))
    return map
  }, [pipelines])

  // ── KPIs ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total       = periodOpps.length
    const wonOpps     = pipelineOpps.filter(o => o.status === 'won')
    const wonCount    = wonOpps.length
    const activeCount = pipelineOpps.filter(o => o.status === 'open').length
    const pipelineValue = pipelineOpps.filter(o => o.status === 'open').reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
    const qualifCount = periodOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('qualif') || n.includes('rdv') || n.includes('book')
    }).length
    const rdvCount = periodOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('rdv') || n.includes('book')
    }).length
    const h24ago = Date.now() - 24 * 3600_000
    const noResponseCount = pipelineOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return o.status === 'open' && (n.includes('sans') || n.includes('réponse')) && new Date(o.updatedAt).getTime() < h24ago
    }).length
    const conversionRate = pipelineOpps.length > 0 ? Math.round((wonCount / pipelineOpps.length) * 100) : 0
    const qualifRate = total > 0 ? Math.round((qualifCount / total) * 100) : 0
    const avgDays = wonOpps.length > 0
      ? Math.round(wonOpps.reduce((s, o) => {
          const diff = new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()
          return s + diff / 86400000
        }, 0) / wonOpps.length)
      : 0
    const avgValue = pipelineOpps.length > 0
      ? Math.round(pipelineOpps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0) / pipelineOpps.length)
      : 0
    return { total, pipelineValue, qualifCount, qualifRate, rdvCount, noResponseCount, wonCount, conversionRate, avgDays, activeCount, avgValue }
  }, [periodOpps, pipelineOpps, stageNames])

  // ── Bar chart ────────────────────────────────────────────────
  const chartData = useMemo(() => Array.from({ length: periodDays }, (_, i) => {
    const d = new Date(Date.now() - (periodDays - 1 - i) * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    const count = periodOpps.filter(o => o.createdAt.startsWith(dateStr)).length
    const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const label = periodDays <= 7
      ? DAYS[d.getDay()]
      : periodDays <= 30
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `S${Math.ceil(d.getDate() / 7)} ${['Jan','Fév','Mar','Avr','Mai','Jui','Jul','Aoû','Sep','Oct','Nov','Déc'][d.getMonth()]}`
    return { date: dateStr, count, label }
  }), [periodOpps, periodDays])

  // ── Funnel ────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const selectedPipelineObj = selectedPipeline === 'TOUS' ? null : pipelines.find(p => p.id === selectedPipeline)
    const stages = selectedPipelineObj?.stages ?? pipelines[0]?.stages ?? []
    const STAGE_COLORS: Record<string, string> = {
      'Nouveau Lead': '#3D4F6B', '1er Contact IA': '#4A91A8', 'En Conversation': '#3462EE',
      'Qualifié': '#E2FF8D', 'RDV Booké': '#EFE347', 'Non Qualifié': '#8896AB',
      'Sans Réponse': '#EC4899', 'Perdu': '#EF4444', 'À Réactiver': '#3D4F6B',
      'Séquence en cours': '#4A91A8', 'A Répondu': '#3462EE', 'Re-Qualifié': '#E2FF8D',
    }
    const stageCount: Record<string, { count: number; value: number }> = {}
    stages.forEach(s => { stageCount[s.id] = { count: 0, value: 0 } })
    pipelineOpps.forEach(o => {
      if (stageCount[o.pipelineStageId]) {
        stageCount[o.pipelineStageId].count++
        stageCount[o.pipelineStageId].value += o.monetaryValue ?? 0
      }
    })
    const total = Object.values(stageCount).reduce((s, v) => s + v.count, 0) || 1
    const maxCount = Math.max(...Object.values(stageCount).map(v => v.count), 1)
    return stages.sort((a, b) => a.position - b.position).map(s => {
      const name = cleanStageName(s.name)
      const { count, value } = stageCount[s.id] ?? { count: 0, value: 0 }
      return {
        id: s.id, name, count, value,
        pct: count > 0 ? Math.max(Math.round((count / maxCount) * 100), 8) : 3,
        pctTotal: Math.round((count / total) * 100),
        color: STAGE_COLORS[name] ?? '#3462EE',
      }
    })
  }, [pipelines, pipelineOpps, selectedPipeline])

  // ── Pie: répartition par statut ──────────────────────────────
  const statusPieData = useMemo(() => {
    const counts = { open: 0, won: 0, lost: 0, abandoned: 0 }
    pipelineOpps.forEach(o => { if (o.status in counts) counts[o.status as keyof typeof counts]++ })
    const total = pipelineOpps.length || 1
    return [
      { name: 'Ouverts',    value: counts.open,      color: '#3462EE', pct: Math.round(counts.open / total * 100) },
      { name: 'Gagnés',     value: counts.won,       color: '#E2FF8D', pct: Math.round(counts.won / total * 100) },
      { name: 'Perdus',     value: counts.lost,      color: '#EF4444', pct: Math.round(counts.lost / total * 100) },
      { name: 'Abandonnés', value: counts.abandoned,  color: '#9CA3AF', pct: Math.round(counts.abandoned / total * 100) },
    ]
  }, [pipelineOpps])

  // ── Pie: répartition par pipeline ────────────────────────────
  const pipelinePieData = useMemo(() => {
    const PIPELINE_COLORS = ['#3462EE', '#F97316', '#22c55e', '#8B5CF6', '#EC4899']
    const total = opportunities.length || 1
    return pipelines.map((p, i) => {
      const count = opportunities.filter(o => o.pipelineId === p.id).length
      return {
        name: p.name, value: count, color: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
        pct: Math.round(count / total * 100),
      }
    })
  }, [opportunities, pipelines])

  // ── Leads par heure ──────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    periodOpps.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      if (h >= 0 && h <= 23) counts[h].count++
    })
    return counts
  }, [periodOpps])

  // ── Source bars ───────────────────────────────────────────────
  const SOURCE_LABELS: Record<string, string> = {
    'facebook':             'Meta Ads',
    'facebook-lead-ad':     'Meta Ads',
    'fb':                   'Meta Ads',
    'meta':                 'Meta Ads',
    'google':               'Google Ads',
    'google-ads':           'Google Ads',
    'instagram':            'Instagram',
    'linkedin':             'LinkedIn',
    'website':              'Site web',
    'web':                  'Site web',
    'form':                 'Formulaire',
    'landing-page':         'Landing page',
    'email':                'Email',
    'sms':                  'SMS',
    'phone':                'Téléphone',
    'call':                 'Téléphone',
    'chat':                 'Chat',
    'whatsapp':             'WhatsApp',
    'manual':               'Manuel',
    'import':               'Import',
    'csv':                  'Import',
    'api':                  'API',
    'referral':             'Parrainage',
    'organic':              'Organique',
    'seed-script':          'Import',
    'seed':                 'Import',
    'demo':                 'Démo',
  }

  function normalizeSource(raw: string | null | undefined): string {
    if (!raw) return 'Manuel'
    const key = raw.toLowerCase().trim()
    return SOURCE_LABELS[key] ?? raw.charAt(0).toUpperCase() + raw.slice(1).replace(/-/g, ' ')
  }

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    pipelineOpps.forEach(o => {
      const label = normalizeSource(o.source)
      counts[label] = (counts[label] || 0) + 1
    })
    const max = Math.max(...Object.values(counts), 1)
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [pipelineOpps])

  // ── Objectifs de vente ────────────────────────────────────────
  const objectives = useMemo(() => {
    const total        = pipelineOpps.length || 1
    const wonCount     = pipelineOpps.filter(o => o.status === 'won').length
    const qualifCount  = pipelineOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('qualif') || n.includes('rdv') || n.includes('book')
    }).length
    const pipelineValue = pipelineOpps.filter(o => o.status === 'open').reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
    const convRate     = Math.round((wonCount / total) * 100)
    const CA_TARGET    = 100_000
    const QUALIF_TARGET = 30
    const CONV_TARGET  = 25
    return [
      {
        label: "Chiffre d'affaires", current: fmt(pipelineValue), target: fmt(CA_TARGET),
        pct: Math.min(Math.round((pipelineValue / CA_TARGET) * 100), 100), color: '#E2FF8D',
      },
      {
        label: 'Leads qualifiés', current: String(qualifCount), target: String(QUALIF_TARGET),
        pct: Math.min(Math.round((qualifCount / QUALIF_TARGET) * 100), 100), color: '#A78BFA',
      },
      {
        label: 'Taux de conversion', current: `${convRate}%`, target: `${CONV_TARGET}%`,
        pct: Math.min(Math.round((convRate / CONV_TARGET) * 100), 100), color: '#FB923C',
      },
    ]
  }, [pipelineOpps, stageNames])

  const CARD = 'rounded-2xl' as const
  const SHADOW = { boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)' } as const
  const DARK = '#1C1C1E' as const

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-soren-app">
      <div className="p-5 flex flex-col gap-2.5 max-w-[1600px]">

        {/* ── Header + Filtres ── */}
        <div className="flex items-center justify-between gap-4 mb-1" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
          <h1 className="text-[22px] font-black text-soren-text tracking-tight">Analyse</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-[10px] p-[3px]">
              {pipelineTabs.map(tab => (
                <button key={tab.id} onClick={() => setSelectedPipeline(tab.id)}
                  className={`text-[11px] font-medium px-3 py-[5px] rounded-[7px] transition-colors ${
                    selectedPipeline === tab.id ? 'bg-[#1a1a1a] text-white font-bold' : 'text-[#888] hover:text-[#111]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-[10px] p-[3px]">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriodDays(p.days)}
                  className={`text-[11px] font-medium px-3 py-[5px] rounded-[7px] transition-colors ${
                    periodDays === p.days ? 'bg-[#1a1a1a] text-white font-bold' : 'text-[#888] hover:text-[#111]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 1 : Objectifs de vente ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]" style={{ animation: 'fadeSlideUp 400ms ease-out 60ms both' }}>Objectifs de vente</p>
        <div className="grid grid-cols-3 gap-2.5" style={{ animation: 'fadeSlideUp 400ms ease-out 80ms both' }}>
          {objectives.map((obj, idx) => {
            const S = [
              { bg: '#E2FF8D', text: '#111', muted: '#556b00', barBg: 'rgba(0,0,0,0.1)',          fillC: '#111111' },
              { bg: DARK,      text: '#fff', muted: '#666',    barBg: 'rgba(255,255,255,0.08)', fillC: '#E2FF8D' },
              { bg: '#ffffff', text: '#111', muted: '#888',    barBg: '#EBEBEB',                fillC: '#111111' },
            ][idx]!
            return (
              <div key={obj.label} className={`${CARD} p-4 flex flex-col gap-2.5`} style={{ background: S.bg, ...SHADOW }}>
                <p className="text-[10px] font-semibold uppercase tracking-[.6px]" style={{ color: S.muted }}>{obj.label}</p>
                <p className="text-[26px] font-black leading-none tracking-tight" style={{ color: S.text }}>{obj.current}</p>
                <p className="text-[10px]" style={{ color: S.muted }}>Objectif : {obj.target}</p>
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: S.barBg }}>
                  <div className="h-full rounded-full" style={{ width: `${obj.pct}%`, background: S.fillC }} />
                </div>
                <p className="text-[11px] font-bold" style={{ color: S.fillC }}>{obj.pct}%</p>
              </div>
            )
          })}
        </div>

        {/* ── Section 2 : KPI cards ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]" style={{ animation: 'fadeSlideUp 400ms ease-out 150ms both' }}>Métriques</p>
        <div className="grid grid-cols-6 gap-2.5" style={{ animation: 'fadeSlideUp 400ms ease-out 170ms both' }}>
          {[
            { label: 'Total leads',     value: String(kpis.total),        trend: `sur ${periodDays}j`,  bg: DARK,      text: '#fff', muted: '#666', trendC: '#E2FF8D' },
            { label: 'Pipeline',        value: fmt(kpis.pipelineValue),   trend: 'deals ouverts',    bg: '#ffffff', text: '#111', muted: '#888', trendC: '#111111' },
            { label: 'Conversion',      value: `${kpis.conversionRate}%`, trend: `${kpis.wonCount} gagné${kpis.wonCount > 1 ? 's' : ''}`, bg: DARK, text: '#fff', muted: '#666', trendC: '#E2FF8D' },
            { label: 'Durée moy.',      value: `${kpis.avgDays}j`,        trend: 'leads gagnés',     bg: '#ffffff', text: '#111', muted: '#888', trendC: '#888'    },
            { label: 'Leads actifs',    value: String(kpis.activeCount),  trend: 'statut ouvert',    bg: DARK,      text: '#fff', muted: '#666', trendC: '#E2FF8D' },
            { label: 'Valeur moy.',     value: fmt(kpis.avgValue),        trend: 'par lead',         bg: '#ffffff', text: '#111', muted: '#888', trendC: '#111111' },
          ].map(kpi => (
            <div key={kpi.label} className={`${CARD} p-3.5 flex flex-col gap-2`} style={{ background: kpi.bg, ...SHADOW }}>
              <p className="text-[10px] font-semibold uppercase tracking-[.6px]" style={{ color: kpi.muted }}>{kpi.label}</p>
              <p className="text-[22px] font-black leading-none tracking-tight" style={{ color: kpi.text }}>{kpi.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: kpi.trendC }}>{kpi.trend}</p>
            </div>
          ))}
        </div>

        {/* ── Section 3 : Activité ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]" style={{ animation: 'fadeSlideUp 400ms ease-out 240ms both' }}>Activité</p>
        <div className="flex gap-2.5" style={{ animation: 'fadeSlideUp 400ms ease-out 260ms both' }}>

          {/* Leads par jour — fond dark */}
          <div className={`flex-1 ${CARD} p-[18px]`} style={{ background: DARK, ...SHADOW }}>
            <p className="text-[12px] font-bold text-white mb-3.5">Leads par jour</p>
            {chartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-24">
                <p className="text-[11px] text-[#555]">Aucun lead sur la période</p>
              </div>
            ) : (
              <DailyBarChart data={chartData} />
            )}
          </div>

          {/* Leads par heure — fond blanc */}
          <div className={`${CARD} p-[18px]`} style={{ background: '#fff', width: 260, ...SHADOW }}>
            <p className="text-[12px] font-bold text-[#111] mb-3">Par heure</p>
            <HourlyBarChart data={hourlyData} />
          </div>

        </div>

        {/* ── Section 4 : Entonnoir + Source ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]">Entonnoir &amp; sources</p>
        <div className="flex gap-2.5">

          {/* Entonnoir — fond blanc */}
          <div className={`flex-1 ${CARD} p-[18px]`} style={{ background: '#fff', ...SHADOW }}>
            <p className="text-[12px] font-bold text-[#111] mb-3.5">Entonnoir de vente</p>
            {funnelData.length === 0 ? (
              <p className="text-[11px] text-soren-subtle text-center py-6">Aucun stage</p>
            ) : (
              <div className="flex flex-col">
                {funnelData.map(stage => (
                  <div key={stage.id} className="flex items-center gap-2.5 py-[6px] border-b border-[#F0F0EB] last:border-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                    <span className="text-[11px] text-[#888] font-medium flex-1 truncate">{stage.name}</span>
                    <div className="w-24 h-[5px] rounded-full overflow-hidden" style={{ background: '#EBEBEB' }}>
                      <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, background: stage.color }} />
                    </div>
                    <span className="text-[12px] font-bold text-[#111] w-7 text-right flex-shrink-0">{stage.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads par source — fond dark */}
          <div className={`${CARD} p-[18px]`} style={{ background: DARK, width: 240, ...SHADOW }}>
            <p className="text-[12px] font-bold text-white mb-3.5">Par source</p>
            {sourceData.length === 0 ? (
              <p className="text-[11px] text-[#555] text-center py-6">Aucune donnée</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sourceData.map(src => (
                  <div key={src.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#666] flex-shrink-0 truncate" style={{ width: 80 }}>{src.name}</span>
                    <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full bg-[#E2FF8D]" style={{ width: `${src.pct}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-white flex-shrink-0 w-5 text-right">{src.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Section 5 : Donuts ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]">Répartition</p>
        <div className="grid grid-cols-3 gap-2.5">
          {([
            {
              title: 'Par statut',
              bg: '#1C1C1E', titleC: '#fff', centerColor: '#fff', trackColor: 'rgba(255,255,255,0.07)',
              labelC: '#888', valC: '#fff', barTrack: 'rgba(255,255,255,0.08)',
              centerSub: 'leads',
              data: [
                { name: 'Actif',      color: '#E2FF8D', value: statusPieData.find(d => d.name === 'Ouverts')?.value    ?? 0, pct: statusPieData.find(d => d.name === 'Ouverts')?.pct    ?? 0 },
                { name: 'Gagné',      color: '#ffffff', value: statusPieData.find(d => d.name === 'Gagnés')?.value     ?? 0, pct: statusPieData.find(d => d.name === 'Gagnés')?.pct     ?? 0 },
                { name: 'Perdu',      color: '#555555', value: statusPieData.find(d => d.name === 'Perdus')?.value     ?? 0, pct: statusPieData.find(d => d.name === 'Perdus')?.pct     ?? 0 },
                { name: 'Abandonné',  color: '#333333', value: statusPieData.find(d => d.name === 'Abandonnés')?.value ?? 0, pct: statusPieData.find(d => d.name === 'Abandonnés')?.pct ?? 0 },
              ],
            },
            {
              title: 'Par pipeline',
              bg: '#ffffff', titleC: '#111', centerColor: '#111', trackColor: '#E4E4E0',
              labelC: '#888', valC: '#111', barTrack: '#EBEBEB',
              centerSub: 'pipelines',
              data: pipelinePieData.map((d, i) => ({ ...d, color: i === 0 ? '#111111' : '#E2FF8D' })),
            },
            {
              title: 'Par source',
              bg: '#E2FF8D', titleC: '#111', centerColor: '#111', trackColor: 'rgba(0,0,0,0.1)',
              labelC: '#3a5200', valC: '#111', barTrack: 'rgba(0,0,0,0.08)',
              centerSub: 'sources',
              data: sourceData.slice(0, 4).map((d, i) => ({
                name: d.name, value: d.count, pct: d.pct,
                color: ['#111111', '#ffffff', '#555555', '#333333'][i] ?? '#444',
              })),
            },
          ]).map(card => {
            const total = card.data.reduce((s, d) => s + d.value, 0)
            return (
              <div key={card.title} className={`${CARD} p-4`} style={{ background: card.bg, ...SHADOW }}>
                <span className="text-[11px] font-bold block mb-3" style={{ color: card.titleC }}>{card.title}</span>
                <div className="flex items-center gap-4">
                  <SvgDonut
                    data={card.data} centerNum={String(total)}
                    centerSub={card.centerSub} centerColor={card.centerColor} trackColor={card.trackColor}
                  />
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {card.data.filter(d => d.value > 0).map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-[9px] flex-1 truncate" style={{ color: card.labelC }}>{d.name}</span>
                        <div className="w-10 h-[3px] rounded-full overflow-hidden flex-shrink-0" style={{ background: card.barTrack }}>
                          <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                        </div>
                        <span className="text-[10px] font-bold w-7 text-right flex-shrink-0" style={{ color: card.valC }}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Section 6 : Table — fond blanc ── */}
        <p className="text-[9px] font-bold uppercase tracking-[.8px] text-[#aaa]">Détail par étape</p>
        <div className={`${CARD} bg-soren-card p-3`} style={SHADOW}>
          <div className="flex items-center px-3 pb-2 mb-1">
            <span className="text-[8px] font-bold text-[#C0C0B8] uppercase tracking-wider flex-1">Étape</span>
            <span className="text-[8px] font-bold text-[#C0C0B8] uppercase tracking-wider w-28">Volume</span>
            <span className="text-[8px] font-bold text-[#C0C0B8] uppercase tracking-wider w-14 text-right">Leads</span>
            <span className="text-[8px] font-bold text-[#C0C0B8] uppercase tracking-wider w-20 text-right">Valeur</span>
            <span className="text-[8px] font-bold text-[#C0C0B8] uppercase tracking-wider w-12 text-right">%</span>
          </div>
          {funnelData.length === 0 ? (
            <p className="text-[11px] text-soren-subtle text-center py-6">Aucune donnée</p>
          ) : (
            funnelData.map((stage, i) => (
              <div key={stage.id}
                className="flex items-center px-3 py-2.5 rounded-xl mb-0.5"
                style={{ background: i % 2 === 1 ? '#F8F8F5' : 'transparent' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                  <span className="text-[11px] font-semibold text-[#333] truncate">{stage.name}</span>
                </div>
                <div className="w-28 pr-3">
                  <div className="h-1.5 bg-[#EAEAE6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, background: stage.color }} />
                  </div>
                </div>
                <span className="text-[13px] font-black text-[#111] w-14 text-right tracking-tight">{stage.count}</span>
                <span className="text-[10px] text-[#999] w-20 text-right">{stage.value > 0 ? fmt(stage.value) : '—'}</span>
                <div className="w-12 flex justify-end">
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    stage.pctTotal === 100 ? 'bg-[#E2FF8D] text-[#3a5200]' :
                    stage.pctTotal > 30   ? 'bg-[#DCFCE7] text-[#166534]' :
                                            'bg-[#EAEAE6] text-[#666]'
                  }`}>
                    {stage.pctTotal}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
