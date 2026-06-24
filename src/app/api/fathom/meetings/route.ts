import { NextResponse } from 'next/server'

const FATHOM_BASE = 'https://api.fathom.ai/external/v1'

// Liste les réunions Fathom. On demande les transcripts inline (include_transcript)
// pour que la modale détail n'ait pas à refaire un appel par enregistrement.
export async function GET() {
  const apiKey = process.env.FATHOM_API_KEY
  if (!apiKey) return NextResponse.json({ meetings: [], error: 'FATHOM_API_KEY not set' })

  try {
    const res = await fetch(`${FATHOM_BASE}/meetings?include_transcript=true`, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`fathom ${res.status}`)
    const data = await res.json()
    // Fathom paginate : { items: [...], limit, next_cursor }
    const meetings = data.items ?? data.results ?? data.meetings ?? (Array.isArray(data) ? data : [])
    return NextResponse.json({ meetings })
  } catch (err) {
    console.error('[fathom]', err)
    return NextResponse.json({ meetings: [], error: String(err) })
  }
}
