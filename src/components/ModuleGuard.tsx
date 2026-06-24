'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firstAllowedRoute } from '@/components/nav/modules'

// Toujours autorisés, quel que soit allowedModules.
// /modules = page « Tout » (navigation) → indispensable, même en compte restreint.
// /dashboard N'EST PLUS toujours autorisé : il expose des KPI sensibles (CA, leads)
// et doit être réservé aux comptes ayant ce module dans allowedModules.
const ALWAYS_ALLOWED = ['/parametres', '/modules']

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
    // allowedModules ABSENT/non-tableau (anciennes lignes) => aucune restriction => ne pas
    // rediriger. Un tableau (même VIDE) = liste blanche exhaustive : zéro module = aucun
    // accès (sinon « rien coché » accorderait tout — l'inverse du besoin).
    const allowed = me.allowedModules
    if (Array.isArray(allowed) && !allowed.includes(base)) {
      // Renvoie vers le 1er module autorisé (jamais /dashboard si non autorisé → pas de boucle).
      router.replace(firstAllowedRoute(false, allowed))
    }
  }, [isLoaded, me, isAdmin, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
