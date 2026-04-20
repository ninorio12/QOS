import { NextRequest, NextResponse } from 'next/server'
import { runHermes } from '@/lib/agents/executor'
import type { TelegramUpdate } from '@/lib/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const update = await req.json() as TelegramUpdate
  const message = update.message
  if (!message?.text) return NextResponse.json({ ok: true })

  // Vérification chat ID Thomas (sécurité)
  const allowedChatId = process.env.HERMES_TELEGRAM_CHAT_ID
  if (allowedChatId && String(message.chat.id) !== allowedChatId) {
    return NextResponse.json({ ok: true })
  }

  // Exécution non-bloquante — on répond à Telegram immédiatement
  const chatId = String(message.chat.id)
  runHermes(message.text, chatId).catch(err =>
    console.error('[Hermes webhook error]', err)
  )

  return NextResponse.json({ ok: true })
}
