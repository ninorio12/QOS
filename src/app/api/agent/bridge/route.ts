import { NextRequest, NextResponse } from 'next/server'
import { bridge, type MsgType } from '@/lib/agent-bridge'

const SECRET = process.env.HERMES_SHARED_SECRET ?? 'hermes-qos-2026'

function auth(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${SECRET}`
}

// POST — Hermes envoie un message (task / start / progress / result / error / ack)
// Body: { from, to, type, subject, payload, ref_id? }
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { from = 'hermes', to = 'qos', type = 'result', subject = '', payload = {}, ref_id } = await req.json()

  const id = await bridge.send(to, type as MsgType, subject, payload, {
    from: from as 'qos' | 'hermes',
    refId: ref_id,
  })

  return NextResponse.json({ ok: true, id })
}

// GET — Hermes lit ses messages non lus
// ?agent=hermes
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const agent = (req.nextUrl.searchParams.get('agent') ?? 'hermes') as 'qos' | 'hermes'
  const messages = await bridge.inbox(agent)

  return NextResponse.json({ messages })
}
