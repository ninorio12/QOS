import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured, type GoogleEvent } from '@/lib/google'

export const dynamic = 'force-dynamic'

const GOOGLE_COLOR = '#34A853'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

// Données de démonstration affichées tant qu'aucun compte Google n'est connecté.
// (Source clairement marquée "mock" — à remplacer par la sync Google réelle, Phase 2.3.)
const MOCK_APPOINTMENTS = (() => {
  const now = new Date()
  const d = (offsetDays: number, h: number, m = 0) => {
    const dt = new Date(now); dt.setDate(dt.getDate() + offsetDays); dt.setHours(h, m, 0, 0); return dt.toISOString()
  }
  return [
    { id: 'mock-1', calendarId: 'mock-cal', title: 'RDV client — Rénovation façade', contactName: 'M. Dubois', startTime: d(0, 9), endTime: d(0, 10), status: 'confirmed', calendarName: 'VividFlow', notes: 'Visite initiale', color: '#3462EE', source: 'mock' },
    { id: 'mock-2', calendarId: 'mock-cal', title: 'Visite chantier — Les Acacias', contactName: 'Mme Favre', startTime: d(1, 14), endTime: d(1, 15, 30), status: 'confirmed', calendarName: 'VividFlow', notes: null, color: '#4A91A8', source: 'mock' },
    { id: 'mock-3', calendarId: 'mock-cal', title: 'Présentation devis — Isolation', contactName: 'M. & Mme Rochat', startTime: d(2, 10, 30), endTime: d(2, 11, 30), status: 'confirmed', calendarName: 'VividFlow', notes: null, color: '#FF4D00', source: 'mock' },
  ]
})()

// GHL retiré (mort, causait des timeouts de 7-60s) + dépendance Supabase (getAuthContext)
// retirée. Auth gérée par le middleware. Google avec timeout court → réponse rapide.
export async function GET(req: NextRequest) {
  const now = Date.now()
  const RANGE = 30 * 24 * 60 * 60 * 1000
  const fromMs = Date.parse(req.nextUrl.searchParams.get('from') ?? '')
  const toMs   = Date.parse(req.nextUrl.searchParams.get('to') ?? '')
  const windowMin = Number.isNaN(fromMs) ? now - RANGE : fromMs
  const windowMax = Number.isNaN(toMs)   ? now + RANGE : toMs

  const googleOn = await isGoogleConfigured().catch(() => false)
  if (!googleOn) {
    return NextResponse.json({
      appointments: MOCK_APPOINTMENTS,
      calendars: [{ id: 'mock-cal', name: 'VividFlow (démo)' }],
      googleConfigured: false,
    })
  }

  try {
    const cal = await getCalendarClient()
    const res = await withTimeout(cal.events.list({
      calendarId:   process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin:      new Date(windowMin).toISOString(),
      timeMax:      new Date(windowMax).toISOString(),
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   500,
    }), 2500).catch(() => ({ data: { items: [] } }))

    const appointments = (res.data.items ?? [] as GoogleEvent[]).map((ev) => ({
      id:           `google-${ev.id}`,
      calendarId:   'google',
      title:        ev.summary || 'Événement',
      contactName:  '—',
      startTime:    ev.start?.dateTime ?? ev.start?.date ?? new Date().toISOString(),
      endTime:      ev.end?.dateTime   ?? ev.end?.date   ?? new Date().toISOString(),
      status:       'confirmed',
      calendarName: 'Google Calendar',
      notes:        (ev as Record<string, unknown>).description as string ?? null,
      color:        GOOGLE_COLOR,
      source:       'google',
    }))

    return NextResponse.json({ appointments, calendars: [{ id: 'google', name: 'Google Calendar' }], googleConfigured: true })
  } catch (err) {
    console.error('[Calendrier API]', err)
    return NextResponse.json({ appointments: [], calendars: [], googleConfigured: true })
  }
}
