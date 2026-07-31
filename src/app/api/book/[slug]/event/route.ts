import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

// Parcours horodaté : le front signale les étapes (calendrier affiché, jour
// sélectionné…). Événements whitelistés côté Convex, timeline bornée.
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const secret = process.env.INTERNAL_API_SECRET
  if (!url || !secret) return NextResponse.json({ ok: false }, { status: 503 })
  const cx = new ConvexHttpClient(url)

  let body: { captureId?: string; event?: string; detail?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  if (!body.captureId || !body.event) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cx.mutation(api.booking.captureEvent, { captureId: body.captureId as any, event: body.event, detail: (body.detail ?? '').slice(0, 80) || undefined, secret })
  } catch { /* trace best-effort, jamais bloquant pour le prospect */ }
  return NextResponse.json({ ok: true })
}
