import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Pages publiques (pas de login requis).
const isPublic = createRouteMatcher([
  '/login(.*)',
  '/inscription(.*)',
  '/formulaire(.*)',
])

// Routes /api/* qui exposent / modifient des données métier (CRM, dashboard,
// pipeline, contacts, agenda, etc.). Elles doivent exiger soit une session Clerk
// humaine (cookie navigateur), soit le secret de service HERMES_API_SECRET pour
// les appelants serveur-à-serveur (MCP/agents). Les webhooks signés, les agents,
// les formulaires publics (leads/capture, onboarding/intake, devis/signature) et
// les routes qui gèrent déjà leur propre auth ne sont PAS listés ici.
const isProtectedApi = createRouteMatcher([
  '/api/contact(.*)',
  '/api/contacts/search',
  '/api/crm/(.*)',
  '/api/outbound/(.*)',
  '/api/dashboard',
  '/api/pipeline-opps',
  '/api/pipeline/(.*)',
  '/api/pipelines',
  '/api/opp(.*)',
  '/api/budget',
  '/api/calendrier',
  '/api/calendar-event(.*)',
  '/api/google-events(.*)',
  '/api/tasks',
  '/api/feed',
  '/api/agent-logs',
  '/api/settings/(.*)',
  '/api/knowledge/(.*)',
  '/api/integrations',
  '/api/whatsapp/send',
  '/api/send-message',
  '/api/tldv/(.*)',
  '/api/fathom/(.*)',
])

// Appelant serveur-à-serveur légitime (MCP/agents) porteur du secret partagé.
function hasServiceSecret(req: Request): boolean {
  const secret = process.env.HERMES_API_SECRET
  if (!secret) return false
  const provided =
    req.headers.get('authorization')?.replace('Bearer ', '') ??
    req.headers.get('x-hermes-secret') ??
    ''
  return provided.length > 0 && provided === secret
}

// Mode démo : pass-through total (aucun Clerk). Constante de build → la prod garde Clerk.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api/')) {
    // Données métier : session Clerk OU secret de service requis, sinon 401.
    if (isProtectedApi(req) && !hasServiceSecret(req)) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    return
  }
  if (!isPublic(req)) {
    await auth.protect()
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function middleware(req: any, ev: any) {
  if (DEMO_MODE) return NextResponse.next()
  return clerkHandler(req, ev)
}

export const config = {
  // Exclut les assets statiques ; inclut les pages.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt|xml|js)$).*)'],
}
