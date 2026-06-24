'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Search, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import NotificationBell from './NotificationBell'

const NAV_PAGES = [
  { label: 'Tableau de bord', href: '/dashboard' },
  { label: 'Pipeline',       href: '/pipeline' },
  { label: 'Contacts',       href: '/contacts' },
  { label: 'Calendrier',     href: '/calendrier' },
  { label: 'Équipe IA',      href: '/equipe' },
  { label: 'Tâches',         href: '/taches' },
  { label: 'Logs',           href: '/logs' },
  { label: 'Knowledge Base', href: '/knowledge' },
  { label: 'Paramètres',     href: '/parametres' },
]

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':          'Tableau de bord',
  '/pipeline':           'Pipeline',
  '/pipeline/clients':   'Pipeline',
  '/contacts':           'Contacts',
  '/prospection':        'Prospection',
  '/closing':            'Closing',
  '/cockpit':            'Performance',
  '/performance':        'Suivi Setting',
  '/media-buyer':        'Meta Ads',
  '/onboarding':         'Onboarding',
  '/paiement':           'Paiement',
  '/calendrier':         'Calendrier',
  '/equipe':             'Équipe IA',
  '/taches':             'Tâches',
  '/logs':               'Logs',
  '/knowledge':          'Knowledge Base',
  '/budget':             'Budget',
  '/integrations':       'Intégrations',
  '/parametres':         'Paramètres',
  '/bibliotheque/data':       'Data',
  '/bibliotheque/records':    'Records',
  '/bibliotheque/process':    'Process',
  '/bibliotheque/onboarding': 'Onboarding',
  '/bibliotheque/projets':    'Projets',
}

const SUB_LABELS: Record<string, string> = {
  '/pipeline':           'Leads',
  '/pipeline/clients':   'Clients',
}

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const base = '/' + (pathname.split('/')[1] ?? '')
  const label    = PAGE_LABELS[pathname] ?? PAGE_LABELS[base] ?? 'VividFlow'
  const subLabel = SUB_LABELS[pathname] ?? null

  const { theme, setTheme } = useTheme()
  const { clerkUser } = useCurrentUser()
  const updateProfile = useMutation(api.users.updateProfile)
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (clerkUser) updateProfile({ clerkUserId: clerkUser.id, theme: next })
  }
  // Garde anti-mismatch d'hydratation : le thème n'est connu qu'au client.
  // Sans ça, l'icône Soleil/Lune diffère server↔client → erreur d'hydratation #418/#423
  // qui peut casser le routeur App Router sur la page chargée en SSR.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [contactResults, setContactResults] = useState<{ id: string; contactName: string; firstName: string | null; lastName: string | null; companyName: string | null }[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search results
  const q = searchQuery.toLowerCase().trim()
  const matchedPages = q
    ? NAV_PAGES.filter(p => p.label.toLowerCase().includes(q)).slice(0, 4)
    : []
  const hasResults = matchedPages.length > 0 || contactResults.length > 0

  // Ouvre un contact dans sa fiche (panel auto-ouvert via ?c=) puis reset la recherche.
  function openContact(id: string) {
    router.push(`/contacts?c=${encodeURIComponent(id)}`)
    setSearchQuery(''); setSearchOpen(false); setContactResults([])
  }

  // Première cible (page > contact) pour la touche Entrée.
  function goFirstResult() {
    if (matchedPages.length > 0) { router.push(matchedPages[0].href); setSearchQuery(''); setSearchOpen(false); return }
    if (contactResults.length > 0) { openContact(contactResults[0].id); return }
  }

  // Debounced real contact search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!q) { setContactResults([]); setSearching(false); return }
    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contact?q=${encodeURIComponent(q)}&limit=5`)
        if (!res.ok) { setContactResults([]); return }
        const data = await res.json() as { contacts?: { id: string; contactName: string; firstName: string | null; lastName: string | null; companyName: string | null }[] }
        setContactResults(data.contacts?.slice(0, 4) ?? [])
      } catch { setContactResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [q])

  // Fermer dropdown recherche si clic dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Raccourci ⌘K / Ctrl+K → focus la recherche.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); inputRef.current?.focus(); setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="fixed top-0 left-56 right-0 h-12 bg-soren-app border-b border-soren-border/50 flex items-center px-5 gap-4 z-40">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-soren-subtle">VividFlow</span>
        <span className="text-xs text-[#C8CCC6]">›</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-soren-subtle truncate">{label}</span>
        {subLabel && <>
          <span className="text-xs text-[#C8CCC6]">›</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-soren-text truncate">{subLabel}</span>
        </>}
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div ref={searchRef} className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); goFirstResult() }
              else if (e.key === 'Escape') { setSearchOpen(false); e.currentTarget.blur() }
            }}
            placeholder="Rechercher…"
            className="w-56 lg:w-72 h-8 bg-soren-elevated/40 dark:bg-white/[0.06] backdrop-blur-md border border-soren-border/40 dark:border-white/10 rounded-full pl-8 pr-4 text-[12.5px] text-soren-text placeholder-soren-subtle outline-none focus:bg-soren-elevated/70 dark:focus:bg-white/[0.1] focus:ring-2 focus:ring-[#FF4D00]/15 transition-all"
          />

          {/* Dropdown résultats */}
          {searchOpen && q && (
            <div className="absolute top-full mt-2 right-0 w-72 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-50 overflow-hidden">
              {matchedPages.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-soren-subtle">Pages</p>
                  {matchedPages.map(p => (
                    <button
                      key={p.href}
                      onClick={() => { router.push(p.href); setSearchQuery(''); setSearchOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-soren-elevated flex items-center gap-2.5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] flex-shrink-0" />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {contactResults.length > 0 && (
                <div className={matchedPages.length > 0 ? 'border-t border-soren-border' : ''}>
                  <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-soren-subtle">Contacts</p>
                  {contactResults.map(c => {
                    const fullName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.contactName
                    const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <button
                        key={c.id}
                        onClick={() => openContact(c.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-soren-elevated flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#FF4D00] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-soren-text leading-none truncate">{fullName}</p>
                          {c.companyName && <p className="text-[10px] text-soren-subtle mt-0.5 truncate">{c.companyName}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {hasResults ? (
                <div className="border-t border-soren-border px-4 py-2.5">
                  <p className="text-[10px] text-soren-subtle">{matchedPages.length + contactResults.length} résultat{matchedPages.length + contactResults.length > 1 ? 's' : ''} · Entrée pour ouvrir</p>
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-xs text-soren-subtle">
                  {searching ? 'Recherche…' : `Aucun résultat pour « ${searchQuery.trim()} »`}
                </div>
              )}
            </div>
          )}
        </div>

        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-all"
        >
          {mounted && theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  )
}
