import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

type Params = { params: { agent: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
  }
  try {
    const res  = await fetch(`${GATEWAY_URL}/agents/${params.agent}/soul`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Gateway unreachable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const res  = await fetch(`${GATEWAY_URL}/agents/${params.agent}/soul`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Gateway unreachable' }, { status: 503 })
  }
}
