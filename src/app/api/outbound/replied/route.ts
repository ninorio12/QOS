import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// POST { email, date? } — appelé par n8n (trigger Gmail « réponse reçue » sur la boîte de Clara)
// pour marquer un lead outbound comme ayant répondu → alimente le taux de réponse + le suivi.
// Auth : secret de service (HERMES_API_SECRET) vérifié par le middleware (route listée dans isProtectedApi).
export async function POST(req: NextRequest) {
  try {
    const { email, date } = (await req.json()) as { email?: string; date?: string }
    if (!email) return NextResponse.json({ ok: false, error: 'email requis' }, { status: 400 })
    const res = await convex().mutation(api.outboundLeads.markRepliedByEmail, { email, date: date || undefined })
    return NextResponse.json(res)
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
