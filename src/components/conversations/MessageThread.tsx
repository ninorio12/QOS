'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import { getMessages } from '@/app/conversations/actions'
import { createClient } from '@/lib/supabase/client'
import { getAvatarColor } from '@/components/contacts/types'
import { Sparkles, Loader2 as SpinnerIcon, X } from 'lucide-react'
import ComposerBar from './ComposerBar'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function renderContent(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

function ChannelBadge({ channel }: { channel: Conversation['channel'] }) {
  if (channel === 'whatsapp') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#22c55e18', color: '#22c55e' }}>
      <svg viewBox="0 0 24 24" width="9" height="9" fill="#22c55e">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </span>
  )
  if (channel === 'sms') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#0EA5E918', color: '#0EA5E9' }}>
      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      SMS
    </span>
  )
  if (channel === 'email') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#F43F5E18', color: '#F43F5E' }}>
      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
      Email
    </span>
  )
  return null
}

function MessageBubble({ message, channel }: { message: Message; channel: Conversation['channel'] }) {
  const isContact = message.role === 'user'
  const channelMeta = CHANNEL_META[channel]
  const viaLabel = (message.metadata as { channel?: string } | undefined)?.channel ?? channelMeta.label

  return (
    <div className={`flex gap-2.5 ${isContact ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col gap-1 max-w-[68%] ${isContact ? 'items-start' : 'items-end'}`}>
        <div className={`
          px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap
          ${isContact
            ? 'bg-white text-[#111111] rounded-2xl rounded-tl-md shadow-sm'
            : 'text-white rounded-2xl rounded-tr-md'
          }
        `}
          style={!isContact ? { background: 'linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)' } : {}}
        >
          {renderContent(message.content)}
        </div>
        <span className="text-[10px] text-[#B0B7C3] px-1">
          {formatTime(message.created_at)} · {viaLabel}
        </span>
      </div>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-1 max-w-[68%] items-end">
        <div className="px-4 py-2.5 rounded-2xl rounded-tr-md text-[13px] text-white leading-relaxed whitespace-pre-wrap"
             style={{ background: 'linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)' }}>
          {content || (
            <span className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {content && <span className="inline-block w-0.5 h-3.5 bg-white/60 ml-0.5 animate-pulse align-middle" />}
        </div>
        <span className="text-[10px] text-[#B0B7C3] px-1">En cours…</span>
      </div>
    </div>
  )
}

interface Props {
  conversation: Conversation
  aiEnabled:    boolean
  onAiToggle:   (enabled: boolean) => void
}

export default function MessageThread({ conversation, aiEnabled, onAiToggle }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const [messages,    setMessages]    = useState<Message[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [streaming,   setStreaming]   = useState<string | null>(null)
  const [kaiOpen,     setKaiOpen]     = useState(false)
  const [kaiState,    setKaiState]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [kaiSummary,  setKaiSummary]  = useState('')
  const [kaiScore,    setKaiScore]    = useState<number | null>(null)
  const [kaiAction,   setKaiAction]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const name     = conversation.contact_name ?? 'Contact inconnu'
  const initials = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color    = getAvatarColor(initials)

  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    setStreaming(null)
    void getMessages(conversation.id).then(result => {
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages as Message[])
      } else {
        setMessages(MOCK_MESSAGES[conversation.id] ?? [])
      }
      setIsLoading(false)
    })
  }, [conversation.id])

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
    if (aiEnabled) void triggerKaiResponse(content)
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

  const analyzeKai = useCallback(async () => {
    setKaiOpen(true)
    setKaiState('loading')
    setKaiSummary('')
    setKaiScore(null)
    setKaiAction('')

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => `${m.role === 'user' ? conversation.contact_name ?? 'Lead' : 'Kai'}: ${m.content}`)
      .join('\n\n')

    try {
      const dec = new TextDecoder()

      // Résumé + score
      const res1 = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analysis', contactName: conversation.contact_name, contactCompany: conversation.contact_company, leadStage: conversation.lead_stage, history }),
      })
      if (res1.ok && res1.body) {
        const reader = res1.body.getReader()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += dec.decode(value, { stream: true })
          setKaiSummary(text.replace(/SCORE:\d+\n?/, '').trim())
        }
        const match = text.match(/SCORE:(\d+)/)
        setKaiScore(match ? parseInt(match[1], 10) : 65)
        setKaiSummary(text.replace(/SCORE:\d+\n?/, '').trim())
      }

      // Prochaine action
      const res2 = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'action', contactName: conversation.contact_name, contactCompany: conversation.contact_company, leadStage: conversation.lead_stage, history }),
      })
      if (res2.ok && res2.body) {
        const reader = res2.body.getReader()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += dec.decode(value, { stream: true })
          setKaiAction(text.trim())
        }
      }

      setKaiState('done')
    } catch {
      setKaiState('error')
    }
  }, [conversation, messages])

  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  return (
    <div className="flex flex-col h-full bg-[#EEF0EB]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#F0F0EB] flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
          style={{ background: color + '22', color }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#111111] truncate">{name}</p>
            <ChannelBadge channel={conversation.channel} />
          </div>
          {conversation.contact_company && (
            <p className="text-[11px] text-[#9CA3AF] truncate">{conversation.contact_company}</p>
          )}
        </div>
        <button
          onClick={() => kaiOpen ? setKaiOpen(false) : void analyzeKai()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex-shrink-0"
          style={{
            background: kaiOpen ? '#8B5CF6' : '#8B5CF610',
            color: kaiOpen ? 'white' : '#8B5CF6',
          }}
        >
          <Sparkles size={12} />
          Analyse Kai
        </button>
      </div>

      {/* ── Panel Kai ── */}
      {kaiOpen && (
        <div className="flex-shrink-0 mx-4 mt-3 bg-white rounded-2xl border border-[#8B5CF620] overflow-hidden shadow-sm">
          {/* Header panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-[#8B5CF6]" />
              <span className="text-[12px] font-bold text-[#8B5CF6]">Analyse Kai</span>
              {kaiScore !== null && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                      style={{
                        background: kaiScore >= 70 ? '#16a34a18' : kaiScore >= 40 ? '#f9731618' : '#dc262618',
                        color:      kaiScore >= 70 ? '#16a34a'   : kaiScore >= 40 ? '#f97316'   : '#dc2626',
                      }}>
                  {kaiScore >= 70 ? '🔥 Chaud' : kaiScore >= 40 ? '🌡 Tiède' : '❄️ Froid'} · {kaiScore}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {kaiState === 'done' && (
                <button onClick={() => void analyzeKai()} className="text-[10px] text-[#9CA3AF] hover:text-[#8B5CF6] transition-colors font-medium">
                  Réanalyser
                </button>
              )}
              <button onClick={() => setKaiOpen(false)} className="text-[#9CA3AF] hover:text-[#111] transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 py-3 max-h-48 overflow-y-auto">
            {kaiState === 'loading' && !kaiSummary && (
              <div className="flex items-center gap-2 text-[12px] text-[#9CA3AF]">
                <SpinnerIcon size={13} className="animate-spin text-[#8B5CF6]" />
                Kai analyse la conversation…
              </div>
            )}
            {kaiState === 'error' && (
              <p className="text-[12px] text-red-500">Erreur lors de l'analyse.</p>
            )}
            {kaiSummary && (
              <div className="mb-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Résumé du lead</p>
                <p className="text-[12px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {kaiSummary}
                  {kaiState === 'loading' && <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] ml-0.5 animate-pulse align-middle" />}
                </p>
              </div>
            )}
            {kaiAction && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Prochaine action</p>
                <p className="text-[12px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {kaiAction}
                  {kaiState === 'loading' && <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] ml-0.5 animate-pulse align-middle" />}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Thread ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[#3462EE] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.date} className="flex flex-col gap-3">
                {/* Séparateur date */}
                <div className="flex items-center justify-center my-1">
                  <span className="text-[10px] font-semibold text-[#9CA3AF] bg-[#E4E6E1] px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} channel={conversation.channel} />
                ))}
              </div>
            ))}
            {streaming !== null && <StreamingBubble content={streaming} />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Composer ── */}
      <ComposerBar
        conversation={conversation}
        onMessageSent={handleMessageSent}
        onAiToggle={onAiToggle}
        aiEnabled={aiEnabled}
        toast={toast}
      />
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
