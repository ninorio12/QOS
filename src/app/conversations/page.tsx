'use client'

import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import ConversationsView from '@/components/conversations/ConversationsView'
import ConversationsLoading from './loading'
import type { Conversation, Pipeline } from '@/components/conversations/types'

type ConvData = { conversations: Conversation[]; pipelines: Pipeline[] }

const fetcher = (url: string) =>
  fetch(url)
    .then(r => r.json())
    .then((d: ConvData) => ({
      conversations: d.conversations ?? [],
      pipelines:     d.pipelines     ?? [],
    }))

export default function ConversationsPage() {
  const searchParams = useSearchParams()
  const contactParam = searchParams.get('contact') ?? undefined

  const { data, isLoading } = useSWR<ConvData>('/api/conversations/list', fetcher, {
    revalidateOnFocus:  false,
    dedupingInterval:   20_000,
    revalidateIfStale:  true,
    keepPreviousData:   true,
    onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
      if (retryCount >= 2) return
      setTimeout(() => revalidate({ retryCount }), 5000)
    },
  })

  if (isLoading && !data) return <ConversationsLoading />

  return (
    <div className="h-full page-fade-in">
      <ConversationsView
        dbConversations={data?.conversations ?? []}
        pipelines={data?.pipelines ?? []}
        initialContactId={contactParam}
      />
    </div>
  )
}
