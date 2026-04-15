import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { fields } = body as { fields: unknown[] }

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'fields doit être un tableau' }, { status: 400 })
    }

    const { error } = await supabase()
      .from('company_settings')
      .update({ form_fields: fields })
      .not('id', 'is', null) // update first row

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
