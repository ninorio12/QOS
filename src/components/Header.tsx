'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, ChevronDown } from 'lucide-react'

const tabs = [
  { href: '/pipeline',      label: 'Pipeline' },
  { href: '/contacts',      label: 'Contacts' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/growth',        label: 'Growth' },
  { href: '/agent',         label: 'Agent IA' },
  { href: '/projects',      label: 'Projects' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-[#121721] border-b border-[#1A2235] flex items-center px-6 gap-6 z-40">
      {/* Search */}
      <div className="flex items-center gap-2 bg-[#1A2235] border border-[#232D3F] rounded-lg px-3 py-1.5 w-56 flex-shrink-0">
        <Search size={13} className="text-[#3D4F6B]" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="bg-transparent text-sm text-white placeholder-[#3D4F6B] outline-none w-full"
        />
        <kbd className="text-[10px] text-[#3D4F6B] bg-[#232D3F] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 flex-1">
        {tabs.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-[#1A2235] text-white'
                  : 'text-[#8896AB] hover:text-white hover:bg-[#1A2235]/50'
                }
              `}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button className="flex items-center gap-2 bg-[#3462EE] hover:bg-[#2a50d4] text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={14} />
          Nouveau lead
        </button>
        <button className="flex items-center gap-2 text-sm text-[#8896AB] hover:text-white transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8F135] to-[#8ab520] flex items-center justify-center text-[#121721] text-xs font-bold">Q</div>
          <ChevronDown size={13} />
        </button>
      </div>
    </header>
  )
}
