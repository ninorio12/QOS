import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_FIELDS = ['canal', 'priorite', 'summary', 'ai_enabled']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body    = await req.json()
  const id      = params.id
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  // Champs Supabase (enrichissement local)
  const supabaseUpdate: Record<string, unknown> = {}
  for (const field of SUPABASE_FIELDS) {
    if (field in body) supabaseUpdate[field] = body[field]
  }

  // Champs GHL (reste)
  const ghlUpdate: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!SUPABASE_FIELDS.includes(k)) ghlUpdate[k] = v
  }

  const promises: Promise<unknown>[] = []

  if (Object.keys(supabaseUpdate).length > 0) {
    promises.push(
      createClient().then(sb =>
        sb.from('conversations').update(supabaseUpdate).eq('id', id)
      )
    )
  }

  if (Object.keys(ghlUpdate).length > 0) {
    promises.push(
      fetch(`${baseUrl}/conversations/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${apiKey}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
        body: JSON.stringify(ghlUpdate),
        cache: 'no-store',
      })
    )
  }

  await Promise.all(promises)
  return NextResponse.json({ ok: true })
}
