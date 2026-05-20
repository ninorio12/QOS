'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Search, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import NotificationBell from './NotificationBell'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/login/actions'

const NAV_PAGES = [
  { label: 'Tableau de bord', href: '/dashboard' },
  { label: 'Pipeline',       href: '/pipeline' },
  { label: 'Contacts',       href: '/contacts' },
  { label: 'Conversations',  href: '/conversations' },
  { label: 'Calendrier',     href: '/calendrier' },
  { label: 'Analyse',        href: '/analyse' },
  { label: 'Cockpit Hermes', href: '/cockpit' },
  { label: 'Agents',         href: '/agents' },
  { label: 'Équipe IA',      href: '/equipe' },
  { label: 'Tâches',         href: '/taches' },
  { label: 'Conversations',  href: '/conversations' },
  { label: 'Logs',           href: '/logs' },
  { label: 'Knowledge Base', href: '/knowledge' },
  { label: 'Communication',  href: '/communication' },
  { label: 'Conversion',     href: '/conversion' },
  { label: 'Growth & ROI',   href: '/growth' },
  { label: 'Paramètres',     href: '/parametres' },
]

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':     'Tableau de bord',
  '/pipeline':      'Pipeline',
  '/contacts':      'Contacts',
  '/conversations': 'Conversations',
  '/calendrier':    'Calendrier',
  '/analyse':       'Analyse',
  '/cockpit':       'Cockpit Hermes',
  '/equipe':        'Équipe IA',
  '/taches':        'Tâches',
  '/logs':          'Logs',
  '/knowledge':     'Knowledge Base',
  '/communication': 'Communication',
  '/budget':        'Budget',
  '/conversion':    'Conversion',
  '/growth':        'Growth & ROI',
  '/agent':         'Agent IA',
  '/parametres':    'Paramètres',
  '/architecture':  'Architecture IA',
  '/devis':         'Devis',
  '/workflows':     'Workflows',
  '/chatbot':       'Chatbot',
}

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const base = '/' + (pathname.split('/')[1] ?? '')
  const label = PAGE_LABELS[base] ?? 'VividFlow'

  const [showProfile,  setShowProfile]  = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [contactResults, setContactResults] = useState<{ id: string; contactName: string; firstName: string | null; lastName: string | null; companyName: string | null }[]>([])
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [user, setUser] = useState<{ name: string; email: string; avatar: string | null } | null>(null)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [prenom, setPrenom] = useState('')
  const popupRef  = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Search results
  const q = searchQuery.toLowerCase().trim()
  const matchedPages = q
    ? NAV_PAGES.filter(p => p.label.toLowerCase().includes(q)).slice(0, 4)
    : []
  const hasResults = matchedPages.length > 0 || contactResults.length > 0

  // Debounced real contact search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!q) { setContactResults([]); return }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contact?q=${encodeURIComponent(q)}&limit=5`)
        if (!res.ok) return
        const data = await res.json() as { contacts?: { id: string; contactName: string; firstName: string | null; lastName: string | null; companyName: string | null }[] }
        setContactResults(data.contacts?.slice(0, 4) ?? [])
      } catch { /* silent */ }
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [q])

  useEffect(() => {
    const hasSupabaseEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    if (!hasSupabaseEnv) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const meta = data.user.user_metadata ?? {}
      const name = meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? 'Utilisateur'
      setUser({ name, email: data.user.email ?? '', avatar: meta.avatar_url ?? null })
    })
  }, [])

  useEffect(() => {
    function load() {
      try { setProfilePhoto(localStorage.getItem('soren_profile_photo') ?? '') } catch {}
      try {
        const compte = JSON.parse(localStorage.getItem('soren_compte') ?? '{}')
        setPrenom(compte.prenom ?? '')
      } catch {}
    }
    load()
    window.addEventListener('profile-photo-updated', load)
    window.addEventListener('company-settings-updated', load)
    return () => {
      window.removeEventListener('profile-photo-updated', load)
      window.removeEventListener('company-settings-updated', load)
    }
  }, [])

  // Fermer popup si clic dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initiale = prenom ? prenom[0].toUpperCase() : (user?.name?.[0]?.toUpperCase() ?? 'U')

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-soren-app border-b border-soren-border/50 flex items-center px-6 gap-4 z-40">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-soren-subtle">SOREN</span>
        <span className="text-xs text-[#C8CCC6]">›</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-soren-subtle truncate">{label}</span>
      </div>

      {/* Right: search + bell + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div ref={searchRef} className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Rechercher..."
            className="w-64 bg-soren-elevated border-0 rounded-full pl-8 pr-4 py-1.5 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#9CA3AF]/40 transition-all"
          />

          {/* Dropdown résultats */}
          {searchOpen && hasResults && (
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0" />
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
                        onClick={() => { router.push('/contacts'); setSearchQuery(''); setSearchOpen(false); setContactResults([]) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-soren-elevated flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#FF4D00] flex items-center justify-center text-[9px] font-bold text-[#111111] flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-soren-text leading-none">{fullName}</p>
                          <p className="text-[10px] text-soren-subtle mt-0.5">{c.companyName ?? ''}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="border-t border-soren-border px-4 py-2.5">
                <p className="text-[10px] text-soren-subtle">{matchedPages.length + contactResults.length} résultat{matchedPages.length + contactResults.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>

        <NotificationBell />

        {/* Avatar + popup profil */}
        <div className="relative flex-shrink-0" ref={popupRef}>
          <button
            onClick={() => setShowProfile(v => !v)}
            data-tooltip="Profil"
            className="w-8 h-8 rounded-full bg-[#FF4D00] flex items-center justify-center text-[11px] font-bold text-[#111111] overflow-hidden hover:ring-2 hover:ring-[#FF4D00]/60 transition-all"
          >
            {profilePhoto
              ? <img src={profilePhoto} alt="avatar" className="object-cover w-full h-full" />
              : user?.avatar
                ? <Image src={user.avatar} alt="avatar" width={32} height={32} className="object-cover w-full h-full" />
                : initiale
            }
          </button>

          {showProfile && (
            <div className="absolute right-0 top-10 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-50 w-56 overflow-hidden">
              <div className="px-4 py-3 border-b border-soren-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF4D00] flex items-center justify-center text-[13px] font-bold text-[#111111] overflow-hidden flex-shrink-0">
                    {profilePhoto
                      ? <img src={profilePhoto} alt="avatar" className="object-cover w-full h-full" />
                      : user?.avatar
                        ? <Image src={user.avatar} alt="avatar" width={36} height={36} className="object-cover w-full h-full" />
                        : initiale
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-soren-text truncate capitalize">{prenom || user?.name || '—'}</p>
                    <p className="text-[10px] text-soren-subtle truncate">{user?.email ?? '—'}</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/parametres"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-soren-muted hover:bg-soren-elevated hover:text-soren-text transition-colors"
                >
                  <Settings size={13} /> Paramètres
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={13} /> Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
