import type { Metadata } from 'next'
import { Fraunces, Inter, Montserrat, Outfit, Plus_Jakarta_Sans } from 'next/font/google'
import DataPrefetcher from '@/components/DataPrefetcher'
import Providers from '@/components/Providers'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Soren - Infrastructure d'Acquisition Organisationnelle",
  description: 'Plateforme agentique pour la gestion des leads et workflows BTP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable} ${montserrat.variable} ${outfit.variable} ${jakarta.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <Providers>
          <DataPrefetcher />
          {children}
        </Providers>
      </body>
    </html>
  )
}
