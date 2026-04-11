'use client'

import { useEffect, useState } from 'react'
import ConversationsView from '@/components/conversations/ConversationsView'
import ConversationsLoading from './loading'
import type { Conversation, Pipeline } from '@/components/conversations/types'

type ConvData = { conversations: Conversation[]; pipelines: Pipeline[] }

export default function ConversationsPage() {
  const [data, setData] = useState<ConvData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/conversations/list')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then((d: ConvData) => setData(d))
      .catch(() => setError(true))
  }, [])

  if (error) return (
    <div className="h-full flex items-center justify-center text-sm text-[#6B7280] page-fade-in">
      Impossible de charger les conversations. Actualise la page.
    </div>
  )

  if (!data) return <ConversationsLoading />

  return (
    <div className="h-full page-fade-in">
      <ConversationsView dbConversations={data.conversations} pipelines={data.pipelines} />
    </div>
  )
}
