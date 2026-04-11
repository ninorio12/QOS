'use client'

import { useEffect, useState } from 'react'
import CalendarView from '@/components/calendrier/CalendarView'
import CalendrierLoading from './loading'
import type { Appointment } from '@/components/calendrier/types'
import type { GHLCalendar } from '@/lib/ghl'

export default function CalendrierPage() {
  const [data,    setData]    = useState<{ appointments: Appointment[]; calendars: GHLCalendar[]; googleConfigured: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/calendrier')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ appointments: [], calendars: [], googleConfigured: false }))
  }, [])

  if (!data) return <CalendrierLoading />

  return (
    <CalendarView
      appointments={data.appointments}
      calendars={data.calendars}
      googleConfigured={data.googleConfigured}
    />
  )
}
