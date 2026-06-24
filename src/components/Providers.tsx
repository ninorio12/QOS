'use client'
// Auth Clerk RÉACTIVÉE (instance Production clerk.vividflow.co).
// Convex authentifié via ConvexProviderWithClerk ; localisation FR conservée.

import { ThemeProvider } from 'next-themes'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'
import { ConvexReactClient, ConvexProvider } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { DEMO_MODE } from '@/lib/demo'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export default function Providers({ children }: { children: React.ReactNode }) {
  const themed = (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
  // Mode démo : aucun Clerk (pas de login), Convex non authentifié sur le backend démo.
  if (DEMO_MODE) {
    return convex ? <ConvexProvider client={convex}>{themed}</ConvexProvider> : themed
  }
  // Sans URL Convex (build sans env), on rend quand même l'UI sous Clerk.
  const inner = convex
    ? <ConvexProviderWithClerk client={convex} useAuth={useAuth}>{themed}</ConvexProviderWithClerk>
    : themed
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} localization={frFR}>
      {inner}
    </ClerkProvider>
  )
}
