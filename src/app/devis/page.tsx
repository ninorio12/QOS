'use client'

import { useEffect, useState } from 'react'
import DevisView from '@/components/devis/DevisView'
import DevisLoading from './loading'

type DevisData = {
  devisList: Record<string, unknown>[]
  brandColor: string
}

export default function DevisPage() {
  const [data, setData] = useState<DevisData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/devis/list')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  if (error) return (
    <div className="h-full flex items-center justify-center text-sm text-[#6B7280] page-fade-in">
      Impossible de charger les devis. Actualise la page.
    </div>
  )

  if (!data) return <DevisLoading />

  return (
    <div className="h-full page-fade-in">
      <DevisView devisList={data.devisList as any} brandColor={data.brandColor} />
    </div>
  )
}
