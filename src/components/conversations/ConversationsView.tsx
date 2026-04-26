'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { type Conversation, type Pipeline, type Message, MOCK_CONVERSATIONS } from './types'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'
import ConversationPanel from './ConversationPanel'
import { fetchJSON } from '@/lib/fetchJSON'

interface Props {
  dbConversations:  Conversation[]
  pipelines:        Pipeline[]
  initialContactId?: string
}

async function fetchMessages(convId: string): Promise<Message[]> {
  try {
    const res = await fetch(`/api/conversations/${convId}/messages`)
    if (!res.ok) return []
    const data = await res.json() as { messages: Message[] }
    return data.messages ?? []
  } catch {
    return []
  }
}

export default function ConversationsView({ dbConversations, pipelines, initialContactId }: Props) {
  const allConversations = useMemo(() => {
    if (dbConversations.length >= 4) return dbConversations
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [convList,  setConvList]  = useState<Conversation[]>(allConversations)
  const [selected,  setSelected]  = useState<Conversation | null>(allConversations[0] ?? null)
  const [aiEnabled, setAiEnabled] = useState(allConversations[0]?.ai_enabled ?? true)

  // Auto-sélection quand on arrive depuis le pipeline avec ?contact=id
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (didAutoSelect.current || !initialContactId || allConversations.length === 0) return
    const match = allConversations.find(c => c.contact_id === initialContactId)
    if (match) {
      didAutoSelect.current = true
      setSelected(match)
      setAiEnabled(match.ai_enabled ?? true)
    }
  }, [initialContactId, allConversations])

  // Cache de messages par conversation — évite de re-fetcher à chaque switch
  const msgCache = useRef<Map<string, Message[]>>(new Map())
  const [messages, setMessages] = useState<Message[]>([])

  // Prefetch en cours (pour éviter les doublons)
  const prefetching = useRef<Set<string>>(new Set())

  // Sync aiEnabled when conversation changes
  useEffect(() => {
    if (!selected) return
    setAiEnabled(selected.ai_enabled ?? true)
  }, [selected?.id])

  // Charger les messages de la conversation sélectionnée
  useEffect(() => {
    if (!selected) return

    // Déjà en cache → affichage instantané
    const cached = msgCache.current.get(selected.id)
    if (cached) {
      setMessages(cached)
      // Refresh silencieux — uniquement si pas déjà en cours
      if (!prefetching.current.has(selected.id)) {
        prefetching.current.add(selected.id)
        void fetchMessages(selected.id).then(fresh => {
          prefetching.current.delete(selected.id)
          if (fresh.length > 0) {
            msgCache.current.set(selected.id, fresh)
            setMessages(fresh)
          }
        })
      }
      return
    }

    // Pas en cache → fetch normal
    setMessages([])
    if (!prefetching.current.has(selected.id)) {
      prefetching.current.add(selected.id)
      void fetchMessages(selected.id).then(msgs => {
        prefetching.current.delete(selected.id)
        msgCache.current.set(selected.id, msgs)
        setMessages(msgs)
      })
    }
  }, [selected?.id])

  // Prefetch des messages au hover sur une conversation
  const prefetchConv = useCallback((convId: string) => {
    if (msgCache.current.has(convId) || prefetching.current.has(convId)) return
    prefetching.current.add(convId)
    void fetchMessages(convId).then(msgs => {
      msgCache.current.set(convId, msgs)
      prefetching.current.delete(convId)
    })
  }, [])

  async function handleAiToggle(enabled: boolean) {
    if (!selected) return
    setAiEnabled(enabled)
    try {
      await fetchJSON(`/api/conversation/${selected.id}/ai`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ai_enabled: enabled }),
      })
    } catch {
      setAiEnabled(!enabled)
    }
  }

  function handleSelect(conv: Conversation) {
    setSelected(conv)
    setAiEnabled(conv.ai_enabled ?? true)
  }

  // Quand un nouveau message arrive (Supabase realtime ou envoi manuel)
  // → mettre à jour le cache
  function handleMessageSent(convId: string, msg: Message) {
    msgCache.current.set(convId, [...(msgCache.current.get(convId) ?? []), msg])
  }

  function handleConversationCreated(conv: Conversation) {
    setConvList(prev => {
      if (prev.some(c => c.id === conv.id)) return prev
      return [conv, ...prev]
    })
    setSelected(conv)
    setMessages([])
    msgCache.current.delete(conv.id)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>

      {/* ── Col 1: Conversation list ── */}
      <ConversationList
        conversations={convList}
        selected={selected}
        onSelect={handleSelect}
        activeFilter="all"
        onConversationCreated={handleConversationCreated}
        onPrefetch={prefetchConv}
      />

      {/* ── Col 2: Thread ── */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {selected ? (
          <div className="flex-1 min-h-0">
            <MessageThread
              key={selected.id}
              conversation={selected}
              initialMessages={messages}
              aiEnabled={aiEnabled}
              onAiToggle={handleAiToggle}
              onMessageSent={(msg) => handleMessageSent(selected.id, msg)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-soren-app">
            <p className="text-sm text-soren-subtle">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* ── Col 3: Panel ── */}
      {selected ? (
        <ConversationPanel
          key={selected.id}
          conversation={selected}
          messages={messages}
          aiEnabled={aiEnabled}
          onAiToggle={handleAiToggle}
          pipelines={pipelines}
        />
      ) : (
        <div className="w-[300px] flex-shrink-0 bg-soren-card border-l border-soren-border" />
      )}

    </div>
  )
}
