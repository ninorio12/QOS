'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Pt = { date: string; cpl: number; leads: number }

export default function MetaLeadsChart({ data }: { data: Pt[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap="22%" margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24}
          tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }} />
        <YAxis axisLine={false} tickLine={false} width={30}
          tick={{ fill: '#9CA3AF', fontSize: 10 }} />
        <Tooltip
          cursor={{ fill: 'rgba(255,77,0,0.06)', radius: 6 } as React.SVGProps<SVGRectElement>}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '9px 13px', fontSize: 11, color: '#fff' }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
                <p style={{ color: '#FF4D00' }}>Leads : {payload[0]?.value}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="leads" fill="#FF4D00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
