import { NextRequest, NextResponse } from 'next/server'

// Webhook endpoint pour recevoir les messages d'Hermes
// Hermes peut POST ici pour envoyer des résultats, tâches, ou statuts

type HermesMessage = {
  type: 'audit' | 'result' | 'task' | 'status' | 'error'
  from: string
  payload: Record<string, unknown>
  timestamp?: string
}

export async function POST(req: NextRequest) {
  // Vérification token simple
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.HERMES_SHARED_SECRET ?? 'hermes-qos-2026'

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json() as HermesMessage

  console.log('[Hermes →]', body.type, JSON.stringify(body.payload))

  // Relayer vers Telegram pour notifier Thomas
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const text = formatTelegramMessage(body)
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    }).catch(err => console.error('[Hermes relay Telegram]', err))
  }

  return NextResponse.json({ ok: true, received: body.type })
}

// GET : Hermes peut vérifier que l'endpoint est vivant
export async function GET() {
  return NextResponse.json({
    agent: 'qos',
    status: 'online',
    version: '1.0',
    capabilities: ['ghl', 'supabase', 'conversations', 'contacts', 'dashboard'],
  })
}

function formatTelegramMessage(msg: HermesMessage): string {
  const icon = { audit: '🔍', result: '✅', task: '📋', status: '📡', error: '❌' }[msg.type] ?? '📩'
  const lines = [
    `${icon} *Hermes → QOS* \`${msg.type}\``,
    `From: ${msg.from}`,
    '```',
    JSON.stringify(msg.payload, null, 2).slice(0, 2000),
    '```',
  ]
  return lines.join('\n')
}
