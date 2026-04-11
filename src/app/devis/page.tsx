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

  useEffect(() => {
    fetch('/api/devis/list')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ devisList: [], brandColor: '#d28e46' }))
  }, [])

  if (!data) return <DevisLoading />

  return <DevisView devisList={data.devisList as any} brandColor={data.brandColor} />
}
