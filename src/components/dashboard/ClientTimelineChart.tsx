'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts'

type ClientTimelinePoint = { date: string; value: number; ca?: number }

function fmt(v: number) {
  if (!Number.isFinite(v)) v = 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M CHF`
  return `${Math.round(v).toLocaleString('fr-FR')} CHF`
}

export default function ClientTimelineChart({ data }: { data: ClientTimelinePoint[] }) {
  // Amplitude → format d'axe : grande période ⇒ « mois année », sinon « jour mois ».
  const spanDays = data.length > 1 ? (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / 86400000 : 0
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return spanDays > 250
      ? d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
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
        <YAxis yAxisId="ca" hide />
        <YAxis yAxisId="clients" orientation="right" hide />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, padding: '6px 10px' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, name: any) => name === 'Encaissé' ? [fmt(Number(v) || 0), 'Encaissé'] : [`${Number(v) || 0}`, 'Clients']}
          labelStyle={{ color: '#111', fontWeight: 600 }}
        />
        <Line
          yAxisId="ca" type="monotone" dataKey="ca" name="Encaissé"
          stroke="#FF4D00" strokeWidth={2}
          dot={<Dot r={3} fill="#FF4D00" strokeWidth={0} />}
          activeDot={{ r: 5, fill: '#FF4D00', strokeWidth: 0 }}
        />
        <Line
          yAxisId="clients" type="monotone" dataKey="value" name="Clients"
          stroke="#3462EE" strokeWidth={2}
          dot={<Dot r={3} fill="#3462EE" strokeWidth={0} />}
          activeDot={{ r: 5, fill: '#3462EE', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
