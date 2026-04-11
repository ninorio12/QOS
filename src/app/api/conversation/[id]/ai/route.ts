import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ai_enabled } = await req.json()
  if (typeof ai_enabled !== 'boolean') {
    return NextResponse.json({ error: 'ai_enabled must be boolean' }, { status: 400 })
  }

  const supabase = await createClient()
  // Upsert : crée la ligne si elle n'existe pas encore (conversations GHL)
  const { error } = await supabase
    .from('conversations')
    .upsert({ id: params.id, ai_enabled }, { onConflict: 'id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
