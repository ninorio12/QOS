import { NextRequest, NextResponse } from 'next/server'
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
    const contacts = await convex().query(api.crm_contacts.list)
    return NextResponse.json({ contacts })
  } catch (err) {
    return NextResponse.json({ contacts: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = await convex().mutation(api.crm_contacts.create, body)
    const contact = await convex().query(api.crm_contacts.get, { id })
    return NextResponse.json({ contact: { ...contact, id: contact!._id } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
