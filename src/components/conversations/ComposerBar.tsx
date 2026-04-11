'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, Zap } from 'lucide-react'
import { type Conversation } from './types'
import { fetchJSON } from '@/lib/fetchJSON'
import { type ToastType } from '@/hooks/useToast'

type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

const CHANNEL_OPTIONS: { value: SendChannel; label: string; color: string; icon: React.ReactNode }[] = [
  {
    value: 'WhatsApp',
    label: 'Whatsapp',
    color: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    value: 'SMS',
    label: 'SMS',
    color: '#0EA5E9',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="9" y1="10" x2="9" y2="10"/>
        <line x1="12" y1="10" x2="12" y2="10"/>
        <line x1="15" y1="10" x2="15" y2="10"/>
      </svg>
    ),
  },
  {
    value: 'Email',
    label: 'Email',
    color: '#F43F5E',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
  },
]

function defaultChannel(conv: Conversation): SendChannel {
  if (conv.channel === 'whatsapp') return 'WhatsApp'
  if (conv.channel === 'sms')      return 'SMS'
  if (conv.channel === 'email')    return 'Email'
  return 'WhatsApp'
}

interface Props {
  conversation:  Conversation
  onMessageSent: (content: string, channel: SendChannel) => void
  onAiToggle:    (enabled: boolean) => void
  aiEnabled:     boolean
  disabled?:     boolean
  toast:         (message: string, type: ToastType) => void
}

export default function ComposerBar({ conversation, onMessageSent, onAiToggle, aiEnabled, disabled, toast }: Props) {
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [channel,     setChannel]     = useState<SendChannel>(() => defaultChannel(conversation))
  const [channelOpen, setChannelOpen] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setChannel(defaultChannel(conversation))
    setChannelOpen(false)
    setInput('')
    setError(null)
  }, [conversation.id, conversation.channel])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setChannelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending || disabled) return
    setSending(true)
    setError(null)
    try {
      await fetchJSON('/api/send-message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          contactId:      conversation.contact_id ?? undefined,
          message:        content,
          type:           channel,
          ...(channel === 'Email' && conversation.subject ? { subject: conversation.subject } : {}),
        }),
      })
      setInput('')
      onMessageSent(content, channel)
      inputRef.current?.focus()
      toast('Message envoyé', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi')
      toast("Erreur lors de l'envoi", 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleToggleAI() {
    const next = !aiEnabled
    onAiToggle(next)
    try {
      await fetchJSON(`/api/conversation/${conversation.id}/ai`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ai_enabled: next }),
      })
    } catch {
      onAiToggle(!next)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  const selectedOption = CHANNEL_OPTIONS.find(o => o.value === channel) ?? CHANNEL_OPTIONS[0]!

  return (
    <div className="flex-shrink-0 px-4 pb-3">
      {error && (
        <div className="mb-2 px-3 py-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">

        {/* ── Ligne haute : canal + toggle IA ── */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-[#F3F4F6]">

          {/* Sélecteur canal */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setChannelOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#F9F9F7] transition-colors"
            >
              {selectedOption.icon}
              <span className="text-[12px] font-semibold text-[#111]">{selectedOption.label}</span>
              <ChevronDown size={11} className="text-[#9CA3AF]" />
            </button>

            {channelOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 min-w-[130px] z-20">
                {CHANNEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setChannel(opt.value); setChannelOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F5F5F0] transition-colors"
                    style={{ color: opt.color }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle IA */}
          <button
            onClick={handleToggleAI}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
            style={{ color: aiEnabled ? '#8B5CF6' : '#9CA3AF' }}
          >
            <Zap size={12} className={aiEnabled ? 'text-[#8B5CF6]' : 'text-[#9CA3AF]'} />
            <span>Instant reply with AI</span>
            <div
              className="w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ml-0.5"
              style={{ background: aiEnabled ? '#8B5CF6' : '#D1D5DB' }}
            >
              <div
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform"
                style={{ transform: aiEnabled ? 'translateX(17px)' : 'translateX(2px)' }}
              />
            </div>
          </button>
        </div>

        {/* ── Textarea ── */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type messages here .."
          rows={2}
          disabled={disabled}
          className="w-full resize-none bg-white px-4 py-2 text-[13px] text-[#111111] placeholder-[#C4C9D4] outline-none disabled:opacity-50"
          style={{ maxHeight: 100, overflowY: 'auto' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 100)}px`
          }}
        />

        {/* ── Toolbar bas ── */}
        <div className="flex items-center justify-end px-3 pb-2.5">
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending || disabled}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#1a2b4a' }}
          >
            {sending
              ? <Loader2 size={15} className="text-white animate-spin" />
              : <Send size={15} className="text-white" />
            }
          </button>
        </div>

      </div>
    </div>
  )
}
