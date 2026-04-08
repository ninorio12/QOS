'use client'

import { useState, useMemo } from 'react'
import { type Conversation, CHANNEL_META } from './types'
import { type InboxFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'
import { getAvatarColor } from '@/components/contacts/types'
import { Mail, Phone, MessageSquare, Bot } from 'lucide-react'

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}min`
  return "à l'instant"
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

function getFilterLabel(filter: InboxFilter): string {
  if (filter === 'all')        return 'Toutes les conversations'
  if (filter === 'unassigned') return 'Non assignées'
  if (filter === 'closed')     return 'Fermées'
  if (typeof filter === 'object') {
    if (filter.type === 'pipeline_stage') return 'Pipeline'
    if (filter.type === 'source')         return filter.source === 'meta' ? 'Meta Ads' : filter.source ?? 'Source'
  }
  return 'Conversations'
}

function applyFilter(conversations: Conversation[], filter: InboxFilter): Conversation[] {
  if (filter === 'all') return conversations
  if (filter === 'unassigned') return conversations.filter(c => !c.assigned_to)
  if (filter === 'closed') return conversations.filter(c =>
    c.opportunity_status === 'won' || c.opportunity_status === 'lost' || c.opportunity_status === 'abandoned'
  )
  if (typeof filter === 'object') {
    if (filter.type === 'pipeline_stage') {
      return conversations.filter(c => c.pipeline_stage_id === filter.stageId)
    }
    if (filter.type === 'source') {
      return conversations.filter(c => c.source === filter.source)
    }
  }
  return conversations
}

interface Props {
  conversations: Conversation[]
  selected: Conversation | null
  onSelect: (c: Conversation) => void
  activeFilter: InboxFilter
  onConversationCreated: () => void
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  activeFilter,
  onConversationCreated,
}: Props) {
  const [query, setQuery]         = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    let result = applyFilter(conversations, activeFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        `${c.contact_name ?? ''} ${c.last_message ?? ''}`.toLowerCase().includes(q)
      )
    }
    return result
  }, [conversations, activeFilter, query])

  return (
    <div className="flex flex-col w-[340px] flex-shrink-0 bg-[#F8F8F6] border-r border-[#E5E7EB] h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#111111]">
            {getFilterLabel(activeFilter)}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] transition-colors"
          >
            + Nouveau
          </button>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">Aucune conversation</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isSelected={selected?.id === conv.id}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>

      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); onConversationCreated() }}
        />
      )}
    </div>
  )
}
