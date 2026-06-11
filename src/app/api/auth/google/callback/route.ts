import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { getOAuth2Client } from '@/lib/google'
import { api } from '../../../../../../convex/_generated/api'

// Email du compte Google depuis l'id_token (sans appel réseau supplémentaire).
function emailFromIdToken(idToken?: string | null): string | undefined {
  if (!idToken) return undefined
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'))
    return typeof payload.email === 'string' ? payload.email : undefined
  } catch { return undefined }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  // Même redirect_uri que la requête d'autorisation (sinon l'échange du token échoue).
  const origin = (process.env.NEXT_PUBLIC_APP_URL || '').trim() || req.nextUrl.origin
  const redirectUri = `${origin.replace(/\/+$/, '')}/api/auth/google/callback`
  const oauth2 = getOAuth2Client(redirectUri)
  const { tokens } = await oauth2.getToken(code)

  let saved = false
  let error = ''

  if (tokens.refresh_token) {
    try {
      // Connexion PAR PROFIL — liée à l'utilisateur Clerk connecté. Source de vérité = Convex.
      const { userId } = await auth()
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!userId) {
        error = 'Session expirée — reconnecte-toi au Data OS puis relance la connexion Google.'
      } else if (!convexUrl) {
        error = 'NEXT_PUBLIC_CONVEX_URL manquant côté serveur.'
      } else {
        const convex = new ConvexHttpClient(convexUrl)
        await convex.mutation(api.googleAccounts.connect, {
          clerkUserId:  userId,
          refreshToken: tokens.refresh_token,
          email:        emailFromIdToken(tokens.id_token),
        })
        saved = true
      }
    } catch (e) {
      error = String(e)
    }
  } else {
    error = 'Google n\'a pas retourné de refresh_token'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Calendar</title>
  ${saved ? `<meta http-equiv="refresh" content="2;url=${appUrl}/calendrier">` : ''}
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F5F5F0; }
    .card { background: white; border-radius: 16px; padding: 32px 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 360px; }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; font-size: 18px; color: #111; }
    p { margin: 0 0 24px; font-size: 13px; color: #6B7280; }
    a { display: inline-block; background: #111; color: white; text-decoration: none; padding: 10px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; }
    .err { color: #EF4444; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${saved ? '✅' : '❌'}</div>
    <h2>${saved ? 'Google Calendar connecté !' : 'Erreur de connexion'}</h2>
    <p>${saved ? 'Redirection automatique dans 2 secondes…' : 'Une erreur s\'est produite.'}</p>
    ${error ? `<p class="err">${error}</p>` : ''}
    <a href="${appUrl}/calendrier">Aller au calendrier →</a>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
