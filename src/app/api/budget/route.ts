import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// ─── Coûts fixes mensuels (€) — configurables via env ───────────────────────
const MONTHLY = {
  supabase:    parseFloat(process.env.COST_SUPABASE_MONTHLY    ?? '25'),
  hetzner:     parseFloat(process.env.COST_HETZNER_MONTHLY     ?? '10'),
  ghl:         parseFloat(process.env.COST_GHL_MONTHLY         ?? '90'),
  n8n:         parseFloat(process.env.COST_N8N_MONTHLY         ?? '20'),
  vercel:      parseFloat(process.env.COST_VERCEL_MONTHLY      ?? '0'),
  apitemplate: parseFloat(process.env.COST_APITEMPLATE_MONTHLY ?? '0'),
}

// Prix Claude Opus 4 (input $15/MTok, output $75/MTok → ~$0.003/message moyen)
const CLAUDE_COST_PER_MSG   = 0.003
const CLAUDE_COST_PER_DEVIS = 0.05   // ~2000 tokens

function getDateRange(period: string) {
  const now = new Date()
  const end = now.toISOString().split('T')[0]!
  let start = new Date(now)

  if (period === 'week') {
    start.setDate(now.getDate() - 7)
  } else if (period === 'month') {
    start.setDate(1)
  } else {
    start.setMonth(now.getMonth() - 3)
  }

  const startDate = start.toISOString().split('T')[0]!
  const days = Math.ceil((now.getTime() - start.getTime()) / 86_400_000)
  return { startDate, endDate: end, days }
}

/** Proratise un coût mensuel sur la période sélectionnée */
function prorate(monthly: number, days: number) {
  return parseFloat(((monthly / 30) * days).toFixed(2))
}

// ─── Twilio Usage API ─────────────────────────────────────────────────────────

async function getTwilioUsage(startDate: string, endDate: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return { sms: 0, calls: 0, whatsapp: 0, total: 0 }

  try {
    const auth   = Buffer.from(`${sid}:${token}`).toString('base64')
    const params = new URLSearchParams({ StartDate: startDate, EndDate: endDate })
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Usage/Records.json?${params}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
    )
    if (!res.ok) return { sms: 0, calls: 0, whatsapp: 0, total: 0 }

    const data = await res.json() as { usage_records: { category: string; price: string }[] }
    let sms = 0, calls = 0, whatsapp = 0

    for (const r of data.usage_records ?? []) {
      const price = parseFloat(r.price ?? '0')
      if (r.category?.startsWith('sms'))       sms      += price
      if (r.category?.startsWith('calls'))     calls    += price
      if (r.category?.includes('whatsapp'))    whatsapp += price
    }
    return { sms, calls, whatsapp, total: sms + calls + whatsapp }
  } catch {
    return { sms: 0, calls: 0, whatsapp: 0, total: 0 }
  }
}

// ─── Hetzner API ──────────────────────────────────────────────────────────────

async function getHetznerCost(startDate: string, endDate: string) {
  const token = process.env.HETZNER_API_TOKEN
  if (!token) return { amount: MONTHLY.hetzner, note: 'Coût estimé (API token manquant)' }

  try {
    const res = await fetch('https://api.hetzner.cloud/v1/servers', {
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    })
    if (!res.ok) return { amount: MONTHLY.hetzner, note: 'Coût estimé' }

    const data = await res.json() as { servers: { server_type: { prices: { price_monthly: { gross: string } }[] } }[] }
    let monthly = 0
    for (const s of data.servers ?? []) {
      const price = s.server_type?.prices?.[0]?.price_monthly?.gross
      if (price) monthly += parseFloat(price)
    }
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000)
    return { amount: parseFloat(prorate(monthly || MONTHLY.hetzner, days).toFixed(2)), note: `${data.servers?.length ?? 0} serveur(s)` }
  } catch {
    return { amount: MONTHLY.hetzner, note: 'Coût estimé' }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') ?? 'month'
  const { startDate, endDate, days } = getDateRange(period)

  const supabase = await createClient()

  // Claude — messages IA
  const { count: claudeMessages } = await supabase
    .from('messages').select('*', { count: 'exact', head: true })
    .eq('role', 'assistant')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)

  // Claude — devis générés
  const { count: devisCount } = await supabase
    .from('devis').select('*', { count: 'exact', head: true })
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)

  // APITemplate — PDF envoyés
  const { count: devisEnvoyes } = await supabase
    .from('devis').select('*', { count: 'exact', head: true })
    .eq('statut', 'envoyé')
    .gte('envoye_le', `${startDate}T00:00:00Z`)
    .lte('envoye_le', `${endDate}T23:59:59Z`)

  const claudeCount = claudeMessages ?? 0
  const devisGen    = devisCount ?? 0
  const pdfCount    = devisEnvoyes ?? 0

  const claudeCost      = claudeCount * CLAUDE_COST_PER_MSG + devisGen * CLAUDE_COST_PER_DEVIS
  const apitemplateCost = pdfCount * 0.005

  const [twilio, hetzner] = await Promise.all([
    getTwilioUsage(startDate, endDate),
    getHetznerCost(startDate, endDate),
  ])

  const services = {
    claude: {
      label:   'Claude API',
      cost:    parseFloat(claudeCost.toFixed(4)),
      details: `${claudeCount} réponses IA · ${devisGen} devis générés`,
      type:    'usage' as const,
    },
    twilio: {
      label:   'Twilio',
      cost:    parseFloat(twilio.total.toFixed(4)),
      details: `SMS ${twilio.sms.toFixed(2)}€ · Appels ${twilio.calls.toFixed(2)}€ · WhatsApp ${twilio.whatsapp.toFixed(2)}€`,
      type:    'usage' as const,
    },
    vapi: {
      label:   'Vapi',
      cost:    0,
      details: 'Voice AI — à connecter',
      type:    'usage' as const,
    },
    apitemplate: {
      label:   'APITemplate',
      cost:    parseFloat(apitemplateCost.toFixed(4)),
      details: `${pdfCount} devis PDF générés`,
      type:    'usage' as const,
    },
    ghl: {
      label:   'GoHighLevel',
      cost:    prorate(MONTHLY.ghl, days),
      details: `Abonnement mensuel ${MONTHLY.ghl}€/mois`,
      type:    'subscription' as const,
    },
    supabase: {
      label:   'Supabase',
      cost:    prorate(MONTHLY.supabase, days),
      details: `Base de données & Auth — ${MONTHLY.supabase}€/mois`,
      type:    'subscription' as const,
    },
    hetzner: {
      label:   'Hetzner',
      cost:    hetzner.amount,
      details: hetzner.note,
      type:    'subscription' as const,
    },
    n8n: {
      label:   'N8N',
      cost:    prorate(MONTHLY.n8n, days),
      details: `Orchestration workflows — ${MONTHLY.n8n}€/mois`,
      type:    'subscription' as const,
    },
    vercel: {
      label:   'Vercel',
      cost:    prorate(MONTHLY.vercel, days),
      details: MONTHLY.vercel === 0 ? 'Plan gratuit' : `Hosting Next.js — ${MONTHLY.vercel}€/mois`,
      type:    'subscription' as const,
    },
  }

  const total = parseFloat(
    Object.values(services).reduce((sum, s) => sum + s.cost, 0).toFixed(2)
  )

  return Response.json({ period, startDate, endDate, days, services, total })
}
