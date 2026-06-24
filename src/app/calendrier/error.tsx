'use client'

import { useEffect } from 'react'

export default function CalendrierError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Calendrier] Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-48px)] gap-4">
      <p className="text-sm font-semibold text-[#EF4444]">Erreur : {error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-soren-sidebar text-white text-sm font-semibold rounded-full"
      >
        Réessayer
      </button>
    </div>
  )
}
