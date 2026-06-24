'use client'
import { useEffect } from 'react'
import { useSafeUser } from '@/lib/clerkSafe'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function useCurrentUser() {
  const { user, isLoaded } = useSafeUser()
  const sync = useMutation(api.users.syncFromClerk)
  useEffect(() => {
    if (!user) return
    sync({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.imageUrl || undefined,
    })
  }, [user?.id, user?.imageUrl]) // eslint-disable-line react-hooks/exhaustive-deps  // re-sync quand la photo change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const me = useQuery(api.users.getCurrent, user ? { clerkUserId: user.id } : 'skip') as any
  const isAdmin = me?.role === 'admin'
  return { me, clerkUser: user, isLoaded, isAdmin }
}
