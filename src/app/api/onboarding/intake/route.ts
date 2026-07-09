import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Public form lives on a separate domain → allow cross-origin POST.
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')

    const body = await req.json() as {
      email?: string
      submission?: unknown
      profile?: Record<string, string | undefined>
    }
    const email = (body.email ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400, headers: CORS })
    }

    const convex = new ConvexHttpClient(url)
    const result = await convex.mutation(api.onboarding.intakeSubmit, {
      email,
      submission: body.submission ?? {},
      profile: body.profile,
    })

    // Loop provisioning Hermes : « bouton go » automatique. On prévient le webhook
    // (n8n → SSH host → provision-loop) qui provisionne le client s'il est éligible
    // (contrat signé + accès VPS). Payload = email seul (aucun secret). Best-effort :
    // ne doit JAMAIS casser l'onboarding. Le cron robot-réveil reste le filet de sécurité.
    // URL résolue au runtime depuis le Data OS (doc sys:provision-webhook, resync par la
    // loop) → survit au changement d'URL du tunnel sans redeploy ; fallback env.
    let hook = process.env.N8N_PROVISION_WEBHOOK_URL
    try {
      const doc = await convex.query(api.osKbDocs.getByDocId, { docId: 'sys:provision-webhook' })
      const b = (doc as { body?: string } | null)?.body?.trim()
      if (b && b.startsWith('http')) hook = b
    } catch { /* garde le fallback env */ }
    if (hook) {
      try {
        await fetch(hook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-provision-secret': process.env.N8N_PROVISION_SECRET ?? '',
            'bypass-tunnel-reminder': 'true', // localtunnel : évite la page d'avertissement
          },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(5000),
        })
      } catch { /* best-effort : le robot-réveil rattrapera */ }
    }

    return NextResponse.json(result, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500, headers: CORS })
  }
}
