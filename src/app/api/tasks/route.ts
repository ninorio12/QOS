import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ tasks: [] })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const body = await req.json() as { title: string; agent: string; col?: string; human?: boolean }

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      title:           body.title,
      agent:           body.agent,
      col:             body.col ?? 'todo',
      human:           body.human ?? false,
      organization_id: ctx.orgId,
      created_at:      new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const body = await req.json() as { id: string; col: string }

  const { error } = await supabase
    .from('agent_tasks')
    .update({ col: body.col, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
