import { describe, it, expect, vi } from 'vitest'
import type TelegramBot from 'node-telegram-bot-api'

vi.mock('../config', () => ({
  config: { telegram: { groupChatId: '-100123' } },
}))
vi.mock('../supabase/logger', () => ({
  logInteraction: vi.fn().mockResolvedValue(undefined),
}))

describe('makeTelegramSendTool', () => {
  it('calls bot.sendMessage with group chat id', async () => {
    const mockSend = vi.fn().mockResolvedValue({})
    const mockBot = { sendMessage: mockSend } as unknown as TelegramBot

    const { makeTelegramSendTool } = await import('./tools')
    const { executor } = makeTelegramSendTool('kai', mockBot)
    await executor({ message: 'Bonjour depuis Kai !' })

    expect(mockSend).toHaveBeenCalledWith('-100123', 'Bonjour depuis Kai !', expect.any(Object))
  })
})

describe('makeLogTool', () => {
  it('calls logInteraction with correct args', async () => {
    const { logInteraction } = await import('../supabase/logger')
    const { makeLogTool } = await import('./tools')
    const { executor } = makeLogTool('mia')
    await executor({ type: 'devis', outcome: 'success', duration: 150 })
    expect(logInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'mia', type: 'devis', outcome: 'success' })
    )
  })
})
