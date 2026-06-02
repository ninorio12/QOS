import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthContext } from '@/lib/auth-context'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ success: true })

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

  // Invalide le cache pipeline pour que la vue Kanban reflète immédiatement
  revalidateTag('ghl-opportunities')

  return NextResponse.json({ ok: true })
}
