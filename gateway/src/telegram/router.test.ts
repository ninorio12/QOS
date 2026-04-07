import { describe, it, expect, vi } from 'vitest'
import type TelegramBot from 'node-telegram-bot-api'

vi.mock('../config', () => ({
  config: { telegram: { sorenToken: 'tok', groupChatId: '-100123' } },
}))
const mockTranscribe = vi.fn().mockResolvedValue('transcribed text')
vi.mock('./whisper', () => ({ transcribeVoice: mockTranscribe }))

describe('routeMessage', () => {
  it('returns text directly for text messages', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: -100123 },
      text: 'Bonjour Soren',
      from: { id: 1, username: 'thomas', is_bot: false },
      message_id: 1,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(result).toBe('Bonjour Soren')
    expect(mockTranscribe).not.toHaveBeenCalled()
  })

  it('calls transcribeVoice for voice messages', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: -100123 },
      voice: { file_id: 'AgAD123', duration: 5, mime_type: 'audio/ogg', file_size: 1000 },
      from: { id: 1, username: 'thomas', is_bot: false },
      message_id: 2,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(mockTranscribe).toHaveBeenCalledWith('tok', 'AgAD123')
    expect(result).toBe('transcribed text')
  })

  it('returns null for messages not from the group', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: 999 },
      text: 'hello',
      from: { id: 1, username: 'thomas', is_bot: false },
      message_id: 3,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(result).toBeNull()
  })

  it('returns null for bot messages (loop prevention)', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: -100123 },
      text: 'I am a bot',
      from: { id: 99, is_bot: true },
      message_id: 4,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(result).toBeNull()
  })
})
