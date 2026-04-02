'use client'

import { useState, useMemo } from 'react'
import { type Conversation, LEAD_STAGE_LABEL } from './types'
import { type InboxFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'

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

function getInitials(name?: string) {
  if (!name) return '??'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
  const initials = getInitials(conv.contact_name)
  const stageLabel = conv.lead_stage ? LEAD_STAGE_LABEL[conv.lead_stage] : null

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#EBEBEA] last:border-0
        ${isSelected
          ? 'bg-white border-l-2 border-l-[#3462EE]'
          : 'hover:bg-[#EFEFED] border-l-2 border-l-transparent'
        }
      `}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-sm font-semibold text-[#111111] truncate">
            {conv.contact_name ?? 'Contact inconnu'}
          </p>
          <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">
            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          {stageLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]">
              {stageLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#6B7280] truncate flex-1">
            {conv.last_message ?? 'Aucun message'}
          </p>
          {(conv.unread ?? 0) > 0 && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#3462EE] flex items-center justify-center text-[9px] font-bold text-white">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

interface Props {
  conversations: Conversation[]
  selected: Conversation | null
  onSelect: (c: Conversation) => void
  activeFilter: InboxFilter
  onConversationCreated: () => void
}

const FILTER_LABEL: Record<string, string> = {
  all: 'Toutes les conversations',
  unassigned: 'Non assignées',
  closed: 'Fermées',
  hot: 'Hot Lead',
  vip: 'VIP Lead',
  new: 'Nouveau Lead',
  payments: 'Paiements',
  client: 'Client',
  cold: 'Cold Lead',
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  activeFilter,
  onConversationCreated,
}: Props) {
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    let result = conversations

    // Apply lifecycle filter
    if (activeFilter !== 'all' && activeFilter !== 'unassigned' && activeFilter !== 'closed' && activeFilter !== null) {
      result = result.filter(c => c.lead_stage === activeFilter)
    }

    // Apply search
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
            {FILTER_LABEL[activeFilter ?? 'all'] ?? 'Conversations'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] transition-colors"
          >
            + Nouveau
          </button>
        </div>

        {/* Search */}
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
