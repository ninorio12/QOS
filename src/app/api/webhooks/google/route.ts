import { NextRequest, NextResponse } from 'next/server'

// Google Calendar push notification webhook
// Set up with: POST /api/webhooks/google/subscribe (once, on deploy)
// Google sends a POST here on every calendar change

export async function POST(req: NextRequest) {
  // Google sends headers: X-Goog-Channel-ID, X-Goog-Resource-State
  const state      = req.headers.get('x-goog-resource-state')
  const channelId  = req.headers.get('x-goog-channel-id')

  if (!channelId) return NextResponse.json({ ok: false }, { status: 400 })

  // 'sync' = initial handshake, 'exists'/'not_exists' = real change
  if (state === 'sync') return NextResponse.json({ ok: true })

  // A change happened — clients poll via router.refresh() on next visit
  // For real-time push to the UI, you'd use Server-Sent Events or WebSocket here
  console.log(`[Google Webhook] Calendar changed — state: ${state}`)

  return NextResponse.json({ ok: true })
}
