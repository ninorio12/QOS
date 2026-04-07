import CalendarView from '@/components/calendrier/CalendarView'
import { type Appointment } from '@/components/calendrier/types'
import { getCalendars, getCalendarEvents } from '@/lib/ghl'
import { getCalendarClient, isGoogleConfigured, type GoogleEvent } from '@/lib/google'

export const dynamic   = 'force-dynamic'

const APPOINTMENT_COLORS = ['#3462EE', '#4A91A8', '#E2FF8D', '#EFE347', '#8B5CF6', '#EC4899']
const GOOGLE_COLOR       = '#34A853'

function mapStatus(raw: string): Appointment['status'] {
  const s = raw?.toLowerCase() ?? ''
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'pending' || s === 'requested')  return 'pending'
  return 'confirmed'
}

async function fetchGoogleAppointments(): Promise<Appointment[]> {
  if (!isGoogleConfigured()) return []

  try {
    const cal     = getCalendarClient()
    const now     = new Date()
    const RANGE   = 90 * 24 * 60 * 60 * 1000
    const timeMin = new Date(now.getTime() - RANGE).toISOString()
    const timeMax = new Date(now.getTime() + RANGE).toISOString()

    const res = await cal.events.list({
      calendarId:   process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   500,
    })

    return (res.data.items ?? [] as GoogleEvent[]).map((ev): Appointment => ({
      id:           `google-${ev.id}`,
      calendarId:   'google',
      title:        ev.summary || 'Événement',
      contactName:  '—',
      startTime:    ev.start?.dateTime ?? ev.start?.date ?? new Date().toISOString(),
      endTime:      ev.end?.dateTime   ?? ev.end?.date   ?? new Date().toISOString(),
      status:       'confirmed',
      calendarName: 'Google Calendar',
      notes:        ev.description ?? null,
      color:        GOOGLE_COLOR,
      source:       'google',
      meetLink:     (ev as any).conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ?? null,
    }))
  } catch (err) {
    console.error('[Google] fetch failed:', err)
    return []
  }
}

export default async function CalendrierPage() {
  let appointments: Appointment[] = []

  try {
    const calendars = await getCalendars()

    if (calendars.length > 0) {
      const now    = Date.now()
      const RANGE  = 90 * 24 * 60 * 60 * 1000
      const startMs = now - RANGE
      const endMs   = now + RANGE

      const allEvents = await Promise.all(
        calendars.map(cal => getCalendarEvents(cal.id, startMs, endMs).catch(() => []))
      )

      appointments = allEvents.flat().map((ev, i): Appointment => ({
        id:           ev.id,
        calendarId:   ev.calendarId,
        title:        ev.title || 'Rendez-vous',
        contactName:  ev.contactName ?? '—',
        startTime:    typeof ev.startTime === 'number'
                        ? new Date(ev.startTime).toISOString()
                        : ev.startTime,
        endTime:      typeof ev.endTime === 'number'
                        ? new Date(ev.endTime).toISOString()
                        : ev.endTime,
        status:       mapStatus(ev.status),
        calendarName: calendars.find(c => c.id === ev.calendarId)?.name ?? 'Calendrier',
        notes:        ev.notes,
        color:        APPOINTMENT_COLORS[i % APPOINTMENT_COLORS.length],
        source:       'ghl',
      }))
    }
  } catch (err) {
    console.error('[Calendrier] GHL fetch failed:', err)
  }

  // Merge Google Calendar events
  const googleAppts = await fetchGoogleAppointments()
  appointments = [...appointments, ...googleAppts]

  const calendarsForView = await getCalendars().catch(() => [])
  return (
    <CalendarView
      appointments={appointments}
      calendars={calendarsForView}
      googleConfigured={isGoogleConfigured()}
    />
  )
}
