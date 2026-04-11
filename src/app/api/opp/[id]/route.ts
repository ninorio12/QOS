import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const body    = await req.json()

  const res = await fetch(`${baseUrl}/opportunities/${params.id}`, {
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
