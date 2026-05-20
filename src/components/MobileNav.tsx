'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, GitMerge, Users, MessageSquare, BotMessageSquare } from 'lucide-react'

const TABS = [
  { href: '/dashboard',     icon: LayoutDashboard,  label: 'Home' },
  { href: '/pipeline',      icon: GitMerge,         label: 'Pipeline' },
  { href: '/contacts',      icon: Users,            label: 'Contacts' },
  { href: '/conversations', icon: MessageSquare,    label: 'Messages' },
  { href: '/equipe',        icon: BotMessageSquare, label: 'Agents IA' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
      <div className="pointer-events-auto mb-4 px-3 py-2.5 rounded-[32px] flex items-center gap-1 nav-island">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`w-12 h-12 rounded-[22px] flex items-center justify-center transition-all duration-200 ${
                active
                  ? 'bg-[#FF4D00] shadow-sm scale-105'
                  : 'hover:bg-white/10 active:scale-95'
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 1.7}
                className={active ? 'text-[#111111]' : 'text-soren-subtle'}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
