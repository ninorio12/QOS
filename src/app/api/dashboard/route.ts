import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }
    const data = await getDashboardData(creds)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Dashboard API]', err)
    return NextResponse.json(
      { metrics: { totalContacts: 0, pipelineValue: 0, activeDeals: 0, wonDeals: 0, totalDeals: 0 }, funnel: [], recentOpps: [], featuredContact: null, weeklyBreakdown: [], monthlyPipeline: [] },
      { status: 500 }
    )
  }
}
