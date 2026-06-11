import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

export const dynamic = 'force-dynamic'

// Vérifie la disponibilité (FreeBusy) des invités sur un créneau.
// Body: { emails: string[], start: string (ISO), end: string (ISO) }
// Retour: { configured, results: { [email]: { busy, intervals, error? } } }
export async function POST(req: NextRequest) {
  const { emails, start, end } = (await req.json()) as { emails?: string[]; start?: string; end?: string }
  const list = (emails ?? []).map(e => e.trim().toLowerCase()).filter(Boolean)

  if (!start || !end || list.length === 0) {
    return NextResponse.json({ configured: true, results: {} })
  }
  if (!(await isGoogleConfigured())) {
    // Pas de Google connecté → on ne peut pas vérifier ; on ne bloque pas.
    return NextResponse.json({ configured: false, results: {} })
  }

  try {
    const cal = await getCalendarClient()
    const res = await cal.freebusy.query({
      requestBody: {
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        items: list.map(id => ({ id })),
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cals = (res.data.calendars ?? {}) as Record<string, any>
    const results: Record<string, { busy: boolean; intervals: { start?: string; end?: string }[]; error?: string }> = {}
    for (const email of list) {
      const c = cals[email]
      const errors = c?.errors as { reason?: string }[] | undefined
      const intervals = (c?.busy ?? []) as { start?: string; end?: string }[]
      results[email] = {
        busy: intervals.length > 0,
        intervals,
        error: errors?.length ? (errors[0].reason ?? 'inaccessible') : undefined,
      }
    }
    return NextResponse.json({ configured: true, results })
  } catch (err) {
    return NextResponse.json({ configured: true, results: {}, error: String(err) }, { status: 200 })
  }
}
