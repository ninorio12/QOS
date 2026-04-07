'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip as PieTooltip,
} from 'recharts'
import { ArrowUpRight, TrendingUp, Users, Target, CalendarCheck, Clock, Award } from 'lucide-react'
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

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string; value: string; sub?: string; color: string
  icon: React.ElementType; trend?: string | null
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280] font-medium">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-[#111111] leading-none">{value}</p>
        {trend && (
          <div className="flex items-center gap-0.5 text-xs font-semibold mb-0.5 text-[#22c55e]">
            <ArrowUpRight size={12} />{trend}
          </div>
        )}
      </div>
      {sub && <p className="text-xs text-[#9CA3AF]">{sub}</p>}
    </div>
  )
}

// ─── Bar tooltip ─────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 shadow-md">
      <p className="text-[10px] text-[#9CA3AF] mb-0.5">{label}</p>
      <p className="text-sm font-bold text-[#111111]">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ─── Pie tooltip ─────────────────────────────────────────────
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 shadow-md">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.payload.color }} />
        <p className="text-[10px] text-[#9CA3AF]">{item.name}</p>
      </div>
      <p className="text-sm font-bold text-[#111111]">{item.value} lead{item.value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ─── Pie legend row ───────────────────────────────────────────
function PieLegend({ data }: { data: { name: string; value: number; color: string; pct: number }[] }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {data.map(d => (
        <div key={d.name} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-[#374151] truncate">{d.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-[#111111]">{d.value}</span>
            <span className="text-[10px] text-[#9CA3AF] w-8 text-right">{d.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pie card ─────────────────────────────────────────────────
function PieCard({ title, data }: { title: string; data: { name: string; value: number; color: string; pct: number }[] }) {
  const filtered = data.filter(d => d.value > 0)
  const empty = filtered.length === 0

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-[#111111]">{title}</h2>
      {empty ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-[#9CA3AF]">Aucune donnée</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <PieChart width={130} height={130}>
              <Pie
                data={filtered}
                cx={60}
                cy={60}
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {filtered.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <PieTooltip content={<CustomPieTooltip />} />
            </PieChart>
          </div>
          <PieLegend data={filtered} />
        </div>
      )}
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
    const total = periodOpps.length
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
    const wonCount = pipelineOpps.filter(o => o.status === 'won').length
    const conversionRate = pipelineOpps.length > 0 ? Math.round((wonCount / pipelineOpps.length) * 100) : 0
    const qualifRate = total > 0 ? Math.round((qualifCount / total) * 100) : 0
    return { total, pipelineValue, qualifCount, qualifRate, rdvCount, noResponseCount, wonCount, conversionRate }
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

  // ── Pie: répartition par source ──────────────────────────────
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
      <div className="p-6 flex flex-col gap-6 max-w-[1600px]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#111111]">Analyse</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Performance pipeline · données CRM</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {pipelineTabs.map(tab => (
                <button key={tab.id} onClick={() => setSelectedPipeline(tab.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPipeline === tab.id ? 'bg-[#3462EE] text-white' : 'text-[#6B7280] hover:text-[#111111]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriodDays(p.days)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    periodDays === p.days ? 'bg-[#EEF0EB] text-[#111111] font-semibold' : 'text-[#6B7280] hover:text-[#111111]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-6 gap-4">
          <KpiCard label="Leads entrants"    value={String(kpis.total)}            sub={`sur ${periodDays} derniers jours`} color="#3462EE" icon={Users}         trend={kpis.total > 0 ? `+${kpis.total}` : null} />
          <KpiCard label="Valeur pipeline"   value={fmt(kpis.pipelineValue)}        sub="deals ouverts"                     color="#22c55e" icon={TrendingUp}    />
          <KpiCard label="Taux qualification" value={`${kpis.qualifRate}%`}         sub={`${kpis.qualifCount} qualifiés`}   color="#4A91A8" icon={Target}        />
          <KpiCard label="RDV bookés"         value={String(kpis.rdvCount)}          sub={`sur ${periodDays}j`}              color="#EFE347" icon={CalendarCheck} />
          <KpiCard label="Sans réponse +24h"  value={String(kpis.noResponseCount)}   sub="nécessitent une relance"           color="#EC4899" icon={Clock}         />
          <KpiCard label="Taux conversion"    value={`${kpis.conversionRate}%`}      sub={`${kpis.wonCount} won`}            color="#8B5CF6" icon={Award}         />
        </div>

        {/* ── Bar chart + Funnel ── */}
        <div className="grid grid-cols-[1fr_340px] gap-5">

          {/* Bar chart */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#111111]">Leads par jour</h2>
              <span className="text-xs text-[#9CA3AF]">{periodDays} derniers jours</span>
            </div>
            {chartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-44">
                <p className="text-sm text-[#9CA3AF]">Aucun lead sur la période</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#EEF0EB' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.count > 0 ? '#3462EE' : '#E5E7EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Funnel */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#111111] mb-4">Funnel par étape</h2>
            {funnelData.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun stage</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {funnelData.map(stage => (
                  <div key={stage.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <span className="text-xs text-[#6B7280] truncate max-w-[130px]">{stage.name}</span>
                        <span className="text-[10px] text-[#9CA3AF]">{stage.count}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#9CA3AF]">
                        {stage.value > 0 ? fmt(stage.value) : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#EEF0EB] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${stage.pct}%`, background: stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Camemberts ── */}
        <div className="grid grid-cols-3 gap-5">
          <PieCard title="Répartition par statut"    data={statusPieData}   />
          <PieCard title="Répartition par pipeline"  data={pipelinePieData} />
          <PieCard title="Répartition par source"    data={sourcePieData}   />
        </div>

        {/* ── Tableau détail ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-semibold text-[#111111]">Détail par étape</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Étape</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Leads</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Valeur</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">% total</th>
              </tr>
            </thead>
            <tbody>
              {funnelData.map((stage, i) => (
                <tr key={stage.id} className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 1 ? 'bg-[#EEF0EB]/40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                      <span className="text-xs text-[#111111] font-medium">{stage.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-semibold text-[#111111]">{stage.count}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-medium text-[#6B7280]">{stage.value > 0 ? fmt(stage.value) : '—'}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-semibold" style={{ color: stage.count > 0 ? '#111111' : '#D1D5DB' }}>
                      {stage.pctTotal}%
                    </span>
                  </td>
                </tr>
              ))}
              {funnelData.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[#9CA3AF]">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
