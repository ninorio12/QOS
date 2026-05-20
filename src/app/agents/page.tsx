// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bot, Zap, User, Send, ChevronDown, ChevronRight } from 'lucide-react'

const supabase = createClient()

type MsgType = 'task' | 'start' | 'progress' | 'result' | 'error' | 'ack'

type Msg = {
  id: number
  from_agent: string
  to_agent: string
  type: MsgType
  subject: string | null
  payload: Record<string, unknown>
  ref_id: number | null
  read: boolean
  created_at: string
}

const AGENT_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  qos:    { label: 'QOS',    color: '#3462EE', bg: '#1a2a5e', icon: <Zap size={14} /> },
  hermes: { label: 'Hermes', color: '#C8F135', bg: '#2a3a10', icon: <Bot size={14} /> },
  all:    { label: 'Tous',   color: '#8896AB', bg: '#1A2235', icon: <User size={14} /> },
}

const TYPE_META: Record<MsgType, { icon: string; color: string }> = {
  task:     { icon: '📋', color: '#3462EE' },
  start:    { icon: '🚀', color: '#4A91A8' },
  progress: { icon: '⏳', color: '#EFE347' },
  result:   { icon: '✅', color: '#C8F135' },
  error:    { icon: '❌', color: '#EF4444' },
  ack:      { icon: '👍', color: '#8896AB' },
}

function MessageBubble({ msg }: { msg: Msg }) {
  const [open, setOpen] = useState(msg.type === 'error' || msg.type === 'result')
  const from   = AGENT_META[msg.from_agent] ?? AGENT_META.all
  const toMeta = AGENT_META[msg.to_agent]   ?? AGENT_META.all
  const type   = TYPE_META[msg.type]
  const hasPayload = Object.keys(msg.payload ?? {}).length > 0

  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const isQOS = msg.from_agent === 'qos'

  return (
    <div className={`flex gap-3 ${isQOS ? 'justify-end' : 'justify-start'}`}>
      {!isQOS && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: from.bg, color: from.color, border: `1px solid ${from.color}33` }}>
          {from.icon}
        </div>
      )}

      <div className={`max-w-[75%] min-w-[200px] rounded-xl overflow-hidden border ${isQOS ? 'border-[#3462EE33]' : 'border-[#ffffff10]'}`}
        style={{ background: isQOS ? '#1a2a5e' : '#1A2235' }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#ffffff08]">
          <span className="text-xs" style={{ color: from.color }}>{from.label}</span>
          <span className="text-[10px] text-[#8896AB]">→</span>
          <span className="text-xs" style={{ color: toMeta.color }}>{toMeta.label}</span>
          <span className="ml-auto text-[10px] text-[#8896AB]">{type.icon} {msg.type}</span>
          <span className="text-[10px] text-[#8896AB]">{time}</span>
        </div>

        {/* Subject */}
        <div className="px-3 py-2">
          <p className="text-sm text-white font-medium">{msg.subject ?? '—'}</p>
        </div>

        {/* Payload collapsible */}
        {hasPayload && (
          <div className="border-t border-[#ffffff08]">
            <button
              onClick={() => setOpen(o => !o)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#8896AB] hover:text-white transition-colors">
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Détails
            </button>
            {open && (
              <pre className="px-3 pb-3 text-[11px] text-[#C8F135] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(msg.payload, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {isQOS && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: from.bg, color: from.color, border: `1px solid ${from.color}33` }}>
          {from.icon}
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading]   = useState(true)
  const [input, setInput]       = useState('')
  const [to, setTo]             = useState<'hermes' | 'all'>('hermes')
  const [type, setType]         = useState<MsgType>('task')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Chargement initial
  useEffect(() => {
    supabase.from('agent_messages').select('*').order('created_at').then(({ data }: { data: any }) => {
      setMessages((data ?? []) as Msg[])
      setLoading(false)
    })
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('agent_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages' }, payload => {
        setMessages(prev => [...prev, payload.new as Msg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Scroll au bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return
    const subject = input.trim()
    setInput('')

    await fetch('/api/agent/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type, subject, payload: {} }),
    })
  }

  const unread = messages.filter(m => !m.read && m.to_agent !== 'hermes').length

  return (
    <div className="h-full flex flex-col bg-[#0F1623]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1A2235]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C8F135] animate-pulse" />
          <span className="text-sm font-semibold text-white">Bridge Agents</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {Object.entries(AGENT_META).filter(([k]) => k !== 'all').map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
              {meta.icon} {meta.label}
            </span>
          ))}
        </div>
        {unread > 0 && (
          <span className="ml-auto text-xs bg-[#EF4444] text-white px-2 py-0.5 rounded-full">
            {unread} non lu{unread > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-[#8896AB] text-sm py-10">Chargement…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[#8896AB] text-sm py-10">
            Aucun message. Envoyez une tâche à Hermes pour commencer.
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[#1A2235] px-5 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Type selector */}
          <div className="flex gap-1">
            {(['task', 'result', 'ack'] as MsgType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className="text-[11px] px-2 py-1 rounded transition-colors"
                style={type === t
                  ? { background: TYPE_META[t].color + '30', color: TYPE_META[t].color }
                  : { color: '#8896AB' }}>
                {TYPE_META[t].icon} {t}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-[#1A2235]" />
          {/* To selector */}
          {(['hermes', 'all'] as const).map(a => (
            <button key={a} onClick={() => setTo(a)}
              className="text-[11px] px-2 py-1 rounded transition-colors"
              style={to === a
                ? { background: AGENT_META[a].color + '20', color: AGENT_META[a].color }
                : { color: '#8896AB' }}>
              → {AGENT_META[a].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Envoyer une ${type} à ${AGENT_META[to].label}…`}
            className="flex-1 bg-[#1A2235] border border-[#ffffff10] rounded-lg px-3 py-2 text-sm text-white placeholder-[#8896AB] outline-none focus:border-[#3462EE]"
          />
          <button onClick={sendMessage}
            className="p-2 rounded-lg bg-[#3462EE] hover:bg-[#2a52d4] transition-colors">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
