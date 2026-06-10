'use client'
import { useEffect, useState } from 'react'

/**
 * true sur les appareils à pointeur grossier (tactile) — détecté côté client après montage.
 * Sert à désactiver le drag des cartes sur mobile (où il accroche le scroll) :
 * le déplacement s'y fait via les flèches « Étape/Colonne ».
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    try {
      setCoarse(window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
    } catch { /* noop */ }
  }, [])
  return coarse
}
