'use client'

import { useEffect, useState } from 'react'
import ConversationsView from '@/components/conversations/ConversationsView'
import ConversationsLoading from './loading'
import type { Conversation, Pipeline } from '@/components/conversations/types'

type ConvData = { conversations: Conversation[]; pipelines: Pipeline[] }

export default function ConversationsPage() {
  const [data, setData] = useState<ConvData | null>(null)

  useEffect(() => {
    fetch('/api/conversations/list')
      .then(r => r.json())
      .then((d: ConvData) => setData(d))
      .catch(() => setData({ conversations: [], pipelines: [] }))
  }, [])

  if (!data) return <ConversationsLoading />

  return <ConversationsView dbConversations={data.conversations} pipelines={data.pipelines} />
}
