'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, MessageSquare } from 'lucide-react'
import {
  type Conversation, CHANNEL_META, MOCK_CONVERSATIONS,
} from './types'
import MessageThread from './MessageThread'
import NewConversationModal from './NewConversationModal'

const FILTERS = ['Toutes', 'Email', 'WhatsApp', 'Appel', 'Réunion', 'Note']

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `il y a ${d}j`
  if (h > 0) return `il y a ${h}h`
  if (m > 0) return `il y a ${m}min`
  return "à l'instant"
}

function ConversationRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const channel = CHANNEL_META[conv.channel]
  const initials = conv.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-4 flex items-start gap-3 transition-colors border-b border-[#1A2235] last:border-0
        ${isSelected ? 'bg-[#1A2235]' : 'hover:bg-[#1A2235]/50'}
      `}
    >
      {/* Avatar with channel badge */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] border-2 border-[#121721]"
          style={{ background: channel.color + '30', borderColor: '#121721' }}
          title={channel.label}
        >
          {channel.emoji}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm font-semibold truncate ${conv.unread ? 'text-white' : 'text-[#D1D9E6]'}`}>
            {conv.contact_name ?? 'Contact inconnu'}
          </p>
          <span className="text-[10px] text-[#3D4F6B] flex-shrink-0">
            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
          </span>
        </div>

        {conv.subject && (
          <p className="text-xs text-[#8896AB] truncate mb-1">{conv.subject}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[#3D4F6B] truncate flex-1">
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

export default function ConversationsView({ dbConversations }: { dbConversations: Conversation[] }) {
  const allConversations = useMemo(() => {
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [selected, setSelected] = useState<Conversation | null>(allConversations[0] ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Toutes')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    let result = allConversations
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        `${c.contact_name ?? ''} ${c.subject ?? ''} ${c.last_message ?? ''}`.toLowerCase().includes(q)
      )
    }
    if (filter !== 'Toutes') {
      const channelMap: Record<string, string> = {
        Email: 'email', WhatsApp: 'whatsapp', Appel: 'phone', Réunion: 'meeting', Note: 'note',
      }
      result = result.filter(c => c.channel === channelMap[filter])
    }
    return result
  }, [allConversations, query, filter])

  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Left: Conversation List ── */}
      <div className="flex flex-col w-[360px] flex-shrink-0 border-r border-[#1A2235]">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-[#1A2235]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Conversations</h1>
                {totalUnread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#3462EE] flex items-center justify-center text-[10px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8896AB]">{allConversations.length} conversations</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#3462EE] hover:bg-[#2a50d4] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Nouveau
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#1A2235] border border-[#232D3F] rounded-lg px-3 py-2 mb-3">
            <Search size={13} className="text-[#3D4F6B] flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="flex-1 bg-transparent text-sm text-white placeholder-[#3D4F6B] outline-none"
            />
          </div>

          {/* Channel filters */}
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  flex-shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors
                  ${filter === f
                    ? 'bg-[#3462EE]/20 text-[#3462EE]'
                    : 'text-[#8896AB] hover:text-white hover:bg-[#1A2235]'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-[#3D4F6B]">Aucune conversation trouvée</p>
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                isSelected={selected?.id === conv.id}
                onClick={() => setSelected(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Message Thread ── */}
      <div className="flex-1 overflow-hidden bg-[#121721]">
        {selected ? (
          <MessageThread conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A2235] flex items-center justify-center">
              <MessageSquare size={20} className="text-[#3D4F6B]" />
            </div>
            <p className="text-sm text-[#3D4F6B]">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={() => {}}
        />
      )}
    </div>
  )
}
