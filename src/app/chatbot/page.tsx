import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
import ChatbotView from '@/components/chatbot/ChatbotView'

export const dynamic = 'force-dynamic'

export default async function ChatbotPage() {
  const supabase = await createClient()

  const { data: soul } = await supabase
    .from('soul_versions')
    .select('content')
    .eq('agent', 'kai')
    .order('deployed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: memories } = await supabase
    .from('agent_memory')
    .select('key, value')
    .eq('agent', 'kai')
    .in('key', ['auto_response', 'budget_min', 'active_hours'])

  const settings: Record<string, unknown> = {}
  for (const m of memories ?? []) settings[m.key] = m.value

  return (
    <ChatbotView
      initialSystemPrompt={soul?.content ?? SYSTEM_PROMPT_DEFAULT}
      initialAutoResponse={(settings.auto_response as boolean) ?? true}
      initialBudgetMin={(settings.budget_min as number) ?? 5000}
      initialActiveHours={(settings.active_hours as { start: string; end: string }) ?? { start: '08:00', end: '20:00' }}
    />
  )
}
