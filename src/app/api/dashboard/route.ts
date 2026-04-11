import { getAuthContext } from '@/lib/auth-context'
import { getOpportunitiesLive } from '@/lib/ghl'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

function computeWeeklyData(opps: Array<{ createdAt: string; updatedAt: string; status: string }>) {
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const today = new Date()

  const raw = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end   = new Date(d); end.setHours(23, 59, 59, 999)

    const opened    = opps.filter(o => { const t = new Date(o.createdAt); return t >= start && t <= end }).length
    const converted = opps.filter(o => { const t = new Date(o.updatedAt); return t >= start && t <= end && o.status === 'won' }).length

    return { day: dayNames[d.getDay()], opened, converted, inactive: i === 6 }
  })

  const maxOpened = Math.max(...raw.map(r => r.opened), 1)

  return raw.map(r => ({
    ...r,
    opened:    r.opened    / maxOpened,
    converted: r.converted / maxOpened,
  }))
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return Response.json({ activeLeads: 0, pipelineValue: 0, stageBreakdown: [], recentOpps: [], weeklyData: [] }, { status: 401 })

  try {
    const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }
    const [dashData, rawOpps] = await Promise.all([
      getDashboardData(creds),
      getOpportunitiesLive(100, undefined, creds),
    ])

    return Response.json({
      activeLeads:    dashData.metrics.activeDeals,
      pipelineValue:  dashData.metrics.pipelineValue,
      stageBreakdown: dashData.funnel,
      recentOpps:     dashData.recentOpps,
      weeklyData:     computeWeeklyData(rawOpps),
    })
  } catch {
    return Response.json({
      activeLeads: 0, pipelineValue: 0,
      stageBreakdown: [], recentOpps: [], weeklyData: [],
    })
  }
}
