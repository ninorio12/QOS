'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, Bot } from 'lucide-react'
import { type Conversation } from './types'
import { fetchJSON } from '@/lib/fetchJSON'

type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

const CHANNEL_OPTIONS: { value: SendChannel; label: string; color: string }[] = [
  { value: 'WhatsApp', label: 'WhatsApp', color: '#22c55e' },
  { value: 'SMS',      label: 'SMS',      color: '#6B7280' },
  { value: 'Email',    label: 'Email',    color: '#4A91A8' },
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
}

export default function ComposerBar({ conversation, onMessageSent, onAiToggle, aiEnabled, disabled }: Props) {
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [channel,     setChannel]     = useState<SendChannel>(() => defaultChannel(conversation))
  const [channelOpen, setChannelOpen] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  // Reset channel when conversation changes
  useEffect(() => {
    setChannel(defaultChannel(conversation))
    setChannelOpen(false)
    setInput('')
    setError(null)
  }, [conversation.id, conversation.channel])

  // Close dropdown on outside click
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
          message:        content,
          type:           channel,
          ...(channel === 'Email' && conversation.subject ? { subject: conversation.subject } : {}),
        }),
      })
      setInput('')
      onMessageSent(content, channel)
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  async function handleToggleAI() {
    const next = !aiEnabled
    onAiToggle(next) // optimistic
    try {
      await fetchJSON(`/api/conversation/${conversation.id}/ai`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ai_enabled: next }),
      })
    } catch {
      onAiToggle(!next) // rollback
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  const selectedOption = CHANNEL_OPTIONS.find(o => o.value === channel) ?? CHANNEL_OPTIONS[0]!

  return (
    <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white">
      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      {/* AI toggle row */}
      <div className="flex items-center justify-end px-4 pt-2">
        <button
          onClick={handleToggleAI}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
          style={{ color: aiEnabled ? '#8B5CF6' : '#9CA3AF' }}
        >
          <Bot size={13} />
          Réponse auto IA
          <div
            className="w-8 h-4 rounded-full transition-colors relative flex-shrink-0"
            style={{ background: aiEnabled ? '#8B5CF6' : '#D1D5DB' }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform"
              style={{ transform: aiEnabled ? 'translateX(17px)' : 'translateX(2px)' }}
            />
          </div>
        </button>
      </div>

      {/* Composer row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Channel selector */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setChannelOpen(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
            style={{ color: selectedOption.color }}
          >
            {selectedOption.label}
            <ChevronDown size={10} />
          </button>
          {channelOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 min-w-[110px] z-20">
              {CHANNEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setChannel(opt.value); setChannelOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-[#F5F5F0] transition-colors"
                  style={{ color: opt.color }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors disabled:opacity-50"
          style={{ maxHeight: 120, overflowY: 'auto' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />

        {/* Send button */}
        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || sending || disabled}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#111111] hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {sending
            ? <Loader2 size={15} className="text-white animate-spin" />
            : <Send size={15} className="text-white" />
          }
        </button>
      </div>
    </div>
  )
}
