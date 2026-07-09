'use client'

import { usePathname } from 'next/navigation'
import AppShell from '@/components/AppShell'

/**
 * ShellGate — monte AppShell (Sidebar + Header) UNE seule fois, depuis le root
 * layout, pour que la coquille ne remonte jamais lors d'une navigation entre
 * modules (fin du flash / re-fetch user / reset scroll sidebar).
 *
 * Allowlist : la coquille s'affiche uniquement pour les routes applicatives qui
 * la portaient déjà (anciens `layout.tsx` -> <AppShell>). Toute autre route
 * (login, formulaire, signer, seed-demo, cockpit, agents, conversion,
 * architecture, agent, (public)/start, …) reste SANS coquille — comportement
 * identique à avant.
 */
const SHELL_PREFIXES = [
  '/dashboard', '/prospection', '/logs', '/modules',
  '/onboarding', '/integrations', '/equipe', '/budget',
  '/parametres', '/contacts', '/knowledge', '/pipeline', '/calendrier', '/reservations',
  '/taches', '/paiement', '/performance', '/bibliotheque',
  '/closing', '/media-buyer', '/cockpit',
]

export default function ShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const withShell = SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  return withShell ? <AppShell>{children}</AppShell> : <>{children}</>
}
