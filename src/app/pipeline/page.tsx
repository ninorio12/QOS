import Link from 'next/link'
import { GitMerge, Settings } from 'lucide-react'
import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { getPipelines, getOpportunities, getUsers } from '@/lib/ghl'
import { stageColor, type GHLPipelineData, type Opportunity } from '@/components/pipeline/types'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ─── Local pipeline (fallback when GHL is unavailable) ────────
const LOCAL_PIPELINE: GHLPipelineData = {
  id: 'local-pipeline-01',
  name: 'Pipeline Commercial',
  stages: [
    { id: 'stage-nouveau',     name: 'Nouveau lead',  color: stageColor('nouveau'),  position: 0 },
    { id: 'stage-qualif',      name: 'Qualification', color: stageColor('qualif'),   position: 1 },
    { id: 'stage-proposition', name: 'Proposition',   color: stageColor('devis'),    position: 2 },
    { id: 'stage-negociation', name: 'Négociation',   color: stageColor('rdv'),      position: 3 },
    { id: 'stage-gagne',       name: 'Gagné',         color: stageColor('gagné'),    position: 4 },
  ],
}

async function getLocalOpportunities(): Promise<Opportunity[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('local_opportunities').select('*').order('created_at', { ascending: false })
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:         r.id as string,
    name:       r.name as string,
    company:    (r.company as string) ?? '',
    value:      Number(r.value ?? 0),
    source:     (r.source as string) ?? '',
    createdAt:  (r.created_at as string).split('T')[0],
    initials:   ((r.name as string).trim().split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()),
    stageId:    r.stage_id as string,
    pipelineId: 'local-pipeline-01',
    email:      (r.email as string) ?? '',
    phone:      (r.phone as string) ?? '',
    contactId:  '',
    tags:       [],
    status:     'open' as const,
  }))
}

// ─── Page ─────────────────────────────────────────────────────
export default async function PipelinePage() {
  let pipelines:     GHLPipelineData[] = []
  let opportunities: Opportunity[]     = []

  // Try GHL
  try {
    const [rawPipelines, rawOpps, rawUsers] = await Promise.all([
      getPipelines(),
      getOpportunities(100),
      getUsers().catch(() => []),
    ])
    const userInitialsMap = new Map(rawUsers.map(u => {
      const name = u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
      const ini  = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      return [u.id, ini || '?']
    }))
    pipelines = rawPipelines.map(p => ({
      id: p.id, name: p.name,
      stages: p.stages.sort((a, b) => a.position - b.position).map(s => ({
        id: s.id,
        name: s.name.replace(/^[^\w\d\s'"«»-]+\s*/, '').trim(),
        color: stageColor(s.name),
        position: s.position,
      })),
    }))
    opportunities = rawOpps.map(opp => {
      const contactName = opp.contact?.name ?? opp.name
      const initials    = opp.assignedTo
        ? (userInitialsMap.get(opp.assignedTo) ?? '?')
        : contactName.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      const rawSource = (opp as Record<string, unknown> & { attributions?: { utmSessionSource?: string }[] })
        .attributions?.[0]?.utmSessionSource
      return {
        id: opp.id, name: contactName,
        company:    ((opp.contact as Record<string, unknown> | null)?.companyName as string | undefined) ?? '',
        value:      opp.monetaryValue ?? 0,
        source:     rawSource && rawSource !== 'CRM UI' ? rawSource : '',
        createdAt:  opp.createdAt.split('T')[0],
        initials, stageId: opp.pipelineStageId, pipelineId: opp.pipelineId,
        email:      opp.contact?.email ?? '', phone: opp.contact?.phone ?? '',
        contactId:  opp.contact?.id ?? '',
        tags:       (opp.contact?.tags ?? []).filter(t => !['ia', 'kai', 'soren', 'mia', 'auto', 'ia active', 'auto ia active'].includes(t.toLowerCase())),
        status:     'open' as const,
      }
    })
  } catch { /* GHL unavailable */ }

  // Fallback to local Supabase data
  if (pipelines.length === 0) {
    pipelines = [LOCAL_PIPELINE]
    opportunities = await getLocalOpportunities()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <KanbanBoard initialPipelines={pipelines} initialOpportunities={opportunities} />
    </div>
  )
}
