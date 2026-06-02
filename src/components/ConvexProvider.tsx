'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useMemo } from 'react'

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    return url ? new ConvexReactClient(url) : null
  }, [])

  if (!client) return <>{children}</>
  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
