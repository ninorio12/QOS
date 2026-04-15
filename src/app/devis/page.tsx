'use client'

import useSWR from 'swr'
import DevisView from '@/components/devis/DevisView'
import DevisLoading from './loading'

type DevisData = {
  devisList: Record<string, unknown>[]
  brandColor: string
}

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

export default function DevisPage() {
  const { data, isLoading, error } = useSWR<DevisData>('/api/devis/list', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  if (error) return (
    <div className="h-full flex items-center justify-center text-sm text-[#6B7280] page-fade-in">
      Impossible de charger les devis. Actualise la page.
    </div>
  )

  if (isLoading && !data) return <DevisLoading />

  return (
    <div className="h-full page-fade-in">
      <DevisView devisList={(data?.devisList ?? []) as any} brandColor={data?.brandColor ?? ''} />
    </div>
  )
}
