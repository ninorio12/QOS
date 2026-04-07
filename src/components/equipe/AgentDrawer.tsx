'use client'
import { useState } from 'react'
import { X, Cpu, Users, Database } from 'lucide-react'
import type { EquipeAgent } from './agents'
import type { GatewayEvent } from '@/hooks/useGatewayEvents'
import type { AgentStatusData } from '@/hooks/useAgentStatus'
import { LiveTab }      from './tabs/LiveTab'
import { SoulTab }      from './tabs/SoulTab'
import { SkillsTab }    from './tabs/SkillsTab'
import { PromptLabTab } from './tabs/PromptLabTab'

const ICON_MAP = { cpu: Cpu, users: Users, database: Database } as const

type Tab = 'live' | 'soul' | 'skills' | 'prompt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'live',   label: 'Live'       },
  { id: 'soul',   label: 'SOUL.md'    },
  { id: 'skills', label: 'Skills'     },
  { id: 'prompt', label: 'Prompt Lab' },
]

interface AgentDrawerProps {
  agent:   EquipeAgent
  events:  GatewayEvent[]
  status:  AgentStatusData | undefined
  onClose: () => void
}

export function AgentDrawer({ agent, events, status, onClose }: AgentDrawerProps) {
  const [tab,       setTab]       = useState<Tab>('live')
  const [soulCache, setSoulCache] = useState('')
  const Icon = ICON_MAP[agent.icon as keyof typeof ICON_MAP] ?? Cpu

  async function handleToolToggle(tool: string, enabled: boolean) {
    const res = await fetch(
      `/api/openclaw/agents/${agent.id}/tools/${tool}/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled }),
      }
    )
    if (!res.ok) throw new Error('Toggle failed')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-[#0D1117] border-l border-white/10 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b border-white/10"
          style={{ borderTopColor: agent.accentColor, borderTopWidth: 3 }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: agent.accentColor + '18', border: `1px solid ${agent.accentColor}35` }}
          >
            <Icon size={16} style={{ color: agent.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{agent.name}</p>
            <p className="text-gray-400 text-xs truncate">{agent.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status?.online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'live' && (
            <LiveTab agentId={agent.id} events={events} status={status} />
          )}
          {tab === 'soul' && (
            <SoulTab
              agentId={agent.id}
              onLoad={setSoulCache}
            />
          )}
          {tab === 'skills' && (
            <SkillsTab agentId={agent.id} status={status} onToggle={handleToolToggle} />
          )}
          {tab === 'prompt' && (
            <PromptLabTab agentId={agent.id} currentSoul={soulCache} />
          )}
        </div>
      </div>
    </>
  )
}
