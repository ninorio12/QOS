'use client'

import { useEffect, useState } from 'react'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'
import type { WeeklyDay, MonthlyPoint, FunnelStage, RecentOpp, DashboardMetrics } from '@/lib/dashboard'

type DashData = {
  metrics: DashboardMetrics
  funnel: FunnelStage[]
  recentOpps: RecentOpp[]
  weeklyBreakdown: WeeklyDay[]
  monthlyPipeline: MonthlyPoint[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  if (error) return (
    <div className="h-full flex items-center justify-center text-sm text-[#6B7280]">
      Impossible de charger le dashboard. Actualise la page.
    </div>
  )

  if (!data) return <DashboardLoading />

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden page-fade-in">
      <DashboardClient
        activeLeads={data.metrics.activeDeals}
        pipelineValue={data.metrics.pipelineValue}
        wonLeads={data.metrics.wonDeals}
        totalLeads={data.metrics.totalDeals}
        stageBreakdown={data.funnel}
        recentOpps={data.recentOpps}
        weeklyBreakdown={data.weeklyBreakdown}
        monthlyPipeline={data.monthlyPipeline}
      />
    </div>
  )
}
