import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export interface InteractionLog {
  agent:    'soren' | 'kai' | 'mia'
  type:     string
  outcome:  string
  duration: number
  lead_id?: string
  metadata?: Record<string, unknown>
}

export async function logInteraction(log: InteractionLog): Promise<void> {
  const { error } = await supabase.from('agent_interactions').insert({
    ...log,
    metadata: log.metadata ?? {},
  })
  if (error) {
    console.error('[logger] Supabase insert failed:', error.message)
  }
}
