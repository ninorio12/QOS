import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Public form lives on a separate domain → allow cross-origin POST.
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')

    const body = await req.json() as {
      email?: string
      submission?: unknown
      profile?: Record<string, string | undefined>
    }
    const email = (body.email ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400, headers: CORS })
    }

    const result = await new ConvexHttpClient(url).mutation(api.onboarding.intakeSubmit, {
      email,
      submission: body.submission ?? {},
      profile: body.profile,
    })
    return NextResponse.json(result, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
