import { NextRequest } from 'next/server'
import { setWebhook, getWebhookInfo } from '@/lib/telegram'

// GET  → afficher l'état actuel du webhook
// POST → enregistrer le webhook avec l'URL de l'app

export async function GET() {
  const info = await getWebhookInfo()
  return Response.json(info)
}

export async function POST(req: NextRequest) {
  // Autorisation simple : token en header
  const auth = req.headers.get('authorization')
  if (!process.env.TELEGRAM_BOT_TOKEN || auth !== `Bearer ${process.env.TELEGRAM_BOT_TOKEN}`) {
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
