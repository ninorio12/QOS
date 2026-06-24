'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'

export type DashData = {
  clientsCount:       number
  caEncaisse:         number
  caACollecter:       number
  leadsCount:         number
  r1Count:            number
  r2Count:            number
  metiersCount:       number
  nichesCount:        number
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
  clientsCount: 0, caEncaisse: 0, caACollecter: 0, leadsCount: 0, r1Count: 0, r2Count: 0,
  metiersCount: 0, nichesCount: 0,
  clientTimeline: [], metierBreakdown: [], nicheBreakdown: [], recentLeads: [], totalContactsCount: 0,
}

const fetcher = async (url: string) => {
  const res  = await fetch(url)
  const json = await res.json() as Partial<DashData>
  return { ...EMPTY, ...json }
}

export default function DashboardPage() {
  const tzOffset = new Date().getTimezoneOffset()
  const today = localDate(new Date())
  const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 30_000, keepPreviousData: true }

  // Le dashboard est une vue d'ensemble TOTALE (depuis le début). Le calendrier ne pilote QUE le graphe.
  const totalKey = `/api/dashboard?from=2000-01-01&to=${today}&tzOffset=${tzOffset}`
  const { data, isLoading, isValidating } = useSWR<DashData>(totalKey, fetcher, SWR_OPTS)

  // Calendrier local au graphe « Encaissement et Clients » → refetch SEULEMENT la timeline.
  const [chartRange, setChartRange] = useState(defaultRange)
  const chartKey = `/api/dashboard?from=${chartRange.from}&to=${chartRange.to}&tzOffset=${tzOffset}`
  const { data: chartData } = useSWR<DashData>(chartKey, fetcher, SWR_OPTS)

  const handleRangeChange = useCallback((from: string, to: string) => {
    setChartRange({ from, to })
  }, [])

  if (isLoading && !data) return <DashboardLoading />

  const d = data ?? EMPTY
  const timeline = chartData?.clientTimeline ?? d.clientTimeline

  return (
    <div className={`md:h-full flex flex-col px-3 py-3 md:p-5 md:overflow-auto transition-opacity duration-300 ${isValidating ? 'opacity-60' : 'opacity-100'}`}>
      <DashboardClient
        clientsCount={d.clientsCount}
        caEncaisse={d.caEncaisse}
        caACollecter={d.caACollecter}
        leadsCount={d.leadsCount}
        r1Count={d.r1Count}
        r2Count={d.r2Count}
        metiersCount={d.metiersCount}
        nichesCount={d.nichesCount}
        clientTimeline={timeline}
        metierBreakdown={d.metierBreakdown}
        nicheBreakdown={d.nicheBreakdown}
        recentLeads={d.recentLeads}
        totalContactsCount={d.totalContactsCount}
        rangeFrom="2000-01-01"
        rangeTo={today}
        onRangeChange={handleRangeChange}
      />
    </div>
  )
}
