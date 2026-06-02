import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// GET ?ids=id1,id2,id3
export async function GET(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean)
    if (!ids.length) return NextResponse.json({ meta: [] })
    const convex = getConvex()
    const meta = await convex.query(api.contact_meta.getMany, { ghl_contact_ids: ids })
    return NextResponse.json({ meta })
  } catch (err) {
    return NextResponse.json({ meta: [], error: String(err) }, { status: 500 })
  }
}

// POST { ghl_contact_id, source?, statut?, canton? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ghl_contact_id: string
      source?: string
      statut?: string
      canton?: string
    }
    const convex = getConvex()
    await convex.mutation(api.contact_meta.upsert, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
