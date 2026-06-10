import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey     = process.env.GHL_API_KEY!
  const locationId = process.env.GHL_LOCATION_ID!
  const baseUrl    = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const body = await req.json() as {
    calendarId: string
    title:      string
    startTime:  string  // ISO
    endTime:    string  // ISO
    contactId?: string
    notes?:     string
    tz?:        string
  }
  const { calendarId, title, startTime, endTime, contactId, notes } = body
  const tz = body.tz || 'Europe/Paris'

  const res = await fetch(`${baseUrl}/calendars/events/appointments`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId,
      locationId,
      contactId:        contactId || undefined,
      title,
      startTime:        new Date(startTime).toISOString(),
      endTime:          new Date(endTime).toISOString(),
      notes:            notes || undefined,
      selectedTimezone: tz,
      ignoreDateRange:  true,
    }),
    cache: 'no-store',
  })

  const text = await res.text()
  console.log('[GHL] status:', res.status, 'body:', text)

  if (!res.ok) {
    return NextResponse.json({ error: text }, { status: res.status })
  }

  let data: unknown
  try { data = JSON.parse(text) } catch { data = {} }
  return NextResponse.json({ event: data })
}
