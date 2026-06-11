import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

type ImportRow = {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  companyName: string
}

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

const initialsOf = (first: string, last: string, email: string) => {
  const a = (first || '').trim(), b = (last || '').trim()
  const ini = `${a[0] ?? ''}${b[0] ?? ''}`.toUpperCase()
  return ini || (email[0] ?? '?').toUpperCase()
}

export async function POST(req: NextRequest) {
  const { rows, pipelineId, firstStageId } = await req.json() as {
    rows:           ImportRow[]
    pipelineId?:    string | null
    firstStageId?:  string | null
  }
  if (!rows?.length) return NextResponse.json({ created: 0, errors: [] })

  // Garde anti-burst — max 20 contacts par appel.
  const BURST_LIMIT = 20
  if (rows.length > BURST_LIMIT) {
    return NextResponse.json(
      { error: 'burst_limit_exceeded', message: `Maximum ${BURST_LIMIT} contacts par import. Reçu: ${rows.length}. Découpez en lots.`, limit: BURST_LIMIT, received: rows.length },
      { status: 429 }
    )
  }

  const c = convex()
  const results = await Promise.all(rows.map(async (r, i) => {
    try {
      // 1. Créer le contact dans Convex (source unique de vérité).
      const contactId = await c.mutation(api.crm_contacts.create, {
        firstName:   r.firstName   || '',
        lastName:    r.lastName    || undefined,
        email:       r.email       || undefined,
        phone:       r.phone       || undefined,
        companyName: r.companyName || undefined,
        source:      'import',
      })

      // 2. Créer un lead dans le pipeline si demandé.
      if (pipelineId && firstStageId) {
        const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || 'Contact importé'
        await c.mutation(api.crm_leads.create, {
          contactId,
          name,
          email:      r.email       || undefined,
          phone:      r.phone       || undefined,
          company:    r.companyName || undefined,
          pipelineId,
          stageId:    firstStageId,
          value:      0,
          source:     'import',
          initials:   initialsOf(r.firstName, r.lastName, r.email),
        })
      }

      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, row: i + 1, message: String(err) }
    }
  }))

  const created = results.filter(r => r.ok).length
  const errors  = results
    .filter((r): r is { ok: false; row: number; message: string } => !r.ok)
    .map(({ row, message }) => ({ row, message }))

  return NextResponse.json({ created, errors })
}
