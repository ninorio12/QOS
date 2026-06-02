'use client'

import { ThemeProvider } from 'next-themes'
import ConvexClientProvider from './ConvexProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </ConvexClientProvider>
  )
}
