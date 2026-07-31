'use client'

import { PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer } from 'recharts'

// Donut métiers du dashboard, isolé pour être chargé en lazy (dynamic import) :
// recharts (~100 Ko) ne pèse plus dans le bundle initial de la route Dashboard → chargement mobile plus rapide.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MetierPie({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={36} outerRadius={54} strokeWidth={0}>
          {data.map((entry, i) => (
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
  )
}
