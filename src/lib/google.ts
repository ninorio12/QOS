import { google } from 'googleapis'

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

export function getCalendarClient() {
  const auth = getOAuth2Client()
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: 'v3', auth })
}

export function isGoogleConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  )
}

export type GoogleEvent = {
  id: string
  summary: string
  description?: string | null
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
  status?: string
}
