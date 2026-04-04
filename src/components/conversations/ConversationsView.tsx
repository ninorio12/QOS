'use client'

import { useState, useMemo, useEffect } from 'react'
import { type Conversation, type Pipeline, MOCK_CONVERSATIONS } from './types'
import InboxNav, { type InboxFilter } from './InboxNav'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'

interface Props {
  dbConversations: Conversation[]
  pipelines: Pipeline[]
}

export default function ConversationsView({ dbConversations, pipelines }: Props) {
  const allConversations = useMemo(() => {
    if (dbConversations.length >= 4) return dbConversations
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [selected, setSelected]         = useState<Conversation | null>(allConversations[0] ?? null)
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all')

  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)

  useEffect(() => {
    setSelected(null)
  }, [activeFilter])

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <InboxNav
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalUnread={totalUnread}
        pipelines={pipelines}
      />

      <ConversationList
        conversations={allConversations}
        selected={selected}
        onSelect={setSelected}
        activeFilter={activeFilter}
        onConversationCreated={() => {}}
      />

      <div className="flex-1 overflow-hidden bg-[#EEF0EB]">
        {selected ? (
          <MessageThread conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-[#9CA3AF]">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
