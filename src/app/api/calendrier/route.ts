import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getCalendars, getCalendarEvents } from '@/lib/ghl'
import { getCalendarClient, isGoogleConfigured, type GoogleEvent } from '@/lib/google'

export const dynamic = 'force-dynamic'

const APPOINTMENT_COLORS = ['#3462EE', '#4A91A8', '#E2FF8D', '#EFE347', '#8B5CF6', '#EC4899']
const GOOGLE_COLOR       = '#34A853'

function mapStatus(raw: string): string {
  const s = raw?.toLowerCase() ?? ''
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'pending'   || s === 'requested') return 'pending'
  return 'confirmed'
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now   = Date.now()
  const RANGE = 90 * 24 * 60 * 60 * 1000

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
    if (isGoogleConfigured()) {
      try {
        const cal    = getCalendarClient()
        const res    = await cal.events.list({
          calendarId:   process.env.GOOGLE_CALENDAR_ID || 'primary',
          timeMin:      new Date(now - RANGE).toISOString(),
          timeMax:      new Date(now + RANGE).toISOString(),
          singleEvents: true,
          orderBy:      'startTime',
          maxResults:   500,
        })
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

    return NextResponse.json({ appointments, calendars, googleConfigured: isGoogleConfigured() })
  } catch (err) {
    console.error('[Calendrier API]', err)
    return NextResponse.json({ appointments: [], calendars: [], googleConfigured: false })
  }
}
