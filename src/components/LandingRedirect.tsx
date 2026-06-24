'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firstAllowedRoute } from '@/components/nav/modules'

/**
 * Atterrissage racine `/` — décide la 1ʳᵉ page selon les droits du compte AVANT
 * d'afficher quoi que ce soit. Un compte sans le module /dashboard ne voit donc
 * jamais le Tableau de bord (ni en flash) : il est redirigé vers son 1er module
 * autorisé. Admin / compte non-restreint → /dashboard.
 *
 * Rendu volontairement neutre (logo + shimmer) pendant le chargement du profil :
 * aucune donnée métier n'est montée ici.
 */
export default function LandingRedirect() {
  const { me, isLoaded, isAdmin } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !me) return
    router.replace(firstAllowedRoute(isAdmin, me.allowedModules))
  }, [isLoaded, me, isAdmin, router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-soren-app">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Image src="/vividflow-logo.png" alt="VividFlow" width={48} height={48} priority className="object-contain rounded-2xl shadow-md" />
        <div className="h-2 w-24 rounded bg-soren-border" />
      </div>
    </div>
  )
}
