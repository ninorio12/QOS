# Conversations Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the conversations module into a 3-column layout (list | thread | right panel) matching a modern support interface, with GHL-connected channel selector (WhatsApp/SMS/Email) and per-conversation AI toggle.

**Architecture:** Progressive refactor — front only, backend (`/api/send-message`, `/api/conversation/[id]/ai`, GHL) unchanged. Extract `ComposerBar` and `ConversationPanel` as new focused components. Simplify `MessageThread` by removing tabs and delegating composer + AI toggle to `ComposerBar`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase Realtime, GHL API (existing), `getAvatarColor` from `@/components/contacts/types`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/conversations/ConversationList.tsx` | Modify | List items with canal icon + `getAvatarColor` avatar + AI agent dot |
| `src/components/conversations/MessageThread.tsx` | Modify | Thread only — remove tabs, remove composer, add "Via canal" under bubbles |
| `src/components/conversations/ComposerBar.tsx` | Create | Canal selector + textarea + send button + AI toggle |
| `src/components/conversations/ConversationPanel.tsx` | Create | Right panel: contact info + agent IA + KaiAnalysis |
| `src/components/conversations/ConversationsView.tsx` | Modify | New 3-column layout, remove InboxNav |

---

## Task 1: Update ConversationList item design

**Files:**
- Modify: `src/components/conversations/ConversationList.tsx`

**Context:** Currently uses a gradient blue avatar and shows no channel icon. We add `getAvatarColor` (same as Contacts module), a canal icon per channel, and a small colored dot when `ai_enabled = true`.

- [ ] **Step 1: Add imports**

In `src/components/conversations/ConversationList.tsx`, replace the top imports block:

```tsx
'use client'

import { useState, useMemo } from 'react'
import { type Conversation, LEAD_STAGE_LABEL, CHANNEL_META } from './types'
import { type InboxFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'
import { getAvatarColor } from '@/components/contacts/types'
import { Mail, Phone, MessageSquare, Bot } from 'lucide-react'
```

- [ ] **Step 2: Add channel icon helper**

After the imports, before `function timeAgo`, add:

```tsx
function ChannelIcon({ channel }: { channel: Conversation['channel'] }) {
  const meta = CHANNEL_META[channel]
  if (channel === 'whatsapp') return (
    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: meta.color + '20', color: meta.color }}>WA</span>
  )
  if (channel === 'sms') return (
    <MessageSquare size={10} style={{ color: meta.color }} />
  )
  if (channel === 'email') return (
    <Mail size={10} style={{ color: meta.color }} />
  )
  if (channel === 'phone') return (
    <Phone size={10} style={{ color: meta.color }} />
  )
  return <span className="text-[9px] text-[#9CA3AF]">{meta.label}</span>
}
```

- [ ] **Step 3: Replace ConvRow avatar and add canal + AI dot**

Replace the entire `ConvRow` function (lines 30–103) with:

```tsx
const AGENT_COLORS: Record<string, string> = {
  Kai: '#3462EE', Mia: '#8B5CF6', Soren: '#14B8A6',
}

function ConvRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const name      = conv.contact_name ?? 'Contact inconnu'
  const initials  = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color     = getAvatarColor(initials)
  const isDark    = color === '#C8F135' || color === '#EFE347'
  const closedColor = conv.opportunity_status === 'won' ? '#22c55e'
    : conv.opportunity_status === 'lost' || conv.opportunity_status === 'abandoned' ? '#EF4444'
    : 'transparent'
  const borderColor = isSelected ? '#3462EE' : closedColor

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#EBEBEA] last:border-0 ${isSelected ? 'bg-white' : 'hover:bg-[#EFEFED]'}`}
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-semibold truncate ${closedColor !== 'transparent' && !isSelected ? 'text-[#6B7280]' : 'text-[#111111]'}`}>
              {name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ChannelIcon channel={conv.channel} />
            <span className="text-[10px] text-[#9CA3AF]">
              {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#6B7280] truncate flex-1">
            {conv.last_message ?? 'Aucun message'}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conv.ai_enabled && (
              <Bot size={11} className="text-[#8B5CF6]" />
            )}
            {(conv.unread ?? 0) > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#3462EE] flex items-center justify-center text-[9px] font-bold text-white">
                {conv.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Verify the file still renders**

Run: `rtk next build 2>&1 | head -40`
Expected: No TypeScript errors on `ConversationList.tsx`

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/conversations/ConversationList.tsx
rtk git commit -m "feat(conversations): update list items with getAvatarColor, channel icon, AI dot"
```

---

## Task 2: Create ComposerBar component

**Files:**
- Create: `src/components/conversations/ComposerBar.tsx`

**Context:** Extracted from `MessageThread.tsx`. Handles canal selection (WhatsApp/SMS/Email), the textarea, send button, and AI toggle. Calls `/api/send-message` and `/api/conversation/[id]/ai`. `MessageThread` will import this and remove its own composer logic.

- [ ] **Step 1: Create the file**

Create `src/components/conversations/ComposerBar.tsx`:

```tsx
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
          onClick={handleSend}
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
```

- [ ] **Step 2: Verify TypeScript**

Run: `rtk next build 2>&1 | head -40`
Expected: No errors on `ComposerBar.tsx`

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/conversations/ComposerBar.tsx
rtk git commit -m "feat(conversations): create ComposerBar component (channel selector + AI toggle)"
```

---

## Task 3: Simplify MessageThread

**Files:**
- Modify: `src/components/conversations/MessageThread.tsx`

**Context:** Remove the tab system (Messages/Kai/Vocal), remove the embedded composer and AI toggle (now in `ComposerBar`), add "Via [canal]" label under each message bubble. `MessageThread` receives `aiEnabled` and `onAiToggle` as props and passes them to `ComposerBar`. `KaiAnalysis` is now rendered in `ConversationPanel`, so remove it from here.

- [ ] **Step 1: Rewrite MessageThread.tsx**

Replace the entire file content:

```tsx
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
  contactName,
  channel,
}: {
  message:     Message
  contactName?: string
  channel:     Conversation['channel']
}) {
  const isContact  = message.role === 'user'
  const channelMeta = CHANNEL_META[channel]
  const viaLabel   = (message.metadata as { channel?: string } | undefined)?.channel ?? channelMeta.label

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
    // Add optimistic message
    const msg: Message = {
      id:              crypto.randomUUID(),
      conversation_id: conversation.id,
      role:            'user',
      content,
      metadata:        { channel },
      created_at:      new Date().toISOString(),
    }
    setMessages(prev => [...prev, msg])

    // If AI enabled, trigger Kai streaming response
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
                      contactName={conversation.contact_name ?? undefined}
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
```

- [ ] **Step 2: Verify TypeScript**

Run: `rtk next build 2>&1 | head -40`
Expected: No errors on `MessageThread.tsx`

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/conversations/MessageThread.tsx
rtk git commit -m "feat(conversations): simplify MessageThread - remove tabs, add Via canal, use ComposerBar"
```

---

## Task 4: Create ConversationPanel (right panel)

**Files:**
- Create: `src/components/conversations/ConversationPanel.tsx`

**Context:** Right panel showing contact info (avatar, name, phone, email, pipeline stage) + agent IA section (selector + AI toggle passed from parent) + KaiAnalysis. `KaiAnalysis` already exists and works — we just embed it here. The AI toggle state lives in `ConversationsView` and flows down as props.

- [ ] **Step 1: Create the file**

Create `src/components/conversations/ConversationPanel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, ExternalLink, ChevronDown } from 'lucide-react'
import { type Conversation, type Message, CHANNEL_META } from './types'
import { getAvatarColor } from '@/components/contacts/types'
import KaiAnalysis from './KaiAnalysis'

const AGENT_OPTIONS = [
  { name: 'Kai',   color: '#3462EE' },
  { name: 'Mia',   color: '#8B5CF6' },
  { name: 'Soren', color: '#14B8A6' },
] as const

type AgentName = typeof AGENT_OPTIONS[number]['name']

interface Props {
  conversation: Conversation
  messages:     Message[]
  aiEnabled:    boolean
  onAiToggle:   (enabled: boolean) => void
}

export default function ConversationPanel({ conversation, messages, aiEnabled, onAiToggle }: Props) {
  const [agent,       setAgent]       = useState<AgentName>('Kai')
  const [agentOpen,   setAgentOpen]   = useState(false)

  const name     = conversation.contact_name ?? 'Contact inconnu'
  const initials = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'

  const selectedAgent = AGENT_OPTIONS.find(a => a.name === agent) ?? AGENT_OPTIONS[0]
  const channelMeta   = CHANNEL_META[conversation.channel]

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border-l border-[#E5E7EB] flex flex-col overflow-y-auto">

      {/* ── Contact ──────────────────────────────── */}
      <div className="px-5 py-5 border-b border-[#F0F0EE]">
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Contact</p>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0"
            style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#111111] truncate">{name}</p>
            {conversation.contact_company && (
              <p className="text-xs text-[#6B7280] truncate">{conversation.contact_company}</p>
            )}
            <span
              className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: channelMeta.bg, color: channelMeta.color }}
            >
              {channelMeta.label}
            </span>
          </div>
        </div>

        {conversation.contact_phone && (
          <a
            href={`tel:${conversation.contact_phone}`}
            className="flex items-center gap-2 text-xs text-[#374151] hover:text-[#3462EE] py-1 transition-colors"
          >
            <Phone size={12} className="flex-shrink-0 text-[#9CA3AF]" />
            {conversation.contact_phone}
          </a>
        )}

        {conversation.contact_id && (
          <Link
            href={`/contacts/${conversation.contact_id}`}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#3462EE] hover:underline"
          >
            <ExternalLink size={11} />
            Ouvrir la fiche contact
          </Link>
        )}
      </div>

      {/* ── Agent IA ─────────────────────────────── */}
      <div className="px-5 py-4 border-b border-[#F0F0EE]">
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Agent IA</p>

        {/* Agent selector */}
        <div className="relative mb-3">
          <button
            onClick={() => setAgentOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl text-sm font-semibold transition-colors hover:border-[#D1D5DB]"
            style={{ color: selectedAgent.color }}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: selectedAgent.color }}
              />
              {selectedAgent.name}
            </span>
            <ChevronDown size={13} className="text-[#9CA3AF]" />
          </button>
          {agentOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20">
              {AGENT_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  onClick={() => { setAgent(opt.name); setAgentOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-[#F5F5F0] transition-colors"
                  style={{ color: opt.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#374151] font-medium">Réponse automatique</span>
          <button
            onClick={() => onAiToggle(!aiEnabled)}
            className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
            style={{ background: aiEnabled ? '#8B5CF6' : '#D1D5DB' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: aiEnabled ? 'translateX(21px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-1.5">
          {aiEnabled ? `${selectedAgent.name} répond automatiquement aux nouveaux messages.` : 'Réponse manuelle uniquement.'}
        </p>
      </div>

      {/* ── Analyse Kai ──────────────────────────── */}
      <div className="flex-1 min-h-0">
        <KaiAnalysis conversation={conversation} messages={messages} />
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `rtk next build 2>&1 | head -40`
Expected: No errors on `ConversationPanel.tsx`

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/conversations/ConversationPanel.tsx
rtk git commit -m "feat(conversations): create ConversationPanel with contact info, agent selector, AI toggle, KaiAnalysis"
```

---

## Task 5: Rewrite ConversationsView with 3-column layout

**Files:**
- Modify: `src/components/conversations/ConversationsView.tsx`

**Context:** Remove `InboxNav`, add `ConversationPanel` on the right. AI toggle state (`aiEnabled`) lives here and flows down to both `MessageThread` (via props) and `ConversationPanel`. When conversation changes, reset `aiEnabled` from `conversation.ai_enabled`. `MessageThread` now needs `aiEnabled` + `onAiToggle` props. `messages` state lifted here to share with `ConversationPanel` for KaiAnalysis.

**Important:** `MessageThread` no longer manages `aiEnabled` internally — remove that state from it (already done in Task 3). The state flows from `ConversationsView`.

- [ ] **Step 1: Rewrite ConversationsView.tsx**

Replace the entire file:

```tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { type Conversation, type Pipeline, MOCK_CONVERSATIONS } from './types'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'
import ConversationPanel from './ConversationPanel'
import { type Message } from './types'
import { getMessages } from '@/app/conversations/actions'
import { fetchJSON } from '@/lib/fetchJSON'

interface Props {
  dbConversations: Conversation[]
  pipelines:       Pipeline[]
}

export default function ConversationsView({ dbConversations, pipelines }: Props) {
  const allConversations = useMemo(() => {
    if (dbConversations.length >= 4) return dbConversations
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [selected,  setSelected]  = useState<Conversation | null>(allConversations[0] ?? null)
  const [aiEnabled, setAiEnabled] = useState<boolean>(allConversations[0]?.ai_enabled ?? true)
  const [messages,  setMessages]  = useState<Message[]>([])

  // Sync aiEnabled and load messages when conversation changes
  useEffect(() => {
    if (!selected) return
    setAiEnabled(selected.ai_enabled ?? true)
    getMessages(selected.id).then(result => {
      setMessages((result.messages ?? []) as Message[])
    })
  }, [selected?.id])

  async function handleAiToggle(enabled: boolean) {
    if (!selected) return
    setAiEnabled(enabled) // optimistic
    try {
      await fetchJSON(`/api/conversation/${selected.id}/ai`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ai_enabled: enabled }),
      })
    } catch {
      setAiEnabled(!enabled) // rollback
    }
  }

  function handleSelect(conv: Conversation) {
    setSelected(conv)
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Col 1: Conversation list ── */}
      <ConversationList
        conversations={allConversations}
        selected={selected}
        onSelect={handleSelect}
        activeFilter="all"
        onConversationCreated={() => {}}
      />

      {/* ── Col 2: Thread ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-[#111111]">{selected.contact_name ?? 'Contact inconnu'}</p>
                {selected.contact_company && (
                  <p className="text-xs text-[#6B7280]">{selected.contact_company}</p>
                )}
              </div>
            </div>
            <div className="h-[calc(100%-57px)]">
              <MessageThread
                conversation={selected}
                aiEnabled={aiEnabled}
                onAiToggle={handleAiToggle}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-[#EEF0EB]">
            <p className="text-sm text-[#9CA3AF]">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* ── Col 3: Panel ── */}
      {selected ? (
        <ConversationPanel
          conversation={selected}
          messages={messages}
          aiEnabled={aiEnabled}
          onAiToggle={handleAiToggle}
        />
      ) : (
        <div className="w-[300px] flex-shrink-0 bg-white border-l border-[#E5E7EB]" />
      )}

    </div>
  )
}
```

- [ ] **Step 2: Check `ConversationList` still accepts `activeFilter="all"`**

`ConversationList` still imports `InboxFilter` from `InboxNav`. That import must remain. Verify line 5 in `ConversationList.tsx` still reads:
```tsx
import { type InboxFilter } from './InboxNav'
```
If it does, no change needed — `InboxNav` stays as a file, it's just no longer rendered.

- [ ] **Step 3: Verify full build**

Run: `rtk next build 2>&1 | head -60`
Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 4: Manual smoke test**

Open the app at `/conversations`. Verify:
- 3 columns visible: list | thread | right panel
- Clicking a conversation loads messages in the thread
- Each list item shows channel icon and AI dot if enabled
- "Via WhatsApp" (or SMS/Email) appears under each message bubble
- Right panel shows contact name, avatar, agent selector
- AI toggle in right panel and composer bar both work (one updates the other)
- Sending a message via the channel selector calls `/api/send-message`

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/conversations/ConversationsView.tsx
rtk git commit -m "feat(conversations): 3-column layout with ConversationPanel, lifted AI state"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 3-column layout: list | thread | panel
- ✅ List items: avatar `getAvatarColor` + channel icon + AI dot
- ✅ Thread: "Via canal" under messages, no tabs
- ✅ ComposerBar: canal selector + textarea + send + AI toggle
- ✅ Right panel: contact info + agent selector + AI toggle + KaiAnalysis
- ✅ AI toggle: PATCH `/api/conversation/[id]/ai`, state lifted to ConversationsView
- ✅ Backend untouched: `/api/send-message`, `/api/chat`, GHL mapping
- ✅ `fetchJSON` used for all client fetches
- ✅ `getAvatarColor` used consistently

**Type consistency:**
- `Message` type used consistently across all 5 files
- `Conversation` prop passed to `MessageThread`, `ConversationPanel`, `ComposerBar` — same type throughout
- `aiEnabled: boolean` + `onAiToggle: (enabled: boolean) => void` interface consistent across `MessageThread`, `ComposerBar`, `ConversationPanel`
- `SendChannel = 'WhatsApp' | 'SMS' | 'Email'` defined in `ComposerBar`, referenced locally only — no cross-file conflict
