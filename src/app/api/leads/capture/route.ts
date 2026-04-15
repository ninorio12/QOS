import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createGHLContact, createGHLOpportunity } from '@/lib/ghl'
import { env } from '@/lib/env'

function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRole())
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, phone, email } = await req.json() as {
      firstName: string
      lastName:  string
      phone:     string
      email?:    string
    }

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // ── 1. Créer contact GHL ─────────────────────────────────────────────────
    const ghlContactId = await createGHLContact({ firstName, lastName, phone, email })

    // ── 2. Créer opportunité GHL pipeline ACQUISITION ────────────────────────
    const pipelineId      = process.env.GHL_ACQUISITION_PIPELINE_ID ?? ''
    const pipelineStageId = process.env.GHL_NOUVEAU_STAGE_ID ?? ''
    if (pipelineId && pipelineStageId) {
      await createGHLOpportunity({ contactId: ghlContactId, firstName, lastName, pipelineId, pipelineStageId })
    }

    // ── 3. Sync Supabase ────────────────────────────────────────────────────
    const { data: users } = await supabase.auth.admin.listUsers()
    const userId = users?.users?.[0]?.id
    if (!userId) throw new Error('Aucun utilisateur admin Supabase trouvé')

    // Contact Supabase — cherche d'abord par ghl_contact_id, sinon crée
    let contact: { id: string }
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('ghl_contact_id', ghlContactId)
      .maybeSingle()

    if (existing) {
      contact = existing
    } else {
      const { data: created, error: contactErr } = await supabase
        .from('contacts')
        .insert({ user_id: userId, first_name: firstName, last_name: lastName, phone, email: email ?? null, ghl_contact_id: ghlContactId })
        .select('id')
        .single()
      if (contactErr) {
        console.error('[capture] Supabase contact:', contactErr.message)
        throw new Error('supabase_contact')
      }
      contact = created
    }

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({ user_id: userId, contact_id: contact.id, title: `Lead formulaire — ${firstName} ${lastName}`, status: 'new', source: 'formulaire' })
      .select('id')
      .single()
    if (leadErr) {
      console.error('[capture] Supabase lead:', leadErr.message)
      throw new Error('supabase_lead')
    }

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: userId, lead_id: lead.id, contact_id: contact.id, channel: 'whatsapp', subject: `Qualification — ${firstName} ${lastName}`, source: 'formulaire', ai_enabled: true })
      .select('id')
      .single()
    if (convErr) {
      console.error('[capture] Supabase conversation:', convErr.message)
      throw new Error('supabase_conversation')
    }

    // ── 4. Trigger Kai via gateway ───────────────────────────────────────────
    const gatewayUrl = process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:18789'
    const triggerMsg = [
      'NOUVEAU_LEAD',
      `Prénom: ${firstName}`,
      `Nom: ${lastName}`,
      `Téléphone: ${phone}`,
      `Email: ${email ?? 'non renseigné'}`,
      `GHL Contact ID: ${ghlContactId}`,
      `Supabase Conv ID: ${conversation.id}`,
      'ACTION REQUISE: Contacter immédiatement via WhatsApp GHL.',
    ].join(' | ')

    try {
      await fetch(`${gatewayUrl}/sessions/kai/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: triggerMsg }),
        signal:  AbortSignal.timeout(5000),
      })
    } catch (err) {
      console.error('[capture] Kai trigger échoué (gateway indisponible):', err)
    }

    return NextResponse.json({ ok: true, contactId: contact.id, conversationId: conversation.id })
  } catch (err) {
    console.error('[/api/leads/capture]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
