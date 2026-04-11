import { NextRequest } from 'next/server'
import { ghlMutate } from '@/lib/ghl'

const BASE_URL = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
const LOC_ID   = () => process.env.GHL_LOCATION_ID!

async function ghlGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization:  `Bearer ${process.env.GHL_API_KEY!}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

// GET — fetch GHL Conversation AI bot config
export async function GET() {
  try {
    const data = await ghlGet(`/locations/${LOC_ID()}/conversationsAi`)
    // GHL returns { bot: { ... } } or the object directly
    const bot = data.bot ?? data
    return Response.json({ ok: true, bot })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 502 })
  }
}

// PATCH — save GHL Conversation AI bot config back to GHL
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  try {
    const data = await ghlMutate(`/locations/${LOC_ID()}/conversationsAi`, 'POST', body)
    return Response.json({ ok: true, bot: data.bot ?? data })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 502 })
  }
}
