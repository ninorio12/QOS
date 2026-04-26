import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

const CAL_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google not configured' }, { status: 501 })
  }

  const { id } = params

  try {
    const cal = await getCalendarClient()
    await cal.events.delete({ calendarId: CAL_ID(), eventId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Google] delete failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google not configured' }, { status: 501 })
  }

  const { id } = params
  const { startTime, endTime } = await req.json() as {
    startTime: string
    endTime:   string
  }

  try {
    const cal = await getCalendarClient()
    const res = await cal.events.patch({
      calendarId:  CAL_ID(),
      eventId:     id,
      requestBody: {
        start: { dateTime: new Date(startTime).toISOString(), timeZone: 'Europe/Paris' },
        end:   { dateTime: new Date(endTime).toISOString(),   timeZone: 'Europe/Paris' },
      },
    })
    return NextResponse.json({ event: res.data })
  } catch (err) {
    console.error('[Google] patch failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
