'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Cpu, Users, Database, Play, Square, RefreshCw } from 'lucide-react'
import { EQUIPE_AGENTS, type EquipeAgent } from './agents'
import { useGatewayEvents }  from '@/hooks/useGatewayEvents'
import { useAgentStatus }    from '@/hooks/useAgentStatus'
import { AgentDrawer }       from './AgentDrawer'

// ─── Icon map ─────────────────────────────────────────────────
const ICON_MAP = { cpu: Cpu, users: Users, database: Database } as const

// ─── Types ────────────────────────────────────────────────────
type Point = { x: number; y: number }
type Line  = { from: Point; to: Point }

type AgentRunState = {
  status: 'online' | 'offline' | 'starting'
  lastHeartbeat: string
  logs: string[]
}

// ─── Initial log templates per agent ──────────────────────────
const BOOT_LOGS: Record<string, string[]> = {
  soren: [
    '[08:31:00] Orchestrateur démarré — agents : 3/3',
    '[08:31:02] Analyse pipeline ACQUISITION — 7 opportunités actives',
    '[08:31:04] Directive envoyée à Kai : relancer Xavier Lambert',
    '[08:31:06] Rapport hebdo généré — pipeline €74 600',
  ],
  kai: [
    '[08:31:00] CSM démarré — scan conversations entrantes',
    '[08:31:03] Lead Martin Dupont qualifié → stage CRM mis à jour',
    '[08:31:05] Message WhatsApp envoyé → +33612345007',
    '[08:31:07] RDV planifié — Inès Duprez 2 avril 14h',
  ],
  mia: [
    '[08:31:00] KB Manager démarré — 47 fiches clients actives',
    '[08:31:02] Devis façade €8 900 généré — envoi planifié 09h00',
    '[08:31:04] MEMORY.md mis à jour — 3 nouvelles entrées',
    '[08:31:06] Alerte : devis Marie Colin en attente de validation',
  ],
}

const HEARTBEAT_LOGS: Record<string, string[]> = {
  soren: [
    'Analyse pipeline — {n} opportunités nouvelles',
    'Rapport digest envoyé à Thomas via Telegram',
    'Directive envoyée à Kai : prioriser lead Xavier',
    'Quota API : {q}/1000 requêtes restantes',
    'Pipeline ACQUISITION : valeur totale €{v}k',
  ],
  kai: [
    'Scan conversations — {n} nouvelles entrantes',
    'Lead qualifié → stage CRM mis à jour',
    'Relance WhatsApp envoyée → contact en attente',
    'Calendrier vérifié — prochain RDV dans {h}h',
    'Score qualification moyen : {s}/100',
  ],
  mia: [
    'Base de connaissance synchronisée — {n} docs',
    'Devis en attente de validation : {n} fichier(s)',
    'MEMORY.md mis à jour — dernier heartbeat Soren',
    'Template devis BTP chargé — secteur rénovation',
    'Archivage leads mars terminé — {n} fiches',
  ],
}

function randomLog(agentId: string): string {
  const templates = HEARTBEAT_LOGS[agentId] ?? ['Heartbeat exécuté']
  const tpl = templates[Math.floor(Math.random() * templates.length)]
  const time = new Date().toLocaleTimeString('fr-FR')
  return `[${time}] ` + tpl
    .replace('{n}', String(Math.floor(Math.random() * 8) + 1))
    .replace('{q}', String(Math.floor(Math.random() * 200) + 700))
    .replace('{v}', String(Math.floor(Math.random() * 100) + 280))
    .replace('{h}', String(Math.floor(Math.random() * 4) + 1))
    .replace('{s}', String(Math.floor(Math.random() * 25) + 65))
}

// ─── SVG connection lines ─────────────────────────────────────
function ConnectionLines({ lines }: { lines: Line[] }) {
  if (!lines.length) return null
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {lines.map((line, i) => {
        const dy = (line.to.y - line.from.y) * 0.5
        const d  = `M ${line.from.x} ${line.from.y} C ${line.from.x} ${line.from.y + dy}, ${line.to.x} ${line.to.y - dy}, ${line.to.x} ${line.to.y}`
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#D4D8D0" strokeWidth="1.5" />
            <circle cx={line.from.x} cy={line.from.y} r="2.5" fill="#D4D8D0" />
            <circle cx={line.to.x}   cy={line.to.y}   r="2.5" fill="#D4D8D0" />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Communication badge per agent ───────────────────────────
const AGENT_COMMS: Record<string, { label: string; type: 'telegram' | 'internal' }> = {
  soren: { label: 'Telegram', type: 'telegram' },
  kai:   { label: 'Interne',  type: 'internal' },
  mia:   { label: 'Interne',  type: 'internal' },
}

// ─── Compact agent card ───────────────────────────────────────
function AgentCard({
  agent, runState, isChief = false, isSelected, onClick, cardRef, onStart, onStop,
}: {
  agent:      EquipeAgent
  runState:   AgentRunState
  isChief?:   boolean
  isSelected: boolean
  onClick:    () => void
  cardRef:    React.RefObject<HTMLDivElement>
  onStart:    () => void
  onStop:     () => void
}) {
  const Icon      = ICON_MAP[agent.icon]
  const isOnline  = runState.status === 'online'
  const isStart   = runState.status === 'starting'
  const lightAccent = agent.accentColor === '#C8F135' || agent.accentColor === '#EFE347'
  const headerText  = lightAccent ? '#111111' : '#ffffff'
  const comms     = AGENT_COMMS[agent.id]

  // role parts: "CEO / Orchestrateur Système" → title = "CEO", subtitle = "Orchestrateur Système"
  const [roleTitle, ...roleParts] = agent.role.split(' / ')
  const roleDetail = roleParts.join(' / ')

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden bg-white cursor-pointer select-none transition-all duration-200 ${
        isChief ? 'w-[215px]' : 'w-[188px]'
      } ${
        isSelected
          ? 'shadow-[0_0_0_2px_var(--accent),0_8px_24px_rgba(0,0,0,0.14)]'
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]'
      }`}
      style={{ '--accent': agent.accentColor } as React.CSSProperties}
    >
      {/* Thin colored chapeau */}
      <div className="h-[5px] w-full" style={{ background: agent.accentColor }} />

      {/* Card body */}
      <div className={`${isChief ? 'px-4 pt-3.5 pb-3' : 'px-3.5 pt-3 pb-3'}`}>
        {/* Icon + status dot */}
        <div className="flex items-start justify-between mb-2.5">
          <div
            className={`${isChief ? 'w-9 h-9' : 'w-8 h-8'} rounded-xl flex items-center justify-center`}
            style={{ background: agent.accentColor + '18', border: `1px solid ${agent.accentColor}30` }}
          >
            <Icon size={isChief ? 17 : 15} style={{ color: agent.accentColor }} />
          </div>
          {/* Status dot */}
          <div className="flex-shrink-0 mt-1">
            {isStart ? (
              <span className="w-2 h-2 rounded-full block bg-[#EFE347] animate-pulse" />
            ) : isOnline ? (
              <span className="w-2 h-2 rounded-full block bg-[#84CC16] shadow-[0_0_8px_#84CC16cc] animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full block bg-[#D1D5DB]" />
            )}
          </div>
        </div>

        {/* Name */}
        <p className={`${isChief ? 'text-[15px]' : 'text-[13px]'} font-black leading-tight`} style={{ color: agent.accentColor }}>
          {agent.name}
        </p>
        {/* Role title */}
        <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: agent.accentColor, opacity: 0.7 }}>
          {roleTitle}
        </p>
        {/* Role detail */}
        {roleDetail && (
          <p className="text-[9px] text-[#9CA3AF] mt-0.5 leading-tight truncate">{roleDetail}</p>
        )}

        <div className="border-t border-[#F3F4F6] my-2.5" />

        {/* Status row */}
        <div className="flex items-center justify-between mb-2">
          {isStart ? (
            <span className="text-[8.5px] font-bold text-[#92750C] bg-[#FFFBEB] border border-[#FDE68A] px-1.5 py-0.5 rounded-full">DÉMARRAGE</span>
          ) : isOnline ? (
            <span className="text-[8.5px] font-bold text-[#16a34a] bg-[#22c55e]/10 border border-[#22c55e]/20 px-1.5 py-0.5 rounded-full">EN LIGNE</span>
          ) : (
            <span className="text-[8.5px] font-bold text-[#9CA3AF] bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 rounded-full">HORS LIGNE</span>
          )}
          {/* Comms badge */}
          {comms && (
            <span className={`flex items-center gap-1 text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full border ${
              comms.type === 'telegram'
                ? 'text-[#2AABEE] bg-[#2AABEE]/8 border-[#2AABEE]/25'
                : 'text-[#6B7280] bg-[#F3F4F6] border-[#E5E7EB]'
            }`}>
              {comms.type === 'telegram' ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.857l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.702z"/></svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
              )}
              {comms.label}
            </span>
          )}
        </div>

        {/* model + heartbeat */}
        <div className="space-y-1 mb-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#9CA3AF]">Modèle</span>
            <span className="text-[9px] font-mono text-[#6B7280] truncate max-w-[95px]">
              {agent.model.replace('claude-', '').replace(/-20\d{6}$/, '')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#9CA3AF]">Heartbeat</span>
            <span className="text-[9px] text-[#6B7280]">{runState.lastHeartbeat}</span>
          </div>
        </div>

        {/* start / stop button */}
        <div onClick={e => e.stopPropagation()}>
          {isOnline ? (
            <button
              onClick={onStop}
              className="w-full flex items-center justify-center gap-1 py-1 rounded-xl border border-[#FCA5A5] text-[#EF4444] text-[10px] font-semibold hover:bg-[#FEF2F2] transition-colors"
            >
              <Square size={9} />
              Arrêter
            </button>
          ) : isStart ? (
            <div className="w-full flex items-center justify-center gap-1 py-1 rounded-xl border border-[#FDE68A] text-[#92750C] text-[10px] font-semibold bg-[#FFFBEB]">
              <RefreshCw size={9} className="animate-spin" />
              Initialisation…
            </div>
          ) : (
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-1 py-1 rounded-xl text-[10px] font-bold transition-colors"
              style={{ background: agent.accentColor + '18', color: agent.accentColor, border: `1px solid ${agent.accentColor}35` }}
            >
              <Play size={9} />
              Démarrer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function EquipeView() {
  const soren = EQUIPE_AGENTS.find(a => a.id === 'soren')!
  const kai   = EQUIPE_AGENTS.find(a => a.id === 'kai')!
  const mia   = EQUIPE_AGENTS.find(a => a.id === 'mia')!

  const [selectedAgent, setSelectedAgent] = useState<EquipeAgent | null>(null)
  const gatewayEvents = useGatewayEvents()
  const agentStatus   = useAgentStatus()

  const [runStates, setRunStates] = useState<Record<string, AgentRunState>>({
    soren: { status: 'online', lastHeartbeat: 'En ligne', logs: BOOT_LOGS.soren },
    kai:   { status: 'online', lastHeartbeat: 'En ligne', logs: BOOT_LOGS.kai },
    mia:   { status: 'offline', lastHeartbeat: 'Jamais', logs: [] },
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setRunStates(prev => {
        let changed = false
        const next: typeof prev = {}
        for (const [id, state] of Object.entries(prev)) {
          if (state.status === 'online') {
            changed = true
            next[id] = {
              status: 'online',
              lastHeartbeat: new Date().toLocaleTimeString('fr-FR'),
              logs: [...state.logs.slice(-14), randomLog(id)],
            }
          } else {
            next[id] = state
          }
        }
        return changed ? next : prev
      })
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setRunStates(prev => {
      const updated = { ...prev }
      for (const [id, data] of Object.entries(agentStatus)) {
        if (updated[id]) updated[id] = { ...updated[id], status: data.online ? 'online' : 'offline' }
      }
      return updated
    })
  }, [agentStatus])

  function startAgent(id: string) {
    setRunStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'starting', lastHeartbeat: '…' } }))
    setTimeout(() => {
      setRunStates(prev => ({ ...prev, [id]: { status: 'online', lastHeartbeat: new Date().toLocaleTimeString('fr-FR'), logs: BOOT_LOGS[id] ?? [] } }))
    }, 2200)
  }

  function stopAgent(id: string) {
    setRunStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'offline' } }))
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const sorenRef     = useRef<HTMLDivElement>(null!)
  const kaiRef       = useRef<HTMLDivElement>(null!)
  const miaRef       = useRef<HTMLDivElement>(null!)
  const [lines, setLines] = useState<Line[]>([])

  const measureLines = useCallback(() => {
    const container = containerRef.current
    if (!container || !sorenRef.current || !kaiRef.current || !miaRef.current) return
    const cr = container.getBoundingClientRect()
    function pts(el: HTMLDivElement) {
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2 - cr.left
      return { bottom: { x, y: r.bottom - cr.top }, top: { x, y: r.top - cr.top } }
    }
    const s = pts(sorenRef.current)
    const k = pts(kaiRef.current)
    const m = pts(miaRef.current)
    setLines([{ from: s.bottom, to: k.top }, { from: s.bottom, to: m.top }])
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => measureLines())
    window.addEventListener('resize', measureLines)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measureLines)
    }
  }, [measureLines])

  const anyOnline = Object.values(runStates).some(s => s.status === 'online')
  const agentColorMap: Record<string, string> = Object.fromEntries(EQUIPE_AGENTS.map(a => [a.id, a.accentColor]))
  const agentIds = new Set(['soren', 'kai', 'mia'])
  const interAgentEvents = gatewayEvents.filter(e => agentIds.has(e.from) && agentIds.has(e.to)).slice(-4).reverse()

  return (
    <div className="flex flex-col bg-[#EEF0EB] px-8 py-5 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Header row */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-[#111111] leading-none">Équipe IA</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5 mb-2">Vos agents autonomes et leur organisation</p>
        </div>
        {anyOnline && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#16a34a] bg-[#22c55e]/10 px-2.5 py-1 rounded-full border border-[#22c55e]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Système opérationnel
          </span>
        )}
      </div>

      {/* Content: diagram + comms side by side */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Diagram */}
        <div ref={containerRef} className="relative flex-1 flex flex-col items-center justify-center">
          <ConnectionLines lines={lines} />

          {/* Soren (top) */}
          <div className="flex justify-center mb-6">
            <AgentCard agent={soren} runState={runStates.soren} isChief
              isSelected={selectedAgent?.id === 'soren'} onClick={() => setSelectedAgent(soren)}
              cardRef={sorenRef} onStart={() => startAgent('soren')} onStop={() => stopAgent('soren')} />
          </div>

          {/* Kai + Mia (bottom) */}
          <div className="flex justify-center gap-10">
            <AgentCard agent={kai} runState={runStates.kai}
              isSelected={selectedAgent?.id === 'kai'} onClick={() => setSelectedAgent(kai)}
              cardRef={kaiRef} onStart={() => startAgent('kai')} onStop={() => stopAgent('kai')} />
            <AgentCard agent={mia} runState={runStates.mia}
              isSelected={selectedAgent?.id === 'mia'} onClick={() => setSelectedAgent(mia)}
              cardRef={miaRef} onStart={() => startAgent('mia')} onStop={() => stopAgent('mia')} />
          </div>
        </div>

        {/* Agent detail panel */}
        <div className="w-[420px] flex-shrink-0 flex flex-col">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1">
            {/* Accent top strip */}
            <div className="h-[4px] w-full flex-shrink-0" style={{ background: selectedAgent?.accentColor ?? soren.accentColor }} />

            <div className="flex flex-col flex-1 overflow-y-auto px-5 py-4 gap-4">

              {/* Description */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Description</p>
                  {(() => {
                    const agent = selectedAgent ?? soren
                    const Icon  = ICON_MAP[agent.icon]
                    return (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: agent.accentColor + '18', border: `1px solid ${agent.accentColor}30` }}>
                        <Icon size={15} style={{ color: agent.accentColor }} />
                      </div>
                    )
                  })()}
                </div>
                <p className="text-[13px] text-[#111111] leading-relaxed font-medium">
                  {(selectedAgent ?? soren).description}
                </p>
              </div>

              <div className="border-t border-[#F3F4F6]" />

              {/* Modèle + Heartbeat */}
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Modèle utilisé</p>
                  <span className="text-[11px] font-mono text-[#374151] bg-[#F3F4F6] px-2 py-1 rounded-lg inline-block">
                    {(selectedAgent ?? soren).model}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Dernier heartbeat</p>
                  <span className="text-[11px] text-[#374151] flex items-center gap-1.5">
                    <span className="text-[#9CA3AF]">⏱</span>
                    {runStates[(selectedAgent ?? soren).id]?.lastHeartbeat ?? 'Jamais'}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#F3F4F6]" />

              {/* Outils */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Outils disponibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedAgent ?? soren).tools.map(tool => (
                    <span key={tool}
                      className="text-[9px] font-mono font-medium px-2 py-1 rounded-lg border"
                      style={{
                        color: (selectedAgent ?? soren).accentColor,
                        background: (selectedAgent ?? soren).accentColor + '10',
                        borderColor: (selectedAgent ?? soren).accentColor + '30',
                      }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F3F4F6]" />

              {/* Logs récents */}
              <div className="flex-1 min-h-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Logs récents</p>
                <div className="space-y-1">
                  {(runStates[(selectedAgent ?? soren).id]?.logs ?? []).slice(-5).reverse().map((log, i) => (
                    <p key={i} className="text-[9.5px] font-mono text-[#6B7280] leading-relaxed">{log}</p>
                  ))}
                  {(runStates[(selectedAgent ?? soren).id]?.logs ?? []).length === 0 && (
                    <p className="text-[10px] italic text-[#9CA3AF]">Aucun log — agent hors ligne</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
