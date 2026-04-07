'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
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
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] text-[#777] mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ─── SVG Donut ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DONUT_PALETTE = ['#4A91A8', '#A78BFA', '#FB923C', '#EFE347', '#E2FF8D', '#EF4444']
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STATUS_COLORS: Record<string, string> = {
  open: '#3462EE', won: '#E2FF8D', lost: '#EF4444', abandoned: '#6B7280',
}

function SvgDonut({ data }: { data: { name: string; value: number; color: string; pct: number }[] }) {
  const filtered = data.filter(d => d.value > 0)
  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: 80, height: 80 }}>
        <span className="text-[10px] text-[#555]">—</span>
      </div>
    )
  }
  const R = 36; const SW = 10; const CX = 44; const CY = 44
  const circumference = 2 * Math.PI * R
  const total = filtered.reduce((s, d) => s + d.value, 0) || 1
  let offset = 0
  const slices = filtered.map(d => {
    const dash = (d.value / total) * circumference
    const gap  = circumference - dash
    const slice = { ...d, dash, gap, offset }
    offset += dash
    return slice
  })
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#3A3A3A" strokeWidth={SW} />
      {slices.map((s, i) => (
        <circle key={i} cx={CX} cy={CY} r={R} fill="none"
          stroke={s.color} strokeWidth={SW}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={circumference / 4 - s.offset}
        />
      ))}
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">
        {total}
      </text>
    </svg>
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // ── Pie: répartition par source ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sourcePieData = useMemo(() => {
    const counts: Record<string, number> = {}
    pipelineOpps.forEach(o => {
      // GHL source field may not be populated — group as 'Non défini'
      const src = (o as unknown as { source?: string }).source || 'Non défini'
      counts[src] = (counts[src] || 0) + 1
    })
    const total = pipelineOpps.length || 1
    const COLORS = ['#3462EE', '#4A91A8', '#E2FF8D', '#F97316', '#8B5CF6', '#EC4899', '#22c55e', '#9CA3AF']
    return Object.entries(counts).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length], pct: Math.round(value / total * 100),
    })).sort((a, b) => b.value - a.value)
  }, [pipelineOpps])

  // ── Leads par heure ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hourlyData = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    periodOpps.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      if (h >= 0 && h <= 23) counts[h].count++
    })
    return counts
  }, [periodOpps])

  // ── Source bars ───────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    pipelineOpps.forEach(o => {
      const src = (o as unknown as { source?: string }).source || 'Non défini'
      counts[src] = (counts[src] || 0) + 1
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

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-[#EEF0EB]">
      <div className="p-5 flex flex-col gap-3 max-w-[1600px]">

        {/* ── Header + Filtres ── */}
        <div className="flex items-center justify-between gap-4 mb-1">
          <div>
            <h1 className="text-2xl font-black text-[#111111]">Analyse</h1>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Performance pipeline · données CRM</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {pipelineTabs.map(tab => (
                <button key={tab.id} onClick={() => setSelectedPipeline(tab.id)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPipeline === tab.id ? 'bg-[#111] text-white font-bold' : 'text-[#6B7280] hover:text-[#111]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriodDays(p.days)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    periodDays === p.days ? 'bg-[#111] text-white font-bold' : 'text-[#6B7280] hover:text-[#111]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 1 : Objectifs de vente ── */}
        <div className="grid grid-cols-3 gap-3">
          {objectives.map(obj => (
            <div key={obj.label} className="bg-[#2E2E2E] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#777] uppercase tracking-wider">{obj.label}</span>
                <span className="text-[10px] font-bold" style={{ color: obj.color }}>{obj.pct}%</span>
              </div>
              <div className="h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${obj.pct}%`, background: obj.color }} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{obj.current}</span>
                <span className="text-[11px] text-[#555]">/ {obj.target}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2 : KPI cards ── */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Leads entrants',   value: String(kpis.total),          sub: `sur ${periodDays}j` },
            { label: 'Valeur pipeline',  value: fmt(kpis.pipelineValue),      sub: 'deals ouverts' },
            { label: 'Taux conversion',  value: `${kpis.conversionRate}%`,    sub: `${kpis.wonCount} won` },
            { label: 'Durée moy.',       value: `${kpis.avgDays}j`,           sub: 'leads gagnés' },
            { label: 'Leads actifs',     value: String(kpis.activeCount),     sub: 'status open' },
            { label: 'Valeur moy.',      value: fmt(kpis.avgValue),           sub: 'par lead' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#2E2E2E] rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-[9px] text-[#777] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-black text-white leading-none">{kpi.value}</p>
              <p className="text-[9px] text-[#555]">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Section 3 : Leads par jour + Leads par heure ── */}
        <div className="flex gap-3">

          {/* Leads par jour */}
          <div className="flex-1 bg-[#2E2E2E] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-white">Leads par jour</span>
              <span className="text-[9px] text-[#555]">{periodDays} derniers jours</span>
            </div>
            {chartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-28">
                <p className="text-[11px] text-[#555]">Aucun lead sur la période</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" fill="#E2FF8D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Leads par heure */}
          <div className="bg-[#2E2E2E] rounded-2xl p-4" style={{ width: 280 }}>
            <span className="text-[11px] font-bold text-white block mb-4">Leads par heure</span>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourlyData} barCategoryGap="20%">
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#555', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(h: number) => [0, 6, 12, 18].includes(h) ? `${h}h` : ''}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
                        <p className="text-[10px] text-[#777] mb-0.5">{label}h</p>
                        <p className="text-sm font-bold text-white">{payload[0].value} lead{Number(payload[0].value) !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill="#E2FF8D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* ── Section 4 : Entonnoir + Source ── */}
        <div className="flex gap-3">

          {/* Entonnoir */}
          <div className="flex-1 bg-[#2E2E2E] rounded-2xl p-4">
            <span className="text-[11px] font-bold text-white block mb-4">Funnel par étape</span>
            {funnelData.length === 0 ? (
              <p className="text-[11px] text-[#555] text-center py-6">Aucun stage</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {funnelData.map(stage => (
                  <div key={stage.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <span className="text-[10px] text-[#999] truncate max-w-[160px]">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">{stage.count}</span>
                        {stage.value > 0 && <span className="text-[9px] text-[#555]">{fmt(stage.value)}</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${stage.pct}%`, background: stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads par source */}
          <div className="bg-[#2E2E2E] rounded-2xl p-4" style={{ width: 280 }}>
            <span className="text-[11px] font-bold text-white block mb-4">Leads par source</span>
            {sourceData.length === 0 ? (
              <p className="text-[11px] text-[#555] text-center py-6">Aucune donnée</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sourceData.map(src => (
                  <div key={src.name} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#888] flex-shrink-0" style={{ width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {src.name}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#E2FF8D]" style={{ width: `${src.pct}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-white flex-shrink-0 w-5 text-right">{src.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
