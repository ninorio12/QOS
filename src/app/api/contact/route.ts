import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getAuthContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey, ghlLocationId: locationId } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const q      = req.nextUrl.searchParams.get('q') ?? ''
  const limit  = req.nextUrl.searchParams.get('limit') ?? '100'
  let url = `${baseUrl}/contacts/?locationId=${locationId}&limit=${limit}`
  if (q) url += `&query=${encodeURIComponent(q)}`

  const res = await fetch(url, {
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) return NextResponse.json({ contacts: [] }, { status: 200 })
  const data = await res.json() as { contacts?: unknown[] }
  return NextResponse.json({ contacts: data.contacts ?? [] })
}

const AI_AGENTS = ['kai', 'soren', 'mia'] as const

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey, ghlLocationId: locationId } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const { firstName, lastName, email, phone, companyName, createdBy, tags: extraTags } =
    await req.json() as {
      firstName:   string
      lastName:    string
      email:       string
      phone:       string
      companyName: string
      createdBy?:  string
      tags?:       string[]
    }

  const agentName = createdBy?.toLowerCase()
  const isAiAgent = AI_AGENTS.includes(agentName as typeof AI_AGENTS[number])
  const tags = [
    ...(extraTags ?? []),
    ...(isAiAgent ? ['ia', agentName!] : []),
  ]

  const res = await fetch(`${baseUrl}/contacts/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locationId,
      firstName:   firstName   || undefined,
      lastName:    lastName    || undefined,
      email:       email       || undefined,
      phone:       phone       || undefined,
      companyName: companyName || undefined,
      tags:        tags.length ? tags : undefined,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json() as { contact: { id: string; dateAdded: string } }
  revalidateTag('ghl-contacts')
  revalidateTag('ghl-opportunities')
  return NextResponse.json({ contact: data.contact })
}
