import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: { openaiKey: 'test-oai-key' },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('transcribeVoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns transcribed text from Whisper API', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { file_path: 'voice/file_123.ogg' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Qualifier le lead Jean Dupont' }),
      })

    const { transcribeVoice } = await import('./whisper')
    const result = await transcribeVoice('tok', 'AgAD...')
    expect(result).toBe('Qualifier le lead Jean Dupont')
  })

  it('throws when Whisper API fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { file_path: 'x.ogg' } }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(10) })
      .mockResolvedValueOnce({ ok: false, status: 400 })

    const { transcribeVoice } = await import('./whisper')
    await expect(transcribeVoice('tok', 'file-id')).rejects.toThrow('Whisper API error: 400')
  })
})
