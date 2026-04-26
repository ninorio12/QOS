'use client'
import { useEffect, useRef } from 'react'
import type { GatewayEvent } from '@/hooks/useGatewayEvents'
import type { AgentStatusData } from '@/hooks/useAgentStatus'

interface LiveTabProps {
  agentId: string
  events:  GatewayEvent[]
  status:  AgentStatusData | undefined
}

export function LiveTab({ agentId, events, status }: LiveTabProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Filter events involving this agent
  const agentEvents = events.filter(
    e => e.from === agentId || e.to === agentId
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentEvents.length])

  const isOnline = status?.online ?? false

  return (
    <div className="flex flex-col gap-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-sm font-medium text-white">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
        {status?.activeTools && (
          <span className="text-xs text-gray-400 ml-auto">
            {status.activeTools.length} tool{status.activeTools.length !== 1 ? 's' : ''} actif{status.activeTools.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Active tools list */}
      {status?.activeTools && status.activeTools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {status.activeTools.map(tool => (
            <span
              key={tool}
              className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-soren-card/5 text-gray-300 border border-white/10"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Event feed */}
      <div className="bg-black/40 rounded-xl border border-white/10 p-3 h-64 overflow-y-auto font-mono text-xs">
        {agentEvents.length === 0 ? (
          <p className="text-gray-500 text-center mt-8">
            {isOnline ? 'En attente d\'événements…' : 'Connectez le gateway pour voir les événements'}
          </p>
        ) : (
          agentEvents.map((e, i) => (
            <div key={i} className="flex gap-2 mb-1 text-gray-300 leading-relaxed">
              <span className="text-gray-500 shrink-0">
                {new Date(e.timestamp).toLocaleTimeString('fr-FR')}
              </span>
              <span className="text-blue-400 shrink-0">{e.type}</span>
              <span className="text-gray-400 truncate">{e.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
