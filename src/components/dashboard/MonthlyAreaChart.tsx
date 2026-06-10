'use client'

import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { MonthlyPoint } from '@/lib/dashboard'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export default function MonthlyAreaChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3462EE" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#3462EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false} tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
        />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fill: '#D1D5DB', fontSize: 10 }}
          tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
          width={28}
        />
        <Tooltip
          wrapperStyle={{ border: 'none', outline: 'none' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', minWidth: 110 }}>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{label}</p>
                <p style={{ color: '#fff' }}>{fmt(payload[0]?.value as number ?? 0)}</p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3462EE"
          strokeWidth={2}
          fill="url(#pipelineGrad)"
          dot={{ fill: '#3462EE', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#3462EE', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
