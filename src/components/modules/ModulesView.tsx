'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Star, Check } from 'lucide-react'
import { MODULES, GROUP_ORDER, readFavorites, writeFavorites, canSeeModule } from '@/components/nav/modules'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function ModulesView() {
  const { me, isAdmin } = useCurrentUser()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(false)
  const [favs, setFavs] = useState<string[]>([])

  useEffect(() => { setFavs(readFavorites()) }, [])

  // Compte restreint : la grille ne montre que les modules autorisés.
  const loading = me === undefined && !isAdmin
  const allowed = useMemo(
    () => MODULES.filter(m => loading || canSeeModule(m.href, isAdmin, me?.allowedModules)),
    [isAdmin, me, loading],
  )

  const query = q.toLowerCase().trim()
  const groups = useMemo(() => GROUP_ORDER.map(g => ({
    name: g,
    items: allowed.filter(m => m.group === g && (!query || m.label.toLowerCase().includes(query))),
  })).filter(g => g.items.length > 0), [query, allowed])

  function toggleFav(href: string) {
    setFavs(prev => {
      let next: string[]
      if (prev.includes(href)) next = prev.filter(h => h !== href)
      else if (prev.length >= 4) next = [...prev.slice(1), href] // remplace le plus ancien
      else next = [...prev, href]
      writeFavorites(next)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col bg-soren-app">
      {/* Barre recherche + Personnaliser */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-soren-elevated rounded-full px-3.5 py-2">
          <Search size={15} className="text-soren-subtle flex-shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un module…"
            className="bg-transparent outline-none text-[13px] text-soren-text placeholder-soren-subtle w-full"
          />
        </div>
        <button
          onClick={() => setEdit(e => !e)}
          className={`text-[12px] font-semibold px-3 py-2 rounded-full transition-colors ${edit ? 'bg-[#FF4D00] text-white' : 'bg-soren-card border border-soren-border text-soren-muted'}`}
        >
          {edit ? 'OK' : 'Modifier'}
        </button>
      </div>

      {edit && (
        <p className="flex-shrink-0 px-5 pb-2 text-[11px] text-soren-subtle">
          Touche l'étoile pour ajouter/retirer un favori de la barre. {favs.length}/4 choisis.
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-28">
        {groups.map(g => (
          <div key={g.name} className="mb-2">
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-soren-subtle px-3 pt-4 pb-2">{g.name}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const isFav = favs.includes(href)
                const tile = (
                  <div className="relative flex flex-col items-center gap-2 py-4 px-1.5 rounded-2xl bg-soren-card border border-soren-border h-full">
                    <span className="w-11 h-11 rounded-[13px] flex items-center justify-center bg-[#FF4D00]/10 text-[#FF4D00]">
                      <Icon size={20} strokeWidth={1.9} />
                    </span>
                    <span className="text-[10.5px] font-medium text-center leading-tight text-soren-text">{label}</span>
                    {edit && (
                      <span className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center ${isFav ? 'bg-[#FF4D00] text-white' : 'bg-soren-elevated text-soren-subtle'}`}>
                        {isFav ? <Check size={13} strokeWidth={3} /> : <Star size={12} />}
                      </span>
                    )}
                  </div>
                )
                return edit ? (
                  <button key={href} onClick={() => toggleFav(href)} className="text-left active:scale-95 transition-transform">{tile}</button>
                ) : (
                  <Link key={href} href={href} className="active:scale-95 transition-transform">{tile}</Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
