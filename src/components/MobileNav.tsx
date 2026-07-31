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
    // Sur mobile, « Pipeline Clients » n'est pas un module à part : le module Pipeline regroupe déjà Leads + Clients (onglets).
    const canSee = (href: string) => href !== '/pipeline/clients' && (loading || canSeeModule(href, isAdmin, me?.allowedModules))
    const chosen = favs.filter(canSee)
    for (const m of MODULES) {
      if (chosen.length >= 4) break
      if (canSee(m.href) && !chosen.includes(m.href)) chosen.push(m.href)
    }
    return chosen.slice(0, 4).map(h => MODULES.find(m => m.href === h)).filter(Boolean) as typeof MODULES
  }, [favs, isAdmin, me, loading])

  const onModules = pathname === '/modules'
  const isTabActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  // Index réel (selon la route) de l'onglet actif (modules = après les onglets).
  const realIdx = onModules ? tabs.length : tabs.findIndex(t => isTabActive(t.href))
  // Index OPTIMISTE : posé AU CLIC (jamais au poser du doigt, sinon le rendu
  // React interrompt le geste sur iOS) pour que la pastille glisse sans attendre la route.
  const [pending, setPending] = useState<number | null>(null)
  useEffect(() => { setPending(null) }, [pathname]) // la route est arrivée → on suit le réel
  const activeIdx = pending ?? realIdx
  const modulesActive = activeIdx === tabs.length
  const PITCH = 54 // w-12 (48px) + gap-1.5 (6px)

  // Barre inerte UNIQUEMENT au tout premier chargement : même gabarit, aucun
  // lien cliquable, donc aucun tap ne peut partir sur un onglet qui va changer.
  // Une fois les onglets connus, ils ne redeviennent jamais inertes, même si le
  // profil est rechargé : sinon un tap tomberait dans le vide en pleine navigation.
  const [ready, setReady] = useState(false)
  useEffect(() => { if (!loading) setReady(true) }, [loading])
  if (loading && !ready) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
        <div className="mb-3 px-2.5 py-2 rounded-full flex items-center gap-1.5 nav-island">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="w-12 h-12 rounded-full bg-soren-elevated/60 animate-pulse" />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pointer-events-none">
      <div className="pointer-events-auto mb-3 px-2.5 py-2 rounded-full flex items-center gap-1.5 nav-island relative">
        {/* Pastille active qui GLISSE entre les onglets — pilotée par l'index optimiste (instant au tap) */}
        {activeIdx >= 0 && (
          <span
            aria-hidden
            className="absolute top-2 left-2.5 w-12 h-12 rounded-full shadow-sm transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activeIdx * PITCH}px)`, background: modulesActive ? '#FFFFFF' : '#FF4D00' }}
          />
        )}
        {tabs.map(({ href, icon: Icon, label }, i) => {
          const active = activeIdx === i
          return (
            <Link
              key={href}
              prefetch
              href={href}
              aria-label={label}
              onClick={() => setPending(i)}
              className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center [touch-action:manipulation] active:opacity-70 transition-opacity duration-100 tap-clean"
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} className={`transition-colors duration-200 ${active ? 'text-[#111111]' : 'text-soren-subtle'}`} />
            </Link>
          )
        })}
        {/* 5e onglet fixe — Tout (grille des modules, remplace la sidebar) */}
        <Link
          href="/modules"
          aria-label="Tout"
          onClick={() => setPending(tabs.length)}
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center [touch-action:manipulation] active:opacity-70 transition-opacity duration-100 tap-clean"
        >
          <LayoutGrid size={21} strokeWidth={modulesActive ? 2.3 : 1.8} className={`transition-colors duration-200 ${modulesActive ? 'text-[#111111]' : 'text-soren-subtle'}`} />
        </Link>
      </div>
    </nav>
  )
}
