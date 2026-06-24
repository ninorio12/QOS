import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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
    const tzOffset = Number(params.get('tzOffset') ?? 0)

    // Identité Clerk transmise à Convex : c'est getMetrics qui applique le contrôle par
    // module (pattern maison, cf. processes.list). Pas de session (appel serveur-à-serveur
    // de confiance) ou mode démo → clerkUserId absent → accès complet côté Convex.
    const clerkUserId =
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? undefined : (await auth()).userId ?? undefined

    // KPI fenêtrés (CA encaissé = encaissé DANS le mois choisi). Graphique CUMULÉ partout
    // (la courbe ne fait que monter) + granularité adaptative selon l'amplitude.
    const data = await convex().query(api.dashboard.getMetrics, { from, to, tzOffset, cumulativeTimeline: true, clerkUserId })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Dashboard API]', err)
    return NextResponse.json({ clientsCount: 0, caEncaisse: 0, caACollecter: 0, leadsCount: 0, r1Count: 0, r2Count: 0, metiersCount: 0, nichesCount: 0, clientTimeline: [], metierBreakdown: [], nicheBreakdown: [], recentLeads: [], totalContactsCount: 0 }, { status: 500 })
  }
}
