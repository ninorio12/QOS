import DashboardClient from '@/components/dashboard/DashboardClient'
import { getDashboardData } from '@/lib/dashboard'
import { getOpportunities } from '@/lib/ghl'

export const dynamic   = 'force-dynamic'

function computeWeeklyData(opps: Array<{ createdAt: string; updatedAt: string; status: string }>) {
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const today    = new Date()

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

const MOCK = true

export default async function DashboardPage() {
  let activeLeads    = 0
  let pipelineValue  = 0
  let stageBreakdown: Array<{ label: string; count: number; value: number; color: string; pct: number }> = []
  let recentOpps:     Array<{ id: string; contactName: string; value: number; stage: string; tag: string; date: string; color: string; textColor: string }> = []
  let weeklyData:     Array<{ day: string; opened: number; converted: number; inactive?: boolean }> = []

  if (MOCK) {
    activeLeads   = 34
    pipelineValue = 87500
    stageBreakdown = [
      { label: 'Nouveau Lead',    count: 12, value: 18000, color: '#3D4F6B', pct: 100 },
      { label: '1er Contact IA',  count: 9,  value: 13500, color: '#4A91A8', pct: 75  },
      { label: 'En Conversation', count: 7,  value: 17500, color: '#3462EE', pct: 58  },
      { label: 'Qualifié',        count: 4,  value: 20000, color: '#E2FF8D', pct: 33  },
      { label: 'RDV Booké',       count: 2,  value: 18500, color: '#EFE347', pct: 17  },
    ]
    recentOpps = [
      { id: '1', contactName: 'Martin Dupont',  value: 4500,  stage: 'Qualifié',        tag: 'Lead qualifié — score 87',  date: "Aujourd'hui 09:14", color: '#E2FF8D', textColor: '#111111' },
      { id: '2', contactName: 'Sophie Renard',  value: 7200,  stage: 'RDV Booké',       tag: 'RDV planifié demain 14h',   date: "Aujourd'hui 08:45", color: '#EFE347', textColor: '#111111' },
      { id: '3', contactName: 'Carlos Mendes',  value: 3100,  stage: '1er Contact IA',  tag: 'Relance WhatsApp envoyée',  date: 'Hier 17:32',        color: '#4A91A8', textColor: '#ffffff' },
      { id: '4', contactName: 'Julie Moreau',   value: 5800,  stage: 'En Conversation', tag: 'Devis consulté 3x',         date: 'Hier 14:20',        color: '#3462EE', textColor: '#ffffff' },
    ]
    weeklyData = [
      { day: 'Lun', opened: 7,  converted: 3 },   // total 10
      { day: 'Mar', opened: 6,  converted: 3 },   // total 9
      { day: 'Mer', opened: 11, converted: 5 },   // total 16
      { day: 'Jeu', opened: 13, converted: 6 },   // total 19
      { day: 'Ven', opened: 10, converted: 6 },   // total 16
      { day: 'Sam', opened: 4,  converted: 2 },   // total 6
      { day: 'Dim', opened: 2,  converted: 1, inactive: true }, // total 3
    ]
  } else {
    try {
      const [dashData, rawOpps] = await Promise.all([
        getDashboardData(),
        getOpportunities(100),
      ])
      activeLeads    = dashData.metrics.activeDeals
      pipelineValue  = dashData.metrics.pipelineValue
      stageBreakdown = dashData.funnel
      recentOpps     = dashData.recentOpps
      weeklyData     = computeWeeklyData(rawOpps)
    } catch (e) {
      console.error('[Dashboard] fetch failed:', e)
    }
  }

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden">
      <DashboardClient
        activeLeads={activeLeads}
        pipelineValue={pipelineValue}
        stageBreakdown={stageBreakdown}
        recentOpps={recentOpps}
        weeklyData={weeklyData}
      />
    </div>
  )
}
