import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'
import { createClient } from '@/lib/supabase/server'

const CAL_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary'
const GHL_BASE = () => process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

// Cascade: delete the GHL appointment linked to a Google event (Google → GHL).
async function cascadeDeleteLinkedGhl(googleEventId: string) {
  try {
    const supabase = await createClient()
    const { data: link } = await supabase
      .from('calendar_event_links')
      .select('ghl_appointment_id')
      .eq('google_event_id', googleEventId)
      .maybeSingle()

    if (!link?.ghl_appointment_id) return

    if (process.env.GHL_API_KEY) {
      await fetch(`${GHL_BASE()}/calendars/events/${link.ghl_appointment_id}`, {
        method:  'DELETE',
        headers: {
          Authorization:  `Bearer ${process.env.GHL_API_KEY}`,
          Version:        '2021-07-28',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }).catch(err => console.error('[Google→GHL cascade] GHL delete failed:', err))
    }

    await supabase
      .from('calendar_event_links')
      .delete()
      .eq('google_event_id', googleEventId)
  } catch (err) {
    console.error('[Google→GHL cascade] failed:', err)
    // Non-fatal: Google event was already deleted
  }
}

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
    // Cascade to the linked GHL appointment, if any
    await cascadeDeleteLinkedGhl(id)
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
  const body = await req.json() as {
    startTime: string
    endTime:   string
    tz?:       string
  }
  const { startTime, endTime } = body
  const tz = body.tz || 'Europe/Paris'

  try {
    const cal = await getCalendarClient()
    const res = await cal.events.patch({
      calendarId:  CAL_ID(),
      eventId:     id,
      requestBody: {
        start: { dateTime: new Date(startTime).toISOString(), timeZone: tz },
        end:   { dateTime: new Date(endTime).toISOString(),   timeZone: tz },
      },
    })
    return NextResponse.json({ event: res.data })
  } catch (err) {
    console.error('[Google] patch failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
