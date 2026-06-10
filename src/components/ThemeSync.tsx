'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Applique le thème stocké côté utilisateur (Convex) au chargement, sur toutes les pages.
export default function ThemeSync() {
  const { me } = useCurrentUser()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (me?.theme && me.theme !== theme) {
      setTheme(me.theme)
    }
  }, [me?.theme]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
