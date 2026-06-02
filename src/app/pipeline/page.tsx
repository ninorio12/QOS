import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { stageColor } from '@/components/pipeline/types'
import type { GHLPipelineData, Opportunity } from '@/components/pipeline/types'
import { GitMerge } from 'lucide-react'

export const dynamic = 'force-dynamic'

function PipelineEmpty({ error }: { error?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-center max-w-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-soren-card border border-soren-border flex items-center justify-center mx-auto mb-4 shadow-sm">
          <GitMerge size={20} className="text-soren-subtle" />
        </div>
        <p className="text-sm font-semibold text-soren-text mb-1.5">Pipeline vide</p>
        <p className="text-xs text-soren-subtle leading-relaxed">Crée ton premier lead pour commencer</p>
        {error && (
          <pre className="text-[10px] text-[#EF4444] mt-4 font-mono break-all whitespace-pre-wrap bg-[#FEF2F2] rounded-xl px-3 py-2 text-left">
            {error}
          </pre>
        )}
      </div>
    </div>
  )
}

export default async function PipelinePage() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return <PipelineEmpty error="NEXT_PUBLIC_CONVEX_URL not configured" />

  try {
    const c = new ConvexHttpClient(url)

    // Ensure default pipeline exists and get it
    const rawPipelines = await c.mutation(api.pipeline_config.ensureDefaults)
    if (!rawPipelines?.length) return <PipelineEmpty />

    const pipelines: GHLPipelineData[] = (rawPipelines as { _id: string; name: string; stages: { id: string; name: string; color: string; position: number }[] }[]).map(p => ({
      id:     p._id,
      name:   p.name,
      stages: p.stages
        .sort((a, b) => a.position - b.position)
        .map(s => ({ id: s.id, name: s.name, color: s.color || stageColor(s.name), position: s.position })),
    }))

    // Fetch leads for all pipelines
    const allLeads = await c.query(api.crm_leads.list)
    const opportunities: Opportunity[] = (allLeads as {
      _id: string; name: string; email?: string; phone?: string; company?: string;
      pipelineId: string; stageId: string; value: number; source?: string;
      status: string; initials: string; createdAt: string; contactId?: string
    }[]).map(l => ({
      id:         l._id,
      name:       l.name,
      company:    l.company ?? '',
      value:      l.value,
      source:     l.source ?? '',
      createdAt:  l.createdAt.split('T')[0],
      initials:   l.initials,
      stageId:    l.stageId,
      pipelineId: l.pipelineId,
      email:      l.email ?? '',
      phone:      l.phone ?? '',
      contactId:  l.contactId ?? '',
      tags:       [],
      status:     l.status as Opportunity['status'],
    }))

    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <KanbanBoard initialPipelines={pipelines} initialOpportunities={opportunities} />
      </div>
    )
  } catch (err) {
    return <PipelineEmpty error={String(err)} />
  }
}
