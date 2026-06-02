import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

function getConvex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET() {
  try {
    const convex = getConvex()
    const clients = await convex.query(api.pipeline_clients.list)
    return NextResponse.json({ clients })
  } catch (err) {
    return NextResponse.json({ clients: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ghl_contact_id?: string
      name: string
      company?: string
      email?: string
      phone?: string
      value: number
      stageId: string
      initials: string
      createdAt: string
    }
    const convex = getConvex()
    const id = await convex.mutation(api.pipeline_clients.create, body)
    return NextResponse.json({ id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
