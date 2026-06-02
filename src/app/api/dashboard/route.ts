import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

function defaultPeriod() {
  const to   = new Date(); to.setHours(0,0,0,0)
  const from = new Date(to); from.setDate(to.getDate() - 29) // 30 days default
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const from = params.get('from') || defaultPeriod().from
    const to   = params.get('to')   || defaultPeriod().to

    const data = await convex().query(api.dashboard.getMetrics, { from, to })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Dashboard API]', err)
    return NextResponse.json({ clientsCount: 0, caEncaisse: 0, leadsCount: 0, r1Count: 0, r2Count: 0, clientTimeline: [], metierBreakdown: [], nicheBreakdown: [], recentLeads: [], totalContactsCount: 0 }, { status: 500 })
  }
}
