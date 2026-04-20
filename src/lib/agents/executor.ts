/**
 * Logique d'exécution autonome des agents :
 * - runHermes : traite un message Telegram entrant
 * - executeAgentTask : exécute une tâche agent_tasks pour ops/doc
 */

import Anthropic from '@anthropic-ai/sdk'
import { HERMES_TOOLS } from './hermes-tools'
import { executeTool } from './tools'
import { runAgent } from './runner'
import { env } from '@/lib/env'
import type { GHLCreds } from '@/lib/ghl'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type AgentTask = {
  id: string
  title: string
  agent: 'ops' | 'doc'
  col: string
  priority?: number
  context?: Record<string, unknown>
  organization_id?: string | null
}

export type ExecutionResult = {
  taskId: string
  agentId: string
  response: string
  toolsUsed: string[]
  tokensUsed: number
}

// ─── System prompt Hermes ────────────────────────────────────────────

const HERMES_SYSTEM = `Tu es Hermes, l'assistant COO de Thomas chez Qorpo IA.
Tu reçois des instructions de Thomas via Telegram et tu les exécutes.

Tu peux :
- Créer des tâches pour les agents Ops, Doc, Kai, Soren, Mia
- Consulter le pipeline, les contacts, les logs d'agents
- Lire et mettre à jour la base de connaissance (docs markdown)
- Déclencher des workflows GHL
- Répondre avec des synthèses sur l'activité

Règles :
- Toujours confirmer ce que tu as fait via send_reply
- Pour les questions → réponds avec les données réelles (query Supabase/GHL)
- Pour les actions → exécute et confirme
- Format réponses : concis, en français, avec des emojis clés

Exemples de commandes de Thomas :
"Crée une tâche pour ops : vérifier les leads non contactés"
"Montre-moi les tâches en cours"
"Met à jour la KB 'tarifs' avec : tarif peinture = 35€/m2"
"Combien d'opportunités ouvertes ?"
"Trigger le workflow Relance-7j pour le contact ID abc123"`

// ─── Hermes ──────────────────────────────────────────────────────────

export async function runHermes(text: string, chatId: string): Promise<void> {
  const creds: GHLCreds = { apiKey: env.ghlApiKey(), locationId: env.ghlLocationId() }

  let currentMessages: Anthropic.MessageParam[] = [
    { role: 'user', content: text },
  ]

  for (let turn = 0; turn < 8; turn++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     HERMES_SYSTEM,
      tools:      HERMES_TOOLS,
      messages:   currentMessages,
    })

    if (response.stop_reason !== 'tool_use') break

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        creds,
        null,
        'hermes',
        chatId,
      )
      toolResults.push({
        type:        'tool_result',
        tool_use_id: toolUse.id,
        content:     JSON.stringify(result),
      })
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ]
  }
}

// ─── Task executor ───────────────────────────────────────────────────

export async function executeAgentTask(task: AgentTask): Promise<ExecutionResult> {
  const creds: GHLCreds = { apiKey: env.ghlApiKey(), locationId: env.ghlLocationId() }

  const userMessage = `TÂCHE ID: ${task.id}
TITRE: ${task.title}
PRIORITÉ: ${task.priority ?? 0}
CONTEXTE: ${JSON.stringify(task.context ?? {})}

Exécute cette tâche. N'oublie pas :
1. Appelle read_knowledge en premier pour charger le contexte métier
2. Logue tes actions via write_task_log(taskId="${task.id}", ...)
3. Finalise avec complete_task(taskId="${task.id}", result="...")`

  const result = await runAgent(
    task.agent,
    userMessage,
    creds,
    task.organization_id ?? null,
  )

  return { taskId: task.id, agentId: task.agent, ...result }
}
