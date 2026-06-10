import './vf-onboarding.css'
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google'

// Polices de vividflow.co
const inter = Inter({ subsets: ['latin'], variable: '--vf-font-sans', display: 'swap' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--vf-font-serif', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--vf-font-mono', display: 'swap' })

// Layout public — pas d'AppShell (ni sidebar, ni header, ni auth).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${fraunces.variable} ${plexMono.variable}`}>{children}</div>
}
