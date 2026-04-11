/**
 * Client Telegram Bot API
 * Usage: sendTelegram(chatId, text)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const BASE = () => `https://api.telegram.org/bot${BOT_TOKEN}`

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    date: number
  }
}

export async function sendTelegram(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN non configuré')
    return false
  }
  try {
    const res = await fetch(`${BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: parseMode,
      }),
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function setWebhook(webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: 'Token manquant' }
  const res = await fetch(`${BASE()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  return res.json()
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  if (!BOT_TOKEN) return { ok: false }
  const res = await fetch(`${BASE()}/getWebhookInfo`)
  return res.json()
}

export async function sendChatAction(chatId: number | string, action: 'typing' = 'typing'): Promise<void> {
  if (!BOT_TOKEN) return
  await fetch(`${BASE()}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
    cache: 'no-store',
  }).catch(() => {})
}
