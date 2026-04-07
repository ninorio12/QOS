import type TelegramBot from 'node-telegram-bot-api'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import { config, type AgentName } from '../config'
import { logInteraction } from '../supabase/logger'

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>
export interface BuiltTool { definition: Omit<Tool, 'name'>; executor: ToolExecutor }

// ─── telegram_send ────────────────────────────────────────────
export function makeTelegramSendTool(agentName: AgentName, bot: TelegramBot): BuiltTool {
  return {
    definition: {
      description: "Post a message to the Telegram group using this agent's bot identity",
      input_schema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string', description: 'Message text to send (max 4096 chars)' },
        },
        required: ['message'],
      },
    },
    executor: async (input) => {
      const text = String(input.message)
      await bot.sendMessage(config.telegram.groupChatId, text, { parse_mode: 'Markdown' })
      return { ok: true, agent: agentName }
    },
  }
}

// ─── sessions_send ────────────────────────────────────────────
export type SessionsSendFn = (agent: AgentName, message: string) => Promise<string>

export function makeSessionsSendTool(sessionsSend: SessionsSendFn): BuiltTool {
  return {
    definition: {
      description: 'Delegate a task to another AI agent (Soren, Kai, or Mia)',
      input_schema: {
        type: 'object' as const,
        properties: {
          agent: {
            type: 'string',
            enum: ['soren', 'kai', 'mia'],
            description: 'Which agent to delegate to',
          },
          message: {
            type: 'string',
            description: 'Full instructions or context to send to the agent',
          },
        },
        required: ['agent', 'message'],
      },
    },
    executor: async (input) => {
      const agent  = input.agent as AgentName
      const msg    = String(input.message)
      const result = await sessionsSend(agent, msg)
      return { response: result, agent }
    },
  }
}

// ─── log_interaction ──────────────────────────────────────────
export function makeLogTool(agentName: AgentName): BuiltTool {
  return {
    definition: {
      description: 'Log an agent action to Supabase for analytics and self-improvement',
      input_schema: {
        type: 'object' as const,
        properties: {
          type:     { type: 'string', description: 'Action type: sms, delegation, devis, cron, voice' },
          outcome:  { type: 'string', description: 'Result: success, no_response, error, escalated' },
          duration: { type: 'number', description: 'Duration in milliseconds' },
          lead_id:  { type: 'string', description: 'GHL lead ID if applicable' },
        },
        required: ['type', 'outcome', 'duration'],
      },
    },
    executor: async (input) => {
      await logInteraction({
        agent:    agentName,
        type:     String(input.type),
        outcome:  String(input.outcome),
        duration: Number(input.duration),
        lead_id:  input.lead_id ? String(input.lead_id) : undefined,
      })
      return { ok: true }
    },
  }
}
