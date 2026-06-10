import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'

/**
 * Lecture LIVE du vrai fichier SKILL.md sur le VPS/profil actif.
 * Priorité : fichier réel ; le snapshot bundlé (public/agentic-skills) sert de fallback côté client.
 * Sur un hôte sans accès au FS (ex. Vercel), renvoie 404 → le client bascule sur le snapshot.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOTS = [
  '/home/hermes/.hermes/profiles/',
  '/home/hermes/.hermes/skills/',
  '/home/hermes/.hermes/hermes-agent/skills/',
]

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('path') || ''
  const allowed = ROOTS.some(r => p.startsWith(r)) && /skill\.md$/i.test(p) && !p.includes('..')
  if (!allowed) return NextResponse.json({ error: 'chemin non autorisé', path: p }, { status: 400 })
  try {
    const content = await fs.readFile(p, 'utf8')
    return new NextResponse(content, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'fichier introuvable', path: p }, { status: 404 })
  }
}
