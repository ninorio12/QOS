import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Passage en client UNIFIÉ : un seul endpoint pour tous les chemins (Pipeline, Contacts).
// Protégé par le middleware via /api/crm/(.*). Délègue à sync.convertToClient (garde montant > 0).
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ ok: false, error: 'no convex' }, { status: 500 })
  try {
    const body = await req.json().catch(() => ({})) as {
      contactId?: string; dealValue?: number; dealDate?: string; wonObjection?: string; amountTbd?: boolean
    }
    if (!body.contactId) return NextResponse.json({ ok: false, error: 'contactId required' }, { status: 400 })
    const c = new ConvexHttpClient(url)
    const result = await c.mutation(api.sync.convertToClient, {
      contactId:    body.contactId as Id<'crm_contacts'>,
      dealValue:    body.dealValue,
      dealDate:     body.dealDate,
      wonObjection: body.wonObjection,
      amountTbd:    body.amountTbd,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
