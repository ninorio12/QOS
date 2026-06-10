'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Toujours autorisés, quel que soit allowedModules.
// /modules = page « Tout » (navigation) → indispensable, même en compte restreint.
const ALWAYS_ALLOWED = ['/dashboard', '/parametres', '/modules']

// Dérive le chemin de module de base depuis le pathname.
// /contacts/123 -> /contacts ; /bibliotheque/data -> /bibliotheque/data
function moduleBase(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  if (parts[0] === 'bibliotheque' && parts[1]) return `/bibliotheque/${parts[1]}`
  return `/${parts[0]}`
}

// Redirige un utilisateur NON-admin qui accède à un module hors de ses droits.
export default function ModuleGuard() {
  const { me, isLoaded, isAdmin } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !me || isAdmin) return
    const base = moduleBase(pathname)
    if (ALWAYS_ALLOWED.includes(base)) return
    // allowedModules undefined/null (anciennes lignes) => aucune restriction => ne pas rediriger.
    // On ne redirige QUE si c'est un vrai tableau non-vide qui n'inclut pas la base.
    const allowed = me.allowedModules
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(base)) {
      router.replace('/dashboard')
    }
  }, [isLoaded, me, isAdmin, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
