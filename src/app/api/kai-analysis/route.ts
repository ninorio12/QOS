import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

    const prompt = promptFn(name, company, stage, history)

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
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
