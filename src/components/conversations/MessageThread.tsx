'use client'

import { useState, useEffect, useRef } from 'react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import { getMessages } from '@/app/conversations/actions'
import { createClient } from '@/lib/supabase/client'
import ComposerBar from './ComposerBar'

type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MessageBubble({
  message,
  channel,
}: {
  message:  Message
  channel:  Conversation['channel']
}) {
  const isContact   = message.role === 'user'
  const channelMeta = CHANNEL_META[channel]
  const viaLabel    = (message.metadata as { channel?: string } | undefined)?.channel ?? channelMeta.label

  return (
    <div className={`flex flex-col gap-1 ${isContact ? 'items-start' : 'items-end'}`}>
      <div className={`
        max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isContact
          ? 'bg-white text-[#111111] rounded-tl-sm shadow-sm'
          : 'bg-[#111111] text-white rounded-tr-sm'
        }
      `}>
        {renderContent(message.content)}
      </div>
      <span className="text-[10px] text-[#9CA3AF] px-1">
        {formatTime(message.created_at)} · Via {viaLabel}
      </span>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="max-w-[72%] bg-[#111111] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed whitespace-pre-wrap">
        {content || (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
        {content && <span className="inline-block w-0.5 h-3.5 bg-white/60 ml-0.5 animate-pulse align-middle" />}
      </div>
      <span className="text-[10px] text-[#9CA3AF] px-1">En cours…</span>
    </div>
  )
}

interface Props {
  conversation: Conversation
  aiEnabled:    boolean
  onAiToggle:   (enabled: boolean) => void
}

export default function MessageThread({ conversation, aiEnabled, onAiToggle }: Props) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [streaming, setStreaming] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load messages
  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    setStreaming(null)
    getMessages(conversation.id).then(result => {
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages as Message[])
      } else {
        setMessages(MOCK_MESSAGES[conversation.id] ?? [])
      }
      setIsLoading(false)
    })
  }, [conversation.id])

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [conversation.id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  function handleMessageSent(content: string, channel: SendChannel) {
    const msg: Message = {
      id:              crypto.randomUUID(),
      conversation_id: conversation.id,
      role:            'user',
      content,
      metadata:        { channel },
      created_at:      new Date().toISOString(),
    }
    setMessages(prev => [...prev, msg])

    if (aiEnabled) {
      void triggerKaiResponse(content)
    }
  }

  async function triggerKaiResponse(userMessage: string) {
    setStreaming('')
    try {
      const contactPhone = conversation.channel === 'whatsapp' && conversation.contact_phone
        ? conversation.contact_phone : undefined

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message:        userMessage,
          contactName:    conversation.contact_name,
          contactPhone,
        }),
      })

      if (res.ok && res.body) {
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let fullText  = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setStreaming(fullText)
        }
        fullText += decoder.decode()
        setMessages(prev => [...prev, {
          id:              crypto.randomUUID(),
          conversation_id: conversation.id,
          role:            'assistant',
          content:         fullText,
          created_at:      new Date().toISOString(),
        }])
      }
    } catch (err) {
      console.error('[Kai response]', err)
    } finally {
      setStreaming(null)
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  return (
    <div className="flex flex-col h-full bg-[#EEF0EB]">
      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[#3462EE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                  <span className="text-[10px] text-[#9CA3AF] font-medium">{group.date}</span>
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                </div>
                <div className="flex flex-col gap-4">
                  {group.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      channel={conversation.channel}
                    />
                  ))}
                </div>
              </div>
            ))}
            {streaming !== null && <StreamingBubble content={streaming} />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <ComposerBar
        conversation={conversation}
        onMessageSent={handleMessageSent}
        onAiToggle={onAiToggle}
        aiEnabled={aiEnabled}
      />
    </div>
  )
}
