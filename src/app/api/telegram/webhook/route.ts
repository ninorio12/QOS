import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// IDs Telegram reconnus
const KNOWN_AGENTS: Record<number, string> = {
  7354829275: 'hermes',   // Hermes / Thomas
}

type TelegramUpdate = {
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number }
    text?: string
    date: number
  }
}

export async function POST(req: NextRequest) {
  // Vérification token optionnelle
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const body = await req.json() as TelegramUpdate
  const msg = body.message
  if (!msg?.text) return NextResponse.json({ ok: true })

  const fromId   = msg.from.id
  const fromName = KNOWN_AGENTS[fromId] ?? msg.from.username ?? msg.from.first_name
  const text     = msg.text.trim()

  // Ignorer les commandes système
  if (text.startsWith('/start') || text.startsWith('/help')) {
    return NextResponse.json({ ok: true })
  }

  console.log(`[Telegram ← ${fromName}] ${text}`)

  // Parser le format structuré d'Hermes si présent
  // Format attendu: [TYPE] subject\n{json?}
  // ou texte libre
  let type: string = 'result'
  let subject: string = text
  let payload: Record<string, unknown> = {}

  const typeMatch = text.match(/^\[(task|start|progress|result|error|ack)\]\s*/i)
  if (typeMatch) {
    type = typeMatch[1].toLowerCase()
    const rest = text.slice(typeMatch[0].length)
    const jsonStart = rest.indexOf('\n{')
    if (jsonStart !== -1) {
      subject = rest.slice(0, jsonStart).trim()
      try { payload = JSON.parse(rest.slice(jsonStart + 1)) } catch {}
    } else {
      subject = rest.trim()
    }
  }

  // Stocker dans le bridge Supabase
  try {
    await supabase.from('agent_messages').insert({
      from_agent: fromName === 'hermes' ? 'hermes' : fromName,
      to_agent: 'qos',
      type,
      subject,
      payload: Object.keys(payload).length > 0 ? payload : { raw: text },
      read: false,
    })
  } catch (e) {
    // Table peut ne pas encore exister — log only
    console.warn('[Telegram webhook] bridge insert failed:', e)
  }

  // Accusé de réception Telegram
  const ack = `✅ Reçu par QOS\n_${subject.slice(0, 80)}_`
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: ack,
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id,
    }),
  })

  return NextResponse.json({ ok: true })
}

// Vérification Telegram (GET pour debug)
export async function GET() {
  return NextResponse.json({ status: 'webhook active', agent: 'qos' })
}
