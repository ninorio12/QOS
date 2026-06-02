import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET(req: NextRequest) {
  try {
    const pipelineId = req.nextUrl.searchParams.get('pipelineId')
    const leads = pipelineId
      ? await convex().query(api.crm_leads.listByPipeline, { pipelineId })
      : await convex().query(api.crm_leads.list)
    return NextResponse.json({ leads })
  } catch (err) {
    return NextResponse.json({ leads: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      contactId?: string
      name: string
      email?: string
      phone?: string
      company?: string
      pipelineId: string
      stageId: string
      value: number
      source?: string
      initials: string
    }
    const args = {
      ...body,
      contactId: body.contactId ? body.contactId as Id<'crm_contacts'> : undefined,
    }
    const id = await convex().mutation(api.crm_leads.create, args)
    return NextResponse.json({ lead: { id, ...body, status: 'open', createdAt: new Date().toISOString() } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
