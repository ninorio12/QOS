'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Phone, Mail, ExternalLink, Sparkles, Loader2 } from 'lucide-react'
import { type Conversation, type Message, type Pipeline, CHANNEL_META } from './types'
import { getAvatarColor } from '@/components/contacts/types'

type Priorite = 'faible' | 'moyenne' | 'haute'
type Statut   = 'ouvert' | 'ferme'

const PRIORITE_PILLS: { value: Priorite; label: string; color: string; dot: string }[] = [
  { value: 'faible',  label: 'Faible',  color: '#16a34a', dot: '#22c55e' },
  { value: 'moyenne', label: 'Moyenne', color: '#ea580c', dot: '#f97316' },
  { value: 'haute',   label: 'Haute',   color: '#dc2626', dot: '#ef4444' },
]

const ORIGIN_COLORS: Record<string, string> = {
  Mia:    '#8B5CF6',
  Kai:    '#3462EE',
  Soren:  '#14B8A6',
  Thomas: '#0EA5E9',
  Toi:    '#0EA5E9',
  Luc:    '#F97316',
  Eva:    '#EC4899',
}

function OriginBadge({ createdBy }: { createdBy: string | null }) {
  if (!createdBy) return <span className="text-[11px] text-[#C4C9D4]">—</span>
  const isBot = !['Thomas', 'Toi'].includes(createdBy)
  const color = ORIGIN_COLORS[createdBy] ?? '#6B7280'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: color + '20', color, border: `1px solid ${color}35` }}>
      {isBot && <Sparkles size={9} className="shrink-0" />}
      {createdBy}
    </span>
  )
}

interface Props {
  conversation: Conversation
  messages:     Message[]
  aiEnabled:    boolean
  onAiToggle:   (enabled: boolean) => void
  pipelines?:   Pipeline[]
}

export default function ConversationPanel({ conversation, messages, pipelines }: Props) {
  const name     = conversation.contact_name ?? 'Contact inconnu'
  const initials = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
  const channelMeta = CHANNEL_META[conversation.channel]

  const pipelineName = useMemo(() => {
    if (!conversation.pipeline_stage_id || !pipelines?.length) return null
    for (const p of pipelines) {
      if (p.stages.some(s => s.id === conversation.pipeline_stage_id)) return p.name
    }
    return null
  }, [conversation.pipeline_stage_id, pipelines])

  const [createdBy, setCreatedBy] = useState<string | null>(null)
  const [priorite,  setPriorite]  = useState<Priorite | null>(conversation.priorite ?? null)
  const [sujet,     setSujet]     = useState<string>(conversation.summary ?? '')
  const [statut,    setStatut]    = useState<Statut>(
    conversation.opportunity_status === 'open' || !conversation.opportunity_status ? 'ouvert' : 'ferme'
  )
  const [genSujet, setGenSujet] = useState(false)
  const [genPrio,  setGenPrio]  = useState(false)

  const didGenSujet = useRef(false)
  const didGenPrio  = useRef(false)

  useEffect(() => {
    if (!conversation.contact_id) return
    fetch(`/api/contact/attribution?ids=${conversation.contact_id}`)
      .then(r => r.json())
      .then(data => { if (data.attributions?.[0]?.created_by) setCreatedBy(data.attributions[0].created_by) })
      .catch(() => {})
  }, [conversation.contact_id])

  async function patch(data: Record<string, unknown>) {
    await fetch(`/api/conversation/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  const generateSujet = useCallback(async () => {
    if (messages.length === 0) return
    setGenSujet(true)
    const history = messages.slice(-10).map(m => `${m.role === 'user' ? name : 'Kai'}: ${m.content}`).join('\n\n')
    try {
      const res = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subject', contactName: name, contactCompany: conversation.contact_company ?? '', leadStage: conversation.lead_stage ?? '', history }),
      })
      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += dec.decode(value, { stream: true })
          setSujet(text)
        }
        await patch({ summary: text.trim() })
      }
    } finally { setGenSujet(false) }
  }, [conversation, messages, name])

  const generatePriorite = useCallback(async () => {
    if (messages.length === 0) return
    setGenPrio(true)
    const history = messages.slice(-10).map(m => `${m.role === 'user' ? name : 'Kai'}: ${m.content}`).join('\n\n')
    try {
      const res = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'priority', contactName: name, contactCompany: conversation.contact_company ?? '', leadStage: conversation.lead_stage ?? '', history }),
      })
      if (res.ok) {
        const text = (await res.text()).trim().toLowerCase() as Priorite
        const val: Priorite = ['haute', 'moyenne', 'faible'].includes(text) ? text as Priorite : 'moyenne'
        setPriorite(val)
        await patch({ priorite: val })
      }
    } finally { setGenPrio(false) }
  }, [conversation, messages, name])

  useEffect(() => {
    if (messages.length === 0) return
    if (!sujet && !didGenSujet.current) { didGenSujet.current = true; void generateSujet() }
    if (!priorite && !didGenPrio.current) { didGenPrio.current = true; void generatePriorite() }
  }, [messages.length])

  async function handleStatutToggle() {
    const next: Statut = statut === 'ouvert' ? 'ferme' : 'ouvert'
    setStatut(next)
    await patch({ opportunity_status: next === 'ouvert' ? 'open' : 'lost' })
  }

  async function handlePrioriteClick(val: Priorite) {
    setPriorite(val)
    await patch({ priorite: val })
  }

  return (
    <div className="w-[300px] flex-shrink-0 bg-soren-card border-l border-[#F0F0EE] flex flex-col overflow-hidden">

      {/* Contact header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#F0F0EE] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black flex-shrink-0"
               style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-soren-text truncate">{name}</p>
            {conversation.contact_company && (
              <p className="text-[10px] text-soren-subtle truncate">{conversation.contact_company}</p>
            )}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-3 border-b border-[#F0F0EE] flex-shrink-0">

        {/* Statut */}
        <div>
          <p className="text-[9px] font-semibold text-soren-subtle uppercase tracking-wide mb-1">Statut</p>
          <button
            onClick={() => void handleStatutToggle()}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl border border-soren-border hover:border-[#D1D5DB] transition-colors text-left"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                 style={{ background: statut === 'ouvert' ? '#22c55e' : '#9CA3AF' }} />
            <span className="text-[11px] font-semibold text-[#374151]">
              {statut === 'ouvert' ? 'Ouvert' : 'Fermé'}
            </span>
          </button>
        </div>

        {/* Priorité */}
        <div>
          <p className="text-[9px] font-semibold text-soren-subtle uppercase tracking-wide mb-1 flex items-center gap-1">
            Priorité
            {genPrio && <Loader2 size={8} className="animate-spin text-[#8B5CF6]" />}
          </p>
          <div className="flex gap-1">
            {PRIORITE_PILLS.map(p => {
              const active = priorite === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => void handlePrioriteClick(p.value)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all flex-1 justify-center"
                  style={active
                    ? { background: p.dot + '18', color: p.color, borderColor: p.dot + '50' }
                    : { background: 'transparent', color: '#9CA3AF', borderColor: '#E5E7EB' }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: active ? p.dot : '#D1D5DB' }} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sujet */}
        <div>
          <p className="text-[9px] font-semibold text-soren-subtle uppercase tracking-wide mb-1 flex items-center gap-1">
            <Sparkles size={8} className="text-[#8B5CF6]" />
            Sujet
            {genSujet && <Loader2 size={8} className="animate-spin text-[#8B5CF6]" />}
          </p>
          <div className="px-2.5 py-2 rounded-xl border border-soren-border bg-[#F9F9F7]">
            {sujet ? (
              <p className="text-[11px] text-[#374151] leading-snug">
                {sujet}
                {genSujet && <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] ml-0.5 animate-pulse align-middle" />}
              </p>
            ) : (
              <p className="text-[11px] italic text-[#C4C9D4]">
                {genSujet ? 'Génération…' : 'En attente des messages…'}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {conversation.tags && conversation.tags.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold text-soren-subtle uppercase tracking-wide mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {conversation.tags.map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-soren-app text-soren-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attributs */}
      <div className="px-4 py-3 border-b border-[#F0F0EE] flex-shrink-0">
        <p className="text-[9px] font-semibold text-soren-subtle uppercase tracking-wide mb-2">Attributs</p>
        <div className="space-y-2">

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-soren-subtle">Origine</span>
            <OriginBadge createdBy={createdBy} />
          </div>

          {pipelineName && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-soren-subtle">Pipeline</span>
              <span className="text-[11px] font-semibold text-[#374151]">{pipelineName}</span>
            </div>
          )}

          {conversation.contact_phone && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-soren-subtle flex-shrink-0">Téléphone</span>
              <a href={`tel:${conversation.contact_phone}`}
                 className="flex items-center gap-1 text-[11px] font-semibold text-[#374151] hover:text-[#3462EE] transition-colors truncate">
                <Phone size={9} className="text-[#C4C9D4] flex-shrink-0" />
                {conversation.contact_phone}
              </a>
            </div>
          )}

          {conversation.contact_email && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-soren-subtle flex-shrink-0">Email</span>
              <a href={`mailto:${conversation.contact_email}`}
                 className="flex items-center gap-1 text-[11px] font-semibold text-[#374151] hover:text-[#3462EE] transition-colors truncate">
                <Mail size={9} className="text-[#C4C9D4] flex-shrink-0" />
                <span className="truncate">{conversation.contact_email}</span>
              </a>
            </div>
          )}

          {conversation.contact_id && (
            <Link href={`/contacts/${conversation.contact_id}`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#3462EE] hover:underline pt-0.5">
              <ExternalLink size={9} />
              Ouvrir la fiche contact
            </Link>
          )}
        </div>
      </div>


    </div>
  )
}
