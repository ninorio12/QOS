'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Rend ses enfants dans un nœud attaché à <body>, hors de tout ancêtre `transform`
 * (ex. MotionFade qui anime `y`) qui piégerait le z-index. Indispensable pour qu'une
 * modale `fixed inset-0 z-[100]` passe RÉELLEMENT au-dessus du header (z-40) et de la
 * sidebar (z-50). À utiliser pour toute modale/overlay plein écran.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = document.createElement('div')
    document.body.appendChild(node)
    setEl(node)
    return () => { document.body.removeChild(node) }
  }, [])
  if (!el) return null
  return createPortal(children, el)
}
