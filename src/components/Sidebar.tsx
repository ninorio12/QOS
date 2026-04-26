'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import {
  LayoutDashboard, GitMerge, Users, MessageSquare, CalendarDays,
  TrendingUp, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Settings, LogOut, GitBranch, FileText,
} from 'lucide-react'
import Image from 'next/image'
import { logout } from '@/app/login/actions'
import { createClient } from '@/lib/supabase/client'

type NavItem = { href: string; icon: React.ElementType; label: string; also?: string[] }

const PREFETCH_MAP: Record<string, string> = {
  '/dashboard':     '/api/dashboard',
  '/conversations': '/api/conversations/list',
  '/calendrier':    '/api/calendrier',
  '/devis':         '/api/devis/list',
}

const prefetchFetcher = (url: string) => fetch(url).then(r => r.json())

const ACQUISITION: NavItem[] = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/pipeline',      icon: GitMerge,        label: 'Pipeline' },
  { href: '/contacts',      icon: Users,           label: 'Contacts' },
  { href: '/conversations', icon: MessageSquare,   label: 'Conversations', also: ['/conversion'] },
  { href: '/devis',         icon: FileText,        label: 'Devis' },
  { href: '/calendrier',    icon: CalendarDays,    label: 'Calendrier' },
  { href: '/analyse',       icon: TrendingUp,      label: 'Analyse', also: ['/growth'] },
]

const AGENTIQUE: NavItem[] = [
  { href: '/equipe',    icon: BotMessageSquare, label: 'Équipe IA' },
  { href: '/taches',    icon: CheckSquare,      label: 'Tâches' },
  { href: '/logs',      icon: ScrollText,       label: 'Activités' },
  { href: '/knowledge', icon: Database,         label: 'Base de connaissance' },
]

const CONFIGURATION: NavItem[] = [
  { href: '/workflows', icon: GitBranch, label: 'Automatisation' },
  { href: '/budget',    icon: Wallet,    label: 'Budget' },
  { href: '/parametres', icon: Settings, label: 'Paramètres' },
]

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[8.5px] font-bold uppercase tracking-widest text-white/25 px-3 mt-3 mb-0.5">
      {label}
    </p>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, icon: Icon, label, also = [] } = item
  const { mutate, cache } = useSWRConfig()
  const active =
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href)) ||
    also.some(a => pathname.startsWith(a))

  function handleMouseEnter() {
    const endpoint = PREFETCH_MAP[href]
    if (!endpoint) return
    if ((cache as Map<string, unknown>).get(endpoint)) return
    void mutate(endpoint, prefetchFetcher(endpoint))
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      className={`
        flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
        ${active
          ? 'bg-[#E2FF8D] text-[#111111] shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
        }
      `}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className={`text-[12px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [profilePhoto, setProfilePhoto] = useState('')
  const [prenom, setPrenom] = useState('')
  const [role, setRole] = useState<'superadmin' | 'client' | null>(null)

  useEffect(() => {
    function load() {
      try {
        const p = localStorage.getItem('soren_profile_photo')
        setProfilePhoto(p ?? '')
      } catch {}
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
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => setRole((data?.role as 'superadmin' | 'client') ?? 'client'))
    })
  }, [])

  const isSuperAdmin = role === 'superadmin' || role === null // null = chargement, on affiche tout par défaut

  return (
    <aside className="fixed left-3 top-3 bottom-3 w-56 bg-soren-sidebar rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 flex-shrink-0">
        <Image
          src="/soren-logo.png"
          alt="Soren"
          width={24}
          height={24}
          priority
          className="object-contain rounded-lg flex-shrink-0"
        />
        <span className="text-white font-bold text-[14px] tracking-tight">Soren</span>
      </Link>

      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />

      {/* Nav */}
      <nav className="flex flex-col flex-1 px-2 py-1 overflow-hidden">
        <SectionLabel label="Acquisition" />
        {ACQUISITION.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}

        {isSuperAdmin && (
          <>
            <SectionLabel label="Agentique" />
            {AGENTIQUE.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
          </>
        )}

        {!isSuperAdmin && (
          <>
            <SectionLabel label="Agents" />
            <NavLink item={{ href: '/taches', icon: CheckSquare, label: 'Tâches' }} pathname={pathname} />
          </>
        )}

        <SectionLabel label="Configuration" />
        {isSuperAdmin
          ? CONFIGURATION.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)
          : <NavLink item={{ href: '/parametres', icon: Settings, label: 'Paramètres' }} pathname={pathname} />
        }
      </nav>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-14 left-0 right-0 h-8"
        style={{ background: 'linear-gradient(to bottom, transparent, #111111)' }}
      />

      {/* Avatar + Logout */}
      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />
      <div className="px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#E2FF8D]">
            {profilePhoto
              ? <img src={profilePhoto} alt="profil" className="w-full h-full object-cover" />
              : <span className="text-[11px] font-bold text-soren-text">{prenom ? prenom[0].toUpperCase() : 'T'}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[12px] font-semibold truncate">{prenom || 'Utilisateur'}</p>
            <p className="text-white/40 text-[10px]">Admin · Pro</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-soren-card/8 transition-colors"
            >
              <LogOut size={12} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
