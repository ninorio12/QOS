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
    <nav className="mob-nav-blur flex md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-soren-border pb-safe">
      <div className="flex items-center justify-around w-full pt-2 pb-1">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-0"
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                active ? 'bg-soren-accent' : 'bg-transparent'
              }`}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'text-soren-text' : 'text-soren-subtle'}
                />
              </div>
              <span className={`text-[10px] font-semibold truncate transition-colors ${
                active ? 'text-soren-text' : 'text-soren-subtle'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
