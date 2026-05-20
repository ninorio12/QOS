import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()

const GHL_KEY  = process.env.GHL_API_KEY!
const GHL_BASE = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
const GHL_LOC  = process.env.GHL_LOCATION_ID!
const HEADERS  = { 'Authorization': `Bearer ${GHL_KEY}`, 'Version': '2021-07-28' }

async function ghl(path: string) {
  const r = await fetch(`${GHL_BASE}${path}`, { headers: HEADERS })
  return r.ok ? r.json() : null
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== (process.env.HERMES_SHARED_SECRET ?? 'hermes-qos-2026')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const demoContactId    = '3kCGXTpVDUebEZAWwF4X'
  const demoOpportunityId = 'qFVSHydNcb0VypbCgria'
  const demoAppointmentId = 'cQ8nInILdABMwfrxwytx'
  const demoQuoteId      = 'dd399eb3-7c05-4e33-a905-f61c1a126643'

  // Fetch all in parallel
  const [contact, opportunity, appointment, quoteRes] = await Promise.allSettled([
    ghl(`/contacts/${demoContactId}`),
    ghl(`/opportunities/${demoOpportunityId}`),
    ghl(`/calendars/events/${demoAppointmentId}`),
    supabase.from('devis').select('id,statut,notes,montant_ht,created_at').eq('id', demoQuoteId).single(),
  ])

  const c   = contact.status      === 'fulfilled' ? contact.value?.contact       : null
  const opp = opportunity.status  === 'fulfilled' ? opportunity.value?.opportunity : null
  const apt = appointment.status  === 'fulfilled' ? appointment.value             : null
  const q   = quoteRes.status     === 'fulfilled' ? (quoteRes.value as any).data  : null

  // Human validation flag: statut natif DB (migration 20260416)
  const humanValidationRequired = q?.statut === 'pending_human_validation'

  // Alert: devis non validé depuis > 60 min
  let quoteValidationAlert = null
  if (humanValidationRequired && q?.created_at) {
    const ageMin = (Date.now() - new Date(q.created_at).getTime()) / 60000
    if (ageMin > 60) quoteValidationAlert = `Devis non validé depuis ${Math.round(ageMin)} min`
  }

  return NextResponse.json({
    demo_mode: process.env.DEMO_MODE === 'true',
    timestamp: new Date().toISOString(),
    contact: {
      id:     demoContactId,
      name:   c?.name ?? null,
      email:  c?.email ?? null,
      tags:   c?.tags ?? [],
      ok:     !!c,
    },
    opportunity: {
      id:    demoOpportunityId,
      name:  opp?.name ?? null,
      stage: opp?.pipelineStageId ?? null,
      status: opp?.status ?? null,
      ok:    !!opp,
    },
    appointment: {
      id:       demoAppointmentId,
      status:   apt?.status ?? null,
      start_at: apt?.startTime ?? null,
      ok:       !!apt,
    },
    quote: {
      id:                        demoQuoteId,
      statut:                    q?.statut ?? null,
      human_validation_required: humanValidationRequired,
      validation_alert:          quoteValidationAlert,
      montant_ht:                q?.montant_ht ?? null,
      ok:                        !!q,
    },
    alerts: [quoteValidationAlert].filter(Boolean),
    go_no_go: (!c || !opp || !apt || !q) ? 'no-go' : 'go',
  })
}
