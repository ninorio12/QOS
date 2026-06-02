import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/twilio'
import { getConversationMessages } from '@/lib/ghl'
import { env } from '@/lib/env'
import { getClientIp, checkRateLimit } from '@/lib/rate-limit'

function getAnthropicClient() {
  return new Anthropic({ apiKey: env.anthropicKey() })
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const rate = checkRateLimit({ key: `chat:${user.id}:${ip}`, limit: 20, windowMs: 60_000 })
    if (!rate.allowed) {
      return Response.json(
        { error: `Limite atteinte. Réessayez dans ${rate.retryAfter} secondes.` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    const { conversationId, message, contactName, contactPhone, systemPrompt } = await req.json()

    if (!message?.trim()) {
      return Response.json({ error: 'Message vide' }, { status: 400 })
    }

    // Check ai_enabled if conversationId provided
    if (conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('ai_enabled')
        .eq('id', conversationId)
        .single()

      if (conv && conv.ai_enabled === false) {
        return new Response(null, { status: 204 })
      }
    }

    // 1. Save user message to Supabase
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })
    }

    // 2. Fetch full conversation history
    let history: Anthropic.MessageParam[] = []
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgs && msgs.length > 0) {
        const filtered = msgs.filter(m => m.role === 'user' || m.role === 'assistant')
        history = filtered.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      } else {
        // Aucun historique en base → lire l'historique GHL pour que Kai ait le contexte complet
        const ghlMsgs = await getConversationMessages(conversationId, 30)
        if (ghlMsgs.length > 0) {
          // Les messages GHL les plus anciens en premier, exclure le dernier (= message courant)
          const ordered = [...ghlMsgs].reverse()
          const withoutLast = ordered.slice(0, -1)
          for (const m of withoutLast) {
            if (!m.body?.trim()) continue
            const role = m.direction === 'inbound' ? 'user' : 'assistant'
            history.push({ role, content: m.body.trim() })
          }
        }
      }
    }

    // If history is empty or last message isn't the current one, add it
    const lastMsg = history[history.length - 1]
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
      history.push({ role: 'user', content: message })
    }

    // Ensure history starts with 'user' and alternates properly
    // Fix consecutive same-role messages by merging them
    const cleanHistory: Anthropic.MessageParam[] = []
    for (const msg of history) {
      const last = cleanHistory[cleanHistory.length - 1]
      if (last && last.role === msg.role) {
        // Merge consecutive same-role messages
        last.content = `${last.content}\n\n${msg.content}`
      } else {
        cleanHistory.push({ ...msg })
      }
    }

    // Build system prompt with contact context
    const systemContext = contactName
      ? `${systemPrompt ?? SYSTEM_PROMPT_DEFAULT}\n\nTu parles actuellement avec : ${contactName}.`
      : (systemPrompt ?? SYSTEM_PROMPT_DEFAULT)

    // 3. Stream response from Claude
    const stream = getAnthropicClient().messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemContext,
      messages: cleanHistory,
    })

    // 4. Create a ReadableStream to pipe Claude's response
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text
              fullResponse += text
              controller.enqueue(enc.encode(text))
            }
          }
        } catch (streamErr) {
          console.error('[chat] Erreur stream Anthropic:', streamErr)
          // Si on a déjà du contenu, on le garde — sinon message de fallback
          if (!fullResponse) {
            const fallback = "Une erreur s'est produite. Veuillez réessayer."
            controller.enqueue(enc.encode(fallback))
            fullResponse = fallback
          }
        } finally {
          // Toujours sauvegarder ce qu'on a reçu, même partiel
          if (conversationId && fullResponse) {
            const { error: saveErr } = await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullResponse,
              metadata: { model: 'claude-opus-4-6' },
            })
            if (saveErr) console.error('[chat] Erreur sauvegarde message:', saveErr.message)
          }

          if (contactPhone && fullResponse) {
            sendWhatsApp(contactPhone, fullResponse)
              .catch(e => console.error('[chat] Erreur envoi WhatsApp:', e))
          }

          controller.close()
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
    console.error('[/api/chat] Error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
