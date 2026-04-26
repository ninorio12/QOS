import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage, type SendEmailOptions } from '@/lib/ghl'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

// GET — retourne les infos expéditeur email par défaut
export async function GET() {
  return NextResponse.json({
    fromName:    env.emailFromName(),
    fromAddress: env.emailFromAddress(),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      conversationId: string
      message:        string
      type:           string
      subject?:       string
      contactId?:     string
      // Email-specific
      emailFrom?:     string
      emailFromName?: string
      emailTo?:       string
      emailCc?:       string[]
      emailBcc?:      string[]
    }

    const { conversationId, message, type, subject, contactId } = body

    if (!conversationId || !message?.trim() || !type) {
      return NextResponse.json({ error: 'conversationId, message et type requis' }, { status: 400 })
    }

    const validTypes = ['WhatsApp', 'SMS', 'Email']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type invalide: ${type}` }, { status: 400 })
    }

    let emailOptions: SendEmailOptions | undefined
    if (type === 'Email') {
      emailOptions = {
        subject:  body.emailFrom ? (subject ?? '') : (subject ?? ''),
        from:     body.emailFrom     ?? env.emailFromAddress(),
        fromName: body.emailFromName ?? env.emailFromName(),
        to:       body.emailTo,
        cc:       body.emailCc,
        bcc:      body.emailBcc,
      }
    }

    // Send via GHL
    await sendGHLMessage(
      conversationId,
      message,
      type as 'WhatsApp' | 'SMS' | 'Email',
      subject,
      contactId,
      emailOptions,
    )

    // Save to Supabase as user message (manual send)
    const supabase = await createClient()
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role:    'user',
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
