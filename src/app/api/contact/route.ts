import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET(req: NextRequest) {
  try {
    const c = convex()
    const q = req.nextUrl.searchParams.get('q') ?? ''
    const raw = await c.query(api.crm_contacts.list)
    let contacts = (raw as { _id: string; firstName: string; lastName?: string; email?: string; phone?: string; companyName?: string; address1?: string; city?: string; postalCode?: string; website?: string; source?: string; statut?: string; canton?: string; metier?: string; niche?: string; tags: string[]; createdAt: string; updatedAt?: string }[])
      .map(ct => ({
        id:          ct._id,
        contactName: `${ct.firstName} ${ct.lastName ?? ''}`.trim(),
        firstName:   ct.firstName   || null,
        lastName:    ct.lastName    || null,
        email:       ct.email       || null,
        phone:       ct.phone       || null,
        companyName: ct.companyName || null,
        address1:    ct.address1    || null,
        city:        ct.city        || null,
        postalCode:  ct.postalCode  || null,
        website:     ct.website     || null,
        source:      ct.source      || null,
        statut:      ct.statut      || null,
        canton:      ct.canton      || null,
        metier:      ct.metier      || null,
        niche:       ct.niche       || null,
        tags:        ct.tags        ?? [],
        dateAdded:   ct.createdAt,
        dateUpdated: ct.updatedAt   || null,
      }))
    if (q) {
      const lower = q.toLowerCase()
      contacts = contacts.filter(c =>
        `${c.contactName} ${c.email ?? ''} ${c.phone ?? ''} ${c.companyName ?? ''}`.toLowerCase().includes(lower)
      )
    }
    return NextResponse.json({ contacts })
  } catch (err) {
    return NextResponse.json({ contacts: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      firstName: string; lastName?: string; email?: string; phone?: string; companyName?: string
    }
    const c = convex()
    const id = await c.mutation(api.crm_contacts.create, {
      firstName:   body.firstName,
      lastName:    body.lastName   || undefined,
      email:       body.email      || undefined,
      phone:       body.phone      || undefined,
      companyName: body.companyName || undefined,
      tags:        [],
    })
    return NextResponse.json({ contact: { id, _id: id, dateAdded: new Date().toISOString() } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
