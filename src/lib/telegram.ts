/**
 * Client Telegram Bot API
 * Usage: sendTelegram(chatId, text)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const base = (token?: string) => `https://api.telegram.org/bot${token ?? BOT_TOKEN}`

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    date: number
    voice?: { file_id: string; duration: number; mime_type?: string; file_size?: number }
    audio?: { file_id: string; duration: number; mime_type?: string; file_size?: number }
  }
}

export async function sendTelegram(chatId: number | string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', botToken?: string): Promise<boolean> {
  if (!botToken && !BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN non configuré')
    return false
  }
  try {
    const res = await fetch(`${base(botToken)}/sendMessage`, {
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
  const res = await fetch(`${base()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
  })
  return res.json()
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  if (!BOT_TOKEN) return { ok: false }
  const res = await fetch(`${base()}/getWebhookInfo`)
  return res.json()
}

/**
 * Transcrit un fichier audio Telegram via Whisper (OpenAI).
 * Retourne le texte transcrit, ou null en cas d'échec.
 */
export async function transcribeVoice(fileId: string, botToken?: string): Promise<string | null> {
  if (!botToken && !BOT_TOKEN) return null
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.warn('[Telegram] OPENAI_API_KEY manquant — transcription impossible')
    return null
  }

  try {
    // 1. Récupérer le chemin du fichier depuis Telegram
    const tok = botToken ?? BOT_TOKEN
    const fileRes = await fetch(`${base(botToken)}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json() as { ok: boolean; result?: { file_path: string } }
    if (!fileData.ok || !fileData.result?.file_path) return null

    // 2. Télécharger le fichier audio
    const audioUrl = `https://api.telegram.org/file/bot${tok}/${fileData.result.file_path}`
    const audioRes = await fetch(audioUrl)
    const audioBlob = await audioRes.blob()

    // 3. Envoyer à Whisper
    const form = new FormData()
    form.append('file', audioBlob, 'voice.ogg')
    form.append('model', 'whisper-1')
    form.append('language', 'fr')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    })

    const whisperData = await whisperRes.json() as { text?: string; error?: unknown }
    return whisperData.text ?? null
  } catch (err) {
    console.error('[Telegram] Erreur transcription Whisper:', err)
    return null
  }
}

export async function sendChatAction(chatId: number | string, action: 'typing' = 'typing', botToken?: string): Promise<void> {
  if (!botToken && !BOT_TOKEN) return
  await fetch(`${base(botToken)}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
    cache: 'no-store',
  }).catch(() => {})
}
