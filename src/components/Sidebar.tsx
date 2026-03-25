'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  GitMerge,
  Users,
  MessageSquare,
  TrendingUp,
  Bot,
  FolderKanban,
  Settings,
  Bell,
} from 'lucide-react'
import Image from 'next/image'

const navItems = [
  { href: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pipeline',       icon: GitMerge,        label: 'Pipeline' },
  { href: '/contacts',       icon: Users,           label: 'Contacts' },
  { href: '/conversations',  icon: MessageSquare,   label: 'Conversations' },
  { href: '/growth',         icon: TrendingUp,      label: 'Growth' },
  { href: '/agent',          icon: Bot,             label: 'Agent IA' },
  { href: '/projects',       icon: FolderKanban,    label: 'Projects' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-[#1C2333] border-r border-[#232D3F] flex flex-col items-center py-5 z-50">
      {/* Logo */}
      <Link href="/dashboard" className="mb-8 flex-shrink-0">
        <Image
          src="/logo-icon.png"
          alt="Qorpo"
          width={34}
          height={34}
          priority
          className="object-contain"
        />
      </Link>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative
                ${active
                  ? 'bg-[#3462EE]/20 text-[#3462EE]'
                  : 'text-[#3D4F6B] hover:text-[#8896AB] hover:bg-[#232D3F]'
                }
              `}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3462EE] rounded-r-full -ml-px" />
              )}
              {/* Tooltip */}
              <span className="absolute left-14 bg-[#1A2235] text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-[#232D3F] transition-opacity z-50">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-1">
        <button title="Notifications" className="w-10 h-10 rounded-xl flex items-center justify-center text-[#3D4F6B] hover:text-[#8896AB] hover:bg-[#232D3F] transition-all">
          <Bell size={18} strokeWidth={1.8} />
        </button>
        <Link href="/settings" title="Paramètres" className="w-10 h-10 rounded-xl flex items-center justify-center text-[#3D4F6B] hover:text-[#8896AB] hover:bg-[#232D3F] transition-all">
          <Settings size={18} strokeWidth={1.8} />
        </Link>
        {/* Avatar */}
        <div className="mt-3 w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
          Q
        </div>
      </div>
    </aside>
  )
}
