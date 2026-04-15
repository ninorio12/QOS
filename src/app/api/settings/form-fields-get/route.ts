import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('company_settings')
      .select('form_fields')
      .single()

    return NextResponse.json({ fields: data?.form_fields ?? null })
  } catch {
    return NextResponse.json({ fields: null })
  }
}
