import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Prix Claude Opus 4 (input $15/MTok, output $75/MTok → moyenne ~$0.003/message)
const CLAUDE_COST_PER_MSG = 0.003

// Fetch usage Twilio pour une période
async function getTwilioUsage(startDate: string, endDate: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return { sms: 0, calls: 0, total: 0 }

  const base = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Usage/Records.json`
  const params = new URLSearchParams({ StartDate: startDate, EndDate: endDate })

  try {
    const res = await fetch(`${base}?${params}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
      cache: 'no-store',
    })
    if (!res.ok) return { sms: 0, calls: 0, total: 0 }

    const data = await res.json() as { usage_records: { category: string; price: string }[] }
    let sms   = 0
    let calls = 0

    for (const r of data.usage_records ?? []) {
      const price = parseFloat(r.price ?? '0')
      if (r.category?.startsWith('sms'))   sms   += price
      if (r.category?.startsWith('calls')) calls += price
    }
    return { sms, calls, total: sms + calls }
  } catch {
    return { sms: 0, calls: 0, total: 0 }
  }
}

function getDateRange(period: string): { startDate: string; endDate: string; days: number } {
  const now   = new Date()
  const end   = now.toISOString().split('T')[0]!
  let start   = new Date(now)
  let days    = 7

  if (period === 'week') {
    start.setDate(now.getDate() - 7);  days = 7
  } else if (period === 'month') {
    start.setDate(1);                  days = now.getDate()
  } else if (period === 'quarter') {
    start.setMonth(now.getMonth() - 3); days = 90
  }

  return { startDate: start.toISOString().split('T')[0]!, endDate: end, days }
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') ?? 'month'
  const { startDate, endDate } = getDateRange(period)

  const supabase = await createClient()

  // Compter les messages Claude (assistant = réponse Claude)
  const { count: claudeMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'assistant')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)

  // Compter les devis générés (appels à /api/devis/generate)
  const { count: devisCount } = await supabase
    .from('devis')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)

  const claudeMsgCount  = claudeMessages ?? 0
  const claudeDevisCount = devisCount ?? 0
  // Devis = ~2000 tokens → ~$0.05 chacun
  const claudeCost = claudeMsgCount * CLAUDE_COST_PER_MSG + claudeDevisCount * 0.05

  // Twilio
  const twilio = await getTwilioUsage(startDate, endDate)

  // Vapi — pas d'API publique standard, on met 0 pour l'instant
  const vapiCost = 0

  // APITemplate — $0.005 par PDF (estimation)
  const { count: devisEnvoyes } = await supabase
    .from('devis')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'envoyé')
    .gte('envoye_le', `${startDate}T00:00:00Z`)
    .lte('envoye_le', `${endDate}T23:59:59Z`)
  const apitemplateCost = (devisEnvoyes ?? 0) * 0.005

  const total = claudeCost + twilio.total + vapiCost + apitemplateCost

  return Response.json({
    period,
    startDate,
    endDate,
    services: {
      claude: {
        cost:    parseFloat(claudeCost.toFixed(4)),
        details: { messages: claudeMsgCount, devis: claudeDevisCount },
      },
      twilio: {
        cost:    parseFloat(twilio.total.toFixed(4)),
        details: { sms: parseFloat(twilio.sms.toFixed(4)), calls: parseFloat(twilio.calls.toFixed(4)) },
      },
      vapi: {
        cost:    0,
        details: { note: 'Connexion Vapi non configurée' },
      },
      apitemplate: {
        cost:    parseFloat(apitemplateCost.toFixed(4)),
        details: { pdfs: devisEnvoyes ?? 0 },
      },
    },
    total: parseFloat(total.toFixed(4)),
  })
}
