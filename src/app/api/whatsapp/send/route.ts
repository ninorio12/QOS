import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/twilio'

export const runtime = 'nodejs'

// POST /api/whatsapp/send
// Body: { to: string, message: string, conversationId?: string }
export async function POST(req: NextRequest) {
  try {
    const { to, message, conversationId } = await req.json()

    if (!to || !message?.trim()) {
      return Response.json({ error: 'to et message sont requis' }, { status: 400 })
    }

    await sendWhatsApp(to, message)

    // Sauvegarder dans la conversation si fournie
    if (conversationId) {
      const supabase = await createClient()
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: message,
        metadata: { channel: 'whatsapp', sent_manually: true },
      })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[WhatsApp] Erreur envoi:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return Response.json({ error: message }, { status: 500 })
  }
}
