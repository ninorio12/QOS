import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext } from '@/lib/auth-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const runtime = 'nodejs'

const PROMPTS = {
  analysis: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, expert en qualification de leads BTP.

Analyse cette conversation avec ${contactName} (${company}) — statut actuel : ${stage || 'inconnu'}.

HISTORIQUE :
${history}

Réponds avec ce format EXACT (ne dévie pas) :
SCORE:[nombre entre 0 et 100]
[2-3 phrases de résumé du lead : projet, budget si mentionné, intérêt, maturité]
`.trim(),

  suggestion: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, commercial IA spécialisé BTP.

Basé sur cette conversation avec ${contactName} (${company}) — statut : ${stage || 'inconnu'} :

HISTORIQUE :
${history}

Rédige UN message de suivi court (3-5 phrases max), naturel et professionnel, en français.
Adapte le ton au statut du lead. Ne commence pas par "Bonjour" si la conversation est déjà engagée.
Réponds UNIQUEMENT avec le message, sans explication.
`.trim(),

  subject: (contactName: string, company: string, _stage: string, history: string) => `
Tu es Kai, assistant commercial BTP.

Génère un sujet court (1-2 phrases max) résumant le contexte de cette conversation avec ${contactName} (${company}).
Il doit mentionner : le type de projet, la zone géographique si connue, l'état d'avancement.
Exemple : "Rénovation façade 450m² à Lyon — devis demandé, budget ~15k€."
Réponds UNIQUEMENT avec le sujet, sans introduction.

HISTORIQUE :
${history}
`.trim(),

  priority: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, expert en qualification de leads BTP.

Évalue la priorité de ce lead : ${contactName} (${company}) — statut : ${stage || 'inconnu'}.

HISTORIQUE :
${history}

Réponds UNIQUEMENT avec un de ces trois mots : haute / moyenne / faible
Critères : urgence exprimée, budget mentionné, décision imminente = haute. Intérêt sans urgence = moyenne. Froid, peu engagé = faible.
`.trim(),

  action: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, expert en stratégie commerciale BTP.

Pour ${contactName} (${company}) — statut : ${stage || 'inconnu'} :

HISTORIQUE :
${history}

Propose UNE prochaine action concrète (1-2 phrases max). Exemple : "Envoyer un devis chiffré avant vendredi" ou "Appeler pour confirmer le RDV du 15".
Réponds UNIQUEMENT avec l'action recommandée, sans introduction.
`.trim(),
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { type, contactName, contactCompany, leadStage, history } = await req.json()

    if (!type || !history) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const name    = contactName ?? 'ce contact'
    const company = contactCompany ?? ''
    const stage   = leadStage ?? ''

    const promptFn = PROMPTS[type as keyof typeof PROMPTS]
    if (!promptFn) {
      return Response.json({ error: `Type inconnu: ${type}` }, { status: 400 })
    }

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: promptFn(name, company, stage, history) }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[/api/kai-analysis]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
