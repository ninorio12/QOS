import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Tl;dv sends meeting data here — store in Convex or forward as needed
    console.log('[tldv webhook]', JSON.stringify(body, null, 2))
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
