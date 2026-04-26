import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createGHLContact, createGHLOpportunity, closeOpenOpportunities } from '@/lib/ghl'
import { sendWhatsApp } from '@/lib/twilio'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'
import crypto from 'crypto'

function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRole())
}

// ── Contrat de handoff minimal ────────────────────────────────────────────────
type HandoffPayload = {
  trace_id:       string
  contact_id:     string        // GHL contact ID
  stage:          string
  timestamp:      string
  opportunity_id?: string
  conversation_id?: string
}

function buildHandoff(fields: HandoffPayload): HandoffPayload {
  const missing = (['trace_id', 'contact_id', 'stage', 'timestamp'] as const)
    .filter(k => !fields[k]?.trim())
  if (missing.length > 0) {
    throw new Error(`handoff_invalid: champs manquants — ${missing.join(', ')}`)
  }
  return fields
}

// ── Kai trigger avec 1 retry + backoff 500ms ──────────────────────────────────
function triggerKai(gatewayUrl: string, payload: HandoffPayload): void {
  const body = JSON.stringify({ message: formatKaiMessage(payload), handoff: payload })

  const attempt = () =>
    fetch(`${gatewayUrl}/sessions/kai/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal:  AbortSignal.timeout(5000),
    })

  attempt().catch(async (err1) => {
    log.warn('kai_trigger_retry', `Tentative 1 échouée: ${String(err1)}`, {
      trace_id:   payload.trace_id,
      contact_id: payload.contact_id,
      stage:      payload.stage,
    })
    await new Promise(r => setTimeout(r, 500))
    attempt().catch((err2) => {
      log.error('kai_trigger_failed', `Retry également échoué: ${String(err2)}`, {
        trace_id:   payload.trace_id,
        contact_id: payload.contact_id,
        stage:      payload.stage,
      })
    })
  })
}

function formatKaiMessage(p: HandoffPayload): string {
  return [
    'NOUVEAU_LEAD',
    `GHL Contact ID: ${p.contact_id}`,
    p.opportunity_id  ? `GHL Opportunity ID: ${p.opportunity_id}` : null,
    p.conversation_id ? `Supabase Conv ID: ${p.conversation_id}` : null,
    `Trace ID: ${p.trace_id}`,
    'ACTION REQUISE: Contacter immédiatement via WhatsApp GHL.',
  ].filter(Boolean).join(' | ')
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const trace_id = crypto.randomBytes(6).toString('hex')

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

    log.ok('lead_capture_start', { trace_id, detail: `${firstName} ${lastName} ${phone}` })

    const supabase = supabaseAdmin()

    // ── 1. Créer contact GHL ─────────────────────────────────────────────────
    const ghlContactId = await createGHLContact({ firstName, lastName, phone, email })
    log.ok('lead_ghl_contact_created', { trace_id, contact_id: ghlContactId })

    // ── 2. Créer opportunité GHL pipeline ACQUISITION ────────────────────────
    const pipelineId      = process.env.GHL_ACQUISITION_PIPELINE_ID ?? ''
    const pipelineStageId = process.env.GHL_NOUVEAU_STAGE_ID ?? ''
    let opportunityId: string | undefined
    if (pipelineId && pipelineStageId) {
      try {
        // Fermer les opportunités ouvertes existantes pour éviter doublons pipeline
        await closeOpenOpportunities(ghlContactId)
        const opp = await createGHLOpportunity({ contactId: ghlContactId, firstName, lastName, pipelineId, pipelineStageId })
        opportunityId = (opp as { id?: string })?.id
        log.ok('lead_ghl_opportunity_created', { trace_id, contact_id: ghlContactId, detail: opportunityId })
      } catch (oppErr) {
        log.warn('lead_ghl_opportunity_failed', String(oppErr), { trace_id, contact_id: ghlContactId })
      }
    }

    // ── 3. Sync Supabase ────────────────────────────────────────────────────
    const { data: users } = await supabase.auth.admin.listUsers()
    const userId = users?.users?.[0]?.id
    if (!userId) throw new Error('Aucun utilisateur admin Supabase trouvé')

    let contact: { id: string }
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('ghl_contact_id', ghlContactId)
      .maybeSingle()

    if (existing) {
      contact = existing
      log.ok('lead_supabase_contact_existing', { trace_id, contact_id: ghlContactId })
    } else {
      const { data: created, error: contactErr } = await supabase
        .from('contacts')
        .insert({ user_id: userId, first_name: firstName, last_name: lastName, phone, email: email ?? null, ghl_contact_id: ghlContactId })
        .select('id')
        .single()
      if (contactErr) {
        log.error('lead_supabase_contact_failed', contactErr.message, { trace_id, contact_id: ghlContactId })
        throw new Error('supabase_contact')
      }
      contact = created
      log.ok('lead_supabase_contact_created', { trace_id, contact_id: ghlContactId })
    }

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({ user_id: userId, contact_id: contact.id, title: `Lead formulaire — ${firstName} ${lastName}`, status: 'new', source: 'formulaire', pipeline_name: 'Acquisition' })
      .select('id')
      .single()
    if (leadErr) {
      log.error('lead_supabase_lead_failed', leadErr.message, { trace_id, contact_id: ghlContactId })
      throw new Error('supabase_lead')
    }

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: userId, lead_id: lead.id, contact_id: contact.id, channel: 'whatsapp', subject: `Qualification — ${firstName} ${lastName}`, source: 'formulaire', ai_enabled: true })
      .select('id')
      .single()
    if (convErr) {
      log.error('lead_supabase_conv_failed', convErr.message, { trace_id, contact_id: ghlContactId })
      throw new Error('supabase_conversation')
    }

    log.ok('lead_supabase_synced', { trace_id, contact_id: ghlContactId, detail: `conv=${conversation.id}` })

    // ── 4. WhatsApp qualification via Twilio ─────────────────────────────────
    try {
      const waMsg = [
        `Bonjour ${firstName} 👋`,
        `Je suis Kai, l'assistant de notre équipe.`,
        `J'ai bien reçu votre demande — je vous contacte pour avancer rapidement.`,
        `Quel type de travaux souhaitez-vous réaliser ? (ex: peinture, rénovation, façade…)`,
      ].join('\n')
      await sendWhatsApp(phone, waMsg)
      log.ok('lead_whatsapp_sent', { trace_id, contact_id: ghlContactId })
    } catch (waErr) {
      log.warn('lead_whatsapp_failed', String(waErr), { trace_id, contact_id: ghlContactId })
    }

    // ── 5. Valider le handoff et trigger Kai (best-effort) ──────────────────
    const handoff = buildHandoff({
      trace_id,
      contact_id:      ghlContactId,
      stage:           'qualification',
      timestamp:       new Date().toISOString(),
      opportunity_id:  opportunityId,
      conversation_id: conversation.id,
    })

    const gatewayUrl = process.env.GATEWAY_INTERNAL_URL ?? ''
    if (gatewayUrl) {
      triggerKai(gatewayUrl, handoff)
      log.ok('lead_kai_triggered', { trace_id, contact_id: ghlContactId, stage: 'qualification' })
    }

    return NextResponse.json({ ok: true, trace_id, contactId: contact.id, conversationId: conversation.id })
  } catch (err) {
    log.error('lead_capture_error', String(err), { trace_id })
    return NextResponse.json({ error: String(err), trace_id }, { status: 500 })
  }
}
