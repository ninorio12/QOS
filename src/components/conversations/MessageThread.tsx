'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import Link from 'next/link'
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

function ActivityBubble({ message, conversation }: { message: Message; conversation: Conversation }) {
  const meta = message.metadata as { messageType?: string } | undefined
  const isOpp = meta?.messageType === 'TYPE_ACTIVITY_OPPORTUNITY'

  const contactLine = [conversation.contact_name, conversation.contact_company]
    .filter(Boolean).join(' — ')

  return (
    <div className="flex justify-center my-1">
      <div className="max-w-[80%] bg-[#F3F4F6] border border-soren-border rounded-2xl px-4 py-3 text-center">
        {/* Title */}
        <p className="text-[11px] font-bold text-soren-muted uppercase tracking-wide mb-1">
          {message.content}
        </p>

        {isOpp && contactLine && (
          <p className="text-[12px] text-[#374151] mb-1">{contactLine}</p>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-soren-subtle mb-2">{formatTime(message.created_at)}</p>

        {isOpp && (
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3462EE] hover:underline"
          >
            Voir opportunités →
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Channel meta header (From / To) ─────────────────────────────────────────
function ChannelMetaHeader({
  channel,
  isInbound,
  conversation,
}: {
  channel: Conversation['channel']
  isInbound: boolean
  conversation: Conversation
}) {
  const phone = conversation.contact_phone ?? null
  const email = conversation.contact_email ?? null

  let icon: React.ReactNode
  let label: string
  let iconColor: string

  if (channel === 'whatsapp') {
    iconColor = '#22c55e'
    label = 'WhatsApp'
    icon = (
      <svg viewBox="0 0 24 24" width="9" height="9" fill={iconColor}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    )
  } else if (channel === 'email') {
    iconColor = '#F43F5E'
    label = 'E-mail'
    icon = (
      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    )
  } else {
    iconColor = '#0EA5E9'
    label = 'SMS'
    icon = (
      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  }

  const contactId = channel === 'email' ? email : phone
  const fromVal = isInbound ? (contactId ?? 'No Number Available') : 'No Number Available'
  const toVal   = isInbound ? 'No Number Available' : (contactId ?? 'No Number Available')

  return (
    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
            style={{ background: iconColor + '15', color: iconColor }}>
        {icon}{label}
      </span>
      <span className="text-[9px] text-[#C4C9D4]">
        De : <span className="text-soren-subtle font-medium">{fromVal}</span>
        {' · '}
        À : <span className="text-soren-subtle font-medium">{toVal}</span>
      </span>
    </div>
  )
}

// ── Helpers email content ────────────────────────────────────────────────────
function parseEmailContent(raw: string): { body: string; unsubUrl: string | null } {
  // Détecte "If you no longer wish... unsubscribe\n[url]" ou juste une URL msgsndr
  const unsubBlockRe = /If you no longer wish[\s\S]*?unsubscribe\s*\n?\[([^\]]+)\]/i
  const match = raw.match(unsubBlockRe)
  let body = raw
  let unsubUrl: string | null = null

  if (match) {
    body     = raw.slice(0, match.index).trimEnd()
    unsubUrl = match[1] ?? null
  } else {
    // Fallback : URL msgsndr seule
    const urlRe = /\[?(https?:\/\/services\.msgsndr\.com[^\]\s]*)\]?/
    const urlMatch = raw.match(urlRe)
    if (urlMatch) {
      body     = raw.slice(0, urlMatch.index).trimEnd()
      unsubUrl = urlMatch[1] ?? null
    }
  }

  // Nettoyage du corps :
  // - Supprimer les lignes qui sont juste "- " ou "–" (signature vide)
  // - Supprimer les lignes terminant par ":" sans contenu (variables template non remplies)
  // - Supprimer les URLs nues
  body = body
    .split('\n')
    .filter(line => {
      const t = line.trim()
      if (!t) return true                          // garder les lignes vides (espacement)
      if (/^-+\s*$/.test(t)) return false          // "- " ou "---"
      if (/^https?:\/\//.test(t)) return false     // URL nue
      if (/^\[https?:\/\//.test(t)) return false   // URL entre crochets
      return true
    })
    .join('\n')
    // Réduire les blocs de 3+ sauts de ligne à max 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { body, unsubUrl }
}

// ── Email card — accordéon style GHL ─────────────────────────────────────────
function EmailCard({ message, conversation }: { message: Message; conversation: Conversation }) {
  const [open, setOpen] = useState(false)
  const isInbound = message.role === 'user'
  const { body, unsubUrl } = parseEmailContent(message.content)

  // Préview : première ligne significative du corps (ignore ponctuation seule)
  const firstLine = body.split('\n').map(l => l.trim()).find(l => l.length > 3 && !/^[-–—.,:;!?]+$/.test(l)) ?? ''
  const preview   = firstLine.length > 72 ? firstLine.slice(0, 72) + '…' : firstLine

  // Nom affiché dans la barre
  const senderName = isInbound
    ? (conversation.contact_name ?? 'Contact')
    : 'Kai'

  // Paragraphes pour le corps déplié — on splitte sur double saut de ligne
  const paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  return (
    <div className="flex justify-stretch w-full">
      <div className="flex flex-col gap-1 w-full max-w-[90%]">

        {/* ── Barre accordéon ── */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F3F4F6] hover:bg-[#EAEBEC] transition-colors text-left group"
        >
          {/* Icône email */}
          <div className="w-6 h-6 rounded-full bg-[#F43F5E18] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polyline points="2,4 12,13 22,4"/>
            </svg>
          </div>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-[#374151]">{senderName}</span>
            {preview && (
              <span className="text-[12px] text-soren-subtle">, {preview}</span>
            )}
          </div>

          {/* Heure + chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-[#B0B7C3]">{formatTime(message.created_at)}</span>
            <svg
              viewBox="0 0 24 24" width="12" height="12" fill="none"
              stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>

        {/* ── Contenu déplié ── */}
        {open && (
          <div className="bg-soren-card border border-[#E8E8E5] rounded-xl overflow-hidden shadow-sm mx-1">
            {/* Corps */}
            <div className="px-5 py-4 space-y-2.5">
              {paragraphs.map((para, i) => {
                if (/^https?:\/\//.test(para)) return null
                // Les lignes internes au paragraphe respectent les \n simples
                const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
                if (lines.length === 0) return null
                return (
                  <p key={i} className="text-[13px] text-[#374151] leading-[1.6]">
                    {lines.map((line, j) => (
                      <span key={j}>
                        {renderContent(line)}
                        {j < lines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                )
              })}
            </div>

            {/* Footer unsubscribe */}
            {unsubUrl && (
              <div className="px-5 py-2 border-t border-[#F0F0EE] bg-[#FAFAF9]">
                <a
                  href={unsubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-[#C4C9D4] hover:text-soren-subtle transition-colors underline"
                >
                  Se désabonner
                </a>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// Détecte si un message ressemble à un email (unsubscribe URL ou longueur email typique)
function looksLikeEmail(content: string): boolean {
  return /If you no longer wish|msgsndr\.com|unsubscribe/i.test(content) || content.length > 400
}

function MessageBubble({ message, channel, conversation }: { message: Message; channel: Conversation['channel']; conversation: Conversation }) {
  // Activités internes (non visibles par le prospect)
  if (message.role === 'system') {
    return <ActivityBubble message={message} conversation={conversation} />
  }

  const isContact  = message.role === 'user'
  const meta       = message.metadata as { channel?: string; manual?: boolean; source?: string } | undefined
  const isKai      = message.role === 'assistant' && !meta?.manual

  // Email → rendu carte document (canal email OU contenu ressemblant à un email)
  if (channel === 'email' || looksLikeEmail(message.content)) {
    return <EmailCard message={message} conversation={conversation} />
  }

  if (isContact) {
    return (
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[68%] items-start">
          <div className="px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-soren-card text-soren-text rounded-2xl rounded-tl-md shadow-sm">
            {renderContent(message.content)}
          </div>
          <span className="text-[10px] text-[#B0B7C3] px-1">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    )
  }

  if (isKai) {
    return (
      <div className="flex justify-end">
        <div className="flex flex-col gap-1 max-w-[68%] items-end">
          <div className="px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-white rounded-2xl rounded-tr-md"
               style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)' }}>
            {renderContent(message.content)}
          </div>
          <span className="text-[10px] text-[#B0B7C3] px-1 flex items-center gap-1">
            <Sparkles size={9} className="text-[#8B5CF6]" />
            Kai · {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    )
  }

  // Message manuel (envoyé par l'humain)
  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-1 max-w-[68%] items-end">
        <div className="px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-white rounded-2xl rounded-tr-md"
             style={{ background: 'linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)' }}>
          {renderContent(message.content)}
        </div>
        <span className="text-[10px] text-[#B0B7C3] px-1">
          {formatTime(message.created_at)}
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
             style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)' }}>
          {content || (
            <span className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-soren-card/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-soren-card/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-soren-card/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {content && <span className="inline-block w-0.5 h-3.5 bg-soren-card/60 ml-0.5 animate-pulse align-middle" />}
        </div>
        <span className="text-[10px] text-[#B0B7C3] px-1 flex items-center gap-1">
          <Sparkles size={9} className="text-[#8B5CF6]" />
          Kai · en cours…
        </span>
      </div>
    </div>
  )
}

interface Props {
  conversation:    Conversation
  initialMessages: Message[]
  aiEnabled:       boolean
  onAiToggle:      (enabled: boolean) => void
  onMessageSent?:  (msg: Message) => void
}

export default function MessageThread({ conversation, initialMessages, aiEnabled, onAiToggle, onMessageSent }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const [messages,    setMessages]    = useState<Message[]>(initialMessages)
  const [isLoading,   setIsLoading]   = useState(initialMessages.length === 0)
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

  // Sync quand initialMessages change (nouvelle conv sélectionnée)
  useEffect(() => {
    setStreaming(null)
    if (initialMessages.length > 0) {
      setMessages(initialMessages)
      setIsLoading(false)
    } else {
      setMessages([])
      setIsLoading(true)
    }
  }, [conversation.id, initialMessages])

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
      role:            'user' as const,
      content,
      metadata:        { channel },
      created_at:      new Date().toISOString(),
    }
    setMessages(prev => [...prev, msg])
    onMessageSent?.(msg)
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
    <div className="flex flex-col h-full bg-soren-app">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-soren-card border-b border-[#F0F0EB] flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
          style={{ background: color + '22', color }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-soren-text truncate">{name}</p>
          </div>
          {conversation.contact_company && (
            <p className="text-[11px] text-soren-subtle truncate">{conversation.contact_company}</p>
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
        <div className="flex-shrink-0 mx-4 mt-3 bg-soren-card rounded-2xl border border-[#8B5CF620] overflow-hidden shadow-sm">
          {/* Header panel */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#8B5CF6]" />
              <span className="text-[11px] font-bold text-[#8B5CF6] tracking-wide">Analyse Kai</span>
            </div>
            <div className="flex items-center gap-2">
              {kaiState === 'done' && (
                <button onClick={() => void analyzeKai()} className="text-[10px] text-[#C4C9D4] hover:text-[#8B5CF6] transition-colors font-medium">
                  Réanalyser
                </button>
              )}
              <button onClick={() => setKaiOpen(false)} className="text-[#C4C9D4] hover:text-[#111] transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-4 py-3">
            {kaiState === 'loading' && !kaiSummary && (
              <div className="flex items-center gap-2 text-[11px] text-soren-subtle">
                <SpinnerIcon size={12} className="animate-spin text-[#8B5CF6]" />
                Analyse en cours…
              </div>
            )}
            {kaiState === 'error' && (
              <p className="text-[11px] text-red-400">Erreur lors de l'analyse.</p>
            )}

            {kaiSummary && (() => {
              const lines = kaiSummary.split('\n').map(l => l.trim()).filter(Boolean)
              const rows = lines.map(line => {
                const colonIdx = line.indexOf(': ')
                if (colonIdx === -1) return { key: null, val: line }
                return { key: line.slice(0, colonIdx), val: line.slice(colonIdx + 2) }
              })
              return (
                <div className="space-y-2.5">
                  {rows.map((row, i) => (
                    <div key={i}>
                      {row.key && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#C4C9D4] mb-0.5">{row.key}</p>
                      )}
                      <p className="text-[12px] text-[#374151] leading-snug">
                        {row.val}
                        {i === rows.length - 1 && kaiState === 'loading' && (
                          <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] ml-0.5 animate-pulse align-middle" />
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Thread ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[false, true, false, false, true, false].map((isMe, i) => (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!isMe && <div className="w-7 h-7 rounded-full bg-[#D9DDD6] flex-shrink-0" />}
                <div
                  className={`h-9 rounded-2xl ${isMe ? 'bg-[#D9DDD6]' : 'bg-[#E5E7EB]'}`}
                  style={{ width: `${28 + (i * 9) % 28}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.date} className="flex flex-col gap-3">
                {/* Séparateur date */}
                <div className="flex items-center justify-center my-1">
                  <span className="text-[10px] font-semibold text-soren-subtle bg-[#E4E6E1] px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} channel={conversation.channel} conversation={conversation} />
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
        toast={toast}
      />
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
