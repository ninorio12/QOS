import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

// ─── Mock event templates (fallback for local dev) ─────────────
const EVENT_TEMPLATES = [
  { type: 'webhook',  from: 'Meta Ads', to: 'Gateway', msg: 'Nouveau lead — Jean Dupont, façade 20-50k€' },
  { type: 'delegate', from: 'Soren',    to: 'Kai',     msg: 'Délégation lead #2891 — priorité haute' },
  { type: 'sms',      from: 'Kai',      to: 'Twilio',  msg: 'SMS envoyé +33652334975 — délai 47 sec' },
  { type: 'qualify',  from: 'Kai',      to: 'GHL',     msg: 'Lead qualifié — score 84/100, stage PROPOSITION' },
  { type: 'report',   from: 'Soren',    to: 'Telegram',msg: 'Digest 07h00 — 3 leads qualifiés, 1 RDV booké' },
  { type: 'devis',    from: 'Mia',      to: 'GHL',     msg: 'Devis #2851 façade 22 000€ — template BTP appliqué' },
  { type: 'webhook',  from: 'GHL',      to: 'Gateway', msg: 'Pipeline update — Xavier Alvarez → GAGNÉ' },
  { type: 'qualify',  from: 'Kai',      to: 'Soren',   msg: 'Relance J+2 planifiée — Inès Duprez, pas de réponse' },
]

export async function GET(req: NextRequest) {
  // If real gateway URL is configured, proxy it
  if (GATEWAY_URL) {
    const upstream = await fetch(`${GATEWAY_URL}/events`, {
      signal: req.signal,
    })
    return new Response(upstream.body, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-store',
        Connection:      'keep-alive',
      },
    })
  }

  // Fallback: mock stream for local development
  const encoder = new TextEncoder()
  let eventId = 0
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        const payload = `id: ${eventId++}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      send({ type: 'connected', msg: 'OpenClaw SSE stream connected (mock)' })

      intervalId = setInterval(() => {
        const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
        send({ ...tpl, timestamp: new Date().toISOString(), id: eventId })
      }, 8000 + Math.random() * 6000)

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        controller.close()
      })
    },
    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection:      'keep-alive',
    },
  })
}
