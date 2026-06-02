'use client'

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts'
import type { ClientTimelinePoint } from '@/lib/dashboard'

function fmt(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`
  return `€${Math.round(v).toLocaleString('fr-FR')}`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ClientTimelineChart({ data }: { data: ClientTimelinePoint[] }) {
  const chartData = data.map(p => ({ ...p, label: fmtDate(p.date) }))
  const visibleTicks = chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 5)) === 0).map(d => d.label)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          ticks={visibleTicks}
          interval="preserveStartEnd"
        />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, padding: '6px 10px' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => fmt(v as number)}
          labelStyle={{ color: '#111', fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#FF4D00"
          strokeWidth={2}
          dot={<Dot r={3} fill="#FF4D00" strokeWidth={0} />}
          activeDot={{ r: 5, fill: '#FF4D00', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
