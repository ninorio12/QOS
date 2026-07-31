'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * VersionWatcher — détecte qu'un nouveau déploiement est en ligne et propose de recharger.
 *
 * Pourquoi : le Data OS est une SPA. Un onglet resté ouvert garde l'ANCIEN JavaScript jusqu'à
 * un rechargement complet → l'utilisateur ne voit pas les déploiements récents. Ce composant
 * interroge /api/version (ID unique du déploiement) au chargement puis régulièrement ; si l'ID
 * change, un bandeau « Nouvelle version » apparaît. Plus besoin de penser au cache.
 */
export default function VersionWatcher() {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    let initial: string | null = null
    let done = false

    const check = async () => {
      if (done) return
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        if (!r.ok) return
        const { id } = await r.json()
        if (!id) return
        if (initial === null) initial = id
        else if (id !== initial) { done = true; setStale(true) }
      } catch { /* hors-ligne : on réessaiera */ }
    }

    check()
    const iv = setInterval(check, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  if (!stale) return null
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FF4D00] text-white text-[13px] font-semibold shadow-xl hover:bg-[#e64500] transition-colors animate-[fadeSlideUp_220ms_ease-out_both]"
    >
      <RefreshCw size={14} /> Nouvelle version : recharger
    </button>
  )
}
