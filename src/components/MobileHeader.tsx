'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Settings, LogOut, LayoutGrid, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useSafeClerk } from '@/lib/clerkSafe'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Doit rester aligné avec la nav web (Sidebar) et le registre @/components/nav/modules.
const PAGE_LABELS: Record<string, string> = {
  '/modules':       'Tout',
  '/dashboard':     'Tableau de bord',
  '/pipeline':      'Pipeline',
  '/contacts':      'Contacts',
  '/prospection':   'Prospection',
  '/closing':       'Closing',
  '/performance':   'Cockpit Setter',
  '/media-buyer':   'Meta Ads',
  '/onboarding':    'Onboarding',
  '/paiement':      'Paiement',
  '/calendrier':    'Calendrier',
  '/bibliotheque':  'Bibliothèque',
  '/equipe':        'Équipe IA',
  '/taches':        'Tâches',
  '/logs':          'Activités',
  '/knowledge':     'Base de connaissance',
  '/budget':        'Budget',
  '/integrations':  'Intégrations',
  '/parametres':    'Paramètres',
}

export default function MobileHeader() {
  const pathname = usePathname()
  const base  = '/' + (pathname.split('/')[1] ?? '')
  const label = PAGE_LABELS[base] ?? 'VividFlow'

  const { me, clerkUser } = useCurrentUser()
  const { signOut } = useSafeClerk()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [showProfile, setShowProfile] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }
  void clerkUser

  const displayName = me?.name || 'Utilisateur'
  const avatarUrl = me?.avatarUrl
  const initiale = displayName[0]?.toUpperCase() ?? 'U'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-soren-app border-b border-soren-border items-center justify-between px-4">
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/modules" aria-label="Tous les modules" className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-soren-text active:bg-soren-elevated transition-colors">
          <LayoutGrid size={19} />
        </Link>
        <span className="text-[15px] font-bold text-soren-text truncate">{label}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Bascule thème clair / sombre */}
        <button
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className="w-8 h-8 flex items-center justify-center rounded-full text-soren-muted active:bg-soren-elevated transition-colors"
        >
          {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative" ref={popupRef}>
        <button
          onClick={() => setShowProfile(v => !v)}
          className="w-8 h-8 rounded-full bg-[#FF4D00] flex items-center justify-center text-[11px] font-bold text-white overflow-hidden"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="object-cover w-full h-full" />
            : initiale
          }
        </button>

        {showProfile && (
          <div className="absolute right-0 top-10 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-50 w-52 max-w-[calc(100vw-2rem)] overflow-hidden">
            <div className="px-4 py-3 border-b border-soren-border">
              <p className="text-[13px] font-semibold text-soren-text capitalize">{displayName}</p>
              <p className="text-[10px] text-soren-subtle truncate">{me?.email ?? '—'}</p>
            </div>
            <div className="py-1">
              <Link
                href="/parametres"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-soren-muted hover:bg-soren-elevated transition-colors"
              >
                <Settings size={13} /> Paramètres
              </Link>
              <button
                onClick={() => { void signOut().finally(() => { window.location.href = '/login' }) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={13} /> Se déconnecter
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
