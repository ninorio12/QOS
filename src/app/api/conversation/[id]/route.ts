import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const body    = await req.json()

  const res = await fetch(`${baseUrl}/conversations/${params.id}`, {
    method: 'PUT',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }
  return NextResponse.json({ ok: true })
}
