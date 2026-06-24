import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'
import { type Id } from '../../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as { stageId?: string; stageName?: string; status?: string; reason?: string; lostStage?: string; objection?: string }
    const id = params.id as Id<'crm_leads'>
    if (body.stageId  !== undefined) await convex().mutation(api.crm_leads.updateStage,  { id, stageId: body.stageId, stageName: body.stageName })
    if (body.status   !== undefined) await convex().mutation(api.crm_leads.updateStatus, { id, status:  body.status, reason: body.reason, stage: body.lostStage, objection: body.objection })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await convex().mutation(api.crm_leads.remove, { id: params.id as Id<'crm_leads'> })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
