import { createClient } from '@supabase/supabase-js'
import type { SessionManager } from '../sessions/SessionManager'
import { config } from '../config'
import { logInteraction } from '../supabase/logger'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

/** Runs Sunday 09h00: read interactions, generate SOUL.md suggestions, post to Telegram */
export async function runWeeklyAnalysis(sorenSession: SessionManager): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: interactions, error } = await supabase
    .from('agent_interactions')
    .select('agent, type, outcome, duration, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[weeklyAnalysis] Supabase read error:', error.message)
    return
  }

  if (!interactions || interactions.length === 0) {
    console.log('[weeklyAnalysis] No interactions this week — skipping analysis')
    return
  }

  const summary = buildInteractionSummary(interactions)

  const analysisPrompt = [
    'Analyse les interactions de la semaine et génère des suggestions d\'amélioration pour Kai et Mia.',
    'Utilise ensuite telegram_send pour poster le rapport dans le groupe.',
    '',
    'DONNÉES DE LA SEMAINE :',
    summary,
    '',
    'INSTRUCTIONS :',
    '1. Analyse les patterns (taux de succès par type, durées, outcomes)',
    '2. Génère 1-2 suggestions concrètes pour Kai (SMS, qualification)',
    '3. Génère 1 suggestion pour Mia si pertinent',
    '4. Propose les mises à jour SOUL.md sous forme de diff clair',
    '5. Poste via telegram_send et termine par : "Je mets à jour ? (oui/non)"',
    '6. Si Thomas répond "oui", applique avec update_soul.',
  ].join('\n')

  await sorenSession.send(analysisPrompt)

  await logInteraction({
    agent:    'soren',
    type:     'weekly_analysis',
    outcome:  'triggered',
    duration: 0,
    metadata: { interactionCount: interactions.length },
  })
}

interface Interaction {
  agent: string
  type: string
  outcome: string
  duration: number
  metadata: Record<string, unknown>
  created_at: string
}

function buildInteractionSummary(rows: Interaction[]): string {
  const byAgent = rows.reduce((acc, r) => {
    if (!acc[r.agent]) acc[r.agent] = []
    acc[r.agent].push(r)
    return acc
  }, {} as Record<string, Interaction[]>)

  return Object.entries(byAgent).map(([agent, items]) => {
    const successCount  = items.filter(i => i.outcome === 'success').length
    const total         = items.length
    const avgDuration   = Math.round(items.reduce((s, i) => s + (i.duration ?? 0), 0) / total)
    const byType = items.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      `${agent.toUpperCase()} — ${total} interactions, ${Math.round(successCount / total * 100)}% succès, durée moy: ${avgDuration}ms`,
      Object.entries(byType).map(([t, n]) => `  • ${t}: ${n}x`).join('\n'),
    ].join('\n')
  }).join('\n\n')
}
