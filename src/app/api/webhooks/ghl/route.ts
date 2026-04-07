import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
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

    const ghlSecret = process.env.GHL_WEBHOOK_SECRET
    if (ghlSecret) {
      const receivedSecret = req.headers.get('x-wc-webhook-secret') ?? req.headers.get('x-ghl-secret') ?? ''
      if (receivedSecret !== ghlSecret) {
        console.warn('[ghl-webhook] Invalid secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (eventType !== 'AppointmentDelete' || !appointmentId) {
      if (eventType) console.log(`[ghl-webhook] Ignored event type: ${eventType}`)
      return NextResponse.json({ ok: true })
    }

    const supabase = await createClient()

    // Lookup Google event ID
    const { data: link } = await supabase
      .from('calendar_event_links')
      .select('google_event_id')
      .eq('ghl_appointment_id', appointmentId)
      .maybeSingle()

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
      const { error: delErr } = await supabase
        .from('calendar_event_links')
        .delete()
        .eq('ghl_appointment_id', appointmentId)
      if (delErr) console.error('[ghl-webhook] Mapping delete failed:', delErr)
    }

    revalidateTag('ghl-contacts')
    revalidateTag('ghl-opportunities')
    revalidateTag('ghl-conversations')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ghl-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
