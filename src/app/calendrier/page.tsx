'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import CalendarView from '@/components/calendrier/CalendarView'
import CalendrierLoading from './loading'
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

  const { data, isLoading, mutate } = useSWR<CalData>('/api/calendrier', fetcher, {
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

  if (isLoading && !data) return <CalendrierLoading />

  return (
    <CalendarView
      appointments={data?.appointments ?? []}
      calendars={data?.calendars ?? []}
      googleConfigured={data?.googleConfigured ?? false}
    />
  )
}
