import type TelegramBot from 'node-telegram-bot-api'
import { config } from '../config'
import { transcribeVoice } from './whisper'

/**
 * routeMessage: normalize a Telegram message to plain text.
 * Returns null if the message should be ignored (wrong chat, bot message, etc).
 */
export async function routeMessage(
  msg: TelegramBot.Message,
  botToken: string
): Promise<string | null> {
  // Only process messages from the configured group
  if (String(msg.chat.id) !== config.telegram.groupChatId) return null

  // Ignore messages from bots (prevent loops)
  if (msg.from?.is_bot) return null

  // Voice note → Whisper
  if (msg.voice) {
    const text = await transcribeVoice(botToken, msg.voice.file_id)
    return text
  }

  // Plain text
  if (msg.text) return msg.text

  return null
}
