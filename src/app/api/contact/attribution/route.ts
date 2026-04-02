// src/app/api/contact/attribution/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/contact/attribution?ids=id1,id2,id3
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json({ attributions: [] })
  if (ids.length > 200) return NextResponse.json({ error: 'Too many ids' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_attribution')
    .select('ghl_contact_id, created_by, created_at')
    .in('ghl_contact_id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attributions: data ?? [] })
}

// POST /api/contact/attribution
// Body: { ghlContactId: string, createdBy: string }
export async function POST(req: NextRequest) {
  const { ghlContactId, createdBy } = await req.json() as {
    ghlContactId?: string
    createdBy?: string
  }

  if (!ghlContactId || !createdBy) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (createdBy.length > 100) return NextResponse.json({ error: 'createdBy too long' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_attribution')
    .upsert({ ghl_contact_id: ghlContactId, created_by: createdBy })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
