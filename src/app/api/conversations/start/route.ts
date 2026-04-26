import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { findOrCreateGHLConversation, sendGHLMessage } from '@/lib/ghl'

export const dynamic = 'force-dynamic'

type Body = {
  contactId:   string
  contactName: string
  contactPhone?: string | null
  contactEmail?: string | null
  contactCompany?: string | null
  channel:     'WhatsApp' | 'SMS' | 'Email'
  message?:    string
}

export async function POST(req: Request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Body
  try {
    body = await req.json() as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { contactId, contactName, contactPhone, contactEmail, contactCompany, channel, message } = body

  if (!contactId || !channel) {
    return NextResponse.json({ error: 'contactId et channel requis' }, { status: 400 })
  }

  try {
    // Trouver ou créer la conversation GHL
    const conversationId = await findOrCreateGHLConversation(contactId)

    // Envoyer le premier message si fourni
    if (message?.trim()) {
      try {
        await sendGHLMessage(conversationId, message.trim(), channel, undefined, contactId)
      } catch (e) {
        console.error('[conversations/start] sendGHLMessage failed:', e)
        // On continue même si l'envoi échoue — la conversation existe
      }
    }

    // Retourner les infos pour construire la conversation dans le state
    return NextResponse.json({
      conversation: {
        id:              conversationId,
        user_id:         'ghl',
        lead_id:         null,
        contact_id:      contactId,
        channel:         channel === 'WhatsApp' ? 'whatsapp' : channel === 'SMS' ? 'sms' : 'email',
        subject:         `${channel} — ${contactName}`,
        summary:         null,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
        contact_name:    contactName,
        contact_company: contactCompany ?? null,
        contact_phone:   contactPhone ?? null,
        last_message:    message?.trim() ?? undefined,
        last_message_at: new Date().toISOString(),
        unread:          0,
        assigned_to:     null,
        ai_enabled:      true,
        source:          null,
        pipeline_stage_id:  null,
        opportunity_status: null,
      }
    })
  } catch (err) {
    console.error('[conversations/start]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
