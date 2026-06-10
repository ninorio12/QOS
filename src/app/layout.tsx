import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import ShellGate from '@/components/ShellGate'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import InstallPrompt from '@/components/InstallPrompt'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'VividFlow Data OS',
  description: 'VividFlow Data OS',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'VividFlow', statusBarStyle: 'default' },
  icons: {
    icon:             [
      { url: '/favicon.ico',    sizes: '48x48',  type: 'image/x-icon' },
      { url: '/favicon-32.png', sizes: '32x32',  type: 'image/png'    },
    ],
    apple:            { url: '/apple-touch-icon.png', sizes: '180x180' },
    shortcut:         '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <ShellGate>{children}</ShellGate>
          <ServiceWorkerRegister />
          <InstallPrompt />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}