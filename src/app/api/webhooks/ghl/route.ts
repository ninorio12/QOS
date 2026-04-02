import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?: string
      appointmentId?: string
      id?: string
    }

    const eventType     = body.type ?? ''
    const appointmentId = body.appointmentId ?? body.id ?? ''

    if (eventType !== 'AppointmentDelete' || !appointmentId) {
      return NextResponse.json({ ok: true })
    }

    const supabase = await createClient()

    // Lookup Google event ID
    const { data: link } = await supabase
      .from('calendar_event_links')
      .select('google_event_id')
      .eq('ghl_appointment_id', appointmentId)
      .single()

    if (link?.google_event_id && isGoogleConfigured()) {
      try {
        const cal = getCalendarClient()
        const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
        await cal.events.delete({ calendarId: calId, eventId: link.google_event_id })
        console.log(`[ghl-webhook] Deleted Google event ${link.google_event_id}`)
      } catch (err) {
        console.error('[ghl-webhook] Google delete failed:', err)
      }
    }

    // Clean up mapping
    if (link) {
      await supabase
        .from('calendar_event_links')
        .delete()
        .eq('ghl_appointment_id', appointmentId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ghl-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
