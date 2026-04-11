/**
 * Agent Runner — exécute un cycle complet agent avec tool_use Anthropic SDK
 * Utilisé par les API routes et le bot Telegram
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { KAI_TOOLS, SOREN_TOOLS, MIA_TOOLS, executeTool } from './tools'
import type { GHLCreds } from '@/lib/ghl'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── System prompts par agent ─────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  soren: `Tu es Soren, le COO Digital et orchestrateur IA de l'agence Qorpo IA.
Tu travailles pour des entreprises BTP/rénovation. Tu pilotes les agents Kai et Mia.
Tu as accès aux données du CRM, pipeline, et tâches en cours.
Tu es direct, précis, et proactif. Tu réponds en français.
Quand tu analyses le pipeline ou les leads, tu fournis des insights actionnables.
Tu peux créer des tâches, déléguer, et reporter l'état des opérations.`,

  kai: `Tu es Kai, le CSM Digital spécialisé en qualification de leads BTP/rénovation.
Tu gères les leads entrants, qualifies les prospects et assures le suivi client.
Tu as accès au CRM GHL pour lire/modifier les contacts et opportunités.
Critères de qualification : budget > 5 000€, projet concret, délai < 6 mois.
Tu réponds en français, de manière naturelle et professionnelle.
Quand tu identifies un lead qualifié, tu crées une tâche de suivi.`,

  mia: `Tu es Mia, la KB Manager et assistante documentaire de l'équipe.
Tu génères des devis, maintiens la base de connaissance, et gères les documents.
Tu as accès aux contacts et à la base de connaissance interne.
Tu réponds en français avec précision et clarté.`,
}

const TOOLS_BY_AGENT: Record<string, Anthropic.Tool[]> = {
  soren: SOREN_TOOLS,
  kai:   KAI_TOOLS,
  mia:   MIA_TOOLS,
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AgentRunResult = {
  response: string
  toolsUsed: string[]
  tokensUsed: number
}

// ─── Runner principal ─────────────────────────────────────────────────────────

export async function runAgent(
  agentId: 'soren' | 'kai' | 'mia',
  userMessage: string,
  creds: GHLCreds,
  orgId: string | null,
  conversationHistory: AgentMessage[] = [],
): Promise<AgentRunResult> {

  const tools   = TOOLS_BY_AGENT[agentId] ?? KAI_TOOLS
  const system  = SYSTEM_PROMPTS[agentId] ?? SYSTEM_PROMPTS.kai
  const toolsUsed: string[] = []
  let totalTokens = 0

  // Charger la mémoire persistante de l'agent depuis Supabase
  const supabase = createAdminClient()
  const { data: memories } = await supabase
    .from('agent_memory')
    .select('key, value')
    .eq('agent', agentId)
    .limit(10)

  const memoryContext = memories && memories.length > 0
    ? `\n\nMémoire persistante:\n${memories.map(m => `- ${m.key}: ${JSON.stringify(m.value)}`).join('\n')}`
    : ''

  // Construire les messages pour Anthropic
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  // Boucle agentic — jusqu'à 5 tours de tool_use
  let currentMessages = messages
  let finalResponse = ''

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     system + memoryContext,
      tools,
      messages:   currentMessages,
    })

    totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Extraire le texte de la réponse
    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      finalResponse = textBlocks.map(b => (b as Anthropic.TextBlock).text).join('\n')
    }

    // Si pas de tool_use → réponse finale
    if (response.stop_reason !== 'tool_use') break

    // Exécuter les outils
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name)
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        creds,
        orgId,
      )
      toolResults.push({
        type:        'tool_result',
        tool_use_id: toolUse.id,
        content:     JSON.stringify(result),
      })
    }

    // Ajouter la réponse de l'assistant + résultats des outils
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ]
  }

  // Sauvegarder l'interaction dans Supabase
  supabase.from('agent_interactions').insert({
    agent:           agentId,
    type:            'chat',
    outcome:         'completed',
    metadata:        { userMessage, toolsUsed, tokensUsed: totalTokens },
    organization_id: orgId,
  }).then(() => {/* non-blocking */}, () => {/* silent */})

  return { response: finalResponse, toolsUsed, tokensUsed: totalTokens }
}
