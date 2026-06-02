import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ metiers: [], niches: [] })
  try {
    const c = new ConvexHttpClient(url)
    const data = await c.query(api.crm_contacts.distinctMetiersNiches)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ metiers: [], niches: [] })
  }
}
