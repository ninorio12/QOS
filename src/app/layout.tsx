import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import ShellGate from '@/components/ShellGate'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import InstallPrompt from '@/components/InstallPrompt'
import PinchZoomGuard from '@/components/PinchZoomGuard'
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

// Sensation d'application : pas de zoom au doigt (pinch) ni de double-tap zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Indispensable en mode application installée : sans lui, iOS ne renseigne pas
  // les zones de sécurité et la barre du bas passe sous l'indicateur d'accueil.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Pose data-sidebar AVANT le rendu pour que le contenu démarre au bon décalage (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.sidebar=localStorage.getItem('vf-sidebar-collapsed')==='1'?'collapsed':'expanded'}catch(e){}` }} />
        <Providers>
          <PinchZoomGuard />
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