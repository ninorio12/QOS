'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'

export type DashData = {
  clientsCount:       number
  caEncaisse:         number
  leadsCount:         number
  r1Count:            number
  r2Count:            number
  clientTimeline:     { date: string; value: number; ca: number }[]
  metierBreakdown:    { label: string; niche: string; count: number; pct: number; color: string; contacts: { name: string; company: string }[] }[]
  nicheBreakdown:     { niche: string; metiers: { metier: string; count: number; contacts: { name: string; company: string }[] }[] }[]
  recentLeads:        { id: string; name: string; stageId: string; createdAt: string; value: number; source: string }[]
  totalContactsCount: number
}

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function defaultRange() {
  const to   = new Date(); to.setHours(0,0,0,0)
  const from = new Date(to); from.setDate(to.getDate() - 29)
  return { from: localDate(from), to: localDate(to) }
}

const EMPTY: DashData = {
  clientsCount: 0, caEncaisse: 0, leadsCount: 0, r1Count: 0, r2Count: 0,
  clientTimeline: [], metierBreakdown: [], nicheBreakdown: [], recentLeads: [], totalContactsCount: 0,
}

export default function DashboardPage() {
  const [range, setRange] = useState(defaultRange)

  const key = `/api/dashboard?from=${range.from}&to=${range.to}`
  const { data, isLoading } = useSWR<DashData>(key, async (url: string) => {
    const res  = await fetch(url)
    const json = await res.json() as Partial<DashData>
    return { ...EMPTY, ...json }
  }, { revalidateOnFocus: false, dedupingInterval: 30_000 })

  const handleRangeChange = useCallback((from: string, to: string) => {
    setRange({ from, to })
  }, [])

  if (isLoading && !data) return <DashboardLoading />

  const d = data ?? EMPTY

  return (
    <div className="md:h-full flex flex-col px-3 py-3 md:p-5 md:overflow-auto page-fade-in">
      <DashboardClient
        clientsCount={d.clientsCount}
        caEncaisse={d.caEncaisse}
        leadsCount={d.leadsCount}
        r1Count={d.r1Count}
        r2Count={d.r2Count}
        clientTimeline={d.clientTimeline}
        metierBreakdown={d.metierBreakdown}
        nicheBreakdown={d.nicheBreakdown}
        recentLeads={d.recentLeads}
        totalContactsCount={d.totalContactsCount}
        rangeFrom={range.from}
        rangeTo={range.to}
        onRangeChange={handleRangeChange}
      />
    </div>
  )
}
