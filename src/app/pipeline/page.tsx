import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { stageColor } from '@/components/pipeline/types'
import type { GHLPipelineData } from '@/components/pipeline/types'
import { GitMerge } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const DEFAULT_PIPELINE: GHLPipelineData = {
  id: 'leads',
  name: 'Leads',
  stages: [
    { id: 'nouveau-lead',   name: 'Nouveaux leads',  color: '#6366F1', position: 0 },
    { id: 'conversation',   name: 'En conversation', color: '#F59E0B', position: 1 },
    { id: 'r1',             name: 'R1',              color: '#3B82F6', position: 2 },
    { id: 'r2',             name: 'R2',              color: '#8B5CF6', position: 3 },
    { id: 'nouveau-client', name: 'Nouveau client',  color: '#84cc16', position: 4 },
  ],
}

export default async function PipelinePage() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL

  // No Convex → show empty default pipeline
  if (!url) {
    return (
      <div className="flex-1 md:h-[calc(100vh-3rem)] flex flex-col overflow-hidden min-h-0">
        <KanbanBoard initialPipelines={[DEFAULT_PIPELINE]} initialOpportunities={[]} />
      </div>
    )
  }

  try {
    const c = new ConvexHttpClient(url)
    // Use a QUERY (not the ensureDefaults mutation) — calling a mutation before
    // a query on the same ConvexHttpClient can return stale/empty query results.
    let rawPipelines = await c.query(api.pipeline_config.list)
    if (!rawPipelines?.length) {
      // First-ever load: create defaults with a fresh client, then re-query
      await new ConvexHttpClient(url).mutation(api.pipeline_config.ensureDefaults)
      rawPipelines = await new ConvexHttpClient(url).query(api.pipeline_config.list)
    }

    const pipelines: GHLPipelineData[] = rawPipelines?.length
      ? (rawPipelines as { _id: string; name: string; stages: { id: string; name: string; color: string; position: number }[] }[]).map(p => ({
          id:     p._id,
          name:   p.name,
          stages: p.stages
            .sort((a, b) => a.position - b.position)
            .map(s => ({ id: s.id, name: s.name, color: s.color || stageColor(s.name), position: s.position })),
        }))
      : [DEFAULT_PIPELINE]

    // Sécurité : on NE rend PAS les leads dans le HTML serveur (fuite noms/emails/tél/valeurs
    // avant tout contrôle d'accès). Le board se peuple côté client via sa live query, sous la
    // garde de ModuleGuard (un compte sans /pipeline est redirigé). Cf. backlog auth pré-prod.
    return (
      <div className="flex-1 md:h-[calc(100vh-3rem)] flex flex-col overflow-hidden min-h-0">
        <KanbanBoard initialPipelines={pipelines} initialOpportunities={[]} />
      </div>
    )
  } catch {
    // Convex error → show empty default pipeline (don't block the user)
    return (
      <div className="flex-1 md:h-[calc(100vh-3rem)] flex flex-col overflow-hidden min-h-0">
        <KanbanBoard initialPipelines={[DEFAULT_PIPELINE]} initialOpportunities={[]} />
      </div>
    )
  }
}
