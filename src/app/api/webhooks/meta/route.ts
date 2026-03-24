import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
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
    const body = await req.json()
    console.log('[Meta] Payload reçu:', JSON.stringify(body, null, 2))

    // Meta envoie les changements dans body.entry[]
    const entries = body.entry ?? []

    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        if (change.field !== 'leadgen') continue

        const leadData = change.value
        await processMetaLead(leadData)
      }
    }

    return new Response('EVENT_RECEIVED', { status: 200 })
  } catch (err) {
    console.error('[Meta] Erreur webhook:', err)
    // Toujours répondre 200 à Meta pour éviter les retry
    return new Response('EVENT_RECEIVED', { status: 200 })
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

  // Extraire les champs du formulaire Meta
  const fields: Record<string, string> = {}
  for (const field of leadData.field_data ?? []) {
    fields[field.name] = field.values?.[0] ?? ''
  }

  const firstName = fields['first_name'] ?? fields['prénom'] ?? fields['prenom'] ?? 'Prospect'
  const lastName  = fields['last_name']  ?? fields['nom']    ?? 'Meta'
  const email     = fields['email']      ?? fields['e-mail'] ?? null
  const phone     = fields['phone_number'] ?? fields['téléphone'] ?? fields['telephone'] ?? null

  // 1. Récupérer user_id du premier utilisateur (admin)
  const { data: users } = await supabase.auth.admin.listUsers()
  const userId = users?.users?.[0]?.id
  if (!userId) {
    console.error('[Meta] Aucun utilisateur admin trouvé')
    return
  }

  // 2. Créer le contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company: fields['company'] ?? fields['entreprise'] ?? null,
      job_title: fields['job_title'] ?? fields['poste'] ?? null,
    })
    .select()
    .single()

  if (contactError) {
    console.error('[Meta] Erreur création contact:', contactError.message)
    return
  }

  // 3. Créer le lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      user_id: userId,
      contact_id: contact.id,
      title: `Lead Meta Ads — ${firstName} ${lastName}`,
      status: 'new',
      source: 'other', // 'meta_ads' si tu ajoutes la valeur à l'enum
      description: `Lead entrant via Meta Ads.\nPage ID: ${leadData.page_id ?? 'N/A'}\nForm ID: ${leadData.form_id ?? 'N/A'}`,
    })
    .select()
    .single()

  if (leadError) {
    console.error('[Meta] Erreur création lead:', leadError.message)
    return
  }

  // 4. Créer une conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      lead_id: lead.id,
      contact_id: contact.id,
      channel: 'email',
      subject: `Qualification — ${firstName} ${lastName}`,
    })
    .select()
    .single()

  if (convError || !conversation) {
    console.error('[Meta] Erreur création conversation:', convError?.message)
    return
  }

  // 5. Générer le premier message Claude
  const contextMsg = `Nouveau lead entrant via Meta Ads :
- Nom : ${firstName} ${lastName}
- Email : ${email ?? 'non renseigné'}
- Téléphone : ${phone ?? 'non renseigné'}
- Données formulaire : ${JSON.stringify(fields, null, 2)}

Génère un premier message de prise de contact chaleureux et professionnel pour qualifier ce prospect.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT_DEFAULT,
      messages: [{ role: 'user', content: contextMsg }],
    })

    const aiText = response.content.find(b => b.type === 'text')?.text ?? ''

    // 6. Sauvegarder le message Claude dans la conversation
    if (aiText) {
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiText,
        metadata: { source: 'meta_webhook', model: 'claude-opus-4-6' },
      })
    }

    console.log(`[Meta] Lead ${firstName} ${lastName} traité — conversation ${conversation.id}`)
  } catch (err) {
    console.error('[Meta] Erreur Claude:', err)
  }
}
