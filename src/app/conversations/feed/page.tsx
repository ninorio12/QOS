import KaiFeed from '@/components/conversations/KaiFeed'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function FeedPage() {
  let initialMessages: unknown[] = []

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4000'
    const res = await fetch(`${baseUrl}/api/feed`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      initialMessages = data.messages ?? []
    }
  } catch (err) {
    console.error('[FeedPage] fetch failed:', err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <KaiFeed initialMessages={initialMessages as any} />
}
