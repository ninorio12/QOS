'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, GitMerge, Users, MessageSquare, CalendarDays,
  TrendingUp, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Settings, LogOut, GitBranch,
} from 'lucide-react'
import Image from 'next/image'
import { logout } from '@/app/login/actions'

type NavItem = { href: string; icon: React.ElementType; label: string; also?: string[] }

const ACQUISITION: NavItem[] = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/pipeline',      icon: GitMerge,        label: 'Prospects' },
  { href: '/contacts',      icon: Users,           label: 'Contacts' },
  { href: '/conversations', icon: MessageSquare,   label: 'Conversations', also: ['/conversion'] },
  { href: '/calendrier',    icon: CalendarDays,    label: 'Calendrier' },
  { href: '/analyse',       icon: TrendingUp,      label: 'Analyse', also: ['/growth'] },
]

const AGENTIQUE: NavItem[] = [
  { href: '/equipe',     icon: BotMessageSquare, label: 'Équipe IA' },
  { href: '/taches',     icon: CheckSquare,      label: 'Tâches' },
  { href: '/logs',       icon: ScrollText,       label: 'Logs' },
  { href: '/knowledge',  icon: Database,         label: 'Base de connaissance' },
  { href: '/workflows',  icon: GitBranch,        label: 'Workflows' },
]

const CONFIGURATION: NavItem[] = [
  { href: '/budget',     icon: Wallet,   label: 'Budget' },
  { href: '/parametres', icon: Settings, label: 'Paramètres' },
]

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 px-2.5 mt-4 mb-0.5">
      {label}
    </p>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, icon: Icon, label, also = [] } = item
  const active =
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href)) ||
    also.some(a => pathname.startsWith(a))

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150
        ${active
          ? 'bg-[#E2FF8D] text-[#111111] shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-white/8'
        }
      `}
    >
      <Icon size={14} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className={`text-[13px] truncate ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-3 top-3 bottom-3 w-56 bg-[#111111] rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0">
        <Image
          src="/soren-logo.png"
          alt="Soren"
          width={28}
          height={28}
          priority
          className="object-contain rounded-lg flex-shrink-0"
        />
        <span className="text-white font-bold text-[14px] tracking-tight">Soren</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col flex-1 px-2 pb-2 overflow-y-auto scrollbar-none">
        <SectionLabel label="Acquisition" />
        {ACQUISITION.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Agentique" />
        {AGENTIQUE.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Configuration" />
        {CONFIGURATION.map(item => <NavLink key={item.href} item={item} pathname={pathname} />)}
      </nav>
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-14 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(to bottom, transparent, #111111)' }}
      />

      {/* Avatar + Logout */}
      <div className="px-3 pt-2 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#E2FF8D] flex items-center justify-center text-[11px] font-bold text-[#111111] flex-shrink-0">
            T
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[12px] font-semibold truncate">Thomas</p>
            <p className="text-white/40 text-[10px]">Admin · Pro</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              data-tooltip="Déconnexion"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
            >
              <LogOut size={12} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
