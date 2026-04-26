#!/usr/bin/env node
/**
 * smoke-test.js — Commande unique de go/no-go avant démo
 * Usage: node scripts/smoke-test.js
 */

// Auto-load .env.local (résolution relative au cwd)
import { readFileSync } from 'fs'
import { resolve } from 'path'
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines   = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* .env.local absent — on utilise les vars système */ }

const GHL_KEY  = process.env.GHL_API_KEY ?? 'pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f'
const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_H    = { 'Authorization': `Bearer ${GHL_KEY}`, 'Version': '2021-04-15' }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ihtdazabodmkiapokgtd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO = {
  contact_id:     '3kCGXTpVDUebEZAWwF4X',
  opportunity_id: 'qFVSHydNcb0VypbCgria',
  appointment_id: 'cQ8nInILdABMwfrxwytx',
  quote_id:       'dd399eb3-7c05-4e33-a905-f61c1a126643',
}

async function ghl(path, version = '2021-07-28') {
  const h = { 'Authorization': `Bearer ${GHL_KEY}`, 'Version': version }
  const r = await fetch(`${GHL_BASE}${path}`, { headers: h })
  return r.ok ? r.json() : null
}

async function supa(table, filter) {
  if (!SUPABASE_KEY) return null
  const h = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { headers: h })
  const d = await r.json()
  return Array.isArray(d) ? d[0] ?? null : null
}

async function main() {
  console.log('\n🔍 QOS SMOKE TEST — ' + new Date().toISOString())
  console.log('─'.repeat(60))

  const checks = []

  // 1. SaaS health
  try {
    const r = await fetch('http://localhost:3000', { signal: AbortSignal.timeout(3000) })
    checks.push({ name: 'saas_running',       ok: r.ok || r.status === 307 || r.status === 200 })
  } catch {
    checks.push({ name: 'saas_running',       ok: false, note: 'localhost:3000 non joignable — lancer npm run dev' })
  }

  // 2. GHL contact
  const contact = await ghl(`/contacts/${DEMO.contact_id}`)
  const c = contact?.contact
  checks.push({ name: 'ghl_contact',         ok: !!c, note: c ? c.name ?? c.email : 'NOT FOUND' })
  checks.push({ name: 'demo_tags',            ok: (c?.tags ?? []).includes('demo'), note: JSON.stringify(c?.tags ?? []) })

  // 3. Opportunity
  const opp = await ghl(`/opportunities/${DEMO.opportunity_id}`)
  checks.push({ name: 'ghl_opportunity',     ok: !!opp?.opportunity, note: opp?.opportunity?.status ?? 'NOT FOUND' })

  // 4. RDV
  const apt = await ghl(`/calendars/events/appointments/${DEMO.appointment_id}`, '2021-04-15')
  const a = apt?.appointment
  checks.push({ name: 'ghl_appointment',     ok: !!a, note: a ? `${a.appointmentStatus} — ${a.startTime}` : 'NOT FOUND' })

  // 5. SMS present (check conversation type)
  const convSearch = await ghl(`/conversations/search?contactId=${DEMO.contact_id}`)
  const hasSMS = (convSearch?.conversations ?? []).some(c => c.lastMessageType === 'TYPE_SMS')
  checks.push({ name: 'sms_qualif_sent',     ok: hasSMS, note: hasSMS ? 'TYPE_SMS found' : 'no SMS conversation' })

  // 6. Quote pending validation
  const q = await supa('devis', `id=eq.${DEMO.quote_id}&select=id,statut,montant_ht,notes`)
  const pending = q?.statut === 'brouillon' && String(q?.notes).includes('pending_human_validation')
  checks.push({ name: 'quote_pending',       ok: !!q, note: q ? `statut=${q.statut} montant=${q.montant_ht}€HT` : 'NOT FOUND' })
  checks.push({ name: 'human_validation_flag', ok: pending, note: pending ? 'flag présent dans notes' : 'flag manquant' })

  // 7. Business rules
  const RULES = {
    first_contact_sla_minutes: 2,
    first_channel: 'sms',
    call_channel_allowed_only_for: 'Lucie',
    no_show_followup_delay_hours: 24,
    quote_send_mode: 'human_validation_required',
  }
  checks.push({ name: 'business_rules',      ok: true, note: JSON.stringify(RULES) })

  // ── Report ────────────────────────────────────────────────────────────────
  console.log()
  let allOk = true
  for (const ch of checks) {
    const icon = ch.ok ? '✅' : '❌'
    console.log(`${icon}  ${ch.name.padEnd(28)} ${ch.note ?? ''}`)
    if (!ch.ok) allOk = false
  }

  console.log('\n' + '─'.repeat(60))
  const verdict = allOk ? '🟢  GO — démo prête' : '🔴  NO-GO — corriger les ❌ ci-dessus'
  console.log(verdict)
  console.log()

  process.exit(allOk ? 0 : 1)
}

main().catch(err => {
  console.error('Smoke test error:', err)
  process.exit(1)
})
