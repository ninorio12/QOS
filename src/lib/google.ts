import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl()}/api/auth/google/callback`,
  )
}

async function getRefreshToken(): Promise<string | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) return process.env.GOOGLE_REFRESH_TOKEN
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('company_settings')
      .select('google_refresh_token')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()
    return (data?.google_refresh_token as string) || null
  } catch {
    return null
  }
}

export async function saveGoogleRefreshToken(token: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('company_settings')
    .update({ google_refresh_token: token })
    .eq('id', '00000000-0000-0000-0000-000000000001')
  if (error) throw new Error(`Supabase update failed: ${error.message} (code: ${error.code})`)
}

export async function getCalendarClient() {
  const token = await getRefreshToken()
  const auth  = getOAuth2Client()
  auth.setCredentials({ refresh_token: token ?? undefined })
  return google.calendar({ version: 'v3', auth })
}

export async function isGoogleConfigured(): Promise<boolean> {
  if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) return false
  const token = await getRefreshToken()
  return !!token
}

export type GoogleEvent = {
  id: string
  summary: string
  description?: string | null
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
  status?: string
}
