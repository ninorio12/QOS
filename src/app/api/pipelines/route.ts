import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getPipelinesLive } from '@/lib/ghl'
import { stageColor, type GHLPipelineData } from '@/components/pipeline/types'

export const dynamic = 'force-dynamic'

// Pipeline local fallback (used when GHL is unavailable)
const LOCAL_PIPELINE: GHLPipelineData = {
  id: 'local-pipeline-01',
  name: 'Pipeline Commercial',
  stages: [
    { id: 'stage-nouveau',      name: 'Nouveau lead',   color: stageColor('nouveau'),      position: 0 },
    { id: 'stage-qualif',       name: 'Qualification',  color: stageColor('qualif'),        position: 1 },
    { id: 'stage-proposition',  name: 'Proposition',    color: stageColor('devis'),         position: 2 },
    { id: 'stage-negociation',  name: 'Négociation',    color: stageColor('rdv'),           position: 3 },
    { id: 'stage-gagne',        name: 'Gagné',          color: stageColor('gagné'),         position: 4 },
  ],
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ pipelines: [] }, { status: 401 })

  try {
    const raw = await getPipelinesLive({ apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId })
    const pipelines: GHLPipelineData[] = raw.map(p => ({
      id:   p.id,
      name: p.name,
      stages: p.stages
        .sort((a, b) => a.position - b.position)
        .map(s => ({
          id:       s.id,
          name:     s.name,
          color:    stageColor(s.name),
          position: s.position,
        })),
    }))
    if (pipelines.length > 0) return NextResponse.json({ pipelines })
  } catch {
    // GHL unavailable — fall through to local pipeline
  }

  return NextResponse.json({ pipelines: [LOCAL_PIPELINE] })
}
