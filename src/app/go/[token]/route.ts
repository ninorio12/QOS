import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

/**
 * Redirection traçante : le fil rouge entre les étapes du parcours.
 *
 * Le formulaire Facebook renvoie ici avec le jeton du lead. On note le passage,
 * puis on renvoie vers la vraie destination en lui repassant le jeton, pour que
 * l'étape suivante (quiz, prise de rendez-vous) puisse à son tour se signaler.
 *
 * Publique par nature : c'est un prospect qui clique, il n'a pas de session.
 * Elle ne lit ni n'expose aucune donnée, elle écrit une étape et redirige.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Destinations autorisées par étape. Une liste fermée : une redirection ouverte
// serait un cadeau pour l'hameçonnage.
const DESTINATIONS: Record<string, string> = {
  quiz: 'https://quiz.vividflow.co/',
  // Fin du quiz → prise de rendez-vous. Le jeton voyage dans l'URL : iClosed
  // capture l'adresse complète dans ses utm, ce qui rattache le RDV au lead.
  iclosed: 'https://app.iclosed.io/e/vividflow/audit-ia-offert',
}

// Étape par défaut selon la destination : aller vers iClosed, c'est avoir fini le quiz.
const DEFAULT_STEP: Record<string, string> = { quiz: 'quiz_ouvert', iclosed: 'quiz_termine' }

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const url = new URL(req.url)
  const dest = url.searchParams.get('to') ?? 'quiz'
  const step = url.searchParams.get('step') ?? DEFAULT_STEP[dest] ?? 'quiz_ouvert'

  const target = DESTINATIONS[dest] ?? DESTINATIONS.quiz
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  // Deux façons d'arriver ici. Depuis Meta, l'URL porte « meta » et l'identifiant
  // de soumission du formulaire : on le convertit en jeton. Depuis nos propres
  // liens, le jeton est déjà dans le chemin.
  const leadgenId = url.searchParams.get('lead_id')
  let vfToken = token === 'meta' ? null : token

  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl)
      if (token === 'meta' && leadgenId) {
        const r = await client.mutation(api.leadIngest.trackByLeadgen, { leadgenId, step })
        vfToken = r?.token ?? null
      } else if (vfToken) {
        await client.mutation(api.leadIngest.track, { token: vfToken, step })
      }
    } catch {
      // Le suivi ne doit jamais empêcher le prospect d'avancer.
    }
  }

  const out = new URL(target)
  if (vfToken) out.searchParams.set('vf', vfToken)          // le jeton continue le voyage
  else if (leadgenId) out.searchParams.set('lead_id', leadgenId)  // repli : au moins l'identifiant Meta
  return NextResponse.redirect(out.toString(), 302)
}
