'use client'

import useSWR from 'swr'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'
import type { WeeklyDay, MonthlyPoint, FunnelStage, RecentOpp, DashboardMetrics } from '@/lib/dashboard'

type DashData = {
  metrics:         DashboardMetrics
  funnel:          FunnelStage[]
  recentOpps:      RecentOpp[]
  weeklyBreakdown: WeeklyDay[]
  monthlyPipeline: MonthlyPoint[]
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
  }
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashData>('/api/dashboard', fetcher, {
    revalidateOnFocus:   false,
    dedupingInterval:    30_000,
    revalidateIfStale:   true,
    keepPreviousData:    true,
  })

  if (isLoading && !data) return <DashboardLoading />

  const metrics         = data?.metrics         ?? EMPTY_METRICS
  const funnel          = data?.funnel          ?? []
  const recentOpps      = data?.recentOpps      ?? []
  const weeklyBreakdown = data?.weeklyBreakdown ?? []
  const monthlyPipeline = data?.monthlyPipeline ?? []

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden page-fade-in">
      <DashboardClient
        activeLeads={metrics.activeDeals    ?? 0}
        pipelineValue={metrics.pipelineValue ?? 0}
        wonLeads={metrics.wonDeals           ?? 0}
        totalLeads={metrics.totalDeals       ?? 0}
        stageBreakdown={funnel}
        recentOpps={recentOpps}
        weeklyBreakdown={weeklyBreakdown}
        monthlyPipeline={monthlyPipeline}
      />
    </div>
  )
}
