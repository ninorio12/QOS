// Server-only — uses supabase/server
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

export type KaiAgentSettings = {
  systemPrompt: string
  autoResponse: boolean
  budgetMin:    number
  activeHours:  { start: string; end: string }
}

export async function getKaiAgentSettings(): Promise<KaiAgentSettings> {
  const supabase = await createClient()

  const [{ data: soul }, { data: memories }] = await Promise.all([
    supabase
      .from('soul_versions')
      .select('content')
      .eq('agent', 'kai')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_memory')
      .select('key, value')
      .eq('agent', 'kai')
      .in('key', ['auto_response', 'budget_min', 'active_hours']),
  ])

  const settings: Record<string, unknown> = {}
  for (const m of memories ?? []) settings[m.key] = m.value

  return {
    systemPrompt: soul?.content ?? SYSTEM_PROMPT_DEFAULT,
    autoResponse: (settings.auto_response as boolean) ?? true,
    budgetMin:    (settings.budget_min as number) ?? 5000,
    activeHours:  (settings.active_hours as { start: string; end: string }) ?? { start: '08:00', end: '20:00' },
  }
}
