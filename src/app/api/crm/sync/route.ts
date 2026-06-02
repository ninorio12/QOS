import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ ok: false, error: 'no convex' }, { status: 500 })
  try {
    const { contactId } = await req.json() as { contactId: string }
    const c = new ConvexHttpClient(url)
    const result = await c.mutation(api.sync.syncContactToPipeline, { contactId: contactId as Id<'crm_contacts'> })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
