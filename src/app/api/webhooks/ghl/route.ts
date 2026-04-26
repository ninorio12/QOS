import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'
import { sendGHLMessage, findOrCreateGHLConversation } from '@/lib/ghl'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
import { log } from '@/lib/logger'
import crypto from 'crypto'

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

type GHLOpportunityEvent = {
  type:            string
  locationId?:     string
  id?:             string
  pipelineId?:     string
  pipelineStageId?: string
  contactId?:      string
  contact?: {
    id?:        string
    name?:      string
    firstName?: string
    lastName?:  string
    phone?:     string
    email?:     string
  }
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
  const trace_id = crypto.randomBytes(6).toString('hex')

  try {
    const body = await req.json() as GHLInboundMessage & GHLOpportunityEvent & { appointmentId?: string; id?: string }

    if (!verifySecret(req)) {
      log.warn('ghl_webhook_unauthorized', 'Invalid secret', { trace_id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventType = body.type ?? ''

    // ── OpportunityCreate : nouveau contact dans la pipeline commerciale ──
    if (eventType === 'OpportunityCreate') {
      const commercialPipelineId = process.env.GHL_ACQUISITION_PIPELINE_ID ?? ''

      if (!commercialPipelineId || body.pipelineId !== commercialPipelineId) {
        log.ok('ghl_opportunity_ignored', { trace_id, detail: `pipeline=${body.pipelineId}` })
        return NextResponse.json({ ok: true })
      }

      const contactId = body.contactId ?? body.contact?.id
      if (!contactId) {
        log.warn('ghl_opportunity_no_contact', 'OpportunityCreate sans contactId', { trace_id })
        return NextResponse.json({ ok: true })
      }

      const firstName = body.contact?.firstName ?? body.contact?.name?.split(' ')[0] ?? ''
      const greeting  = firstName ? `Bonjour ${firstName} ! ` : 'Bonjour ! '

      const initialMsg =
        greeting +
        `Je suis Kai, l'assistant IA de l'équipe. 😊 Votre projet nous a bien été transmis — ` +
        `j'ai quelques questions rapides pour que nos experts puissent vous préparer la meilleure réponse possible.\n\n` +
        `Quel type de travaux envisagez-vous ? (rénovation, gros œuvre, façade, plomberie…)`

      try {
        const conversationId = await findOrCreateGHLConversation(contactId)
        await sendGHLMessage(conversationId, initialMsg, 'WhatsApp', undefined, contactId)
        log.ok('ghl_kai_initial_sent', { trace_id, contact_id: contactId, detail: `conv=${conversationId}` })

        const supabase = await createClient()
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contactId)
          .maybeSingle()

        if (conv?.id) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            role:            'assistant',
            content:         initialMsg,
            metadata:        { auto: true, trigger: 'opportunity_create', trace_id },
          })
        }
      } catch (err) {
        log.error('ghl_kai_initial_failed', String(err), { trace_id, contact_id: contactId })
      }

      revalidateTag('ghl-conversations')
      return NextResponse.json({ ok: true })
    }

    // ── InboundMessage : message reçu d'un contact ────────────────────────
    if (eventType === 'InboundMessage') {
      const { conversationId, contactId, body: msgBody, messageType } = body

      if (!conversationId || !msgBody?.trim()) {
        return NextResponse.json({ ok: true })
      }

      log.ok('ghl_inbound_message', { trace_id, contact_id: contactId, stage: 'qualification', detail: `conv=${conversationId} type=${messageType}` })

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
        log.ok('ghl_ai_reply_sent', { trace_id, contact_id: contactId, stage: 'qualification', detail: `channel=${channel}` })
      } catch (sendErr) {
        log.error('ghl_ai_reply_failed', String(sendErr), { trace_id, contact_id: contactId })
        // On continue — le message est déjà sauvegardé dans Supabase
      }

      // 8. Détecter le résumé projet et mettre à jour la fiche contact GHL
      const resumeMatch = aiText.match(/\[RÉSUMÉ_PROJET\]([\s\S]*?)\[\/RÉSUMÉ_PROJET\]/)
      if (resumeMatch && contactId) {
        const resumeText = resumeMatch[1].trim()
        try {
          const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
          const apiKey  = process.env.GHL_API_KEY!
          await fetch(`${baseUrl}/contacts/${contactId}`, {
            method: 'PUT',
            headers: {
              Authorization:  `Bearer ${apiKey}`,
              Version:        '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ additionalNotes: resumeText }),
            cache: 'no-store',
          })
          log.ok('ghl_contact_resume_updated', { trace_id, contact_id: contactId, stage: 'qualification' })
        } catch (updateErr) {
          log.error('ghl_contact_resume_failed', String(updateErr), { trace_id, contact_id: contactId })
        }
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

      if (link?.google_event_id && await isGoogleConfigured()) {
        try {
          const cal   = await getCalendarClient()
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
    log.error('ghl_webhook_error', String(err), { trace_id })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
