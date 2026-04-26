import { NextRequest } from 'next/server'
import { sendTelegram, sendChatAction, transcribeVoice, type TelegramUpdate } from '@/lib/telegram'
import { runAgent } from '@/lib/agents/runner'
import { env } from '@/lib/env'
import { buildClientContext, buildClientSystemPrefix, renderTemplate } from '@/lib/telegram-client-templates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Mode detection ────────────────────────────────────────────────────────────
type Mode = 'admin' | 'soren-client'

const ADMIN_TOKEN  = process.env.TELEGRAM_BOT_TOKEN_ADMIN  ?? process.env.TELEGRAM_BOT_TOKEN
const CLIENT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CLIENT

function getMode(token: string | null): Mode | null {
  if (!token) return null
  if (token === ADMIN_TOKEN)  return 'admin'
  if (token === CLIENT_TOKEN) return 'soren-client'
  return null
}

// Thomas's Telegram chat ID (whitelist admin uniquement)
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID, 10)
  : null

function getSorenCreds() {
  return {
    apiKey:     env.ghlApiKey(),
    locationId: env.ghlLocationId(),
  }
}

// ── Message d'accueil admin ───────────────────────────────────────────────────
const ADMIN_WELCOME = `👋 <b>Soren actif — Mode Admin</b>\n\nBonjour, accès complet activé.\nPipeline, leads, agents, debug — tout est disponible.`

// ── Webhook ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const mode  = getMode(token)

  if (!mode) {
    return new Response('Unauthorized', { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json() as TelegramUpdate
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const message = update.message
  if (!message?.chat) {
    return new Response('OK', { status: 200 })
  }

  const chatId   = message.chat.id
  const fromName = message.from.first_name ?? 'vous'
  const botTok   = token!

  // Whitelist : admin uniquement
  if (mode === 'admin' && ADMIN_CHAT_ID && chatId !== ADMIN_CHAT_ID) {
    await sendTelegram(chatId, '⛔ Accès non autorisé.', 'HTML', botTok)
    return new Response('OK', { status: 200 })
  }

  // Transcription vocale
  let text: string | undefined = message.text?.trim()
  const voiceFileId = message.voice?.file_id ?? message.audio?.file_id
  if (!text && voiceFileId) {
    await sendChatAction(chatId, 'typing', botTok)
    const transcription = await transcribeVoice(voiceFileId, botTok)
    if (!transcription) {
      await sendTelegram(chatId, '❌ Impossible de transcrire le message vocal.', 'HTML', botTok)
      return new Response('OK', { status: 200 })
    }
    text = transcription
    await sendTelegram(chatId, `🎙️ <i>${text}</i>`, 'HTML', botTok)
  }

  if (!text) {
    return new Response('OK', { status: 200 })
  }

  // ── Commandes spéciales ───────────────────────────────────────────────────
  if (text === '/start') {
    if (mode === 'admin') {
      await sendTelegram(chatId, ADMIN_WELCOME, 'HTML', botTok)
    } else {
      const ctx     = await buildClientContext(fromName)
      const welcome = renderTemplate('welcome_new_lead', ctx)
      await sendTelegram(chatId, welcome, 'HTML', botTok)
    }
    return new Response('OK', { status: 200 })
  }

  // /status et /tasks : admin uniquement
  if (mode === 'admin') {
    if (text === '/status') {
      const creds  = getSorenCreds()
      const result = await runAgent('soren', 'Donne-moi un résumé rapide : combien de leads actifs, valeur du pipeline, et les 3 dernières opportunités.', creds, null)
      await sendTelegram(chatId, result.response, 'HTML', botTok)
      return new Response('OK', { status: 200 })
    }

    if (text === '/tasks') {
      const creds  = getSorenCreds()
      const result = await runAgent('soren', 'Liste-moi les tâches en cours des agents. Quelles sont les priorités ?', creds, null)
      await sendTelegram(chatId, result.response, 'HTML', botTok)
      return new Response('OK', { status: 200 })
    }
  } else {
    // Mode client : /status et /tasks non disponibles
    if (text === '/status' || text === '/tasks') {
      await sendTelegram(chatId, 'Cette commande n\'est pas disponible. Je peux vous aider avec votre projet ou votre rendez-vous 😊', 'HTML', botTok)
      return new Response('OK', { status: 200 })
    }
  }

  // ── Message libre → agent ─────────────────────────────────────────────────
  await sendChatAction(chatId, 'typing', botTok)

  try {
    const creds     = getSorenCreds()
    let agentText   = text
    if (mode === 'soren-client') {
      const ctx   = await buildClientContext(fromName)
      agentText   = buildClientSystemPrefix(ctx) + ' ' + text
    }
    const result    = await runAgent('soren', agentText, creds, null)

    let reply = result.response || 'Je n\'ai pas de réponse pour le moment.'

    // Outils utilisés : admin seulement
    if (mode === 'admin' && result.toolsUsed.length > 0) {
      reply += `\n\n<i>🔧 ${result.toolsUsed.join(', ')}</i>`
    }

    await sendTelegram(chatId, reply, 'HTML', botTok)
  } catch (err) {
    console.error('[Telegram webhook] Error:', err)
    await sendTelegram(chatId, '❌ Une erreur est survenue. Réessaie dans un instant.', 'HTML', botTok)
  }

  return new Response('OK', { status: 200 })
}

export async function GET() {
  return new Response('Telegram webhook actif', { status: 200 })
}
