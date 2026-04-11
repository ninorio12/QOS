import DashboardClient from '@/components/dashboard/DashboardClient'
import { getDashboardData, type WeeklyDay, type MonthlyPoint } from '@/lib/dashboard'

export const dynamic   = 'force-dynamic'

export default async function DashboardPage() {
  let activeLeads      = 0
  let pipelineValue    = 0
  let wonLeads         = 0
  let totalLeads       = 0
  let stageBreakdown: Array<{ label: string; count: number; value: number; color: string; pct: number }> = []
  let recentOpps:     Array<{ id: string; contactName: string; value: number; stage: string; tag: string; date: string; color: string; textColor: string }> = []
  let weeklyBreakdown: WeeklyDay[] = []
  let monthlyPipeline: MonthlyPoint[] = []

  try {
    const dashData   = await getDashboardData()
    activeLeads      = dashData.metrics.activeDeals
    pipelineValue    = dashData.metrics.pipelineValue
    wonLeads         = dashData.metrics.wonDeals
    totalLeads       = dashData.metrics.totalDeals
    stageBreakdown   = dashData.funnel
    recentOpps       = dashData.recentOpps
    weeklyBreakdown  = dashData.weeklyBreakdown
    monthlyPipeline  = dashData.monthlyPipeline
  } catch (e) {
    console.error('[Dashboard] fetch failed:', e)
  }

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden">
      <DashboardClient
        activeLeads={activeLeads}
        pipelineValue={pipelineValue}
        wonLeads={wonLeads}
        totalLeads={totalLeads}
        stageBreakdown={stageBreakdown}
        recentOpps={recentOpps}
        weeklyBreakdown={weeklyBreakdown}
        monthlyPipeline={monthlyPipeline}
      />
    </div>
  )
}
