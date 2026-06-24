'use client'

import { useEffect } from 'react'

/**
 * Désactive le zoom au doigt (pinch) pour une vraie sensation d'application.
 * - Android / Chrome : géré par le viewport (maximumScale=1, userScalable=false).
 * - iOS Safari : ignore le viewport → on bloque les gesture events + le touchmove multi-doigts.
 * Le scroll à un doigt et le drag-and-drop (un doigt) restent intacts.
 */
export default function PinchZoomGuard() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    // Pinch iOS Safari
    document.addEventListener('gesturestart', prevent)
    document.addEventListener('gesturechange', prevent)
    document.addEventListener('gestureend', prevent)
    // Filet de sécurité : tout geste à 2 doigts et + (pinch) est bloqué ; 1 doigt (scroll/drag) passe.
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      document.removeEventListener('gesturestart', prevent)
      document.removeEventListener('gesturechange', prevent)
      document.removeEventListener('gestureend', prevent)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
  return null
}
