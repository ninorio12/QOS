import { config } from '../config'

export interface GHLOpportunity {
  id:              string
  name:            string
  monetaryValue:   number
  pipelineId:      string
  pipelineStageId: string
  status:          'open' | 'won' | 'lost' | 'abandoned'
  createdAt:       string
  updatedAt:       string
  contact: { id: string; name: string; email: string | null; phone: string | null } | null
}

async function ghlFetch(path: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${config.ghl.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${config.ghl.apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

/** Returns all open opportunities in the pipeline */
export async function getActivePipeline(): Promise<GHLOpportunity[]> {
  const data = await ghlFetch(
    `/opportunities/search?location_id=${config.ghl.locationId}&status=open&limit=50`
  ) as { opportunities?: GHLOpportunity[] }
  return data.opportunities ?? []
}

/** Returns open leads not updated in the last `hoursThreshold` hours */
export async function detectStaleLeads(hoursThreshold: number): Promise<GHLOpportunity[]> {
  const opps = await getActivePipeline()
  const cutoff = Date.now() - hoursThreshold * 60 * 60 * 1000
  return opps.filter(opp => new Date(opp.updatedAt).getTime() < cutoff)
}

/** Moves an opportunity to a new pipeline stage */
export async function updateOpportunityStage(oppId: string, stageId: string): Promise<void> {
  await ghlFetch(`/opportunities/${oppId}`, {
    method: 'PUT',
    body: JSON.stringify({ pipelineStageId: stageId }),
  })
}

// ─── Tool definitions for agent registration ──────────────────

export const ghlPipelineTool = {
  name: 'ghl_get_pipeline' as const,
  definition: {
    description: 'Get all open leads from the GHL CRM pipeline with their values and last update times',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  executor: async (_input: Record<string, unknown>) => {
    const opps = await getActivePipeline()
    return opps.map(o => ({
      id: o.id,
      name: o.name,
      value: o.monetaryValue,
      phone: o.contact?.phone,
      updatedAt: o.updatedAt,
      status: o.status,
    }))
  },
}

export const ghlStaleLeadsTool = {
  name: 'ghl_detect_stale_leads' as const,
  definition: {
    description: 'Find leads with no activity for more than N hours — used to trigger urgent follow-ups',
    input_schema: {
      type: 'object' as const,
      properties: {
        hours: { type: 'number', description: 'Hours threshold (default: 2)' },
      },
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const hours = typeof input.hours === 'number' ? input.hours : 2
    return detectStaleLeads(hours)
  },
}

export const ghlUpdateStageTool = {
  name: 'ghl_update_stage' as const,
  definition: {
    description: 'Move a GHL opportunity to a new pipeline stage',
    input_schema: {
      type: 'object' as const,
      properties: {
        oppId:   { type: 'string', description: 'Opportunity ID' },
        stageId: { type: 'string', description: 'Target pipeline stage ID' },
      },
      required: ['oppId', 'stageId'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    await updateOpportunityStage(String(input.oppId), String(input.stageId))
    return { ok: true }
  },
}
