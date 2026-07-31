import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

const convex = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  return url ? new ConvexHttpClient(url) : null
}

// Détails d'une réservation via son token de gestion (page /book/manage/<token>).
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const cx = convex()
  if (!cx) return NextResponse.json({ error: 'indisponible' }, { status: 503 })
  const info = await cx.query(api.booking.getByManageToken, { token: params.token })
  if (!info) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json(info)
}

// Annulation par le prospect : marque le RDV `cancelled` (Convex) puis supprime
// l'event Google Calendar du closer (les invités sont notifiés par Google).
export async function DELETE(_req: NextRequest, { params }: { params: { token: string } }) {
  const cx = convex()
  const secret = process.env.INTERNAL_API_SECRET
  if (!cx) return NextResponse.json({ error: 'indisponible' }, { status: 503 })

  let res: { ok: boolean; reason?: string; googleEventId: string | null; closerUserId: string | null }
  try {
    res = await cx.mutation(api.booking.cancelByToken, { token: params.token })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Annulation impossible' }, { status: 404 })
  }
  if (!res.ok) return NextResponse.json({ ok: false, reason: res.reason ?? 'déjà annulé' })

  // Suppression de l'event Google (best-effort : le RDV est déjà annulé côté Data OS).
  if (res.googleEventId && res.closerUserId && secret) {
    try {
      const accounts = await cx.query(api.googleAccounts.listConnected, { secret })
      const token = accounts.find(a => a.clerkUserId === res.closerUserId)?.refreshToken
      if (token) {
        const auth = getOAuth2Client()
        auth.setCredentials({ refresh_token: token })
        const cal = google.calendar({ version: 'v3', auth })
        await cal.events.delete({ calendarId: 'primary', eventId: res.googleEventId, sendUpdates: 'all' })
      }
    } catch { /* event déjà supprimé / token révoqué — non bloquant */ }
  }

  return NextResponse.json({ ok: true })
}
