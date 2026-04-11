import { NextRequest } from 'next/server'
import twilio from 'twilio'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

import { env } from '@/lib/env'

const anthropic = new Anthropic({ apiKey: env.anthropicKey() })

// Parse URL-encoded form data (format Twilio)
function parseFormData(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body).entries())
}

export async function POST(req: NextRequest) {
  try {
    const rawBody  = await req.text()
    const formData = parseFormData(rawBody)

    // Valider la signature Twilio — obligatoire en production
    const twilioSignature = req.headers.get('X-Twilio-Signature') ?? ''
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const isDev = process.env.NODE_ENV === 'development' && (appUrl.includes('localhost') || appUrl.includes('ngrok'))

    if (!isDev) {
      // En production, toujours vérifier la signature
      if (!authToken || !twilioSignature) {
        console.warn('[Twilio] Signature ou token manquant — requête rejetée')
        return twimlResponse('', 403)
      }
      const url = `${appUrl}/api/webhooks/twilio`
      const isValid = twilio.validateRequest(authToken, twilioSignature, url, formData)
      if (!isValid) {
        console.warn('[Twilio] Signature invalide — requête rejetée')
        return twimlResponse('', 403)
      }
    }

    const incomingNumber = formData['From']?.replace('whatsapp:', '')
    const messageBody    = formData['Body']?.trim()

    if (!incomingNumber || !messageBody) {
      return twimlResponse('')
    }

    console.log(`[Twilio] Message de ${incomingNumber}: ${messageBody}`)

    const supabase = await createClient()

    // 1. Trouver le contact par numéro de téléphone
    const normalized = incomingNumber.replace(/\s/g, '')
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .or(`phone.eq.${normalized},phone.eq.+${normalized}`)
      .limit(1)

    let contactId: string | null = contacts?.[0]?.id ?? null
    let contactName = contacts?.[0]
      ? `${contacts[0].first_name} ${contacts[0].last_name}`
      : incomingNumber

    // Créer le contact s'il n'existe pas
    if (!contactId) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const userId = users?.users?.[0]?.id
      if (userId) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            first_name: 'Inconnu',
            last_name: incomingNumber,
            phone: incomingNumber,
          })
          .select()
          .single()
        contactId = newContact?.id ?? null
      }
    }

    // 2. Trouver ou créer une conversation WhatsApp ouverte
    let conversationId: string | null = null
    if (contactId) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(1)

      conversationId = existing?.[0]?.id ?? null

      if (!conversationId) {
        const { data: users } = await supabase.auth.admin.listUsers()
        const userId = users?.users?.[0]?.id
        if (userId) {
          const { data: conv } = await supabase
            .from('conversations')
            .insert({
              user_id: userId,
              contact_id: contactId,
              channel: 'whatsapp',
              subject: `WhatsApp — ${contactName}`,
            })
            .select()
            .single()
          conversationId = conv?.id ?? null
        }
      }
    }

    // 3. Sauvegarder le message entrant
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: messageBody,
        metadata: { channel: 'whatsapp', from: incomingNumber },
      })
    }

    // 4. Récupérer l'historique de la conversation
    let history: Anthropic.MessageParam[] = []
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (msgs) {
        const filtered = msgs.filter(m => m.role === 'user' || m.role === 'assistant')
        history = filtered.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        // Déduplique les rôles consécutifs
        const clean: Anthropic.MessageParam[] = []
        for (const msg of history) {
          const last = clean[clean.length - 1]
          if (last?.role === msg.role) last.content += `\n\n${msg.content}`
          else clean.push({ ...msg })
        }
        history = clean
      }
    }

    if (history.length === 0 || history[history.length - 1]?.role !== 'user') {
      history.push({ role: 'user', content: messageBody })
    }

    // 5. Appel Claude
    const system = `${SYSTEM_PROMPT_DEFAULT}\n\nTu communiques via WhatsApp avec ${contactName}. Réponds de manière concise (max 3 phrases). Pas de formatage markdown.`

    const aiResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system,
      messages: history,
    })

    const replyText = aiResponse.content.find(b => b.type === 'text')?.text ?? "Je reviens vers vous rapidement."

    // 6. Sauvegarder la réponse
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: replyText,
        metadata: { channel: 'whatsapp', model: 'claude-opus-4-6' },
      })
    }

    // 7. Répondre via TwiML
    return twimlResponse(replyText)
  } catch (err) {
    console.error('[Twilio] Erreur:', err)
    return twimlResponse("Une erreur s'est produite. Notre équipe revient vers vous rapidement.")
  }
}

function twimlResponse(message: string, status = 200) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new Response(xml, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
