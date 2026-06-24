'use client'

// Wrappers Clerk « demo-safe » : en mode démo, on NE touche JAMAIS aux hooks Clerk
// (aucun ClerkProvider monté) et on renvoie des valeurs statiques. En prod, on
// délègue aux vrais hooks Clerk. DEMO_MODE est une constante de build → l'ordre des
// hooks est stable pour un build donné (les eslint-disable sont donc sûrs).
import { useUser, useClerk } from '@clerk/nextjs'
import { DEMO_MODE, DEMO_CLERK_USER } from './demo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSafeUser(): any {
  if (DEMO_MODE) return { user: DEMO_CLERK_USER, isLoaded: true, isSignedIn: true }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useUser()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSafeClerk(): any {
  if (DEMO_MODE) return { signOut: async () => { if (typeof window !== 'undefined') window.location.assign('/dashboard') } }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerk()
}
