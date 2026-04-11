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

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }

  let created = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
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
        const err = await contactRes.text()
        errors.push({ row: i + 1, message: err })
        continue
      }

      created++

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
    } catch (err) {
      errors.push({ row: i + 1, message: String(err) })
    }
  }

  return NextResponse.json({ created, errors })
}
