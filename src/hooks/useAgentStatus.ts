'use client'
import { useEffect, useState } from 'react'

export interface AgentStatusData {
  online:      boolean
  activeTools: string[]
}

export type AgentStatusMap = Record<string, AgentStatusData>

/** Polls /api/openclaw/status every 30s. Returns per-agent online status and active tools. */
export function useAgentStatus(): AgentStatusMap {
  const [status, setStatus] = useState<AgentStatusMap>({})

  useEffect(() => {
    async function poll() {
      try {
        const res  = await fetch('/api/openclaw/status')
        const data = await res.json() as { agents?: AgentStatusMap }
        if (data.agents) setStatus(data.agents)
      } catch {
        // keep last known state on error
      }
    }

    poll()
    const interval = setInterval(poll, 30_000)
    return () => clearInterval(interval)
  }, [])

  return status
}
