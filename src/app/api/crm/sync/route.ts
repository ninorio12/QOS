import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ ok: false, error: 'no convex' }, { status: 500 })
  try {
    const body = await req.json().catch(() => ({})) as { contactId?: string; all?: boolean; dealValue?: number }
    const c = new ConvexHttpClient(url)
    if (body.all) {
      const result = await c.mutation(api.sync.syncAllContacts)
      return NextResponse.json(result)
    }
    if (!body.contactId) return NextResponse.json({ ok: false, error: 'contactId required' }, { status: 400 })
    const result = await c.mutation(api.sync.syncContactToPipeline, { contactId: body.contactId as Id<'crm_contacts'>, dealValue: body.dealValue })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
