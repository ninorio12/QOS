'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, Loader2, Sparkles, Zap, Smartphone } from 'lucide-react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import { getMessages } from '@/app/conversations/actions'
import { createClient } from '@/lib/supabase/client'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

// Render **bold** markdown
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isAI = message.role === 'assistant'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0 mt-1">
        {isAI ? (
          <div className="w-7 h-7 rounded-full bg-[#3462EE]/20 border border-[#3462EE]/30 flex items-center justify-center">
            <Bot size={14} className="text-[#3462EE]" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#C8F135]/20 border border-[#C8F135]/30 flex items-center justify-center text-[10px] font-bold text-[#C8F135]">
            Moi
          </div>
        )}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-[#3462EE] text-white rounded-tr-sm'
            : 'bg-[#232D3F] text-[#D1D9E6] rounded-tl-sm'
          }
        `}>
          {renderContent(message.content)}
        </div>
        <span className="text-[10px] text-[#3D4F6B] px-1">{formatTime(message.created_at)}</span>
      </div>
    </div>
  )
}

// Streaming bubble — content grows in real-time
function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-[#3462EE]/20 border border-[#3462EE]/30 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={14} className="text-[#3462EE]" />
      </div>
      <div className="max-w-[75%]">
        <div className="bg-[#232D3F] px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-[#D1D9E6] leading-relaxed whitespace-pre-wrap">
          {content || (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8896AB] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8896AB] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8896AB] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {content && <span className="inline-block w-0.5 h-3.5 bg-[#3462EE] ml-0.5 animate-pulse align-middle" />}
        </div>
      </div>
    </div>
  )
}

export default function MessageThread({ conversation }: { conversation: Conversation }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const channel = CHANNEL_META[conversation.channel]
  const isWhatsApp = conversation.channel === 'whatsapp'

  // Load messages
  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    setStreamingContent(null)

    const load = async () => {
      const result = await getMessages(conversation.id)
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages as Message[])
      } else {
        setMessages(MOCK_MESSAGES[conversation.id] ?? [])
      }
      setIsLoading(false)
    }
    load()
  }, [conversation.id])

  // Supabase Realtime — messages WhatsApp entrants apparaissent live
  useEffect(() => {
    const supabase = createClient()
    const subscription = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // Évite les doublons (message déjà ajouté en optimiste)
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [conversation.id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return
    setInput('')
    setIsSending(true)

    // Optimistic user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setStreamingContent('') // show streaming bubble immediately

    try {
      // Envoyer via WhatsApp uniquement si la conversation est de type whatsapp et que le contact a un numéro
      const contactPhone = conversation.channel === 'whatsapp' && conversation.contact_phone
        ? conversation.contact_phone
        : undefined

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: content,
          contactName: conversation.contact_name,
          contactPhone,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      // Stream the response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreamingContent(fullText)
      }

      // Finalize: replace streaming bubble with real message
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: fullText,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setStreamingContent(null)

      // Indicateur WhatsApp envoyé
      if (contactPhone) {
        setWhatsappSent(true)
        setTimeout(() => setWhatsappSent(false), 3000)
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Vérifiez votre clé API Anthropic dans `.env.local`.",
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
      setStreamingContent(null)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group by date
  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#232D3F] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
            {conversation.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'UN'}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{conversation.contact_name ?? 'Contact inconnu'}</p>
            <p className="text-xs text-[#8896AB]">{conversation.contact_company ?? ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5"
            style={{ color: channel.color, borderColor: channel.color + '40', background: channel.bg }}>
            {channel.emoji} {channel.label}
          </span>
          <button className="flex items-center gap-1.5 text-xs text-[#C8F135] bg-[#C8F135]/10 border border-[#C8F135]/20 hover:bg-[#C8F135]/20 px-2.5 py-1 rounded-full transition-colors">
            <Sparkles size={11} />
            Résumé IA
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="text-[#3D4F6B] animate-spin" />
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.date} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#232D3F]" />
                  <span className="text-[10px] text-[#3D4F6B] font-medium">{group.date}</span>
                  <div className="flex-1 h-px bg-[#232D3F]" />
                </div>
                {group.messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            ))}

            {/* Streaming bubble */}
            {streamingContent !== null && (
              <StreamingBubble content={streamingContent} />
            )}

            {messages.length === 0 && streamingContent === null && !isLoading && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <p className="text-sm text-[#3D4F6B]">Envoyez le premier message ci-dessous.</p>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-[#232D3F]">
        <div className="flex items-end gap-2 bg-[#1A2235] border border-[#232D3F] rounded-xl px-3 py-2 focus-within:border-[#3462EE] transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message... (Entrée pour envoyer)"
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#3D4F6B] outline-none resize-none leading-relaxed py-1 disabled:opacity-50"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-8 h-8 rounded-lg bg-[#3462EE] hover:bg-[#2a50d4] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
          >
            {isSending
              ? <Loader2 size={14} className="text-white animate-spin" />
              : <Send size={14} className="text-white" />
            }
          </button>
        </div>

        {/* Agent status bar */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] animate-pulse" />
            <span className="text-[10px] text-[#8896AB]">
              Agent IA actif · <span className="text-[#C8F135]">Claude Opus 4.6</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {whatsappSent && (
              <span className="flex items-center gap-1 text-[10px] text-[#22c55e] animate-pulse">
                <Smartphone size={9} />
                WhatsApp envoyé
              </span>
            )}
            {isWhatsApp && !whatsappSent && conversation.contact_phone && (
              <span className="flex items-center gap-1 text-[10px] text-[#3D4F6B]">
                <Smartphone size={9} />
                {conversation.contact_phone}
              </span>
            )}
            <div className="flex items-center gap-1 text-[10px] text-[#3D4F6B]">
              <Zap size={9} />
              Qualification automatique
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
