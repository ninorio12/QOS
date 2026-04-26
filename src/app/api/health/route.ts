import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CheckResult = { name: string; status: 'ok' | 'degraded' | 'down'; note?: string }

async function checkTelegramWebhook(token: string | undefined, label: string): Promise<CheckResult> {
  if (!token) return { name: label, status: 'down', note: 'token manquant' }
  try {
    const res  = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`,
      { signal: AbortSignal.timeout(4000) })
    const data = await res.json() as { ok: boolean; result?: { url?: string; last_error_message?: string; pending_update_count?: number } }
    if (!data.ok || !data.result?.url) return { name: label, status: 'down', note: 'webhook non enregistré' }
    if (data.result.last_error_message) return { name: label, status: 'degraded', note: data.result.last_error_message }
    return { name: label, status: 'ok', note: `pending: ${data.result.pending_update_count ?? 0}` }
  } catch {
    return { name: label, status: 'down', note: 'timeout / inaccessible' }
  }
}

async function checkN8NWebhook(): Promise<CheckResult> {
  const url = process.env.N8N_WEBHOOK_BASE_URL
  if (!url) return { name: 'n8n_webhook', status: 'degraded', note: 'N8N_WEBHOOK_BASE_URL non configuré' }
  try {
    const res = await fetch(`${url}/webhook/emma-calendar-booking`,
      { method: 'GET', signal: AbortSignal.timeout(4000) })
    // N8N répond 405 (Method Not Allowed) sur GET — c'est OK, le webhook est actif
    const ok = res.status === 200 || res.status === 405 || res.status === 404
    return { name: 'n8n_webhook', status: ok ? 'ok' : 'down', note: `HTTP ${res.status}` }
  } catch {
    return { name: 'n8n_webhook', status: 'down', note: 'timeout / inaccessible' }
  }
}

async function checkGHL(): Promise<CheckResult> {
  const key = process.env.GHL_API_KEY
  if (!key) return { name: 'ghl_api', status: 'down', note: 'GHL_API_KEY manquant' }
  try {
    const res = await fetch('https://services.leadconnectorhq.com/locations/search?limit=1', {
      headers: { Authorization: `Bearer ${key}`, Version: '2021-07-28' },
      signal: AbortSignal.timeout(4000),
    })
    return { name: 'ghl_api', status: res.ok ? 'ok' : 'degraded', note: `HTTP ${res.status}` }
  } catch {
    return { name: 'ghl_api', status: 'down', note: 'timeout' }
  }
}

export async function GET() {
  const [tgAdmin, tgClient, n8n, ghl] = await Promise.all([
    checkTelegramWebhook(process.env.TELEGRAM_BOT_TOKEN_ADMIN  ?? process.env.TELEGRAM_BOT_TOKEN, 'telegram_admin'),
    checkTelegramWebhook(process.env.TELEGRAM_BOT_TOKEN_CLIENT, 'telegram_client'),
    checkN8NWebhook(),
    checkGHL(),
  ])

  const checks = [tgAdmin, tgClient, n8n, ghl]
  const hasDown     = checks.some(c => c.status === 'down')
  const hasDegraded = checks.some(c => c.status === 'degraded')
  const overall     = hasDown ? 'down' : hasDegraded ? 'degraded' : 'ok'

  return NextResponse.json({
    status: overall,
    ts:     new Date().toISOString(),
    checks,
  }, { status: overall === 'down' ? 503 : 200 })
}
