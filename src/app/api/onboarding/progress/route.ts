import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Public form lives on a separate domain → allow cross-origin. Data is gated by a secret token.
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Load saved progress by exact token.
export async function GET(req: NextRequest) {
  try {
    const token = (req.nextUrl.searchParams.get('token') ?? '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400, headers: CORS })
    const result = await client().query(api.onboarding.getProgress, { token })
    return NextResponse.json({ ok: true, progress: result }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}

// Upsert progress for a token (autosave from the form).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string; name?: string; state?: unknown; contactId?: string }
    const token = (body.token ?? '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400, headers: CORS })
    await client().mutation(api.onboarding.saveProgress, {
      token,
      name: body.name,
      state: body.state ?? {},
      contactId: body.contactId,
    })
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
