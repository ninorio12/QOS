import { createHash } from 'node:crypto'
import { ConvexHttpClient } from 'convex/browser'

// Hash du token agent (Bearer) — même algo que convex/agents.ts (SHA-256 hex).
// On ne transmet JAMAIS le token brut à Convex, seulement son hash.
export function tokenHashFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1] ?? req.headers.get('x-agent-token') ?? ''
  if (!token) return null
  return createHash('sha256').update(token).digest('hex')
}

export function convexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}
