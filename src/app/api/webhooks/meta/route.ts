import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
import { sendWhatsApp } from '@/lib/twilio'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── GET : vérification Meta Webhook ───────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Meta] Webhook vérifié avec succès')
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// ─── POST : réception d'un lead Meta Ads ───────────────────────
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Vérification signature HMAC si META_APP_SECRET configuré
    const appSecret = process.env.META_APP_SECRET
    if (appSecret) {
      const signature = req.headers.get('x-hub-signature-256') ?? ''
      const expected  = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
      if (signature !== expected) {
        console.warn('[Meta] Signature invalide')
        return new Response('Forbidden', { status: 403 })
      }
    }

    const body = JSON.parse(rawBody)
    console.log('[Meta] Payload reçu:', JSON.stringify(body, null, 2))

    const entries = body.entry ?? []
    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        if (change.field !== 'leadgen') continue
        await processMetaLead(change.value)
      }
    }

    return new Response('EVENT_RECEIVED', { status: 200 })
  } catch (err) {
    console.error('[Meta] Erreur webhook:', err)
    return new Response('EVENT_RECEIVED', { status: 200 })
  }
}

// ─── Fetch lead data from Graph API if field_data missing ──────
async function fetchLeadFromGraphAPI(leadgenId: string): Promise<{ name: string; values: string[] }[]> {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) return []

  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data&access_token=${accessToken}`
    const res  = await fetch(url)
    const data = await res.json() as { field_data?: { name: string; values: string[] }[] }
    return data.field_data ?? []
  } catch (err) {
    console.error('[Meta] Erreur Graph API:', err)
    return []
  }
}

// ─── Traitement du lead Meta ────────────────────────────────────
async function processMetaLead(leadData: {
  leadgen_id?: string
  page_id?: string
  form_id?: string
  field_data?: { name: string; values: string[] }[]
  created_time?: number
}) {
  const supabase = await createClient()

  // Récupère field_data : depuis le payload ou via Graph API
  let rawFields = leadData.field_data ?? []
  if (rawFields.length === 0 && leadData.leadgen_id) {
    rawFields = await fetchLeadFromGraphAPI(leadData.leadgen_id)
  }

  const fields: Record<string, string> = {}
  for (const field of rawFields) {
    fields[field.name] = field.values?.[0] ?? ''
  }

  const firstName = fields['first_name'] ?? fields['prénom']    ?? fields['prenom']    ?? 'Prospect'
  const lastName  = fields['last_name']  ?? fields['nom']       ?? 'Meta'
  const email     = fields['email']      ?? fields['e-mail']    ?? null
  const phone     = fields['phone_number'] ?? fields['téléphone'] ?? fields['telephone'] ?? null

  // 1. Récupérer user_id admin
  const { data: users } = await supabase.auth.admin.listUsers()
  const userId = users?.users?.[0]?.id
  if (!userId) {
    console.error('[Meta] Aucun utilisateur admin trouvé')
    return
  }

  // 2. Déduplication : chercher contact existant par email ou téléphone
  let contactId: string | null = null
  if (email) {
    const { data: byEmail } = await supabase.from('contacts').select('id').eq('email', email).limit(1)
    contactId = byEmail?.[0]?.id ?? null
  }
  if (!contactId && phone) {
    const normalized = phone.replace(/\s/g, '')
    const { data: byPhone } = await supabase
      .from('contacts').select('id')
      .or(`phone.eq.${normalized},phone.eq.+${normalized}`)
      .limit(1)
    contactId = byPhone?.[0]?.id ?? null
  }

  // 3. Créer le contact s'il n'existe pas
  if (!contactId) {
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        company:   fields['company']   ?? fields['entreprise'] ?? null,
        job_title: fields['job_title'] ?? fields['poste']      ?? null,
      })
      .select('id')
      .single()

    if (contactError) {
      console.error('[Meta] Erreur création contact:', contactError.message)
      return
    }
    contactId = newContact.id
  }

  // 4. Créer le lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id:    userId,
      contact_id: contactId,
      title:      `Lead Meta Ads — ${firstName} ${lastName}`,
      status:     'new',
      source:     'other',
      description: [
        `Lead entrant via Meta Ads.`,
        `Page ID : ${leadData.page_id  ?? 'N/A'}`,
        `Form ID : ${leadData.form_id  ?? 'N/A'}`,
        `Lead ID : ${leadData.leadgen_id ?? 'N/A'}`,
        Object.keys(fields).length > 0
          ? `\nDonnées formulaire :\n${Object.entries(fields).map(([k,v]) => `  ${k}: ${v}`).join('\n')}`
          : '',
      ].join('\n'),
    })
    .select('id')
    .single()

  if (leadError) {
    console.error('[Meta] Erreur création lead:', leadError.message)
    return
  }

  // 5. Créer la conversation (whatsapp si téléphone, sinon email)
  const channel = phone ? 'whatsapp' : 'email'
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id:    userId,
      lead_id:    lead.id,
      contact_id: contactId,
      channel,
      subject:    `Qualification — ${firstName} ${lastName}`,
      source:     'meta',
      ai_enabled: true,
    })
    .select('id')
    .single()

  if (convError || !conversation) {
    console.error('[Meta] Erreur création conversation:', convError?.message)
    return
  }

  // 6. Générer le premier message Claude
  const contextMsg = [
    `Nouveau lead entrant via Meta Ads :`,
    `- Nom : ${firstName} ${lastName}`,
    `- Email : ${email ?? 'non renseigné'}`,
    `- Téléphone : ${phone ?? 'non renseigné'}`,
    Object.keys(fields).length > 0 ? `- Données formulaire : ${JSON.stringify(fields)}` : '',
    ``,
    `Génère un premier message de prise de contact chaleureux et professionnel pour qualifier ce prospect.`,
    phone ? `Le message sera envoyé via WhatsApp donc reste concis (3 phrases max, pas de markdown).` : '',
  ].filter(Boolean).join('\n')

  let aiText = ''
  try {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 512,
      system:     SYSTEM_PROMPT_DEFAULT,
      messages:   [{ role: 'user', content: contextMsg }],
    })
    aiText = response.content.find(b => b.type === 'text')?.text ?? ''

    if (aiText) {
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        role:            'assistant',
        content:         aiText,
        metadata:        { source: 'meta_webhook', model: 'claude-opus-4-6', channel },
      })
    }
  } catch (err) {
    console.error('[Meta] Erreur Claude:', err)
  }

  // 7. Envoyer le message Claude via WhatsApp si téléphone disponible
  if (phone && aiText) {
    try {
      await sendWhatsApp(phone, aiText)
      console.log(`[Meta] WhatsApp envoyé à ${phone}`)
    } catch (err) {
      console.error('[Meta] Erreur envoi WhatsApp:', err)
    }
  }

  console.log(`[Meta] Lead ${firstName} ${lastName} traité — conv ${conversation.id} (${channel})`)
}
