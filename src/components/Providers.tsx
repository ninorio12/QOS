'use client'
// Auth Clerk RÉACTIVÉE (instance Production clerk.vividflow.co).
// Convex authentifié via ConvexProviderWithClerk ; localisation FR conservée.

import { ThemeProvider } from 'next-themes'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export default function Providers({ children }: { children: React.ReactNode }) {
  const themed = (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
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
