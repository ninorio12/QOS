'use client'

import useSWR from 'swr'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'
import type { WeeklyDay, MonthlyPoint, FunnelStage, RecentOpp, DashboardMetrics, ClientTimelinePoint, MetierBreakdown, Payment } from '@/lib/dashboard'

type DashData = {
  metrics:         DashboardMetrics
  funnel:          FunnelStage[]
  recentOpps:      RecentOpp[]
  weeklyBreakdown: WeeklyDay[]
  monthlyPipeline: MonthlyPoint[]
  clientTimeline:  ClientTimelinePoint[]
  metierBreakdown: MetierBreakdown[]
  payments:        Payment[]
  wonCA:           number
}

const EMPTY_METRICS: DashboardMetrics = {
  totalContacts: 0, pipelineValue: 0, activeDeals: 0, wonDeals: 0, totalDeals: 0,
}

const fetcher = async (url: string): Promise<DashData> => {
  const res  = await fetch(url)
  const json = await res.json() as Partial<DashData>
  return {
    metrics:         json.metrics         ?? EMPTY_METRICS,
    funnel:          json.funnel          ?? [],
    recentOpps:      json.recentOpps      ?? [],
    weeklyBreakdown: json.weeklyBreakdown ?? [],
    monthlyPipeline: json.monthlyPipeline ?? [],
    clientTimeline:  json.clientTimeline  ?? [],
    metierBreakdown: json.metierBreakdown ?? [],
    payments:        json.payments        ?? [],
    wonCA:           json.wonCA           ?? 0,
  }
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashData>('/api/dashboard', fetcher, {
    revalidateOnFocus:    false,
    revalidateIfStale:    false,
    revalidateOnMount:    true,
    revalidateOnReconnect: false,
    dedupingInterval:     60_000,
  })

  if (isLoading && !data) return <DashboardLoading />

  const metrics         = data?.metrics         ?? EMPTY_METRICS
  const funnel          = data?.funnel          ?? []
  const recentOpps      = data?.recentOpps      ?? []
  const weeklyBreakdown = data?.weeklyBreakdown ?? []
  const monthlyPipeline = data?.monthlyPipeline ?? []
  const clientTimeline  = data?.clientTimeline  ?? []
  const metierBreakdown = data?.metierBreakdown ?? []
  const payments        = data?.payments        ?? []
  const wonCA           = data?.wonCA           ?? 0

  return (
    <div className="md:h-full flex flex-col px-3 py-3 md:p-5 md:overflow-auto page-fade-in">
      <DashboardClient
        activeLeads={metrics.activeDeals    ?? 0}
        pipelineValue={metrics.pipelineValue ?? 0}
        wonLeads={metrics.wonDeals           ?? 0}
        totalLeads={metrics.totalDeals       ?? 0}
        stageBreakdown={funnel}
        recentOpps={recentOpps}
        weeklyBreakdown={weeklyBreakdown}
        monthlyPipeline={monthlyPipeline}
        clientTimeline={clientTimeline}
        metierBreakdown={metierBreakdown}
        payments={payments}
        wonCA={wonCA}
      />
    </div>
  )
}
