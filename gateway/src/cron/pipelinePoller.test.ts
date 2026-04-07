import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
const mockStale = vi.fn()
vi.mock('../skills/ghl', () => ({ detectStaleLeads: mockStale }))
vi.mock('../supabase/logger', () => ({ logInteraction: vi.fn().mockResolvedValue(undefined) }))

describe('runPipelinePoller', () => {
  it('does nothing when no stale leads', async () => {
    mockStale.mockResolvedValueOnce([])
    const { runPipelinePoller } = await import('./pipelinePoller')
    await runPipelinePoller({ send: mockSend } as never)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends urgent prompt to Soren for each stale lead', async () => {
    mockStale.mockResolvedValueOnce([
      {
        id: 'opp-1', name: 'Dupont', monetaryValue: 35000, status: 'open',
        pipelineId: 'p1', pipelineStageId: 's1',
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
        contact: { id: 'c1', name: 'Jean Dupont', email: null, phone: '+33612345678' },
      },
    ])
    const { runPipelinePoller } = await import('./pipelinePoller')
    await runPipelinePoller({ send: mockSend } as never)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Jean Dupont'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('sessions_send'))
  })
})
