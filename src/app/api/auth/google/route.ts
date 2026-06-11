import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function page(title: string, msg: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Google Calendar</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F5F5F0}.card{background:#fff;border-radius:16px;padding:32px 40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:440px}h2{margin:0 0 8px;font-size:18px;color:#111}p{margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.6}code{background:#F3F4F6;padding:2px 6px;border-radius:6px;font-size:12px}a{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:600}</style></head><body><div class="card"><div style="font-size:40px;margin-bottom:12px">⚙️</div><h2>${title}</h2><p>${msg}</p><a href="/calendrier">← Retour au calendrier</a></div></body></html>`
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  // redirect_uri dérivé de l'origine réelle de la requête (robuste même si
  // NEXT_PUBLIC_APP_URL est vide/mal posée). Doit être enregistré à l'identique
  // dans la console Google Cloud.
  const origin = (process.env.NEXT_PUBLIC_APP_URL || '').trim() || req.nextUrl.origin
  const redirectUri = `${origin.replace(/\/+$/, '')}/api/auth/google/callback`

  // Pas d'app OAuth configurée → message clair plutôt qu'un 400 Google cryptique.
  if (!clientId || !clientSecret) {
    return new NextResponse(
      page('Google Calendar pas encore configuré',
        'Les identifiants OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ne sont pas définis côté serveur. ' +
        `Redirect URI à enregistrer côté Google : <code>${redirectUri}</code>`),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    redirect_uri: redirectUri, // explicite — évite "Missing required parameter: redirect_uri"
  })
  return NextResponse.redirect(url)
}
