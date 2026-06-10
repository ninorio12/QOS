'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import CalendrierLoading from './loading'

// Client-only : CalendarView utilise new Date() au rendu → un SSR provoquerait un mismatch
// d'hydratation (#418/#423) qui casse le routeur App Router. ssr:false l'évite totalement.
const CalendarView = dynamic(() => import('@/components/calendrier/CalendarView'), {
  ssr: false,
  loading: () => <CalendrierLoading />,
})
import type { Appointment } from '@/components/calendrier/types'
import type { GHLCalendar } from '@/lib/ghl'

type CalData = {
  appointments: Appointment[]
  calendars: GHLCalendar[]
  googleConfigured: boolean
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CalendrierPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const justConnected = searchParams.get('google') === 'connected'

  // Date window of the currently-displayed period (set by CalendarView).
  // Drives the fetch range so navigating months/weeks loads that period's events.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)

  const swrKey = range
    ? `/api/calendrier?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    : '/api/calendrier'

  const { data, isLoading, mutate } = useSWR<CalData>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval:  justConnected ? 0 : 30_000,
    keepPreviousData:  true,
  })

  useEffect(() => {
    if (justConnected) {
      mutate()
      router.replace('/calendrier')
    }
  }, [justConnected, mutate, router])

  // ⚠️ Callbacks STABLES (useCallback) + bail-out si la période est inchangée.
  // L'effet onRangeChange de CalendarView dépend de cette fonction ; une fonction inline
  // recréée à chaque render + un setRange qui crée un nouvel objet à chaque fois
  // provoquaient une BOUCLE DE RENDU INFINIE qui saturait le thread → navigation bloquée
  // depuis le module Calendrier. Stabiliser + bail-out casse la boucle.
  const handleRefresh = useCallback(() => { void mutate() }, [mutate])
  const handleRangeChange = useCallback((from: string, to: string) => {
    setRange(prev => (prev && prev.from === from && prev.to === to) ? prev : { from, to })
  }, [])

  if (isLoading && !data) return <CalendrierLoading />

  return (
    <CalendarView
      appointments={data?.appointments ?? []}
      calendars={data?.calendars ?? []}
      googleConfigured={data?.googleConfigured ?? false}
      onRefresh={handleRefresh}
      onRangeChange={handleRangeChange}
    />
  )
}
