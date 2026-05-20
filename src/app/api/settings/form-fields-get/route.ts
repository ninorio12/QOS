import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('company_settings')
      .select('form_fields')
      .single()

    return NextResponse.json({ fields: data?.form_fields ?? null })
  } catch {
    return NextResponse.json({ fields: null })
  }
}
