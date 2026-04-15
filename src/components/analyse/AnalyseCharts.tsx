'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type DailyPoint  = { label: string; count: number }
type HourlyPoint = { hour: number; count: number }

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] text-[#777] mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function DailyBarChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" fill="#E2FF8D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HourlyBarChart({ data }: { data: HourlyPoint[] }) {
  const maxH = Math.max(...data.map(d => d.count), 1)
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <XAxis
          dataKey="hour"
          tick={{ fill: '#BBB', fontSize: 8, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(h: number) => [0, 6, 12, 18, 23].includes(h) ? `${h}h` : ''}
          interval={0}
          tickMargin={4}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-[#111] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
                <p className="text-[10px] text-[#777] mb-0.5">{label}h</p>
                <p className="text-sm font-bold text-white">{payload[0].value} lead{Number(payload[0].value) !== 1 ? 's' : ''}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((h, i) => (
            <Cell key={i} fill={h.count >= maxH * 0.4 && h.count > 0 ? '#1C1C1E' : '#E5E5E0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
