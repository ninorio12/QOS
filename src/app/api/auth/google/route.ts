import { NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google'

export async function GET() {
  const oauth2 = getOAuth2Client()
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  })
  return NextResponse.redirect(url)
}
