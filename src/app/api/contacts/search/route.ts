import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ contacts: [] }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  const url = new URL(`${env.ghlBaseUrl()}/contacts/`)
  url.searchParams.set('locationId', env.ghlLocationId())
  url.searchParams.set('limit', '15')
  if (q) url.searchParams.set('query', q)

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.ghlApiKey()}`,
        Version: '2021-07-28',
      },
      cache: 'no-store',
    })
    const data = await res.json() as { contacts?: { id: string; contactName: string; firstName: string | null; lastName: string | null; companyName: string | null; phone: string | null; email: string | null }[] }

    const contacts = (data.contacts ?? []).map(c => ({
      id:          c.id,
      name:        c.firstName && c.lastName
                     ? `${c.firstName} ${c.lastName}`
                     : c.contactName,
      company:     c.companyName ?? null,
      phone:       c.phone ?? null,
      email:       c.email ?? null,
    }))

    return NextResponse.json({ contacts })
  } catch {
    return NextResponse.json({ contacts: [] })
  }
}
