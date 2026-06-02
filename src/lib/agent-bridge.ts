// Bridge inter-agents QOS ↔ Hermes
// Protocole : task | start | progress | result | error | ack

import { createAdminClient } from './supabase/admin'

function getSupabase() { return createAdminClient() }

export type MsgType = 'task' | 'start' | 'progress' | 'result' | 'error' | 'ack'

export type AgentMessage = {
  id: number
  from_agent: 'qos' | 'hermes'
  to_agent: 'qos' | 'hermes' | 'all'
  type: MsgType
  subject: string | null
  payload: Record<string, unknown>
  ref_id: number | null       // ID du message auquel on répond
  read: boolean
  created_at: string
}

const ICONS: Record<MsgType, string> = {
  task: '📋', start: '🚀', progress: '⏳', result: '✅', error: '❌', ack: '👍'
}

export const bridge = {
  // Envoyer un message
  async send(
    to: 'qos' | 'hermes' | 'all',
    type: MsgType,
    subject: string,
    payload: Record<string, unknown> = {},
    opts: { from?: 'qos' | 'hermes'; refId?: number } = {}
  ): Promise<number> {
    const { from = 'qos', refId } = opts

    const { data, error } = await getSupabase()
      .from('agent_messages')
      .insert({ from_agent: from, to_agent: to, type, subject, payload, ref_id: refId ?? null })
      .select('id')
      .single()

    if (error) throw error

    await notifyTelegram(from, to, type, subject, payload)

    return data.id as number
  },

  // Lire l'inbox non lue
  async inbox(agent: 'qos' | 'hermes'): Promise<AgentMessage[]> {
    const sb = getSupabase()
    const { data } = await sb
      .from('agent_messages')
      .select('*')
      .or(`to_agent.eq.${agent},to_agent.eq.all`)
      .eq('read', false)
      .order('created_at', { ascending: true })

    const msgs = (data ?? []) as AgentMessage[]
    if (msgs.length > 0) {
      await sb.from('agent_messages').update({ read: true }).in('id', msgs.map(m => m.id))
    }
    return msgs
  },

  // Historique pour la page /agents
  async history(limit = 50): Promise<AgentMessage[]> {
    const sb = getSupabase()
    const { data } = await sb
      .from('agent_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []).reverse() as AgentMessage[]
  },

  // Raccourcis protocole
  task:     (to: 'hermes', subject: string, payload?: Record<string, unknown>) =>
              bridge.send(to, 'task', subject, payload),
  result:   (to: 'hermes' | 'qos', subject: string, payload?: Record<string, unknown>, from?: 'qos' | 'hermes') =>
              bridge.send(to, 'result', subject, payload ?? {}, { from }),
  ack:      (refId: number, from: 'qos' | 'hermes' = 'qos') =>
              bridge.send('all', 'ack', 'Reçu', {}, { from, refId }),
}

// Envoi Telegram direct
async function notifyTelegram(
  from: string, to: string, type: MsgType, subject: string | null, payload: Record<string, unknown>
) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID   // 7354829275 — Thomas & Hermes
  if (!token || !chatId) return

  const icon = ICONS[type]
  const lines = [
    `${icon} *${from.toUpperCase()} → ${to.toUpperCase()}* \`${type}\``,
    subject ? `*${subject}*` : null,
    Object.keys(payload).length > 0
      ? '```\n' + JSON.stringify(payload, null, 2).slice(0, 600) + '\n```'
      : null,
  ].filter(Boolean).join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines, parse_mode: 'Markdown' }),
  }).catch(() => {})
}
