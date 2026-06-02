import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ error: 'no url' })
  const c = new ConvexHttpClient(url)
  const pipelines = await c.mutation(api.pipeline_config.ensureDefaults)
  const leads = await c.query(api.crm_leads.list)
  const pipelineIds = (pipelines as { _id: string }[]).map(p => p._id)
  const leadPipelineIds = (leads as { pipelineId: string; status: string; stageId: string }[]).map(l => ({ pid: l.pipelineId, status: l.status, stage: l.stageId }))
  return NextResponse.json({
    pipelineIds,
    leadPipelineIds,
    matchCheck: leadPipelineIds.map(l => ({ ...l, matches: pipelineIds.includes(l.pid) })),
  })
}
