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
    // tl;dv paginates: { page, pageSize, pages, total, results: [...] }
    const meetings = data.results ?? data.meetings?.results ?? data.meetings ?? (Array.isArray(data) ? data : [])
    return NextResponse.json({ meetings })
  } catch (err) {
    console.error('[tldv]', err)
    return NextResponse.json({ meetings: [], error: String(err) })
  }
}
