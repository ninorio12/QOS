import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

// Disponibilités de TOUTE l'équipe (FreeBusy Google) — créneaux occupés SANS détails,
// pour afficher des cases grisées « Occupé · Prénom » dans le calendrier.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ people: [] })

  const secret = process.env.INTERNAL_API_SECRET
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!secret || !convexUrl) return NextResponse.json({ people: [] })
  const convex = new ConvexHttpClient(convexUrl)

  let accounts: { clerkUserId: string; refreshToken: string; email: string | null }[] = []
  try { accounts = await convex.query(api.googleAccounts.listConnected, { secret }) }
  catch { return NextResponse.json({ people: [] }) }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let users: any[] = []
  try { users = await convex.query(api.users.list, {}) } catch { /* noms facultatifs */ }
  const nameByClerk = new Map<string, string>()
  for (const u of users) {
    const nm = u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
    if (u.clerkUserId && nm) nameByClerk.set(u.clerkUserId, nm)
  }

  const timeMin = new Date(from).toISOString()
  const timeMax = new Date(to).toISOString()

  const people = await Promise.all(accounts.map(async acc => {
    const label = nameByClerk.get(acc.clerkUserId) || acc.email || 'Collègue'
    try {
      const auth = getOAuth2Client()
      auth.setCredentials({ refresh_token: acc.refreshToken })
      const cal = google.calendar({ version: 'v3', auth })
      const res = await cal.freebusy.query({ requestBody: { timeMin, timeMax, items: [{ id: 'primary' }] } })
      const busy = (res.data.calendars?.primary?.busy ?? [])
        .filter(b => b.start && b.end)
        .map(b => ({ start: b.start as string, end: b.end as string }))
      return { clerkUserId: acc.clerkUserId, name: label, email: acc.email, busy }
    } catch {
      return { clerkUserId: acc.clerkUserId, name: label, email: acc.email, busy: [] as { start: string; end: string }[] }
    }
  }))

  return NextResponse.json({ people })
}
