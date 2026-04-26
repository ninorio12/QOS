'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/login/actions'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':     'Tableau de bord',
  '/pipeline':      'Pipeline',
  '/contacts':      'Contacts',
  '/conversations': 'Conversations',
  '/calendrier':    'Calendrier',
  '/analyse':       'Analyse',
  '/equipe':        'Équipe IA',
  '/taches':        'Tâches',
  '/logs':          'Logs',
  '/knowledge':     'Connaissance',
  '/budget':        'Budget',
  '/conversion':    'Conversion',
  '/growth':        'Growth & ROI',
  '/parametres':    'Paramètres',
  '/devis':         'Devis',
  '/workflows':     'Automatisation',
}

export default function MobileHeader() {
  const pathname = usePathname()
  const base  = '/' + (pathname.split('/')[1] ?? '')
  const label = PAGE_LABELS[base] ?? 'Soren'

  const [showProfile, setShowProfile] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [prenom, setPrenom] = useState('')
  const [user, setUser] = useState<{ name: string; email: string; avatar: string | null } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initiale = prenom ? prenom[0].toUpperCase() : (user?.name?.[0]?.toUpperCase() ?? 'U')

  return (
    <header className="flex md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-soren-app border-b border-soren-border items-center justify-between px-4">
      <span className="text-[15px] font-bold text-soren-text">{label}</span>

      <div className="relative flex-shrink-0" ref={popupRef}>
        <button
          onClick={() => setShowProfile(v => !v)}
          className="w-8 h-8 rounded-full bg-[#E2FF8D] flex items-center justify-center text-[11px] font-bold text-[#111111] overflow-hidden"
        >
          {profilePhoto
            ? <img src={profilePhoto} alt="avatar" className="object-cover w-full h-full" />
            : user?.avatar
              ? <Image src={user.avatar} alt="avatar" width={32} height={32} className="object-cover w-full h-full" />
              : initiale
          }
        </button>

        {showProfile && (
          <div className="absolute right-0 top-10 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-50 w-52 overflow-hidden">
            <div className="px-4 py-3 border-b border-soren-border">
              <p className="text-[13px] font-semibold text-soren-text capitalize">{prenom || user?.name || '—'}</p>
              <p className="text-[10px] text-soren-subtle">{user?.email ?? '—'}</p>
            </div>
            <div className="py-1">
              <Link
                href="/parametres"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-soren-muted hover:bg-soren-elevated transition-colors"
              >
                <Settings size={13} /> Paramètres
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} /> Se déconnecter
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
