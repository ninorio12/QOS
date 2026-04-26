import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext } from '@/lib/auth-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const runtime = 'nodejs'

const PROMPTS = {
  analysis: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, assistant commercial. Analyse cette conversation en 3 lignes MAX.

Contact : ${contactName}${company ? ` (${company})` : ''} — étape : ${stage || 'inconnue'}

CONVERSATION :
${history}

Format STRICT — réponds exactement comme ceci, sans rien ajouter :
SCORE:[0-100]
Projet : [une phrase max]
Budget : [montant ou "non mentionné"]
Statut : [une phrase sur l'engagement et la maturité du lead]
`.trim(),

  suggestion: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, commercial IA. Rédige UN message de relance court pour ${contactName}${company ? ` (${company})` : ''}, étape : ${stage || 'inconnue'}.

CONVERSATION :
${history}

3 phrases MAX. Ton naturel et direct. Pas de "Bonjour" si déjà en cours. UNIQUEMENT le message.
`.trim(),

  subject: (contactName: string, company: string, _stage: string, history: string) => `
Résume en UNE phrase le projet de ${contactName}${company ? ` (${company})` : ''} : type de travaux, lieu si connu, budget si connu.
Exemple : "Rénovation façade 450m² Lyon — budget ~15k€"
UNIQUEMENT la phrase.

CONVERSATION :
${history}
`.trim(),

  priority: (contactName: string, company: string, stage: string, history: string) => `
Évalue la priorité de ${contactName}${company ? ` (${company})` : ''}, étape : ${stage || 'inconnue'}.

CONVERSATION :
${history}

Réponds UNIQUEMENT avec : haute / moyenne / faible
`.trim(),

  action: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai. Pour ${contactName}${company ? ` (${company})` : ''}, étape : ${stage || 'inconnue'} — quelle est la prochaine action ?

CONVERSATION :
${history}

1 phrase concrète et directe. Exemples : "Envoyer le devis avant vendredi." / "Appeler pour confirmer le RDV."
UNIQUEMENT l'action, sans introduction.
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
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
