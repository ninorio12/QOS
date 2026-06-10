'use client'

import { usePathname } from 'next/navigation'

/**
 * PageTransition — entrée de chaque module en cascade « stagger cartes ».
 *
 * Le wrapper se remonte sur changement de `pathname` (via `key`), ce qui
 * rejoue l'animation CSS : la page apparaît en fondu doux et les cartes des
 * conteneurs marqués `data-stagger` montent l'une après l'autre.
 * Toute la logique d'anim vit dans globals.css (.vf-stagger-page), y compris
 * le respect de prefers-reduced-motion. Sidebar/Header (hors de ce composant)
 * restent fixes.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="vf-stagger-page h-full">
      {children}
    </div>
  )
}
