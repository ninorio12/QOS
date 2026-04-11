import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      role,
      content,
      created_at,
      conversations (
        id,
        channel,
        ai_enabled,
        contact_name
      )
    `)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}
