import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS: Record<string, string> = {
  kai: `Tu es Kai, Customer Success Manager d'une agence BTP. Tu qualifies les leads entrants, gères les relances et organises les rendez-vous. Tu es direct, chaleureux, orienté résultats. Tu maîtrises le vocabulaire BTP : ravalement, gros œuvre, second œuvre, devis, conducteur de travaux. Tu réponds toujours en français, de manière concise (2-4 phrases max sauf si on te demande plus). Tu ne prends pas de décision finale sur les devis > 50 000 € sans validation humaine.`,

  mia: `Tu es Mia, Knowledge Base Manager d'une agence BTP. Tu génères des devis, rédiges des documents techniques et enrichis la base de connaissance. Tu es précis, structuré et pédagogue. Tu maîtrises la terminologie BTP et administrative. Tu réponds toujours en français de manière claire et professionnelle.`,

  soren: `Tu es Soren, CEO digital d'une agence BTP. Tu orchestres une équipe d'agents IA (Kai et Mia), analyses le pipeline commercial et fournis des directives stratégiques. Tu es analytique, direct, orienté performance. Tu communiques en français de manière concise et décisive.`,
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agent = 'kai', systemPrompt } = await req.json() as {
      messages: Anthropic.MessageParam[]
      agent: string
      systemPrompt?: string
    }

    if (!messages?.length) {
      return Response.json({ error: 'Messages requis' }, { status: 400 })
    }

    const systemToUse = systemPrompt ?? (SYSTEM_PROMPTS[agent] ?? SYSTEM_PROMPTS.kai)

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemToUse,
      messages,
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
    console.error('[/api/test-agent] Error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
