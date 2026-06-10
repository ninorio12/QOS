'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { MODULES, readFavorites, FAV_EVENT, DEFAULT_FAVORITES, canSeeModule } from '@/components/nav/modules'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function MobileNav() {
  const pathname = usePathname()
  const { me, isAdmin } = useCurrentUser()
  const [favs, setFavs] = useState<string[]>(DEFAULT_FAVORITES)

  // Favoris persistés (par device). Re-lecture sur changement + event de personnalisation.
  useEffect(() => {
    const sync = () => setFavs(readFavorites())
    sync()
    window.addEventListener(FAV_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(FAV_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [pathname])

  // Compte restreint : on ne garde que les modules autorisés et on complète jusqu'à 4.
  const loading = me === undefined && !isAdmin
  const tabs = useMemo(() => {
    const canSee = (href: string) => loading || canSeeModule(href, isAdmin, me?.allowedModules)
    const chosen = favs.filter(canSee)
    for (const m of MODULES) {
      if (chosen.length >= 4) break
      if (canSee(m.href) && !chosen.includes(m.href)) chosen.push(m.href)
    }
    return chosen.slice(0, 4).map(h => MODULES.find(m => m.href === h)).filter(Boolean) as typeof MODULES
  }, [favs, isAdmin, me, loading])

  const onModules = pathname === '/modules'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
      <div className="pointer-events-auto mb-3 px-1.5 py-1.5 rounded-full flex items-center gap-0.5 nav-island">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = !onModules && (pathname === href || pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                active ? 'bg-[#FF4D00] shadow-sm' : 'active:scale-90'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-[#111111]' : 'text-soren-subtle'} />
            </Link>
          )
        })}
        {/* 5e onglet fixe — Tout (grille des modules, remplace la sidebar) */}
        <Link
          href="/modules"
          aria-label="Tout"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            onModules ? 'bg-white shadow-sm' : 'active:scale-90'
          }`}
        >
          <LayoutGrid size={18} strokeWidth={onModules ? 2.3 : 1.8} className={onModules ? 'text-[#111111]' : 'text-soren-subtle'} />
        </Link>
      </div>
    </nav>
  )
}
