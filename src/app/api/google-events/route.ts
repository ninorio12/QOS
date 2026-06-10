import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

const CAL_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary'
const RANGE_MS = 90 * 24 * 60 * 60 * 1000

export async function GET() {
  if (!await isGoogleConfigured()) return NextResponse.json({ events: [] })

  try {
    const cal     = await getCalendarClient()
    const now     = new Date()
    const timeMin = new Date(now.getTime() - RANGE_MS).toISOString()
    const timeMax = new Date(now.getTime() + RANGE_MS).toISOString()

    const res = await cal.events.list({
      calendarId:   CAL_ID(),
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   500,
    })

    return NextResponse.json({ events: res.data.items ?? [] })
  } catch (err) {
    console.error('[Google] fetch failed:', err)
    return NextResponse.json({ events: [] })
  }
}

export async function POST(req: NextRequest) {
  if (!await isGoogleConfigured()) return NextResponse.json({ event: null })

  const body = await req.json() as {
    title:     string
    startTime: string
    endTime:   string
    notes?:    string
    withMeet?: boolean
    attendees?: string[]   // emails — invitations envoyées à ces personnes
    tz?:       string
    type?:     string      // R1/R2/Follow-up/… — persisted in extendedProperties
  }
  const { title, startTime, endTime, notes, withMeet = true, attendees = [], type } = body
  const tz = body.tz || 'Europe/Paris'

  // Dédoublonne + valide grossièrement les emails
  const guests = [...new Set((attendees ?? []).map(e => (e || '').trim()).filter(e => /.+@.+\..+/.test(e)))]

  try {
    const cal = await getCalendarClient()
    const res = await cal.events.insert({
      calendarId:          CAL_ID(),
      conferenceDataVersion: withMeet ? 1 : 0,
      sendUpdates:         guests.length ? 'all' : 'none',   // déclenche l'envoi des invitations
      requestBody: {
        summary:     title,
        description: notes || undefined,
        start:       { dateTime: startTime, timeZone: tz },
        end:         { dateTime: endTime,   timeZone: tz },
        ...(type ? { extendedProperties: { private: { type } } } : {}),
        ...(guests.length ? { attendees: guests.map(email => ({ email })) } : {}),
        ...(withMeet ? {
          conferenceData: {
            createRequest: {
              requestId:            `meet-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        } : {}),
      },
    })

    const meetLink = res.data.conferenceData?.entryPoints
      ?.find(e => e.entryPointType === 'video')?.uri ?? null

    return NextResponse.json({ event: res.data, meetLink })
  } catch (err) {
    console.error('[Google] create failed:', err)
    return NextResponse.json({ event: null })
  }
}
