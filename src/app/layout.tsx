import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QOS — Qorpo Operating System',
  description: 'CRM intelligent pour l\'acquisition client dans le bâtiment',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
