'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Smartphone, Zap } from 'lucide-react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import { getMessages } from '@/app/conversations/actions'
import { createClient } from '@/lib/supabase/client'
import KaiAnalysis from './KaiAnalysis'
import VapiCall from './VapiCall'

type Tab = 'messages' | 'kai' | 'vocal'

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

function MessageBubble({ message, contactName }: { message: Message; contactName?: string }) {
  const isContact = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isContact ? 'items-start' : 'items-end'}`}>
      <span className="text-[10px] text-[#9CA3AF] px-1">
        {isContact ? (contactName ?? 'Contact') : 'Kai'} · {formatTime(message.created_at)}
      </span>
      <div className={`
        max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isContact
          ? 'bg-white text-[#111111] rounded-tl-sm shadow-sm'
          : 'bg-[#111111] text-white rounded-tr-sm'
        }
      `}>
        {renderContent(message.content)}
      </div>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-1 items-end">
      <span className="text-[10px] text-[#9CA3AF] px-1">Kai</span>
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
    </div>
  )
}

export default function MessageThread({ conversation }: { conversation: Conversation }) {
  const [tab, setTab]                   = useState<Tab>('messages')
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [isLoading, setIsLoading]       = useState(true)
  const [isSending, setIsSending]       = useState(false)
  const [streamingContent, setStreaming] = useState<string | null>(null)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const channel   = CHANNEL_META[conversation.channel]

  // Load messages
  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    setStreaming(null)
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

  // Reset tab when conversation changes
  useEffect(() => {
    setTab('messages')
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
  }, [messages, streamingContent])

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return
    setInput('')
    setIsSending(true)

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setStreaming('')

    try {
      const contactPhone = conversation.channel === 'whatsapp' && conversation.contact_phone
        ? conversation.contact_phone : undefined

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
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreaming(fullText)
      }
      fullText += decoder.decode()

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: fullText,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setStreaming(null)

      if (contactPhone) {
        setWhatsappSent(true)
        setTimeout(() => setWhatsappSent(false), 3000)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: "Erreur. Vérifiez votre clé API Anthropic.",
        created_at: new Date().toISOString(),
      }])
      setStreaming(null)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  const TABS: { id: Tab; label: string }[] = [
    { id: 'messages', label: 'Messages'  },
    { id: 'kai',      label: 'Kai IA'    },
    { id: 'vocal',    label: 'Vocal'     },
  ]

  return (
    <div className="flex flex-col h-full bg-[#EEF0EB]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
            {conversation.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111111]">{conversation.contact_name ?? 'Contact inconnu'}</p>
            {conversation.contact_company && (
              <p className="text-xs text-[#6B7280]">{conversation.contact_company}</p>
            )}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full border"
          style={{ color: channel.color, borderColor: channel.color + '40', background: channel.bg }}
        >
          {channel.label}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 px-5 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-[#111111] font-semibold border-[#3462EE]'
                : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'kai' && (
        <div className="flex-1 overflow-hidden">
          <KaiAnalysis conversation={conversation} messages={messages} />
        </div>
      )}

      {tab === 'vocal' && (
        <div className="flex-1 overflow-hidden">
          <VapiCall conversation={conversation} />
        </div>
      )}

      {tab === 'messages' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={18} className="text-[#9CA3AF] animate-spin" />
              </div>
            ) : (
              <>
                {grouped.map(group => (
                  <div key={group.date} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#E5E7EB]" />
                      <span className="text-[10px] text-[#9CA3AF]">{group.date}</span>
                      <div className="flex-1 h-px bg-[#E5E7EB]" />
                    </div>
                    {group.messages.map(msg => (
                      <MessageBubble key={msg.id} message={msg} contactName={conversation.contact_name} />
                    ))}
                  </div>
                ))}
                {streamingContent !== null && <StreamingBubble content={streamingContent} />}
                {messages.length === 0 && streamingContent === null && !isLoading && (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-[#9CA3AF]">Envoyez le premier message.</p>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-[#E5E7EB] bg-white">
            <div className="flex items-end gap-2 border border-[#E5E7EB] rounded-xl px-3 py-2 focus-within:border-[#3462EE] transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                rows={1}
                disabled={isSending}
                className="flex-1 bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none resize-none leading-relaxed py-1 disabled:opacity-50"
                style={{ maxHeight: 120, overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="w-8 h-8 rounded-lg bg-[#111111] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
              >
                {isSending
                  ? <Loader2 size={14} className="text-white animate-spin" />
                  : <Send size={14} className="text-white" />
                }
              </button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] text-[#6B7280]">Kai actif</span>
              </div>
              <div className="flex items-center gap-2">
                {whatsappSent && (
                  <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                    <Smartphone size={9} />
                    WhatsApp envoyé
                  </span>
                )}
                <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                  <Zap size={9} />
                  Qualification auto
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
