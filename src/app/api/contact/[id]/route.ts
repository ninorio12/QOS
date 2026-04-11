import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthContext } from '@/lib/auth-context'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const { id }  = params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${baseUrl}/contacts/${id}`, { headers, cache: 'no-store' })
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json() as { contact: unknown }
  return NextResponse.json({ contact: data.contact })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const { id }  = params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }

  const body = await req.json()
  const { tags, ...contactBody } = body as { tags?: string[]; [key: string]: unknown }

  const res = await fetch(`${baseUrl}/contacts/${id}`, {
    method: 'PUT', headers, body: JSON.stringify(contactBody),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  if (Array.isArray(tags)) {
    const current = await fetch(`${baseUrl}/contacts/${id}`, { headers, cache: 'no-store' })
      .then(r => r.json())
      .then((d: { contact?: { tags?: string[] } }) => d.contact?.tags ?? [])
      .catch(() => [] as string[])

    const toAdd    = tags.filter(t => !current.includes(t))
    const toRemove = current.filter(t => !tags.includes(t))

    await Promise.all([
      toAdd.length > 0 && fetch(`${baseUrl}/contacts/${id}/tags`, {
        method: 'POST', headers, body: JSON.stringify({ tags: toAdd }),
      }),
      toRemove.length > 0 && fetch(`${baseUrl}/contacts/${id}/tags`, {
        method: 'DELETE', headers, body: JSON.stringify({ tags: toRemove }),
      }),
    ].filter(Boolean))
  }

  const data = await res.json() as { contact: unknown }
  revalidateTag('ghl-contacts')
  return NextResponse.json({ contact: data.contact })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const { id }  = params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const res = await fetch(`${baseUrl}/contacts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  revalidateTag('ghl-contacts')
  return NextResponse.json({ success: true })
}
