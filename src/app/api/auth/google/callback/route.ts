import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)

  return NextResponse.json({
    ok: true,
    message: 'Copie ce refresh_token dans ton .env.local sous GOOGLE_REFRESH_TOKEN',
    refresh_token: tokens.refresh_token,
  })
}
