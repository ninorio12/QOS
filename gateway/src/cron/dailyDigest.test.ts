import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
vi.mock('../sessions/SessionManager', () => ({
  SessionManager: vi.fn(),
}))

const mockGetPipeline = vi.fn().mockResolvedValue([
  {
    id: 'opp-1', name: 'Dupont', monetaryValue: 30000, status: 'open',
    pipelineId: 'p1', pipelineStageId: 's1',
    createdAt: '2026-04-01T00:00:00Z', updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    contact: { id: 'c1', name: 'Jean Dupont', email: null, phone: '+336' },
  },
])
vi.mock('../skills/ghl', () => ({ getActivePipeline: mockGetPipeline }))

describe('triggerDailyDigest', () => {
  it('calls session.send with a digest prompt containing pipeline info', async () => {
    const fakeSession = { send: mockSend } as never
    const { triggerDailyDigest } = await import('./dailyDigest')
    await triggerDailyDigest(fakeSession)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Digest pipeline'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('30'))
  })
})
