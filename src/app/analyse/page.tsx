import AnalyseView from '@/components/analyse/AnalyseView'
import { getOpportunities, getPipelines, type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'

export const revalidate = 300

type SearchParams = { pipeline?: string; period?: string }


export default async function AnalysePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  let opportunities: GHLOpportunity[] = []
  let pipelines: GHLPipeline[] = []

  try {
    ;[opportunities, pipelines] = await Promise.all([
      getOpportunities(100),
      getPipelines(),
    ])
  } catch (err) {
    console.error('[Analyse] GHL fetch failed:', err)
  }

  const initialPipeline = (() => {
    const raw = searchParams.pipeline ?? 'TOUS'
    if (raw === 'TOUS') return 'TOUS'
    const byId   = pipelines.find(p => p.id === raw)
    const byName = pipelines.find(p => p.name === raw)
    return byId?.id ?? byName?.id ?? 'TOUS'
  })()

  const initialPeriod = (() => {
    const v = Number(searchParams.period)
    return [7, 30, 90].includes(v) ? v : 7
  })()

  return (
    <AnalyseView
      opportunities={opportunities}
      pipelines={pipelines}
      initialPipeline={initialPipeline}
      initialPeriod={initialPeriod}
    />
  )
}
