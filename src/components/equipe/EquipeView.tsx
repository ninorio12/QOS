'use client'

import { useState, useEffect } from 'react'
import { Cpu, Users, Database, Code2, Megaphone, BarChart2, Play, Square, RefreshCw } from 'lucide-react'
import { EQUIPE_AGENTS, type EquipeAgent } from './agents'
import { useGatewayEvents }  from '@/hooks/useGatewayEvents'
import { useAgentStatus }    from '@/hooks/useAgentStatus'

// ─── Icon map ─────────────────────────────────────────────────
const ICON_MAP = {
  cpu:       Cpu,
  users:     Users,
  database:  Database,
  code:      Code2,
  megaphone: Megaphone,
  chart:     BarChart2,
} as const

// ─── Types ────────────────────────────────────────────────────
type AgentRunState = {
  status: 'online' | 'offline' | 'starting'
  lastHeartbeat: string
  logs: string[]
}

// ─── Logs ─────────────────────────────────────────────────────
const BOOT_LOGS: Record<string, string[]> = {
  soren: [
    '[08:31:00] Orchestrateur démarré — agents : 5/5',
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
  alex: [
    '[08:31:00] CTO démarré — monitoring infrastructure actif',
    '[08:31:02] Scan sécurité API : 0 vulnérabilités détectées',
    '[08:31:04] Déploiement v2.3.1 planifié — 02h00',
    '[08:31:06] Latence moyenne API : 127ms — nominal',
  ],
  mia: [
    '[08:31:00] CMO démarrée — 47 fiches clients actives',
    '[08:31:02] Devis façade €8 900 généré — envoi planifié 09h00',
    '[08:31:04] Campagne Meta analysée — CPL 12€ — ROAS 3.2',
    '[08:31:06] Alerte : devis Marie Colin en attente de validation',
  ],
  leo: [
    '[08:31:00] CFO démarré — données financières chargées',
    '[08:31:02] MRR courant : 3 200€ — objectif 4 000€',
    '[08:31:04] Rapport mensuel généré — envoi CEO',
    '[08:31:06] ROI campagne Meta : +340% — coût infra 218€/mois',
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
  alex: [
    'Uptime système : {s}% — nominal',
    'Dépendances à mettre à jour : {n} packages',
    'Temps réponse API moyen : {q}ms',
    'Scan sécurité terminé — {n} alertes mineures',
    'Pipeline CI/CD — build {v} déployé en prod',
  ],
  mia: [
    'Campagne Meta analysée — {n} nouveaux leads',
    'Devis en attente de validation : {n} fichier(s)',
    'Contenu client mis à jour — secteur rénovation',
    'Template devis BTP chargé — {n} variables',
    'Score engagement campagne : {s}/100',
  ],
  leo: [
    'MRR actuel : {v}€ — delta +{n}% mois précédent',
    'Coût infra mensuel : {q}€ — dans budget',
    'Nouvelles transactions : {n} ce jour',
    'Prévision fin de mois : {v}€ CA',
    'ROI campagnes cumulé : {s}%',
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

function formatTool(t: string) {
  return t.replace(/_/g, ' ')
}

function shortModel(m: string) {
  return m.replace('claude-', '').replace(/-20\d{6}$/, '').replace('gemini-', '')
}

// ─── Soren hero card — inspiré screenshot ────────────────────
function SorenHeroCard({
  agent, runState, isSelected, onClick, onStart, onStop, prenom,
}: {
  agent:      EquipeAgent
  runState:   AgentRunState
  isSelected: boolean
  onClick:    () => void
  onStart:    () => void
  onStop:     () => void
  prenom:     string
}) {
  const isOnline = runState.status === 'online'
  const isStart  = runState.status === 'starting'

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background: '#F2F3F0',
        border: isSelected ? '2px solid #C8F135' : '2px solid #E2E4DF',
        boxShadow: isSelected
          ? '0 6px 20px rgba(0,0,0,0.10)'
          : '0 4px 16px rgba(0,0,0,0.07)',
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out',
      }}
    >
      <div className="flex items-stretch" style={{ minHeight: 128 }}>

        {/* LEFT: avatar zone */}
        <div className="relative flex-shrink-0 overflow-hidden rounded-l-2xl" style={{ width: 165, background: '#F2F3F0' }}>
          {/* Ombre grise classique derrière avatar */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.10)', filter: 'blur(20px)', bottom: '-8px' }} />
          {/* Right-edge fade */}
          <div className="absolute inset-y-0 right-0 w-12 pointer-events-none"
            style={{ background: 'linear-gradient(to left, #F2F3F0 20%, transparent)', zIndex: 2 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soren-avatar.png" alt="Soren"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto object-contain"
            style={{ height: '120px', zIndex: 3, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))' }} />
        </div>

        {/* RIGHT: contenu */}
        <div className="flex flex-col justify-between flex-1 min-w-0 px-4 py-2.5">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[8.5px] font-black uppercase tracking-widest text-[#0D0D0D] bg-[#C8F135] px-2 py-0.5 rounded-full">COO</span>
              <span className="text-[10px] text-[#6B7280] font-medium">Orchestrateur Système</span>
              <div className="ml-auto flex items-center gap-1.5">
                {isStart ? <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                  : isOnline ? <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_5px_#22c55e]" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />}
                <span className="text-[8.5px] font-medium text-[#6B7280]">
                  {isStart ? 'Démarrage…' : isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>

            <h2 className="text-[16px] font-black text-[#0D0D0D] leading-tight tracking-tight mb-1">
              Bonjour{prenom ? `, ${prenom}` : ''}, je suis Soren. 👋
            </h2>
            <p className="text-[10.5px] text-[#4B5563] leading-relaxed line-clamp-1 max-w-[460px]">
              {agent.description}
            </p>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1 my-1.5">
            {agent.tools.slice(0, 3).map(tool => (
              <span key={tool} className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#E6E8E4', color: '#374151', border: '1px solid #D8DAD5' }}>
                {formatTool(tool)}
              </span>
            ))}
            {agent.tools.length > 3 && (
              <span className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#E6E8E4', color: '#9CA3AF', border: '1px solid #D8DAD5' }}>
                +{agent.tools.length - 3}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[8.5px] text-[#2AABEE]">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.857l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.702z"/></svg>
              Telegram
            </span>
            <span className="text-[#E5E7EB]">·</span>
            <span className="text-[8.5px] font-mono text-[#6B7280]">{agent.model.replace(/-20\d{6}$/, '')}</span>
            <div className="ml-auto" onClick={e => e.stopPropagation()}>
              {isOnline ? (
                <button onClick={onStop}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[#374151] text-[9px] font-semibold border border-[#E5E7EB] hover:bg-[#F9FAF7] transition-colors">
                  <Square size={7} /> Arrêter
                </button>
              ) : isStart ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[#92750C] text-[9px] font-semibold border border-[#FDE68A] bg-[#FFFBEB]">
                  <RefreshCw size={7} className="animate-spin" /> Initialisation…
                </div>
              ) : (
                <button onClick={onStart}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[#0D0D0D] text-[9px] font-bold hover:brightness-95 transition-all"
                  style={{ background: '#C8F135', border: '1px solid #aad420' }}>
                  <Play size={7} /> Démarrer
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-agent card — active ──────────────────────────────────
function AgentCard({
  agent, runState, isSelected, onClick, onStart, onStop,
}: {
  agent:      EquipeAgent
  runState:   AgentRunState
  isSelected: boolean
  onClick:    () => void
  onStart:    () => void
  onStop:     () => void
}) {
  const Icon     = ICON_MAP[agent.icon]
  const isOnline = runState.status === 'online'
  const isStart  = runState.status === 'starting'

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none flex-1 min-w-0"
      style={{
        background: agent.accentColor,
        transform: isSelected ? 'scale(1.015)' : 'scale(1)',
        boxShadow: isSelected
          ? '0 8px 24px rgba(0,0,0,0.18)'
          : '0 4px 12px rgba(0,0,0,0.12)',
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
      }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
      <div className="absolute -bottom-12 -left-6 w-28 h-28 rounded-full bg-black/8 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full p-4 gap-2">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Icon size={16} color="white" />
            </div>
            <div>
              <p className="text-[14px] font-black text-white leading-tight">{agent.name}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/55 mt-0.5">
                {agent.role.split(' / ')[0]}
              </p>
            </div>
          </div>
          {isStart ? (
            <span className="w-2 h-2 mt-1 rounded-full block bg-white/70 animate-pulse flex-shrink-0" />
          ) : isOnline ? (
            <span className="w-2 h-2 mt-1 rounded-full block bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.9)] flex-shrink-0" />
          ) : (
            <span className="w-2 h-2 mt-1 rounded-full block bg-white/20 flex-shrink-0" />
          )}
        </div>

        <p className="text-[10px] text-white/70 leading-relaxed line-clamp-1">{agent.description}</p>

        <div className="flex-1">
          <p className="text-[7px] font-bold uppercase tracking-widest text-white/35 mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {agent.tools.slice(0, 3).map(tool => (
              <span
                key={tool}
                className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {formatTool(tool)}
              </span>
            ))}
            {agent.tools.length > 3 && (
              <span
                className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                +{agent.tools.length - 3}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1.5 border-t border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[8px] font-mono text-white/50 truncate">{shortModel(agent.model)}</span>
            <span className="text-white/20">·</span>
            <span className="text-[8px] text-white/50">{isOnline ? runState.lastHeartbeat : 'Jamais'}</span>
          </div>
          <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
            {isOnline ? (
              <button onClick={onStop}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Square size={8} /> Arrêter
              </button>
            ) : isStart ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <RefreshCw size={8} className="animate-spin" /> Init…
              </div>
            ) : (
              <button onClick={onStart}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white hover:brightness-110 transition-all"
                style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Play size={8} /> Démarrer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card "en formation" — grisée ────────────────────────────
function AgentCardInTraining({ agent }: { agent: EquipeAgent }) {
  const Icon      = ICON_MAP[agent.icon]
  const roleLabel = agent.role.split(' / ')[0]

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-1 min-w-0 select-none"
      style={{ background: '#E8EAEB', border: '1px solid #D2D5D8' }}
    >

      <div className="relative z-10 flex flex-col h-full p-4 gap-2">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#D2D5D8' }}>
              <Icon size={16} color="#9CA3AF" />
            </div>
            <div>
              <p className="text-[14px] font-black text-[#9CA3AF] leading-tight">{agent.name}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#AAAEB3] mt-0.5">{roleLabel}</p>
            </div>
          </div>
          <span className="text-[8.5px] font-bold text-[#7B8086] bg-[#D2D5D8] border border-[#C4C8CC] px-2.5 py-0.5 rounded-full whitespace-nowrap">
            En formation
          </span>
        </div>

        <p className="text-[10px] text-[#AAAEB3] leading-relaxed line-clamp-1">{agent.description}</p>

        <div className="flex-1">
          <p className="text-[7px] font-bold uppercase tracking-widest text-[#BDC1C5] mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {agent.tools.slice(0, 3).map(tool => (
              <span key={tool}
                className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#D8DBDE', color: '#9CA3AF', border: '1px solid #C8CCD0' }}>
                {formatTool(tool)}
              </span>
            ))}
            {agent.tools.length > 3 && (
              <span
                className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#D8DBDE', color: '#AAAEB3', border: '1px solid #C8CCD0' }}>
                +{agent.tools.length - 3}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1.5 border-t border-[#D2D5D8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-[#AAAEB3]">{shortModel(agent.model)}</span>
            <span className="text-[#C8CCD0]">·</span>
            <span className="text-[8px] text-[#AAAEB3]">Actuellement en formation</span>
          </div>
          <button disabled
            className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold cursor-not-allowed"
            style={{ background: '#CDD0D3', color: '#9CA3AF', border: '1px solid #C4C8CC' }}>
            <Play size={8} /> Indisponible
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function EquipeView() {
  const soren = EQUIPE_AGENTS.find(a => a.id === 'soren')!
  const kai   = EQUIPE_AGENTS.find(a => a.id === 'kai')!
  const alex  = EQUIPE_AGENTS.find(a => a.id === 'alex')!
  const mia   = EQUIPE_AGENTS.find(a => a.id === 'mia')!
  const leo   = EQUIPE_AGENTS.find(a => a.id === 'leo')!

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [prenom, setPrenom] = useState('')
  const gatewayEvents = useGatewayEvents()
  const agentStatus   = useAgentStatus()

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('soren_compte') ?? '{}')
      if (stored.prenom) setPrenom(stored.prenom)
    } catch {}
  }, [])

  const [runStates, setRunStates] = useState<Record<string, AgentRunState>>({
    soren: { status: 'online', lastHeartbeat: 'En ligne', logs: BOOT_LOGS.soren },
    kai:   { status: 'online', lastHeartbeat: 'En ligne', logs: BOOT_LOGS.kai },
    alex:  { status: 'offline', lastHeartbeat: 'Jamais', logs: [] },
    mia:   { status: 'offline', lastHeartbeat: 'Jamais', logs: [] },
    leo:   { status: 'offline', lastHeartbeat: 'Jamais', logs: [] },
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
          } else { next[id] = state }
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
      setRunStates(prev => ({
        ...prev,
        [id]: { status: 'online', lastHeartbeat: new Date().toLocaleTimeString('fr-FR'), logs: BOOT_LOGS[id] ?? [] },
      }))
    }, 2200)
  }

  function stopAgent(id: string) {
    setRunStates(prev => ({ ...prev, [id]: { ...prev[id], status: 'offline' } }))
  }

  const anyOnline = Object.values(runStates).some(s => s.status === 'online')
  const agentIds  = new Set(['soren', 'kai', 'alex', 'mia', 'leo'])
  const interAgentEvents = gatewayEvents.filter(e => agentIds.has(e.from) && agentIds.has(e.to)).slice(-3).reverse()

  return (
    <div className="flex flex-col bg-[#EEF0EB] px-8 py-5" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <div>
          <h1 className="text-xl font-black text-[#111111] leading-none">Équipe IA</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Vos agents autonomes et leur organisation</p>
        </div>
        {anyOnline && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#16a34a] bg-[#22c55e]/10 px-2.5 py-1 rounded-full border border-[#22c55e]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Système opérationnel
          </span>
        )}
      </div>

      {/* 3-row grid — full width */}
      <div
        className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-0.5"
        style={{ animation: 'fadeSlideUp 400ms ease-out 90ms both' }}
      >

        {/* Row 1: Soren */}
        <SorenHeroCard
          agent={soren}
          runState={runStates.soren}
          isSelected={selectedAgent === 'soren'}
          onClick={() => setSelectedAgent(p => p === 'soren' ? null : 'soren')}
          onStart={() => startAgent('soren')}
          onStop={() => stopAgent('soren')}
          prenom={prenom}
        />

        {/* Row 2: Kai + Mia (actifs) */}
        <div className="flex gap-3" style={{ height: 185 }}>
          <AgentCard agent={kai} runState={runStates.kai}
            isSelected={selectedAgent === 'kai'} onClick={() => setSelectedAgent(p => p === 'kai' ? null : 'kai')}
            onStart={() => startAgent('kai')} onStop={() => stopAgent('kai')} />
          <AgentCard agent={mia} runState={runStates.mia}
            isSelected={selectedAgent === 'mia'} onClick={() => setSelectedAgent(p => p === 'mia' ? null : 'mia')}
            onStart={() => startAgent('mia')} onStop={() => stopAgent('mia')} />
        </div>

        {/* Row 3: Alex + Leo (en formation) */}
        <div className="flex gap-3" style={{ height: 175 }}>
          <AgentCardInTraining agent={alex} />
          <AgentCardInTraining agent={leo} />
        </div>

        {/* Inter-agent events */}
        {interAgentEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {interAgentEvents.map((ev, i) => (
              <span key={i} className="text-[9px] font-mono text-[#6B7280] bg-white/60 px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                {ev.from} → {ev.to}: {ev.msg?.slice(0, 50)}
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
