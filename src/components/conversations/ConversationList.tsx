'use client'

import { useState, useMemo, useCallback } from 'react'
import { type Conversation } from './types'
import { type InboxFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'
import { getAvatarColor } from '@/components/contacts/types'
import { Sparkles, Star } from 'lucide-react'

// ── Starred conversations persistées en localStorage ───────────────────────
function useStarred() {
  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('soren_starred_convs')
      return new Set(raw ? JSON.parse(raw) as string[] : [])
    } catch { return new Set() }
  })

  const toggle = useCallback((id: string) => {
    setStarred(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem('soren_starred_convs', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  return { starred, toggle }
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
  isStarred,
  onClick,
  onMouseEnter,
  onToggleStar,
}: {
  conv: Conversation
  isSelected: boolean
  isStarred: boolean
  onClick: () => void
  onMouseEnter: () => void
  onToggleStar: (e: React.MouseEvent) => void
}) {
  const name      = conv.contact_name ?? 'Contact inconnu'
  const initials  = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color     = getAvatarColor(initials)
  const closedColor = conv.opportunity_status === 'won' ? '#22c55e'
    : conv.opportunity_status === 'lost' || conv.opportunity_status === 'abandoned' ? '#EF4444'
    : 'transparent'
  const borderColor = isSelected ? '#3462EE' : closedColor

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className={`relative w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#EBEBEA] last:border-0 group cursor-pointer ${isSelected ? 'bg-soren-card' : 'hover:bg-[#EFEFED]'}`}
    >
      {/* Indicateur sélection / statut */}
      {borderColor !== 'transparent' && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200"
          style={{
            height: isSelected ? '60%' : '40%',
            background: borderColor,
            opacity: isSelected ? 1 : 0.6,
          }}
        />
      )}
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: color + '22', color }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-semibold truncate ${closedColor !== 'transparent' && !isSelected ? 'text-soren-muted' : 'text-soren-text'}`}>
              {name}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Bouton étoile — stopPropagation fonctionne car plus de button imbriqué */}
            <span
              role="button"
              tabIndex={0}
              onClick={onToggleStar}
              onKeyDown={e => e.key === 'Enter' && onToggleStar(e as unknown as React.MouseEvent)}
              className={`p-0.5 rounded transition-all ${isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}`}
            >
              <Star
                size={11}
                className="transition-colors"
                style={{ fill: isStarred ? '#FBBF24' : 'none', color: isStarred ? '#FBBF24' : '#9CA3AF' }}
              />
            </span>
            <span className="text-[10px] text-soren-subtle">
              {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-soren-muted truncate flex-1">
            {conv.last_message ?? 'Aucun message'}
          </p>
          {conv.ai_enabled && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#8B5CF610', color: '#8B5CF6' }}>
              <Sparkles size={8} />
              Kai
            </span>
          )}
        </div>
      </div>
    </div>
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
  onConversationCreated: (conv: Conversation) => void
  onPrefetch: (convId: string) => void
}

type InboxTab = 'tous' | 'nonlus' | 'recents' | 'favoris'

const TABS: { key: InboxTab; label: string }[] = [
  { key: 'tous',    label: 'Tous' },
  { key: 'nonlus',  label: 'Non lus' },
  { key: 'recents', label: 'Récents' },
  { key: 'favoris', label: '★ Favoris' },
]

function applyTab(conversations: Conversation[], tab: InboxTab, starred: Set<string>): Conversation[] {
  if (tab === 'nonlus')  return conversations.filter(c => (c.unread ?? 0) > 0)
  if (tab === 'recents') {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    return conversations.filter(c => c.last_message_at && new Date(c.last_message_at).getTime() > cutoff)
  }
  if (tab === 'favoris') return conversations.filter(c => starred.has(c.id))
  return conversations
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  activeFilter,
  onConversationCreated,
  onPrefetch,
}: Props) {
  const [query, setQuery]         = useState('')
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab]             = useState<InboxTab>('tous')
  const { starred, toggle: toggleStar } = useStarred()

  const filtered = useMemo(() => {
    let result = applyFilter(conversations, activeFilter)
    result = applyTab(result, tab, starred)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        `${c.contact_name ?? ''} ${c.last_message ?? ''}`.toLowerCase().includes(q)
      )
    }
    return result
  }, [conversations, activeFilter, tab, starred, query])

  const unreadCount  = useMemo(() => conversations.filter(c => (c.unread ?? 0) > 0).length, [conversations])
  const recentCount  = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    return conversations.filter(c => c.last_message_at && new Date(c.last_message_at).getTime() > cutoff).length
  }, [conversations])
  const starredCount = useMemo(() => conversations.filter(c => starred.has(c.id)).length, [conversations, starred])
  const counts: Record<InboxTab, number> = { tous: conversations.length, nonlus: unreadCount, recents: recentCount, favoris: starredCount }

  return (
    <div className="flex flex-col w-[340px] flex-shrink-0 bg-[#F8F8F6] border-r border-soren-border h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-soren-border">
        <h1 className="text-2xl font-black text-soren-text leading-none mb-1">Conversations</h1>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-soren-muted">
            {getFilterLabel(activeFilter)}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-soren-sidebar text-white hover:bg-[#222] transition-colors"
          >
            + Nouveau
          </button>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-soren-card border border-soren-border rounded-lg px-3 py-2 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors mb-3"
        />
        {/* Onglets */}
        <div className="flex gap-1.5">
          {TABS.map(t => {
            const active = tab === t.key
            const count  = counts[t.key]
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: active ? '#111111' : 'white',
                  color:      active ? 'white'   : '#6B7280',
                  boxShadow:  active ? 'none'    : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold rounded-full px-0.5 leading-none pointer-events-none"
                    style={{
                      background: active ? 'rgba(255,255,255,0.9)' : (t.key === 'nonlus' ? '#3462EE' : t.key === 'favoris' ? '#FBBF24' : '#6B7280'),
                      color:      active ? '#111111' : 'white',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-soren-subtle">Aucune conversation</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isSelected={selected?.id === conv.id}
              isStarred={starred.has(conv.id)}
              onClick={() => onSelect(conv)}
              onMouseEnter={() => onPrefetch(conv.id)}
              onToggleStar={(e) => { e.stopPropagation(); toggleStar(conv.id) }}
            />
          ))
        )}
      </div>

      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={(conv) => { setShowModal(false); onConversationCreated(conv) }}
        />
      )}
    </div>
  )
}
