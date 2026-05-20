'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { WeeklyDay } from '@/lib/dashboard'

export default function WeeklyBarChart({ data }: { data: WeeklyDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} barCategoryGap="18%" margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          axisLine={false} tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
        />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fill: '#D1D5DB', fontSize: 10 }}
          width={24}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 } as React.SVGProps<SVGRectElement>}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const FULL: Record<string, string> = {
              Lun: 'Lundi', Mar: 'Mardi', Mer: 'Mercredi', Jeu: 'Jeudi',
              Ven: 'Vendredi', Sam: 'Samedi', Dim: 'Dimanche',
            }
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', minWidth: 110 }}>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{label != null ? (FULL[label] ?? label) : ''}</p>
                {payload.map(p => (
                  <p key={p.dataKey as string} style={{ color: p.dataKey === 'leads' ? '#FF4D00' : p.dataKey === 'booked' ? '#fff' : '#9CA3AF', marginBottom: 2 }}>
                    {p.name} : {p.value}
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Bar dataKey="rdv"    name="RDV"    fill="#3462EE" radius={[4, 4, 0, 0]} />
        <Bar dataKey="booked" name="Signés" fill="#111111" radius={[4, 4, 0, 0]} />
        <Bar dataKey="leads"  name="Leads"  fill="#FF4D00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
