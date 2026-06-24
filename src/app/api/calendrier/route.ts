import { NextRequest, NextResponse } from 'next/server'
import { getCalendarClient, isGoogleConfigured, type GoogleEvent } from '@/lib/google'
import { DEMO_MODE } from '@/lib/demo'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

const GOOGLE_COLOR = '#34A853'
const ICLOSED_R1 = '#3462EE' // bleu (R1)
const ICLOSED_R2 = '#22C55E' // vert (R2)
const KICKOFF_COLOR = '#FF4D00' // orange (kickoff onboarding)

// Google Calendar renvoie souvent la description en HTML (<br>, <p>, <wbr>, &nbsp;…).
function htmlToText(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (!/[<&]/.test(raw)) return raw.trim() || null
  const s = raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#?39;|&apos;/gi, "'")
  return s.split('\n').map(l => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim() || null
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

// RDV iClosed (R1/R2) synchronisés dans os_sales_calls : toujours inclus dans le calendrier.
async function fetchClosingAppts(fromISO: string, toISO: string) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return []
    const cx = new ConvexHttpClient(url)
    const events = await cx.query(api.closing.calendarEvents, { from: fromISO, to: toISO }) as Array<{
      id: string; kind: string; contactName: string; startTime: string; endTime: string; meetLink: string | null
      calendarLabel?: string | null; calendarColor?: string | null
    }>
    return events.map(e => ({
      id:           `iclosed-${e.id}`,
      calendarId:   'iclosed',
      title:        `${e.kind} · ${e.contactName}`,
      contactName:  e.contactName,
      startTime:    e.startTime,
      endTime:      e.endTime,
      status:       'confirmed' as const,
      calendarName: e.calendarLabel ? `iClosed · ${e.calendarLabel}` : 'iClosed',
      notes:        null,
      color:        e.calendarColor || (e.kind === 'R2' ? ICLOSED_R2 : ICLOSED_R1),
      source:       'iclosed' as const,
      meetLink:     e.meetLink ?? null,
    }))
  } catch (err) {
    console.error('[Calendrier iClosed]', err)
    return []
  }
}

// Kickoffs onboarding réservés (onboarding.kickoffAt) : inclus dans le calendrier comme les R1/R2.
async function fetchKickoffAppts(fromISO: string, toISO: string) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return []
    const cx = new ConvexHttpClient(url)
    const events = await cx.query(api.onboarding.kickoffCalendarEvents, { from: fromISO, to: toISO }) as Array<{
      id: string; contactName: string; startTime: string
    }>
    return events.map(e => ({
      id:           `kickoff-${e.id}`,
      calendarId:   'iclosed',
      title:        `Kickoff · ${e.contactName}`,
      contactName:  e.contactName,
      startTime:    e.startTime,
      endTime:      new Date(new Date(e.startTime).getTime() + 45 * 60000).toISOString(),
      status:       'confirmed' as const,
      calendarName: 'iClosed · Kickoff',
      notes:        null,
      color:        KICKOFF_COLOR,
      source:       'iclosed' as const,
      meetLink:     null,
    }))
  } catch (err) {
    console.error('[Calendrier Kickoff]', err)
    return []
  }
}

// Statut connexion iClosed (badge vert "connecté" du Calendrier).
async function fetchIclosedStatus(): Promise<{ connected: boolean; count: number }> {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return { connected: false, count: 0 }
    const cx = new ConvexHttpClient(url)
    return await cx.query(api.closing.iclosedStatus, {}) as { connected: boolean; count: number }
  } catch {
    return { connected: false, count: 0 }
  }
}

export async function GET(req: NextRequest) {
  const now = Date.now()
  const RANGE = 30 * 24 * 60 * 60 * 1000
  const fromMs = Date.parse(req.nextUrl.searchParams.get('from') ?? '')
  const toMs   = Date.parse(req.nextUrl.searchParams.get('to') ?? '')
  const windowMin = Number.isNaN(fromMs) ? now - RANGE : fromMs
  const windowMax = Number.isNaN(toMs)   ? now + RANGE : toMs
  const fromISO = new Date(windowMin).toISOString()
  const toISO   = new Date(windowMax).toISOString()

  if (DEMO_MODE) {
    return NextResponse.json({ appointments: [], calendars: [], googleConfigured: false })
  }

  // RDV iClosed (indépendant de Google).
  const closingAppts = await fetchClosingAppts(fromISO, toISO)
  const kickoffAppts = await fetchKickoffAppts(fromISO, toISO)
  const iclosed = await fetchIclosedStatus()
  const iclosedCal = iclosed.connected ? [{ id: 'iclosed', name: 'iClosed' }] : []

  const googleOn = await isGoogleConfigured().catch(() => false)
  if (!googleOn) {
    return NextResponse.json({ appointments: [...closingAppts, ...kickoffAppts], calendars: iclosedCal, googleConfigured: false, iclosed })
  }

  try {
    const cal = await getCalendarClient()
    const res = await withTimeout(cal.events.list({
      calendarId:   process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin:      fromISO,
      timeMax:      toISO,
      singleEvents: true,
      orderBy:      'startTime',
      maxResults:   500,
    }), 2500).catch(() => ({ data: { items: [] } }))

    const googleAppts = (res.data.items ?? [] as GoogleEvent[]).map((ev) => ({
      id:           `google-${ev.id}`,
      calendarId:   'google',
      title:        ev.summary || 'Événement',
      contactName:  '',
      startTime:    ev.start?.dateTime ?? ev.start?.date ?? new Date().toISOString(),
      endTime:      ev.end?.dateTime   ?? ev.end?.date   ?? new Date().toISOString(),
      status:       'confirmed' as const,
      calendarName: 'Google Calendar',
      notes:        htmlToText((ev as Record<string, unknown>).description),
      color:        GOOGLE_COLOR,
      source:       'google' as const,
    }))

    return NextResponse.json({
      appointments: [...closingAppts, ...kickoffAppts, ...googleAppts],
      calendars: [{ id: 'google', name: 'Google Calendar' }, ...iclosedCal],
      googleConfigured: true,
      iclosed,
    })
  } catch (err) {
    console.error('[Calendrier API]', err)
    return NextResponse.json({ appointments: [...closingAppts, ...kickoffAppts], calendars: iclosedCal, googleConfigured: true, iclosed })
  }
}
