'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard, GitMerge, Users, MessageSquare, CalendarDays,
  TrendingUp, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Settings, LogOut, GitBranch, FileText,
  Radio, ChevronDown, Library, FolderOpen, HardDrive, ListChecks, Users2, CreditCard, Rocket, Plug, PhoneCall,
} from 'lucide-react'
import Image from 'next/image'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type NavItem = { href: string; icon: React.ElementType; label: string; also?: string[] }

const PREFETCH_MAP: Record<string, string> = {
  '/dashboard':     '/api/dashboard',
  '/calendrier':    '/api/calendrier',
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
  { href: '/prospection',   icon: PhoneCall,       label: 'Prospection' },
  { href: '/performance',   icon: TrendingUp,      label: 'Performance' },
  { href: '/onboarding',    icon: Rocket,          label: 'Onboarding' },
  { href: '/paiement',      icon: CreditCard,      label: 'Paiement' },
  { href: '/calendrier',    icon: CalendarDays,    label: 'Calendrier' },
]

const BIBLIOTHEQUES: NavItem[] = [
  { href: '/bibliotheque/data',       icon: HardDrive,   label: 'Data'       },
  { href: '/bibliotheque/records',    icon: FolderOpen,  label: 'Records'    },
  { href: '/bibliotheque/process',    icon: ListChecks,  label: 'Process'    },
]

const AGENTIQUE: NavItem[] = [
{ href: '/equipe',        icon: BotMessageSquare, label: 'Équipe IA' },
  { href: '/taches',        icon: CheckSquare,      label: 'Tâches' },
  { href: '/logs',          icon: ScrollText,       label: 'Activités' },
  { href: '/knowledge',     icon: Database,         label: 'Base de connaissance' },
]

const CONFIGURATION: NavItem[] = [
  { href: '/budget',    icon: Wallet,    label: 'Budget' },
  { href: '/integrations', icon: Plug,   label: 'Intégrations' },
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
      <span className="text-[12px] truncate font-medium">{label}</span>
    </Link>
  )
}

function BibliothequeNav({ pathname }: { pathname: string }) {
  const onBiblio = pathname.startsWith('/bibliotheque')
  const dataActive    = pathname.startsWith('/bibliotheque/data') || (onBiblio && !pathname.startsWith('/bibliotheque/records') && !pathname.startsWith('/bibliotheque/process'))
  const recordsActive = pathname.startsWith('/bibliotheque/records')
  const processActive  = pathname.startsWith('/bibliotheque/process')

  const SUBS = [
    { href: '/bibliotheque/data',       label: 'Data',       active: dataActive    },
    { href: '/bibliotheque/records',    label: 'Records',    active: recordsActive },
    { href: '/bibliotheque/process',    label: 'Process',    active: processActive },
  ]

  return (
    <>
      <Link
        href="/bibliotheque/data"
        className={`
          flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
          ${onBiblio
            ? 'bg-[#FF4D00] text-white shadow-sm'
            : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
          }
        `}
      >
        <Library size={13} strokeWidth={onBiblio ? 2.5 : 1.8} className="flex-shrink-0" />
        <span className="text-[12px] truncate flex-1 font-medium">Bibliothèque</span>
        {onBiblio && <ChevronDown size={10} className="flex-shrink-0 text-white/60" />}
      </Link>

      {onBiblio && (
        <div className="ml-4 flex flex-col gap-0.5 mt-0.5">
          {SUBS.map(({ href, label, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
              active ? 'bg-white/10 text-white font-medium' : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
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
  const router = useRouter()
  const onPipeline = pathname.startsWith('/pipeline')
  const leadsActive   = onPipeline && !pathname.startsWith('/pipeline/clients')
  const clientsActive = pathname.startsWith('/pipeline/clients')
  const [open, setOpen] = useState(onPipeline)

  useEffect(() => { if (onPipeline) setOpen(true); else setOpen(false) }, [onPipeline])

  return (
    <>
      <button
        onClick={() => { if (!onPipeline) router.push('/pipeline'); else setOpen(v => !v) }}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150 ${
          onPipeline
            ? 'bg-[#FF4D00] text-white shadow-sm'
            : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
        }`}
      >
        <GitMerge size={13} strokeWidth={onPipeline ? 2.5 : 1.8} className="flex-shrink-0" />
        <span className="text-[12px] truncate flex-1 text-left font-medium">Pipeline</span>
        <ChevronDown
          size={10}
          className="flex-shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
        <div className="flex flex-col gap-0.5 mt-0.5 pb-0.5">
          <Link
            href="/pipeline"
            className={`flex items-center px-3 py-1.5 rounded-xl text-[11px] transition-all duration-150 ${
              leadsActive
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="pl-[23px]">Leads</span>
          </Link>
          <Link
            href="/pipeline/clients"
            className={`flex items-center px-3 py-1.5 rounded-xl text-[11px] transition-all duration-150 ${
              clientsActive
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <span className="pl-[23px]">Clients</span>
          </Link>
        </div>
        </div>
      </div>
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const { me, isAdmin, isLoaded } = useCurrentUser()
  const { signOut } = useClerk()

  const displayName = me?.name || 'Utilisateur'
  const avatarUrl = me?.avatarUrl
  const canSee = (href: string) => isAdmin || (me?.allowedModules ?? []).includes(href)
  const visible = (items: NavItem[]) => items.filter(i => canSee(i.href))

  const acquisitionPre = visible(ACQUISITION_PRE)
  const acquisitionPost = visible(ACQUISITION_POST)
  const bibliotheques = visible(BIBLIOTHEQUES)
  const agentique = visible(AGENTIQUE)
  const configuration = visible(CONFIGURATION)
  const showAcquisition = acquisitionPre.length > 0 || acquisitionPost.length > 0 || canSee('/pipeline')

  // Avoid flicker: render nothing until user data is loaded
  if (!isLoaded) return (
    <aside className="fixed left-3 top-3 bottom-3 w-56 bg-soren-sidebar rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl" />
  )

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
        <span className="text-white font-sans font-bold text-[16px] tracking-[-0.01em]">VividFlow</span>
      </Link>

      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />

      {/* Nav */}
      <nav ref={navRef} className="flex flex-col flex-1 px-2 pt-1 pb-10 overflow-y-auto sidebar-nav">
        {showAcquisition && <SectionLabel label="Acquisition" />}
        {acquisitionPre.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
        {canSee('/pipeline') && <PipelineNav pathname={pathname} />}
        {acquisitionPost.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}

        {bibliotheques.length > 0 && <>
          <SectionLabel label="Bibliothèques" />
          {bibliotheques.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
        </>}

        {isAdmin && agentique.length > 0 && (
          <>
            <SectionLabel label="Agentique" />
            {agentique.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
          </>
        )}

        {!isAdmin && canSee('/taches') && (
          <>
            <SectionLabel label="Agents" />
            <NavLink item={{ href: '/taches', icon: CheckSquare, label: 'Tâches' }} pathname={pathname} />
          </>
        )}

        {isAdmin && configuration.length > 0 && (
          <>
            <SectionLabel label="Configuration" />
            {configuration.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
          </>
        )}
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
          <Link href="/parametres" className="flex items-center gap-2.5 min-w-0 flex-1 group">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#FF4D00]">
              {avatarUrl
                ? <img src={avatarUrl} alt="profil" className="w-full h-full object-cover" />
                : <span className="text-[11px] font-bold text-[#111111]">{displayName[0]?.toUpperCase() ?? 'U'}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[12px] font-semibold truncate group-hover:text-white/90 transition-colors">{displayName}</p>
              <p className="text-white/40 text-[10px] capitalize truncate">{me?.role ?? '—'}</p>
            </div>
          </Link>
          <button
            onClick={() => { void signOut().finally(() => { window.location.href = '/login' }) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-soren-card/8 transition-colors flex-shrink-0"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
