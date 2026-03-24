import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'

// ─── POST : confirmation RDV Cal.com ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Vérification optionnelle du secret Cal.com
    const calSecret = process.env.CAL_WEBHOOK_SECRET
    if (calSecret) {
      const signature = req.headers.get('X-Cal-Signature-256') ?? ''
      // Validation basique de présence de signature
      if (!signature) {
        console.warn('[Cal] Signature manquante')
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    console.log('[Cal] Payload reçu:', JSON.stringify(body, null, 2))

    const triggerEvent = body.triggerEvent as string
    if (triggerEvent !== 'BOOKING_CREATED' && triggerEvent !== 'BOOKING_CONFIRMED') {
      console.log(`[Cal] Événement ignoré: ${triggerEvent}`)
      return Response.json({ ok: true })
    }

    const payload = body.payload ?? {}
    const attendees: { name?: string; email?: string; phoneNumber?: string }[] = payload.attendees ?? []
    const organizer = payload.organizer ?? {}
    const startTime: string = payload.startTime ?? ''
    const title: string = payload.title ?? 'Rendez-vous'
    const uid: string = payload.uid ?? ''

    // Extraire les infos du premier attendee (le prospect)
    const attendee = attendees.find(a => a.email !== organizer.email) ?? attendees[0]
    if (!attendee) {
      console.warn('[Cal] Aucun attendee trouvé')
      return Response.json({ ok: true })
    }

    const attendeeName  = attendee.name ?? 'Prospect'
    const attendeeEmail = attendee.email ?? null
    const attendeePhone = attendee.phoneNumber ?? null

    const supabase = await createClient()

    // 1. Trouver le contact par email ou téléphone
    let contactId: string | null = null

    if (attendeeEmail) {
      const { data: byEmail } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', attendeeEmail)
        .limit(1)
      contactId = byEmail?.[0]?.id ?? null
    }

    if (!contactId && attendeePhone) {
      const normalized = attendeePhone.replace(/\s/g, '')
      const { data: byPhone } = await supabase
        .from('contacts')
        .select('id')
        .or(`phone.eq.${normalized},phone.eq.+${normalized}`)
        .limit(1)
      contactId = byPhone?.[0]?.id ?? null
    }

    // 2. Créer le contact s'il n'existe pas
    if (!contactId) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const userId = users?.users?.[0]?.id
      if (userId) {
        const nameParts = attendeeName.split(' ')
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            first_name: nameParts[0] ?? 'Prospect',
            last_name: nameParts.slice(1).join(' ') || 'Cal.com',
            email: attendeeEmail,
            phone: attendeePhone,
          })
          .select()
          .single()
        contactId = newContact?.id ?? null
      }
    }

    // 3. Trouver le lead associé et le passer à "rdv"
    if (contactId) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)

      const leadId = leads?.[0]?.id
      if (leadId) {
        await supabase
          .from('leads')
          .update({ status: 'rdv', updated_at: new Date().toISOString() })
          .eq('id', leadId)

        console.log(`[Cal] Lead ${leadId} mis à jour → statut "rdv"`)

        // 4. Enregistrer le RDV dans la conversation
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)

        const conversationId = conversations?.[0]?.id
        if (conversationId) {
          const rdvDate = startTime
            ? new Date(startTime).toLocaleString('fr-FR', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'Europe/Paris',
              })
            : 'date non précisée'

          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: `RDV confirmé via Cal.com\n📅 ${rdvDate}\n👤 ${attendeeName}\nRéférence : ${uid}`,
            metadata: { source: 'cal_webhook', event: triggerEvent, uid },
          })
        }
      }
    }

    // 5. Envoyer confirmation WhatsApp si numéro disponible
    if (attendeePhone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken  = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM

      if (accountSid && authToken && fromNumber) {
        const client = twilio(accountSid, authToken)

        const rdvDate = startTime
          ? new Date(startTime).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Europe/Paris',
            })
          : 'la date convenue'

        const message = `Bonjour ${attendeeName} 👋\n\nVotre rendez-vous "${title}" est confirmé pour le ${rdvDate}.\n\nNous avons hâte de vous rencontrer ! Si vous avez des questions, répondez à ce message.\n\nÀ bientôt,\nL'équipe Qorpo`

        const toNumber = attendeePhone.startsWith('+')
          ? attendeePhone
          : `+${attendeePhone}`

        try {
          await client.messages.create({
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${toNumber}`,
            body: message,
          })
          console.log(`[Cal] WhatsApp envoyé à ${toNumber}`)
        } catch (smsErr) {
          console.error('[Cal] Erreur envoi WhatsApp:', smsErr)
        }
      }
    }

    console.log(`[Cal] RDV traité — ${attendeeName} (${attendeeEmail ?? attendeePhone})`)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[Cal] Erreur webhook:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
