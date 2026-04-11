import { NextRequest } from 'next/server'
import { sendTelegram, sendChatAction, type TelegramUpdate } from '@/lib/telegram'
import { runAgent } from '@/lib/agents/runner'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Thomas's Telegram chat ID (whitelist)
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID
  ? parseInt(process.env.TELEGRAM_CHAT_ID, 10)
  : null

// GHL creds pour Soren (superadmin = env vars)
function getSorenCreds() {
  return {
    apiKey:     env.ghlApiKey(),
    locationId: env.ghlLocationId(),
  }
}

export async function POST(req: NextRequest) {
  // Vérification token dans l'URL (?token=BOT_TOKEN)
  const token = req.nextUrl.searchParams.get('token')
  if (!process.env.TELEGRAM_BOT_TOKEN || token !== process.env.TELEGRAM_BOT_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json() as TelegramUpdate
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const message = update.message
  if (!message?.text || !message.chat) {
    return new Response('OK', { status: 200 })
  }

  const chatId   = message.chat.id
  const text     = message.text.trim()
  const fromName = message.from.first_name ?? 'Thomas'

  // Sécurité : seulement Thomas
  if (ALLOWED_CHAT_ID && chatId !== ALLOWED_CHAT_ID) {
    await sendTelegram(chatId, '⛔ Accès non autorisé.')
    return new Response('OK', { status: 200 })
  }

  // Commandes spéciales
  if (text === '/start') {
    await sendTelegram(chatId,
      `👋 <b>Soren actif</b>\n\nBonjour ${fromName}, je suis Soren, ton COO Digital.\n\nPose-moi n'importe quelle question sur ton pipeline, tes leads ou tes agents — j'ai accès à tout.`
    )
    return new Response('OK', { status: 200 })
  }

  if (text === '/status') {
    const creds = getSorenCreds()
    const result = await runAgent('soren', 'Donne-moi un résumé rapide : combien de leads actifs, valeur du pipeline, et les 3 dernières opportunités.', creds, null)
    await sendTelegram(chatId, result.response)
    return new Response('OK', { status: 200 })
  }

  if (text === '/tasks') {
    const creds = getSorenCreds()
    const result = await runAgent('soren', 'Liste-moi les tâches en cours des agents. Quelles sont les priorités ?', creds, null)
    await sendTelegram(chatId, result.response)
    return new Response('OK', { status: 200 })
  }

  // Message libre → Soren répond avec ses outils
  await sendChatAction(chatId)

  try {
    const creds = getSorenCreds()
    const result = await runAgent('soren', text, creds, null)

    // Formatter la réponse pour Telegram (HTML)
    let reply = result.response || 'Je n\'ai pas de réponse pour le moment.'

    // Ajouter les outils utilisés si présents
    if (result.toolsUsed.length > 0) {
      reply += `\n\n<i>🔧 ${result.toolsUsed.join(', ')}</i>`
    }

    await sendTelegram(chatId, reply)
  } catch (err) {
    console.error('[Telegram webhook] Error:', err)
    await sendTelegram(chatId, '❌ Une erreur est survenue. Réessaie dans un instant.')
  }

  return new Response('OK', { status: 200 })
}

// GET = vérification webhook (Telegram envoie parfois des GET)
export async function GET() {
  return new Response('Telegram webhook actif', { status: 200 })
}
