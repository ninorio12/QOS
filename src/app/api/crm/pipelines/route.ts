import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET() {
  try {
    const c = convex()
    // Ensure defaults exist, then return all pipelines
    const pipelines = await c.mutation(api.pipeline_config.ensureDefaults)
    return NextResponse.json({ pipelines })
  } catch (err) {
    return NextResponse.json({ pipelines: [], error: String(err) }, { status: 500 })
  }
}
