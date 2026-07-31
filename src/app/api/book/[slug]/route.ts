import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { getLinkConfig, getAvailableSlots } from '@/lib/bookingServer'

export const dynamic = 'force-dynamic'

const convex = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  return url ? new ConvexHttpClient(url) : null
}
const secret = () => process.env.INTERNAL_API_SECRET ?? ''

// Infos publiques du lien (rendu de la page /book/<slug>).
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const cx = convex()
  if (!cx) return NextResponse.json({ error: 'indisponible' }, { status: 503 })
  const link = await cx.query(api.booking.getLink, { slug: params.slug })
  if (!link) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json(link)
}

// Réservation : (1) revérifie la dispo du créneau (autorité serveur), (2) assigne
// un closer en round-robin + crée contact/lead/RDV (Convex), (3) crée l'event
// Google Calendar + Meet sur l'agenda du closer, (4) accroche le lien Meet.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const cx = convex()
  if (!cx || !secret()) return NextResponse.json({ error: 'indisponible' }, { status: 503 })

  const cfg = await getLinkConfig(params.slug)
  if (!cfg) return NextResponse.json({ error: 'introuvable' }, { status: 404 })

  let body: {
    firstName?: string; lastName?: string; email?: string; phone?: string
    start?: string; answers?: { q: string; a: string }[]; captureId?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'requête invalide' }, { status: 400 }) }

  const firstName = (body.firstName ?? '').trim()
  const email = (body.email ?? '').trim()
  const start = body.start ?? ''
  const startMs = Date.parse(start)
  if (!firstName || !/.+@.+\..+/.test(email) || isNaN(startMs)) {
    return NextResponse.json({ error: 'Nom, email et créneau requis' }, { status: 400 })
  }

  // (1) Le créneau demandé est-il RÉELLEMENT libre ? (recalcul serveur)
  const endMs = startMs + cfg.durationMin * 60000
  const slots = await getAvailableSlots(cfg, startMs - 60000, endMs + 60000)
  const wanted = new Date(startMs).toISOString()
  const match = slots.find(s => s.start === wanted)
  if (!match || match.freeHosts.length === 0) {
    return NextResponse.json({ error: 'Ce créneau vient d’être pris. Choisissez-en un autre.' }, { status: 409 })
  }

  // (2) Round-robin + création contact/lead/RDV (atomique côté Convex).
  const manageToken = crypto.randomUUID().replace(/-/g, '')
  let booking: { salesCallId: string; closerUserId: string; already: boolean }
  try {
    booking = await cx.mutation(api.booking.createBooking, {
      slug: params.slug,
      firstName,
      lastName: (body.lastName ?? '').trim() || undefined,
      email,
      phone: (body.phone ?? '').trim() || undefined,
      startIso: wanted,
      freeHosts: match.freeHosts,
      answers: body.answers?.filter(x => x && x.q && x.a),
      manageToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      captureId: (body.captureId as any) || undefined,
      secret: secret(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Échec de la réservation'
    // Créneau pris entre le calcul et le commit → 409 (le client rafraîchit les créneaux).
    const taken = /créneau/i.test(msg)
    return NextResponse.json({ error: taken ? 'Ce créneau vient d’être pris. Choisissez-en un autre.' : msg }, { status: taken ? 409 : 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const manageUrl = booking.already ? null : `${origin}/book/manage/${manageToken}`

  // (3) Event Google Calendar + Meet sur l'agenda du closer assigné.
  let meetLink: string | null = null
  if (!booking.already) {
    try {
      const accounts = await cx.query(api.googleAccounts.listConnected, { secret: secret() })
      const token = accounts.find(a => a.clerkUserId === booking.closerUserId)?.refreshToken
      if (token) {
        const auth = getOAuth2Client()
        auth.setCredentials({ refresh_token: token })
        const cal = google.calendar({ version: 'v3', auth })
        const fullName = `${firstName} ${(body.lastName ?? '').trim()}`.trim()
        const descLines = [
          `RDV réservé via ${cfg.title}.`,
          body.phone ? `Téléphone : ${body.phone}` : '',
          ...(body.answers ?? []).map(x => `${x.q} : ${x.a}`),
          manageUrl ? `Annuler / gérer : ${manageUrl}` : '',
        ].filter(Boolean)
        const res = await cal.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          sendUpdates: 'all',
          requestBody: {
            summary: `${cfg.stage} · ${fullName}`,
            description: descLines.join('\n'),
            start: { dateTime: new Date(startMs).toISOString(), timeZone: cfg.timezone },
            end: { dateTime: new Date(endMs).toISOString(), timeZone: cfg.timezone },
            attendees: [{ email }],
            conferenceData: {
              createRequest: { requestId: `book-${booking.salesCallId}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
            },
          },
        })
        meetLink = res.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? res.data.hangoutLink ?? null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await cx.mutation(api.booking.attachMeet, { salesCallId: booking.salesCallId as any, meetLink: meetLink ?? undefined, googleEventId: res.data.id ?? undefined, secret: secret() })
      }
    } catch {
      // L'event Google a échoué (Google non connecté / quota) : le RDV existe
      // quand même dans le Data OS, on ne perd pas le lead. meetLink reste null.
    }
  }

  return NextResponse.json({ ok: true, meetLink, manageUrl, start: wanted, durationMin: cfg.durationMin, timezone: cfg.timezone })
}
