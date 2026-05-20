'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Channel, CHANNEL_META } from './types'
import { getAvatarColor } from '@/components/contacts/types'

type FeedMessage = {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
  conversations: {
    id: string
    channel: Channel
    ai_enabled: boolean
    contact_name: string | null
  } | null
}

type ChannelFilter = 'all' | 'WhatsApp' | 'SMS' | 'Email'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}min`
  return "à l'instant"
}

function channelMatchesFilter(channel: Channel, filter: ChannelFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'WhatsApp') return channel === 'whatsapp'
  if (filter === 'SMS')      return channel === 'sms'
  if (filter === 'Email')    return channel === 'email'
  return true
}

function FeedCard({ message }: { message: FeedMessage }) {
  const conv = message.conversations
  if (!conv) return null
  const channelMeta = CHANNEL_META[conv.channel]
  const initials = (conv.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) ?? '??'
  const avatarColor = getAvatarColor(initials)

  return (
    <div className="bg-soren-card rounded-xl p-4 border border-soren-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: avatarColor + '22', color: avatarColor }}
          >
            {initials}
          </div>
          <span className="text-sm font-semibold text-soren-text">
            {conv.contact_name ?? 'Contact inconnu'}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
            style={{ color: channelMeta.color, borderColor: channelMeta.color + '40', background: channelMeta.bg }}
          >
            {channelMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-soren-subtle">{timeAgo(message.created_at)}</span>
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
            style={conv.ai_enabled
              ? { color: '#111111', background: '#22c55e18' }
              : { color: '#9CA3AF', background: '#9CA3AF18' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: conv.ai_enabled ? '#22c55e' : '#9CA3AF' }}
            />
            {conv.ai_enabled ? 'Kai ON' : 'Kai OFF'}
          </span>
        </div>
      </div>
      <p className="text-sm text-soren-muted leading-relaxed line-clamp-3">{message.content}</p>
    </div>
  )
}

interface Props {
  initialMessages: FeedMessage[]
}

export default function KaiFeed({ initialMessages }: Props) {
  const [messages, setMessages] = useState<FeedMessage[]>(initialMessages)
  const [filter, setFilter]     = useState<ChannelFilter>('all')

  // Supabase Realtime — global messages subscription
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel('kai-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const newMsg = payload.new as { id: string; conversation_id: string; role: string; content: string; created_at: string }
        if (newMsg.role !== 'assistant') return

        // Fetch conversation details
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, channel, ai_enabled, contact_name')
          .eq('id', newMsg.conversation_id)
          .single()

        const feedMsg: FeedMessage = {
          ...newMsg,
          conversations: conv ?? null,
        }
        setMessages(prev => [feedMsg, ...prev].slice(0, 100))
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const filtered = messages.filter(m =>
    m.conversations ? channelMatchesFilter(m.conversations.channel, filter) : true
  )

  const CHANNEL_FILTERS: { id: ChannelFilter; label: string }[] = [
    { id: 'all',      label: 'Tous'      },
    { id: 'WhatsApp', label: 'WhatsApp'  },
    { id: 'SMS',      label: 'SMS'       },
    { id: 'Email',    label: 'Email'     },
  ]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#F8F8F6]">
      {/* Left: channel filter */}
      <div className="w-[160px] flex-shrink-0 bg-soren-sidebar h-full overflow-y-auto px-2 pt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-3">
          Canal
        </p>
        <div className="flex flex-col gap-0.5">
          {CHANNEL_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                filter === f.id
                  ? 'bg-[#FF4D00] text-white font-medium'
                  : 'text-soren-subtle hover:text-white hover:bg-soren-card/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: feed */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h1 className="text-base font-semibold text-soren-text">Feed Kai Live</h1>
            <p className="text-xs text-soren-muted mt-0.5">Toutes les conversations IA en temps réel</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-soren-subtle">Aucune conversation IA</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(msg => (
                <FeedCard key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
