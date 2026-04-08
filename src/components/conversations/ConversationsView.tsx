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
    void getMessages(selected.id).then(result => {
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
