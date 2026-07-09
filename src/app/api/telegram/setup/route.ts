import { NextRequest } from 'next/server'
import { setWebhook, getWebhookInfo } from '@/lib/telegram'

// GET  → afficher l'état actuel du webhook
// POST → enregistrer le webhook avec l'URL de l'app

// Auth Bearer requise : la réponse Telegram contient l'URL du webhook AVEC le token du bot en clair.
// Sans auth, un simple GET exfiltrait le TELEGRAM_BOT_TOKEN. On gate + on masque le token dans la sortie.
function authorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return !!process.env.TELEGRAM_BOT_TOKEN && auth === `Bearer ${process.env.TELEGRAM_BOT_TOKEN}`
}
function maskToken<T>(info: T): T {
  const tok = process.env.TELEGRAM_BOT_TOKEN
  if (!tok) return info
  try { return JSON.parse(JSON.stringify(info).split(tok).join('***')) as T } catch { return info }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 })
  const info = await getWebhookInfo()
  return Response.json(maskToken(info))
}

export async function POST(req: NextRequest) {
  // Autorisation simple : token en header
  if (!authorized(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return Response.json({ ok: false, error: 'NEXT_PUBLIC_APP_URL non configuré' }, { status: 500 })
  }

  const webhookUrl = `${appUrl}/api/webhooks/telegram?token=${process.env.TELEGRAM_BOT_TOKEN}`
  const result = await setWebhook(webhookUrl)

  return Response.json({ ...result, webhookUrl })
}
