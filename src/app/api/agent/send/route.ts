import { NextRequest, NextResponse } from 'next/server'
import { bridge, type MsgType } from '@/lib/agent-bridge'

// Route interne (UI QOS uniquement) — pas besoin du shared secret
// Le secret Hermes reste côté serveur uniquement
export async function POST(req: NextRequest) {
  const { to = 'hermes', type = 'task', subject = '', payload = {} } = await req.json()

  const id = await bridge.send(
    to as 'qos' | 'hermes' | 'all',
    type as MsgType,
    subject,
    payload,
    { from: 'qos' }
  )

  return NextResponse.json({ ok: true, id })
}
