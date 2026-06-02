import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getPipelinesLive } from '@/lib/ghl'
import { stageColor, type GHLPipelineData } from '@/components/pipeline/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) { const { MOCK_PIPELINES } = await import('@/lib/mock-data'); return NextResponse.json({ pipelines: MOCK_PIPELINES }) }

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
    return NextResponse.json({ pipelines })
  } catch (err) {
    return NextResponse.json({ pipelines: [], error: String(err) }, { status: 500 })
  }
}
