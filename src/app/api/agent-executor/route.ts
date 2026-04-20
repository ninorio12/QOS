import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAgentTask, type AgentTask } from '@/lib/agents/executor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Vérification secret (Vercel Cron ou appel manuel)
  const secret = req.nextUrl.searchParams.get('secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_EXECUTOR_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Récupère jusqu'à 3 tâches 'todo' pour ops/doc
  const { data: tasks, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('col', 'todo')
    .in('agent', ['ops', 'doc'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) {
    console.error('[agent-executor] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tasks?.length) {
    return NextResponse.json({ executed: 0 })
  }

  const results = []

  for (const task of tasks as AgentTask[]) {
    // Marque inprogress immédiatement (évite double exécution)
    await supabase
      .from('agent_tasks')
      .update({ col: 'inprogress', started_at: new Date().toISOString() })
      .eq('id', task.id)

    try {
      const result = await executeAgentTask(task)
      results.push({ taskId: task.id, status: 'ok', toolsUsed: result.toolsUsed })
    } catch (err) {
      console.error(`[agent-executor] Task ${task.id} failed:`, err)
      await supabase
        .from('agent_tasks')
        .update({
          col:         'error',
          result:      err instanceof Error ? err.message : String(err),
          finished_at: new Date().toISOString(),
        })
        .eq('id', task.id)
      results.push({ taskId: task.id, status: 'error' })
    }
  }

  return NextResponse.json({ executed: results.length, results })
}
