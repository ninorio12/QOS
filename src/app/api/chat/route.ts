import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, contactName, systemPrompt } = await req.json()

    if (!message?.trim()) {
      return Response.json({ error: 'Message vide' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Save user message to Supabase
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })
    }

    // 2. Fetch full conversation history from Supabase
    let history: Anthropic.MessageParam[] = []
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgs && msgs.length > 0) {
        // Convert to Anthropic format, ensuring alternating roles
        const filtered = msgs.filter(m => m.role === 'user' || m.role === 'assistant')
        history = filtered.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
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
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemContext,
      messages: cleanHistory,
    })

    // 4. Create a ReadableStream to pipe Claude's response
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text
              fullResponse += text
              controller.enqueue(new TextEncoder().encode(text))
            }
          }

          // 5. Save assistant response to Supabase after streaming completes
          if (conversationId && fullResponse) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullResponse,
              metadata: { model: 'claude-opus-4-6' },
            })
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
    console.error('[/api/chat] Error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
