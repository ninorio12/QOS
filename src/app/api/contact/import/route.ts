import { NextRequest, NextResponse } from 'next/server'

type ImportRow = {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  companyName: string
}

export async function POST(req: NextRequest) {
  const apiKey     = process.env.GHL_API_KEY!
  const locationId = process.env.GHL_LOCATION_ID!
  const baseUrl    = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const { rows, pipelineId, firstStageId } = await req.json() as {
    rows:           ImportRow[]
    pipelineId?:    string | null
    firstStageId?:  string | null
  }
  if (!rows?.length) return NextResponse.json({ created: 0, errors: [] })

  // Guard anti-burst — max 20 contacts par appel (GHL rate-limit)
  const BURST_LIMIT = 20
  if (rows.length > BURST_LIMIT) {
    const trace_id = Math.random().toString(36).slice(2, 8)
    console.warn(`[import] burst guard déclenché — ${rows.length} rows > ${BURST_LIMIT} (trace_id: ${trace_id})`)
    return NextResponse.json(
      { error: 'burst_limit_exceeded', trace_id, message: `Maximum ${BURST_LIMIT} contacts par import. Reçu: ${rows.length}. Découpez en lots.`, limit: BURST_LIMIT, received: rows.length },
      { status: 429 }
    )
  }

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }

  const results = await Promise.all(rows.map(async (r, i) => {
    try {
      // 1. Create contact
      const contactRes = await fetch(`${baseUrl}/contacts/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          locationId,
          firstName:   r.firstName   || undefined,
          lastName:    r.lastName    || undefined,
          email:       r.email       || undefined,
          phone:       r.phone       || undefined,
          companyName: r.companyName || undefined,
        }),
        cache: 'no-store',
      })

      if (!contactRes.ok) {
        return { ok: false, row: i + 1, message: await contactRes.text() }
      }

      // 2. Create opportunity if pipeline selected
      if (pipelineId && firstStageId) {
        const contactData = await contactRes.json() as { contact?: { id: string } }
        const contactId   = contactData.contact?.id
        if (contactId) {
          const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || 'Contact importé'
          await fetch(`${baseUrl}/opportunities/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              locationId,
              pipelineId,
              pipelineStageId: firstStageId,
              contactId,
              name,
              monetaryValue:   0,
              status:          'open',
            }),
            cache: 'no-store',
          })
          // Opportunity errors are non-fatal — contact was already created
        }
      }

      return { ok: true }
    } catch (err) {
      return { ok: false, row: i + 1, message: String(err) }
    }
  }))

  const created = results.filter(r => r.ok).length
  const errors  = results
    .filter((r): r is { ok: false; row: number; message: string } => !r.ok)
    .map(({ row, message }) => ({ row, message }))

  return NextResponse.json({ created, errors })
}
