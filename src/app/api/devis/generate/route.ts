import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { contactName, contactCompany, history } = await req.json()

  const prompt = `Tu es un commercial BTP expert. Génère un devis professionnel en français basé sur cette conversation.

Contact : ${contactName ?? 'Client'}${contactCompany ? ` (${contactCompany})` : ''}

Historique de la conversation :
${history ?? "Pas d'historique disponible."}

Génère un devis structuré avec :
- Un titre court (ex: "Devis Rénovation Salle de Bain")
- Une description des travaux
- Les postes de travaux avec estimations de prix
- Un total HT estimé
- Les conditions (délai, validité du devis 30 jours, TVA 20%)

Réponds UNIQUEMENT avec le contenu du devis, sans introduction.`

  const stream = anthropic.messages.stream({
    model:      'claude-opus-4-6',
    max_tokens: 2048,
    messages:   [{ role: 'user', content: prompt }],
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
      } catch (err) { controller.error(err) }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
