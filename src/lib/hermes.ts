import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'

// Server-only Convex client for Hermes/agent writes.
export function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// Guard: Hermes writes require a shared server secret (never exposed client-side).
// Returns a NextResponse to short-circuit when unauthorized/unconfigured, else null.
export function guardHermes(req: NextRequest): NextResponse | null {
  const secret = process.env.HERMES_API_SECRET
  if (!secret) return NextResponse.json({ error: 'Hermes endpoint not configured (HERMES_API_SECRET missing)' }, { status: 503 })
  const provided = req.headers.get('x-hermes-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}
