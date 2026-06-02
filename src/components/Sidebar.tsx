'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import {
  LayoutDashboard, GitMerge, Users, MessageSquare, CalendarDays,
  TrendingUp, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Settings, LogOut, GitBranch, FileText,
  Radio, ChevronDown, Library, FolderOpen, HardDrive, ListChecks, Users2,
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

const prefetchFetcher = async (url: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`API ${url} failed:`, response.status)
      return null
    }
    const text = await response.text()
    if (!text) {
      console.warn(`API ${url} returned empty response`)
      return null
    }
    return JSON.parse(text)
  } catch (error) {
    console.warn(`API ${url} error:`, error)
    return null
  }
}

const ACQUISITION_PRE: NavItem[] = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
]

const ACQUISITION_POST: NavItem[] = [
  { href: '/contacts',      icon: Users,           label: 'Contacts' },
  { href: '/conversations', icon: MessageSquare,   label: 'Conversations', also: ['/conversion'] },
  { href: '/devis',         icon: FileText,        label: 'Contrats' },
  { href: '/calendrier',    icon: CalendarDays,    label: 'Calendrier' },
  { href: '/analyse',       icon: TrendingUp,      label: 'Analyse', also: ['/growth'] },
]

const BIBLIOTHEQUES: NavItem[] = [
  { href: '/bibliotheque/projets',    icon: Library,     label: 'Projets'    },
  { href: '/bibliotheque/data',       icon: HardDrive,   label: 'Data'       },
  { href: '/bibliotheque/records',    icon: FolderOpen,  label: 'Records'    },
  { href: '/bibliotheque/process',    icon: ListChecks,  label: 'Process'    },
  { href: '/bibliotheque/onboarding', icon: Users2,      label: 'Onboarding' },
]

const AGENTIQUE: NavItem[] = [
{ href: '/equipe',        icon: BotMessageSquare, label: 'Équipe IA' },
  { href: '/taches',        icon: CheckSquare,      label: 'Tâches' },
  { href: '/logs',          icon: ScrollText,       label: 'Activités' },
  { href: '/knowledge',     icon: Database,         label: 'Base de connaissance' },
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
  const router = useRouter()
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

  function handleClick(e: React.MouseEvent) {
    if (active) {
      e.preventDefault()
      router.refresh()
    }
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      className={`
        flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
        ${active
          ? 'bg-[#FF4D00] text-white shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
        }
      `}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className={`text-[12px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </Link>
  )
}

function BibliothequeNav({ pathname }: { pathname: string }) {
  const onBiblio = pathname.startsWith('/bibliotheque')
  const projetsActive = onBiblio && !pathname.startsWith('/bibliotheque/data') && !pathname.startsWith('/bibliotheque/records') && !pathname.startsWith('/bibliotheque/process') && !pathname.startsWith('/bibliotheque/onboarding')
  const dataActive    = pathname.startsWith('/bibliotheque/data')
  const recordsActive = pathname.startsWith('/bibliotheque/records')

  const processActive  = pathname.startsWith('/bibliotheque/process')
  const onboardActive  = pathname.startsWith('/bibliotheque/onboarding')

  const SUBS = [
    { href: '/bibliotheque/projets',    label: 'Projets',    active: projetsActive },
    { href: '/bibliotheque/data',       label: 'Data',       active: dataActive    },
    { href: '/bibliotheque/records',    label: 'Records',    active: recordsActive },
    { href: '/bibliotheque/process',    label: 'Process',    active: processActive },
    { href: '/bibliotheque/onboarding', label: 'Onboarding', active: onboardActive },
  ]

  return (
    <>
      <Link
        href="/bibliotheque/projets"
        className={`
          flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
          ${onBiblio
            ? 'bg-[#FF4D00] text-white shadow-sm'
            : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
          }
        `}
      >
        <Library size={13} strokeWidth={onBiblio ? 2.5 : 1.8} className="flex-shrink-0" />
        <span className={`text-[12px] truncate flex-1 ${onBiblio ? 'font-semibold' : 'font-medium'}`}>Bibliothèque</span>
        {onBiblio && <ChevronDown size={10} className="flex-shrink-0 text-white/60" />}
      </Link>

      {onBiblio && (
        <div className="ml-4 flex flex-col gap-0.5 mt-0.5">
          {SUBS.map(({ href, label, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
              active ? 'bg-white/10 text-white font-semibold' : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${active ? 'bg-[#FF4D00]' : 'bg-white/20'}`} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function PipelineNav({ pathname }: { pathname: string }) {
  const leadsActive   = pathname === '/pipeline' || (pathname.startsWith('/pipeline') && !pathname.startsWith('/pipeline/clients'))
  const clientsActive = pathname.startsWith('/pipeline/clients')

  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150 ${
        active ? 'bg-[#FF4D00] text-white shadow-sm' : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
      }`}
    >
      <GitMerge size={13} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className={`text-[12px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </Link>
  )

  return (
    <>
      {item('/pipeline', 'Pipeline Leads', leadsActive)}
      {item('/pipeline/clients', 'Pipeline Clients', clientsActive)}
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const saved = sessionStorage.getItem('sidebar_scroll')
    if (saved) nav.scrollTop = parseInt(saved, 10)
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const save = () => sessionStorage.setItem('sidebar_scroll', String(nav.scrollTop))
    nav.addEventListener('scroll', save, { passive: true })
    return () => nav.removeEventListener('scroll', save)
  }, [])
  const [profilePhoto, setProfilePhoto] = useState('')
  const [prenom, setPrenom] = useState('')
  const [role, setRole] = useState<'superadmin' | 'client' | null>(null)

  useEffect(() => {
    function load() {
      try {
        const p = localStorage.getItem('vividflow_profile_photo')
        setProfilePhoto(p ?? '')
      } catch {}
      try {
        const compte = JSON.parse(localStorage.getItem('vividflow_compte') ?? '{}')
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
    const hasSupabaseEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    if (!hasSupabaseEnv) {
      setRole('superadmin')
      return
    }

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

  const isSuperAdmin = role === 'superadmin' || role === null

  return (
    <aside className="fixed left-3 top-3 bottom-3 w-56 bg-soren-sidebar rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 flex-shrink-0">
        <Image
          src="/vividflow-logo.png"
          alt="VividFlow"
          width={32}
          height={32}
          priority
          className="object-contain rounded-xl flex-shrink-0 shadow-md"
        />
        <span className="text-white font-black text-[15px] tracking-tight">VividFlow</span>
      </Link>

      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />

      {/* Nav */}
      <nav ref={navRef} className="flex flex-col flex-1 px-2 py-1 overflow-y-auto">
        <SectionLabel label="Acquisition" />
        {ACQUISITION_PRE.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <PipelineNav pathname={pathname} />
        {ACQUISITION_POST.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}

        <SectionLabel label="Bibliothèques" />
        {BIBLIOTHEQUES.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}

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
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#FF4D00]">
            {profilePhoto
              ? <img src={profilePhoto} alt="profil" className="w-full h-full object-cover" />
              : <span className="text-[11px] font-bold text-[#111111]">{prenom ? prenom[0].toUpperCase() : 'T'}</span>
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
