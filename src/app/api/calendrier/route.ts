import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getCalendars, getCalendarEvents } from '@/lib/ghl'
import { getCalendarClient, isGoogleConfigured, type GoogleEvent } from '@/lib/google'

export const dynamic = 'force-dynamic'

const APPOINTMENT_COLORS = ['#3462EE', '#4A91A8', '#FF4D00', '#EFE347', '#8B5CF6', '#EC4899']
const GOOGLE_COLOR       = '#34A853'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

function mapStatus(raw: string): string {
  const s = raw?.toLowerCase() ?? ''
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'pending'   || s === 'requested') return 'pending'
  return 'confirmed'
}

const MOCK_APPOINTMENTS = (() => {
  const now = new Date()
  const d = (offsetDays: number, h: number, m = 0) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + offsetDays)
    dt.setHours(h, m, 0, 0)
    return dt.toISOString()
  }
  return [
    {
      id: 'mock-1', calendarId: 'mock-cal', title: 'RDV client — Rénovation façade', contactName: 'M. Dubois',
      startTime: d(0, 9), endTime: d(0, 10), status: 'confirmed',
      calendarName: 'VividFlow', notes: 'Visite initiale, apporter catalogues', color: '#3462EE', source: 'ghl',
    },
    {
      id: 'mock-2', calendarId: 'mock-cal', title: 'Visite chantier — Résidence Les Acacias', contactName: 'Mme Favre',
      startTime: d(1, 14), endTime: d(1, 15, 30), status: 'confirmed',
      calendarName: 'VividFlow', notes: 'Contrôle avancement travaux', color: '#4A91A8', source: 'ghl',
    },
    {
      id: 'mock-3', calendarId: 'mock-cal', title: 'Présentation devis — Isolation thermique', contactName: 'M. & Mme Rochat',
      startTime: d(2, 10, 30), endTime: d(2, 11, 30), status: 'confirmed',
      calendarName: 'VividFlow', notes: 'Devis 8 500 CHF — à valider', color: '#FF4D00', source: 'ghl',
    },
    {
      id: 'mock-4', calendarId: 'mock-cal', title: 'RDV client — Ravalement balcons', contactName: 'Syndic Cité Verte',
      startTime: d(3, 8, 30), endTime: d(3, 9, 30), status: 'pending',
      calendarName: 'VividFlow', notes: 'Copropriété 12 logements', color: '#EFE347', source: 'ghl',
    },
    {
      id: 'mock-5', calendarId: 'google', title: 'Réunion équipe — Planning semaine', contactName: '—',
      startTime: d(4, 8), endTime: d(4, 9), status: 'confirmed',
      calendarName: 'Google Calendar', notes: null, color: '#34A853', source: 'google',
    },
    {
      id: 'mock-6', calendarId: 'mock-cal', title: 'Suivi chantier — Peinture extérieure Rue du Lac', contactName: 'M. Bonnet',
      startTime: d(5, 13), endTime: d(5, 14), status: 'confirmed',
      calendarName: 'VividFlow', notes: 'Vérifier finitions avant réception', color: '#8B5CF6', source: 'ghl',
    },
  ]
})()

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({
    appointments: MOCK_APPOINTMENTS,
    calendars: [{ id: 'mock-cal', name: 'VividFlow' }],
    googleConfigured: false,
  })

  const now   = Date.now()
  const RANGE = 30 * 24 * 60 * 60 * 1000

  try {
    const calendars = await getCalendars()
    let appointments: unknown[] = []

    if (calendars.length > 0) {
      const allEvents = await Promise.all(
        calendars.map(cal => getCalendarEvents(cal.id, now - RANGE, now + RANGE).catch(() => []))
      )
      appointments = allEvents.flat().map((ev, i) => ({
        id:          ev.id,
        calendarId:  ev.calendarId,
        title:       ev.title || 'Rendez-vous',
        contactName: ev.contactName ?? '—',
        startTime:   typeof ev.startTime === 'number' ? new Date(ev.startTime).toISOString() : ev.startTime,
        endTime:     typeof ev.endTime   === 'number' ? new Date(ev.endTime).toISOString()   : ev.endTime,
        status:      mapStatus(ev.status),
        calendarName: calendars.find(c => c.id === ev.calendarId)?.name ?? 'Calendrier',
        notes:       ev.notes,
        color:       APPOINTMENT_COLORS[i % APPOINTMENT_COLORS.length],
        source:      'ghl',
      }))
    }

    // Google Calendar
    if (await isGoogleConfigured()) {
      try {
        const cal    = await getCalendarClient()
        const res    = await withTimeout(cal.events.list({
          calendarId:   process.env.GOOGLE_CALENDAR_ID || 'primary',
          timeMin:      new Date(now - RANGE).toISOString(),
          timeMax:      new Date(now + RANGE).toISOString(),
          singleEvents: true,
          orderBy:      'startTime',
          maxResults:   500,
        }), 2000).catch(() => ({ data: { items: [] } }))
        const googleAppts = (res.data.items ?? [] as GoogleEvent[]).map((ev): unknown => ({
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
          meetLink:     null,
        }))
        appointments = [...appointments, ...googleAppts]
      } catch { /* Google optional */ }
    }

    return NextResponse.json({ appointments, calendars, googleConfigured: await isGoogleConfigured() })
  } catch (err) {
    console.error('[Calendrier API]', err)
    return NextResponse.json({ appointments: [], calendars: [], googleConfigured: false })
  }
}
