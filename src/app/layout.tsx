import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'VividFlow QOS',
  description: 'Personal Brand OS for Coaches & Entrepreneurs',
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
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}