import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: {
    ghl: {
      apiKey:     'test-ghl-key',
      locationId: 'loc-123',
      baseUrl:    'https://services.leadconnectorhq.com',
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('getActivePipeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns open opportunities from GHL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-1',
            name: 'Jean Dupont — Façade',
            monetaryValue: 35000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-1',
            status: 'open',
            createdAt: '2026-04-05T10:00:00Z',
            updatedAt: '2026-04-05T14:00:00Z',
            contact: { id: 'c-1', name: 'Jean Dupont', email: null, phone: '+33612345678' },
          },
        ],
      }),
    })

    const { getActivePipeline } = await import('./ghl')
    const opps = await getActivePipeline()
    expect(opps).toHaveLength(1)
    expect(opps[0].name).toBe('Jean Dupont — Façade')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/search'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-ghl-key' }) })
    )
  })
})

describe('detectStaleLeads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns leads not updated in the last N hours', async () => {
    const twoHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3h ago

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-stale',
            name: 'Xavier Alvarez — Toiture',
            monetaryValue: 22000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-2',
            status: 'open',
            createdAt: '2026-04-04T08:00:00Z',
            updatedAt: twoHoursAgo,
            contact: { id: 'c-2', name: 'Xavier Alvarez', email: null, phone: '+33698765432' },
          },
        ],
      }),
    })

    const { detectStaleLeads } = await import('./ghl')
    const stale = await detectStaleLeads(2) // 2h threshold
    expect(stale).toHaveLength(1)
    expect(stale[0].id).toBe('opp-stale')
  })

  it('excludes recently updated leads', async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-fresh',
            name: 'Inès Duprez',
            monetaryValue: 15000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-1',
            status: 'open',
            createdAt: '2026-04-07T08:00:00Z',
            updatedAt: thirtyMinAgo,
            contact: { id: 'c-3', name: 'Inès Duprez', email: null, phone: '+33677889900' },
          },
        ],
      }),
    })

    const { detectStaleLeads } = await import('./ghl')
    const stale = await detectStaleLeads(2)
    expect(stale).toHaveLength(0)
  })
})

describe('updateOpportunityStage', () => {
  it('calls PUT /opportunities/:id with new stageId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'opp-1' }) })

    const { updateOpportunityStage } = await import('./ghl')
    await updateOpportunityStage('opp-1', 'stage-proposal')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/opp-1'),
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
