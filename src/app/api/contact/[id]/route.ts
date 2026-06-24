import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ct = await convex().query(api.crm_contacts.get, { id: params.id as Id<'crm_contacts'> })
    if (!ct) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ contact: { ...ct, id: ct._id } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    // Les champs optionnels Convex sont string|undefined, pas nullable : on retire les null
    // (un champ vide = omis, pas null) pour éviter ArgumentValidationError (ex: phone: null).
    const clean = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== null))
    await convex().mutation(api.crm_contacts.update, { id: params.id as Id<'crm_contacts'>, ...clean })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await convex().mutation(api.crm_contacts.remove, { id: params.id as Id<'crm_contacts'> })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
