import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
const mockSelect = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => ({
            limit: mockSelect,
          }),
        }),
      }),
    }),
  }),
}))
vi.mock('../config', () => ({
  config: { supabase: { url: 'https://test.supabase.co', serviceKey: 'key' } },
}))
vi.mock('../supabase/logger', () => ({ logInteraction: vi.fn().mockResolvedValue(undefined) }))

describe('runWeeklyAnalysis', () => {
  it('skips analysis when no interactions', async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null })
    const { runWeeklyAnalysis } = await import('./weeklyAnalysis')
    await runWeeklyAnalysis({ send: mockSend } as never)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('calls session.send with analysis prompt when interactions exist', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { agent: 'kai', type: 'sms', outcome: 'success', duration: 320, metadata: {}, created_at: new Date().toISOString() },
        { agent: 'kai', type: 'sms', outcome: 'no_response', duration: 0, metadata: {}, created_at: new Date().toISOString() },
      ],
      error: null,
    })
    const { runWeeklyAnalysis } = await import('./weeklyAnalysis')
    await runWeeklyAnalysis({ send: mockSend } as never)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Analyse les interactions'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('KAI'))
  })
})
