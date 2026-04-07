'use client'
import { useState } from 'react'
import type { AgentStatusData } from '@/hooks/useAgentStatus'

// Tool name → display name + description (from openclaw.config.json skills list)
const TOOL_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  telegram_send:          { label: 'Telegram Send',    description: 'Poste des messages dans le groupe Telegram' },
  sessions_send:          { label: 'Sessions Send',    description: 'Délègue vers un autre agent' },
  log_interaction:        { label: 'Log Interaction',  description: 'Enregistre les actions dans Supabase' },
  ghl_get_pipeline:       { label: 'GHL Pipeline',     description: 'Lit les opportunités du CRM' },
  ghl_detect_stale_leads: { label: 'GHL Stale Leads',  description: 'Détecte les leads sans contact > 2h' },
  ghl_update_stage:       { label: 'GHL Update Stage', description: 'Change le stage d\'une opportunité' },
  twilio_send_sms:        { label: 'Twilio SMS',       description: 'Envoie des SMS via Twilio' },
  update_soul:            { label: 'Update Soul',      description: 'Met à jour le SOUL.md d\'un agent' },
}

interface SkillsTabProps {
  agentId: string
  status:  AgentStatusData | undefined
  onToggle: (tool: string, enabled: boolean) => Promise<void>
}

export function SkillsTab({ agentId, status, onToggle }: SkillsTabProps) {
  const [pending, setPending] = useState<string | null>(null)
  const activeTools = status?.activeTools ?? []
  const isGatewayOnline = status?.online ?? false

  // All known tools for this agent (from both active and possible disabled)
  // We show all tools that were ever registered — infer from TOOL_DESCRIPTIONS keys
  // filtered by what makes sense per agent
  const AGENT_TOOLS: Record<string, string[]> = {
    soren: ['telegram_send', 'sessions_send', 'log_interaction', 'ghl_get_pipeline', 'ghl_detect_stale_leads', 'update_soul'],
    kai:   ['telegram_send', 'sessions_send', 'log_interaction', 'ghl_get_pipeline', 'ghl_update_stage', 'twilio_send_sms'],
    mia:   ['telegram_send', 'sessions_send', 'log_interaction'],
  }

  const tools = AGENT_TOOLS[agentId] ?? []

  async function handleToggle(tool: string, currentlyActive: boolean) {
    setPending(tool)
    try {
      await onToggle(tool, !currentlyActive)
    } finally {
      setPending(null)
    }
  }

  if (!isGatewayOnline) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Gateway hors ligne — impossible de modifier les skills
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tools.map(tool => {
        const isActive = activeTools.includes(tool)
        const isPending = pending === tool
        const meta = TOOL_DESCRIPTIONS[tool] ?? { label: tool, description: '' }

        return (
          <div
            key={tool}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium text-white">{meta.label}</p>
              {meta.description && (
                <p className="text-xs text-gray-400 truncate">{meta.description}</p>
              )}
            </div>

            {/* Toggle switch */}
            <button
              onClick={() => handleToggle(tool, isActive)}
              disabled={isPending}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0
                ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                ${isActive ? 'bg-[#3462EE]' : 'bg-white/20'}
              `}
              aria-label={`${isActive ? 'Désactiver' : 'Activer'} ${meta.label}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                  ${isActive ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
