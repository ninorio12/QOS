import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Pas de Supabase configuré → vide honnête (aucune donnée fabriquée).
  // Instancier le client APRÈS le garde, sinon createAdminClient() jette
  // "supabaseUrl is required".
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ logs: [] })
  }
  const supabase = createAdminClient()
  const { searchParams } = req.nextUrl

  const agent  = searchParams.get('agent')
  const level  = searchParams.get('level')
  const taskId = searchParams.get('taskId')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200)

  let query = supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agent)  query = query.eq('agent',   agent)
  if (level)  query = query.eq('level',   level)
  if (taskId) query = query.eq('task_id', taskId)

  const { data, error } = await query

  if (error) return NextResponse.json({ logs: [] })
  return NextResponse.json({ logs: data ?? [] })
}
