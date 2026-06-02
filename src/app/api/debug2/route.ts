import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL!
  const allLeads = await new ConvexHttpClient(url).query(api.crm_leads.list)
  const rawPipelines = await new ConvexHttpClient(url).query(api.pipeline_config.list)
  return NextResponse.json({
    pipelineCount: (rawPipelines as unknown[]).length,
    pipelineIds: (rawPipelines as { _id: string }[]).map(p => p._id),
    leadCount: (allLeads as unknown[]).length,
    leads: (allLeads as { name: string; pipelineId: string; status: string }[]).map(l => ({ name: l.name, pid: l.pipelineId, status: l.status })),
  })
}
