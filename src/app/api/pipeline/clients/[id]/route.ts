import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'
import { type Id } from '../../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as { stageId?: string; value?: number }
    const convex = getConvex()
    const id = params.id as Id<'pipeline_clients'>
    if (body.stageId !== undefined) await convex.mutation(api.pipeline_clients.updateStage, { id, stageId: body.stageId })
    if (body.value  !== undefined) await convex.mutation(api.pipeline_clients.updateValue,  { id, value: body.value })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const convex = getConvex()
    await convex.mutation(api.pipeline_clients.remove, { id: params.id as Id<'pipeline_clients'> })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
