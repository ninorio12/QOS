import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { isApiCallerAdmin } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export async function POST() {
  // Sécurité : peupler la base est réservé aux administrateurs.
  if (!(await isApiCallerAdmin())) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 })
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ error: 'NEXT_PUBLIC_CONVEX_URL not configured' }, { status: 500 })
  try {
    const c = new ConvexHttpClient(url)
    const result = await c.mutation(api.seed.seedContacts)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
