import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'
import { sendGHLMessage } from '@/lib/ghl'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type GHLInboundMessage = {
  type:           string
  locationId?:    string
  contactId?:     string
  conversationId: string
  messageId?:     string
  body?:          string
  messageType?:   string  // 'WhatsApp' | 'SMS' | 'Email' | 'Call' etc.
  direction?:     string
  dateAdded?:     string
  attachments?:   unknown[]
}

function verifySecret(req: NextRequest): boolean {
  const ghlSecret = process.env.GHL_WEBHOOK_SECRET
  if (!ghlSecret) return true
  const received = req.headers.get('x-wc-webhook-secret') ?? req.headers.get('x-ghl-secret') ?? ''
  return received === ghlSecret
}

function toGHLChannel(messageType?: string): 'WhatsApp' | 'SMS' | 'Email' {
  if (!messageType) return 'WhatsApp'
  const t = messageType.toLowerCase()
  if (t === 'email') return 'Email'
  if (t === 'sms')   return 'SMS'
  return 'WhatsApp'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GHLInboundMessage & { appointmentId?: string; id?: string }

    if (!verifySecret(req)) {
      console.warn('[ghl-webhook] Invalid secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventType = body.type ?? ''

    // ── InboundMessage : message reçu d'un contact ────────────────────────
    if (eventType === 'InboundMessage') {
      const { conversationId, contactId, body: msgBody, messageType } = body

      if (!conversationId || !msgBody?.trim()) {
        return NextResponse.json({ ok: true })
      }

      const supabase = await createClient()

      // 1. Sauvegarder le message entrant dans Supabase
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role:            'user',
        content:         msgBody.trim(),
        metadata:        { channel: messageType, source: 'ghl_webhook', contact_id: contactId },
      })

      // 2. Vérifier si ai_enabled pour cette conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('ai_enabled')
        .eq('id', conversationId)
        .maybeSingle()

      // Si pas de config ou AI désactivée → ignorer
      if (!conv?.ai_enabled) {
        console.log(`[ghl-webhook] AI disabled for conversation ${conversationId}`)
        revalidateTag('ghl-conversations')
        return NextResponse.json({ ok: true })
      }

      // 3. Récupérer l'historique depuis Supabase (20 derniers messages)
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20)

      // 4. Construire l'historique Anthropic (rôles alternés)
      const rawHistory = (msgs ?? []).filter(m => m.role === 'user' || m.role === 'assistant')
      const history: Anthropic.MessageParam[] = []
      for (const m of rawHistory) {
        const last = history[history.length - 1]
        if (last && last.role === m.role) {
          last.content = `${last.content}\n\n${m.content}`
        } else {
          history.push({ role: m.role as 'user' | 'assistant', content: m.content })
        }
      }
      // S'assurer que le dernier message est bien le message entrant
      const lastMsg = history[history.length - 1]
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== msgBody.trim()) {
        history.push({ role: 'user', content: msgBody.trim() })
      }

      // 5. Générer la réponse Claude (non-streaming pour webhook)
      const response = await anthropic.messages.create({
        model:     'claude-opus-4-6',
        max_tokens: 1024,
        system:    SYSTEM_PROMPT_DEFAULT,
        messages:  history,
      })

      const aiText = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
      if (!aiText) {
        console.warn('[ghl-webhook] Claude returned empty response')
        return NextResponse.json({ ok: true })
      }

      // 6. Sauvegarder la réponse IA
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role:            'assistant',
        content:         aiText,
        metadata:        { model: 'claude-opus-4-6', auto: true },
      })

      // 7. Envoyer la réponse via GHL
      const channel = toGHLChannel(messageType)
      try {
        await sendGHLMessage(conversationId, aiText, channel, undefined, contactId)
        console.log(`[ghl-webhook] AI response sent via ${channel} for conversation ${conversationId}`)
      } catch (sendErr) {
        console.error('[ghl-webhook] Envoi GHL échoué:', sendErr)
        // On continue — le message est déjà sauvegardé dans Supabase
      }

      revalidateTag('ghl-conversations')
      return NextResponse.json({ ok: true })
    }

    // ── AppointmentDelete : supprimer l'event Google Calendar ─────────────
    if (eventType === 'AppointmentDelete') {
      const appointmentId = body.appointmentId ?? body.id ?? ''
      if (!appointmentId) return NextResponse.json({ ok: true })

      const supabase = await createClient()
      const { data: link } = await supabase
        .from('calendar_event_links')
        .select('google_event_id')
        .eq('ghl_appointment_id', appointmentId)
        .maybeSingle()

      if (link?.google_event_id && isGoogleConfigured()) {
        try {
          const cal   = getCalendarClient()
          const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
          await cal.events.delete({ calendarId: calId, eventId: link.google_event_id })
          console.log(`[ghl-webhook] Deleted Google event ${link.google_event_id}`)
        } catch (err) {
          console.error('[ghl-webhook] Google delete failed:', err)
        }
      }

      if (link) {
        const { error: delErr } = await supabase
          .from('calendar_event_links')
          .delete()
          .eq('ghl_appointment_id', appointmentId)
        if (delErr) console.error('[ghl-webhook] Mapping delete failed:', delErr)
      }
    }

    // Tous les autres events → ignorer mais logger
    if (eventType && eventType !== 'AppointmentDelete') {
      console.log(`[ghl-webhook] Unhandled event type: ${eventType}`)
    }

    revalidateTag('ghl-contacts')
    revalidateTag('ghl-opportunities')
    revalidateTag('ghl-conversations')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ghl-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
