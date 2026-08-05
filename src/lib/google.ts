import { google } from 'googleapis'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri ?? `${appUrl()}/api/auth/google/callback`,
  )
}

function convexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  return url ? new ConvexHttpClient(url) : null
}

// Token Google = source de vérité Convex (table google_accounts), plus Supabase.
// "global" = premier profil connecté (le calendrier ne lit pas encore par profil).
// La lecture par profil reste possible via api.googleAccounts.getToken(clerkUserId).
export async function getRefreshToken(): Promise<string | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) return process.env.GOOGLE_REFRESH_TOKEN
  const secret = process.env.INTERNAL_API_SECRET
  const convex = convexClient()
  if (!secret || !convex) return null
  try {
    const accounts = await convex.query(api.googleAccounts.listConnected, { secret })
    return accounts[0]?.refreshToken ?? null
  } catch {
    return null
  }
}

// Conservé en no-op : le callback OAuth écrit directement dans Convex
// (api.googleAccounts.connect). Évite de casser les appelants existants.
export async function saveGoogleRefreshToken(_token: string): Promise<void> {
  /* no-op — source de vérité = Convex google_accounts */
}

export async function getCalendarClient() {
  const token = await getRefreshToken()
  const auth  = getOAuth2Client()
  auth.setCredentials({ refresh_token: token ?? undefined })
  return google.calendar({ version: 'v3', auth })
}

/**
 * Calendrier PERSONNEL du profil connecté.
 *
 * `getCalendarClient` prend « le premier compte connecté » : c'est bon pour le
 * calendrier d'entreprise (réservation, round-robin), mais sur l'écran
 * Calendrier ça faisait voir à chacun l'agenda de quelqu'un d'autre. Ici, un
 * profil ne voit et n'écrit QUE son propre agenda, et rien du tout s'il n'a
 * pas connecté le sien : on ne retombe jamais sur le compte d'un collègue.
 */
export async function getUserCalendarClient(clerkUserId?: string | null) {
  if (!clerkUserId) return null
  if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) return null
  const secret = process.env.INTERNAL_API_SECRET
  const convex = convexClient()
  if (!secret || !convex) return null
  let token: string | null = null
  try {
    token = await convex.query(api.googleAccounts.getToken, { clerkUserId, secret })
  } catch {
    return null
  }
  if (!token) return null
  const auth = getOAuth2Client()
  auth.setCredentials({ refresh_token: token })
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
