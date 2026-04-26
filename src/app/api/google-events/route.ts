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

  const { title, startTime, endTime, notes, withMeet = true } = await req.json() as {
    title:     string
    startTime: string
    endTime:   string
    notes?:    string
    withMeet?: boolean
  }

  try {
    const cal = await getCalendarClient()
    const res = await cal.events.insert({
      calendarId:          CAL_ID(),
      conferenceDataVersion: withMeet ? 1 : 0,
      requestBody: {
        summary:     title,
        description: notes || undefined,
        start:       { dateTime: startTime, timeZone: 'Europe/Paris' },
        end:         { dateTime: endTime,   timeZone: 'Europe/Paris' },
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
