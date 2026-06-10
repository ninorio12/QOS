import { NextRequest, NextResponse } from 'next/server'

const TLDV_BASE = 'https://pasta.tldv.io/v1alpha1'

export const dynamic = 'force-dynamic'

// Returns the full transcript of a tl;dv meeting, normalized to a flat list of
// { speaker, text, time } segments. Defensive against tl;dv response shape variations.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = process.env.TLDV_API_KEY
  if (!apiKey) return NextResponse.json({ segments: [], error: 'TLDV_API_KEY not set' })

  try {
    const res = await fetch(`${TLDV_BASE}/meetings/${params.id}/transcript`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`tldv ${res.status}`)
    const data = await res.json()

    // tl;dv may return { data: [...] } or { transcript: [...] } or a bare array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = data.data ?? data.transcript ?? data.segments ?? (Array.isArray(data) ? data : [])
    const fmt = (s?: number) => {
      if (s == null || isNaN(s)) return ''
      const m = Math.floor(s / 60), sec = Math.floor(s % 60)
      return `${m}:${String(sec).padStart(2, '0')}`
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments = raw.map((seg: any) => ({
      speaker: seg.speaker ?? seg.speakerName ?? seg.name ?? '',
      text:    seg.text ?? seg.content ?? seg.transcript ?? '',
      time:    typeof seg.startTime === 'number' ? fmt(seg.startTime)
             : typeof seg.start === 'number' ? fmt(seg.start)
             : (seg.timestamp ?? seg.time ?? ''),
    })).filter((s: { text: string }) => s.text)

    return NextResponse.json({ segments })
  } catch (err) {
    console.error('[tldv transcript]', err)
    return NextResponse.json({ segments: [], error: String(err) })
  }
}
