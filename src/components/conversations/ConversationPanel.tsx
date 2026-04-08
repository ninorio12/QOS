'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, ExternalLink, ChevronDown } from 'lucide-react'
import { type Conversation, type Message, CHANNEL_META } from './types'
import { getAvatarColor } from '@/components/contacts/types'
import KaiAnalysis from './KaiAnalysis'
import { useClickOutside } from '@/hooks/useClickOutside'

const AGENT_OPTIONS = [
  { name: 'Kai',   color: '#3462EE' },
  { name: 'Mia',   color: '#8B5CF6' },
  { name: 'Soren', color: '#14B8A6' },
] as const

type AgentName = typeof AGENT_OPTIONS[number]['name']

interface Props {
  conversation: Conversation
  messages:     Message[]
  aiEnabled:    boolean
  onAiToggle:   (enabled: boolean) => void
}

export default function ConversationPanel({ conversation, messages, aiEnabled, onAiToggle }: Props) {
  const [agent,     setAgent]     = useState<AgentName>('Kai')
  const [agentOpen, setAgentOpen] = useState(false)
  const agentDropdownRef = useClickOutside<HTMLDivElement>(() => setAgentOpen(false))

  const name     = conversation.contact_name ?? 'Contact inconnu'
  const initials = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'

  const selectedAgent = AGENT_OPTIONS.find(a => a.name === agent) ?? AGENT_OPTIONS[0]
  const channelMeta   = CHANNEL_META[conversation.channel]

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border-l border-[#E5E7EB] flex flex-col overflow-y-auto">

      {/* ── Contact ──────────────────────────────── */}
      <div className="px-5 py-5 border-b border-[#F0F0EE]">
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Contact</p>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0"
            style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#111111] truncate">{name}</p>
            {conversation.contact_company && (
              <p className="text-xs text-[#6B7280] truncate">{conversation.contact_company}</p>
            )}
            <span
              className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: channelMeta.bg, color: channelMeta.color }}
            >
              {channelMeta.label}
            </span>
          </div>
        </div>

        {conversation.contact_phone && (
          <a
            href={`tel:${conversation.contact_phone}`}
            className="flex items-center gap-2 text-xs text-[#374151] hover:text-[#3462EE] py-1 transition-colors"
          >
            <Phone size={12} className="flex-shrink-0 text-[#9CA3AF]" />
            {conversation.contact_phone}
          </a>
        )}

        {conversation.contact_email && (
          <a href={`mailto:${conversation.contact_email}`} className="text-sm text-[#6B7280] hover:text-[#111111] truncate">
            {conversation.contact_email}
          </a>
        )}

        {conversation.pipeline_stage && (
          <span className="text-xs bg-[#EEF0EB] text-[#6B7280] px-2 py-0.5 rounded-full">
            {conversation.pipeline_stage}
          </span>
        )}

        {conversation.contact_id && (
          <Link
            href={`/contacts/${conversation.contact_id}`}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#3462EE] hover:underline"
          >
            <ExternalLink size={11} />
            Ouvrir la fiche contact
          </Link>
        )}
      </div>

      {/* ── Agent IA ─────────────────────────────── */}
      <div className="px-5 py-4 border-b border-[#F0F0EE]">
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">Agent IA</p>

        {/* Agent selector */}
        <div ref={agentDropdownRef} className="relative mb-3">
          <button
            onClick={() => setAgentOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl text-sm font-semibold transition-colors hover:border-[#D1D5DB]"
            style={{ color: selectedAgent.color }}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: selectedAgent.color }}
              />
              {selectedAgent.name}
            </span>
            <ChevronDown size={13} className="text-[#9CA3AF]" />
          </button>
          {agentOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 z-20">
              {AGENT_OPTIONS.map(opt => (
                <button
                  key={opt.name}
                  onClick={() => { setAgent(opt.name); setAgentOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-[#F5F5F0] transition-colors"
                  style={{ color: opt.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#374151] font-medium">Réponse automatique</span>
          <button
            onClick={() => onAiToggle(!aiEnabled)}
            className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
            style={{ background: aiEnabled ? '#8B5CF6' : '#D1D5DB' }}
            aria-label={aiEnabled ? 'Désactiver la réponse automatique' : 'Activer la réponse automatique'}
            aria-pressed={aiEnabled}
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: aiEnabled ? 'translateX(21px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-1.5">
          {aiEnabled ? `${selectedAgent.name} répond automatiquement aux nouveaux messages.` : 'Réponse manuelle uniquement.'}
        </p>
      </div>

      {/* ── Analyse Kai ──────────────────────────── */}
      <div className="flex-1 min-h-0">
        <KaiAnalysis conversation={conversation} messages={messages} />
      </div>

    </div>
  )
}
