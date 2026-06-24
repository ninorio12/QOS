'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Pt = { date: string; cpl: number; leads: number }

export default function MetaCplChart({ data }: { data: Pt[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="cplFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4D00" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#FF4D00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24}
          tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} />
        <YAxis axisLine={false} tickLine={false} width={30}
          tick={{ fill: '#9CA3AF', fontSize: 10 }} />
        <Tooltip
          cursor={{ stroke: '#FF4D00', strokeOpacity: 0.3 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '9px 13px', fontSize: 11, color: '#fff' }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
                <p style={{ color: '#FF4D00' }}>CPL : {payload[0]?.value} Fr.</p>
              </div>
            )
          }}
        />
        <Area type="monotone" dataKey="cpl" stroke="#FF4D00" strokeWidth={2.5}
          fill="url(#cplFill)" dot={false} activeDot={{ r: 4, fill: '#FF4D00' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
