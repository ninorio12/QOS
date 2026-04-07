import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (_table: string) => ({ insert: mockInsert }),
  }),
}))
vi.mock('../config', () => ({
  config: { supabase: { url: 'https://test.supabase.co', serviceKey: 'key' } },
}))

describe('logger', () => {
  it('inserts an interaction row', async () => {
    const { logInteraction } = await import('./logger')
    await logInteraction({
      agent: 'kai',
      type: 'sms',
      outcome: 'success',
      duration: 320,
      lead_id: 'lead-abc',
    })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'kai', type: 'sms', outcome: 'success' })
    )
  })

  it('does not throw when supabase returns error (fire-and-forget)', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'db error' } })
    const { logInteraction } = await import('./logger')
    await expect(logInteraction({ agent: 'soren', type: 'cron', outcome: 'success', duration: 0 }))
      .resolves.not.toThrow()
  })
})
