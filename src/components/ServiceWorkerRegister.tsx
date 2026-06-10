'use client'

import { useEffect } from 'react'

// Enregistre le service worker (/sw.js) → active l'installation PWA sur mobile.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* silencieux */ })
    }
  }, [])
  return null
}
