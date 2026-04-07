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
    `[${new Date().toLocaleTimeString('fr-FR')}] Orchestrateur démarré — agents : 3/3`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Analyse pipeline ACQUISITION — 7 opportunités actives`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Directive envoyée à Kai : relancer Xavier Lambert`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Rapport hebdo généré — pipeline €74 600`,
  ],
  kai: [
    `[${new Date().toLocaleTimeString('fr-FR')}] CSM démarré — scan conversations entrantes`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Lead Martin Dupont qualifié → stage CRM mis à jour`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Message WhatsApp envoyé → +33612345007`,
    `[${new Date().toLocaleTimeString('fr-FR')}] RDV planifié — Inès Duprez 2 avril 14h`,
  ],
  mia: [
    `[${new Date().toLocaleTimeString('fr-FR')}] KB Manager démarré — 47 fiches clients actives`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Devis façade €8 900 généré — envoi planifié 09h00`,
    `[${new Date().toLocaleTimeString('fr-FR')}] MEMORY.md mis à jour — 3 nouvelles entrées`,
    `[${new Date().toLocaleTimeString('fr-FR')}] Alerte : devis Marie Colin en attente de validation`,
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
function ConnectionLines({ lines, active }: { lines: Line[]; active: boolean }) {
  if (!lines.length) return null
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        {lines.map((_, i) => (
          <linearGradient key={i} id={`grad${i}`} gradientUnits="userSpaceOnUse"
            x1={lines[i].from.x} y1={lines[i].from.y} x2={lines[i].to.x} y2={lines[i].to.y}>
            <stop offset="0%" stopColor={active ? '#3462EE' : '#2D3748'} stopOpacity="0.9" />
            <stop offset="100%" stopColor={active ? '#4A91A8' : '#2D3748'} stopOpacity="0.5" />
          </linearGradient>
        ))}
      </defs>
      {lines.map((line, i) => {
        const dy = (line.to.y - line.from.y) * 0.5
        const d  = `M ${line.from.x} ${line.from.y} C ${line.from.x} ${line.from.y + dy}, ${line.to.x} ${line.to.y - dy}, ${line.to.x} ${line.to.y}`
        const pathId = `path${i}`
        return (
          <g key={i}>
            {/* Base path */}
            <path
              d={d}
              fill="none"
              stroke={active ? `url(#grad${i})` : '#2D3748'}
              strokeWidth="1.5"
              strokeDasharray={active ? '6 4' : '4 6'}
              opacity={active ? 0.8 : 0.4}
            />
            {/* Animated data packet */}
            {active && (
              <>
                <path id={pathId} d={d} fill="none" />
                <circle r="3.5" fill="#E2FF8D" opacity="0.9">
                  <animateMotion dur={`${3 + i * 0.8}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </>
            )}
            <circle cx={line.from.x} cy={line.from.y} r="3" fill={active ? '#3462EE' : '#3D4F6B'} />
            <circle cx={line.to.x}   cy={line.to.y}   r="3" fill={active ? '#4A91A8' : '#3D4F6B'} />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Agent card ───────────────────────────────────────────────
function AgentCard({
  agent,
  runState,
  isChief = false,
  isSelected,
  onClick,
  cardRef,
  onStart,
  onStop,
}: {
  agent: EquipeAgent
  runState: AgentRunState
  isChief?: boolean
  isSelected: boolean
  onClick: () => void
  cardRef: React.RefObject<HTMLDivElement>
  onStart: () => void
  onStop: () => void
}) {
  const Icon     = ICON_MAP[agent.icon]
  const isOnline = runState.status === 'online'
  const isStart  = runState.status === 'starting'
  const w        = isChief ? 'w-[300px]' : 'w-[240px]'

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`${w} relative rounded-2xl border bg-[#111111] cursor-pointer select-none transition-all duration-200 ${
        isSelected
          ? 'shadow-[0_0_0_1.5px_var(--accent),0_8px_24px_rgba(0,0,0,0.5)]'
          : 'hover:border-[#3D4F6B] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
      }`}
      style={{ '--accent': agent.accentColor, borderColor: isSelected ? agent.accentColor : '#2D3A4A' } as React.CSSProperties}
    >
      {/* accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: agent.accentColor }} />

      <div className={`${isChief ? 'p-5' : 'p-4'} pt-6`}>
        {/* icon + status */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={`${isChief ? 'w-11 h-11' : 'w-9 h-9'} rounded-xl flex items-center justify-center`}
            style={{ background: agent.accentColor + '18', border: `1px solid ${agent.accentColor}35` }}
          >
            <Icon size={isChief ? 20 : 16} style={{ color: agent.accentColor }} />
          </div>
          <div className="flex items-center gap-1.5">
            {isStart ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#EFE347] animate-pulse" />
                <span className="text-[10px] font-bold text-[#EFE347]">DÉMARRAGE</span>
              </>
            ) : isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e] animate-pulse" />
                <span className="text-[10px] font-bold text-[#22c55e]">EN LIGNE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#3D4F6B]" />
                <span className="text-[10px] font-bold text-[#9CA3AF]">HORS LIGNE</span>
              </>
            )}
          </div>
        </div>

        {/* name + role */}
        <p className={`${isChief ? 'text-lg' : 'text-sm'} font-bold text-white leading-tight`}>{agent.name}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: agent.accentColor }}>
          {agent.roleShort}
        </p>

        <div className="border-t border-white/10 my-3" />

        {/* model + heartbeat */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">Modèle</span>
            <span className="text-[10px] font-mono text-white/60 truncate max-w-[120px]">
              {agent.model.replace('claude-', '')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">Heartbeat</span>
            <span className="text-[10px] text-white/60">{runState.lastHeartbeat}</span>
          </div>
        </div>

        {/* start / stop button */}
        <div className="mt-3" onClick={e => e.stopPropagation()}>
          {isOnline ? (
            <button
              onClick={onStop}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-semibold hover:bg-[#EF4444]/10 transition-colors"
            >
              <Square size={10} />
              Arrêter
            </button>
          ) : isStart ? (
            <div className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[#EFE347]/30 text-[#EFE347] text-[11px] font-semibold">
              <RefreshCw size={10} className="animate-spin" />
              Initialisation…
            </div>
          ) : (
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
              style={{ background: agent.accentColor + '20', color: agent.accentColor, border: `1px solid ${agent.accentColor}40` }}
            >
              <Play size={10} />
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

  // Runtime state per agent (client-side simulation)
  const [runStates, setRunStates] = useState<Record<string, AgentRunState>>({
    soren: { status: 'online', lastHeartbeat: new Date().toLocaleTimeString('fr-FR'), logs: BOOT_LOGS.soren },
    kai:   { status: 'online', lastHeartbeat: new Date().toLocaleTimeString('fr-FR'), logs: BOOT_LOGS.kai },
    mia:   { status: 'offline', lastHeartbeat: 'Jamais', logs: [] },
  })

  // Simulate periodic heartbeat for online agents (20s to reduce re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      setRunStates(prev => {
        let changed = false
        const next: typeof prev = {}
        for (const [id, state] of Object.entries(prev)) {
          if (state.status === 'online') {
            changed = true
            const newLog = randomLog(id)
            next[id] = {
              status: 'online',
              lastHeartbeat: new Date().toLocaleTimeString('fr-FR'),
              logs: [...state.logs.slice(-14), newLog],
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

  // Sync real gateway status into local runStates
  useEffect(() => {
    setRunStates(prev => {
      const updated = { ...prev }
      for (const [id, data] of Object.entries(agentStatus)) {
        if (updated[id]) {
          updated[id] = { ...updated[id], status: data.online ? 'online' : 'offline' }
        }
      }
      return updated
    })
  }, [agentStatus])

  function startAgent(agentId: string) {
    setRunStates(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], status: 'starting', lastHeartbeat: '…' },
    }))
    setTimeout(() => {
      setRunStates(prev => ({
        ...prev,
        [agentId]: {
          status: 'online',
          lastHeartbeat: new Date().toLocaleTimeString('fr-FR'),
          logs: BOOT_LOGS[agentId] ?? [],
        },
      }))
    }, 2200)
  }

  function stopAgent(agentId: string) {
    setRunStates(prev => ({
      ...prev,
      [agentId]: { status: 'offline', lastHeartbeat: prev[agentId].lastHeartbeat, logs: prev[agentId].logs },
    }))
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
    measureLines()
    window.addEventListener('resize', measureLines)
    return () => window.removeEventListener('resize', measureLines)
  }, [measureLines])

  const anyOnline = Object.values(runStates).some(s => s.status === 'online')

  const agentColorMap: Record<string, string> = Object.fromEntries(
    EQUIPE_AGENTS.map(a => [a.id, a.accentColor])
  )
  const agentIds = new Set(['soren', 'kai', 'mia'])
  const interAgentEvents = gatewayEvents
    .filter(e => agentIds.has(e.from) && agentIds.has(e.to))
    .slice(-6)
    .reverse()

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-56px)] bg-[#EEF0EB] px-8 py-10">

      {/* Module tabs */}
      <div className="w-full max-w-3xl mb-6">
      <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit">
        <Link href="/equipe" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#111111] text-white transition-all">
          Équipe IA
        </Link>
        <Link href="/architecture" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#6B7280] hover:text-[#111111] transition-all">
          Architecture
        </Link>
      </div>
      </div>

      {/* Page header */}
      <div className="w-full max-w-3xl mb-8 flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Infrastructure IA</p>
          <h1 className="text-lg font-bold text-[#111111]">Équipe IA</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Vos agents autonomes et leur organisation</p>
        </div>
        <div className="flex items-center gap-2">
          {anyOnline && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-3 py-1.5 rounded-full border border-[#22c55e]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Système opérationnel
            </span>
          )}
        </div>
      </div>

      {/* Diagram */}
      <div ref={containerRef} className="relative w-full max-w-3xl" style={{ minHeight: 320 }}>
        <ConnectionLines lines={lines} active={anyOnline} />

        {/* Soren top center */}
        <div className="flex justify-center mb-10">
          <AgentCard
            agent={soren}
            runState={runStates.soren}
            isChief
            isSelected={selectedAgent?.id === soren.id}
            onClick={() => setSelectedAgent(soren)}
            cardRef={sorenRef}
            onStart={() => startAgent('soren')}
            onStop={() => stopAgent('soren')}
          />
        </div>

        {/* Kai + Mia bottom */}
        <div className="flex justify-center gap-12">
          <AgentCard
            agent={kai}
            runState={runStates.kai}
            isSelected={selectedAgent?.id === kai.id}
            onClick={() => setSelectedAgent(kai)}
            cardRef={kaiRef}
            onStart={() => startAgent('kai')}
            onStop={() => stopAgent('kai')}
          />
          <AgentCard
            agent={mia}
            runState={runStates.mia}
            isSelected={selectedAgent?.id === mia.id}
            onClick={() => setSelectedAgent(mia)}
            cardRef={miaRef}
            onStart={() => startAgent('mia')}
            onStop={() => stopAgent('mia')}
          />
        </div>
      </div>

      {/* Agent drawer */}
      {selectedAgent && (
        <AgentDrawer
          agent={selectedAgent}
          events={gatewayEvents}
          status={agentStatus[selectedAgent.id]}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Inter-agent comms feed */}
      <div className="w-full max-w-3xl mt-6 mb-10">
        <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE] animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Communications inter-agents</p>
            </div>
            {anyOnline && (
              <span className="ml-auto text-[9px] font-bold text-[#22c55e] px-1.5 py-0.5 rounded-full bg-[#22c55e]/10">
                LIVE
              </span>
            )}
          </div>
          <div className="divide-y divide-white/5">
            {interAgentEvents.length === 0 ? (
              <p className="px-5 py-6 text-xs italic text-white/25 text-center">
                {anyOnline ? 'En attente de communications…' : 'Démarrez un agent pour activer le réseau'}
              </p>
            ) : interAgentEvents.map((evt, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color: agentColorMap[evt.from] ?? '#fff' }}>{evt.from}</span>
                <span className="text-[9px] text-white/20">→</span>
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color: agentColorMap[evt.to] ?? '#fff' }}>{evt.to}</span>
                <span className="text-[10px] text-white/50 flex-1 truncate">{evt.msg}</span>
                <span className="text-[9px] text-white/20 flex-shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
