import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

export async function GET() {
  const supabase = await createClient()

  // Dernier soul (system prompt)
  const { data: soul } = await supabase
    .from('soul_versions')
    .select('content, deployed_at')
    .eq('agent', 'kai')
    .order('deployed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Settings from agent_memory
  const { data: memories } = await supabase
    .from('agent_memory')
    .select('key, value')
    .eq('agent', 'kai')
    .in('key', ['auto_response', 'active_hours', 'budget_min'])

  const settings: Record<string, unknown> = {}
  for (const m of memories ?? []) settings[m.key] = m.value

  return Response.json({
    systemPrompt: soul?.content ?? SYSTEM_PROMPT_DEFAULT,
    autoResponse: settings.auto_response ?? true,
    budgetMin:    settings.budget_min    ?? 5000,
    activeHours:  settings.active_hours  ?? { start: '08:00', end: '20:00' },
  })
}

export async function PATCH(req: Request) {
  const { systemPrompt, autoResponse, budgetMin, activeHours } = await req.json()
  const supabase = await createClient()

  if (systemPrompt !== undefined) {
    await supabase.from('soul_versions').insert({
      agent: 'kai', content: systemPrompt, author: 'admin', deployed_at: new Date().toISOString()
    })
  }

  const upserts = [
    { agent: 'kai', key: 'auto_response', value: autoResponse },
    { agent: 'kai', key: 'budget_min',    value: budgetMin    },
    { agent: 'kai', key: 'active_hours',  value: activeHours  },
  ].filter(u => u.value !== undefined)

  if (upserts.length > 0) {
    await supabase.from('agent_memory').upsert(upserts, { onConflict: 'agent,key' })
  }

  return Response.json({ ok: true })
}
