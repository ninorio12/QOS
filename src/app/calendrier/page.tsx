'use client'

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
  const { data, isLoading } = useSWR<CalData>('/api/calendrier', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  if (isLoading && !data) return <CalendrierLoading />

  return (
    <CalendarView
      appointments={data?.appointments ?? []}
      calendars={data?.calendars ?? []}
      googleConfigured={data?.googleConfigured ?? false}
    />
  )
}
