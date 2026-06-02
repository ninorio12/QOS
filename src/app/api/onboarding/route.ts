import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET(req: NextRequest) {
  try {
    const contactId = req.nextUrl.searchParams.get('contactId')
    const c = convex()
    if (contactId) {
      const ob = await c.query(api.onboarding.getByContact, { contactId })
      return NextResponse.json({ onboarding: ob })
    }
    const all = await c.query(api.onboarding.list)
    return NextResponse.json({ onboarding: all })
  } catch (err) {
    return NextResponse.json({ onboarding: null, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = await convex().mutation(api.onboarding.patch, body)
    return NextResponse.json({ id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
