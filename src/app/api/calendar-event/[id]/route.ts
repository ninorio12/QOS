// src/app/api/calendar-event/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

const BASE = () => process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
const KEY  = () => process.env.GHL_API_KEY!

function ghlHeaders() {
  return {
    Authorization:  `Bearer ${KEY()}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params
  const supabase = await createClient()

  // 1. Lookup Google event ID from mapping
  const { data: link } = await supabase
    .from('calendar_event_links')
    .select('google_event_id')
    .eq('ghl_appointment_id', id)
    .maybeSingle()

  // 2. Delete from Google Calendar if linked
  if (link?.google_event_id && isGoogleConfigured()) {
    try {
      const cal = getCalendarClient()
      const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
      await cal.events.delete({ calendarId: calId, eventId: link.google_event_id })
    } catch (err) {
      console.error('[calendar-event/delete] Google delete failed:', err)
      // Non-fatal: continue to delete from GHL
    }
  }

  // 3. Delete from GHL
  const res = await fetch(`${BASE()}/calendars/events/${id}`, {
    method:  'DELETE',
    headers: ghlHeaders(),
    cache:   'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  // 4. Delete mapping row (only if GHL delete succeeded)
  if (link) {
    const { error: delErr } = await supabase
      .from('calendar_event_links')
      .delete()
      .eq('ghl_appointment_id', id)
    if (delErr) console.error('[calendar-event/delete] Mapping delete failed:', delErr)
  }

  return NextResponse.json({ success: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params
  const { startTime, endTime } = await req.json() as {
    startTime: string
    endTime:   string
  }

  const res = await fetch(`${BASE()}/calendars/events/appointments/${id}`, {
    method:  'PUT',
    headers: ghlHeaders(),
    body:    JSON.stringify({
      startTime: new Date(startTime).toISOString(),
      endTime:   new Date(endTime).toISOString(),
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ event: data })
}
