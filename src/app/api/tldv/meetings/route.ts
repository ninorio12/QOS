import { NextResponse } from 'next/server'

const TLDV_BASE = 'https://pasta.tldv.io/v1alpha1'

export async function GET() {
  const apiKey = process.env.TLDV_API_KEY
  if (!apiKey) return NextResponse.json({ meetings: [], error: 'TLDV_API_KEY not set' })

  try {
    const res = await fetch(`${TLDV_BASE}/meetings`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`tldv ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ meetings: data.meetings ?? data ?? [] })
  } catch (err) {
    console.error('[tldv]', err)
    return NextResponse.json({ meetings: [], error: String(err) })
  }
}
