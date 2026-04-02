import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as { ghlId?: string; googleEventId?: string }
  const { ghlId, googleEventId } = body

  if (!ghlId || !googleEventId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_event_links')
    .upsert({ ghl_appointment_id: ghlId, google_event_id: googleEventId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
