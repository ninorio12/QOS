'use client'
import { useEffect, useRef, useState } from 'react'

export interface GatewayEvent {
  type:      string
  from:      string
  to:        string
  msg:       string
  timestamp: string
  id?:       number
}

/** Subscribes to the OpenClaw SSE stream. Returns the last `maxEvents` events. */
export function useGatewayEvents(maxEvents = 50): GatewayEvent[] {
  const [events, setEvents] = useState<GatewayEvent[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/openclaw/events')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as GatewayEvent
        if (data.type === 'connected') return
        setEvents(prev => [...prev.slice(-(maxEvents - 1)), data])
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      // EventSource reconnects automatically — no action needed
    }

    return () => {
      es.close()
    }
  }, [maxEvents])

  return events
}
