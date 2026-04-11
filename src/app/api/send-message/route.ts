import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, type, subject, contactId } = await req.json()

    if (!conversationId || !message?.trim() || !type) {
      return NextResponse.json({ error: 'conversationId, message et type requis' }, { status: 400 })
    }

    const validTypes = ['WhatsApp', 'SMS', 'Email']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type invalide: ${type}` }, { status: 400 })
    }

    // Send via GHL
    await sendGHLMessage(conversationId, message, type as 'WhatsApp' | 'SMS' | 'Email', subject, contactId)

    // Save to Supabase as user message (manual send)
    const supabase = await createClient()
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      metadata: { manual: true, channel: type },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/send-message] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
