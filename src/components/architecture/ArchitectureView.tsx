'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Cpu, MessageSquare, Database, Globe, Phone,
  GitMerge, Zap, Activity, Radio, Send, Bot,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type Pt = { x: number; y: number }
type Edge = { from: Pt; to: Pt; color: string; id: string; dur: number; delay: number }

type LiveEvent = {
  id: number
  type: 'webhook' | 'delegate' | 'sms' | 'qualify' | 'report' | 'devis'
  from: string
  to: string
  msg: string
  color: string
  time: string
}

// ─── Event templates ──────────────────────────────────────────
const EVENTS: Omit<LiveEvent, 'id' | 'time'>[] = [
  { type: 'webhook',  from: 'Meta Ads',  to: 'Gateway',  msg: 'Nouveau lead — Jean Dupont, façade 20-50k€',          color: '#1877F2' },
  { type: 'delegate', from: 'Soren',     to: 'Kai',      msg: 'Délégation lead #2891 — priorité haute',              color: '#3462EE' },
  { type: 'sms',      from: 'Kai',       to: 'Twilio',   msg: 'SMS envoyé +33652334975 — délai 47 sec',              color: '#4A91A8' },
  { type: 'qualify',  from: 'Kai',       to: 'CRM',      msg: 'Lead qualifié — score 84/100, stage PROPOSITION',     color: '#4A91A8' },
  { type: 'report',   from: 'Soren',     to: 'Telegram', msg: 'Digest 07h00 — 3 leads qualifiés, 1 RDV booké',       color: '#3462EE' },
  { type: 'devis',    from: 'Mia',       to: 'CRM',      msg: 'Devis #2851 façade 22 000€ — template BTP appliqué',  color: '#C8F135' },
  { type: 'delegate', from: 'Soren',     to: 'Mia',      msg: 'Générer devis — Marie Lambert, rénovation 45k€',      color: '#3462EE' },
  { type: 'webhook',  from: 'CRM',       to: 'Gateway',  msg: 'Pipeline update — Xavier Lambert → GAGNÉ',           color: '#22c55e' },
  { type: 'qualify',  from: 'Kai',       to: 'Soren',    msg: 'Relance J+2 planifiée — Inès Duprez, pas de réponse', color: '#4A91A8' },
  { type: 'report',   from: 'Mia',       to: 'Soren',    msg: 'KB synchronisée — 3 nouvelles fiches BTP ajoutées',   color: '#C8F135' },
  { type: 'sms',      from: 'Kai',       to: 'Twilio',   msg: 'Relance automatique J+7 — Marc Bonnet',               color: '#4A91A8' },
  { type: 'webhook',  from: 'Twilio',    to: 'Gateway',  msg: 'SMS entrant — réponse lead Dupont reçue',             color: '#F22F46' },
]

const LEAD_SEQUENCE: Omit<LiveEvent, 'id'>[] = [
  { type: 'webhook',  from: 'Meta Ads', to: 'Gateway',  msg: 'Lead entrant — Sophie Martin, toiture 35k€',              color: '#1877F2', time: '' },
  { type: 'delegate', from: 'Soren',    to: 'Kai',      msg: 'Délégation — Sophie Martin, priorité haute',               color: '#3462EE', time: '' },
  { type: 'sms',      from: 'Kai',      to: 'Twilio',   msg: 'SMS envoyé à Sophie Martin en 38 secondes',               color: '#4A91A8', time: '' },
  { type: 'qualify',  from: 'Kai',      to: 'CRM',      msg: 'Lead qualifié — score 91/100, budget confirmé 35k€',       color: '#4A91A8', time: '' },
  { type: 'delegate', from: 'Kai',      to: 'Soren',    msg: 'Lead chaud — RDV proposé jeudi 10 avril 14h',              color: '#4A91A8', time: '' },
  { type: 'report',   from: 'Soren',    to: 'Telegram', msg: 'Alerte Thomas — Sophie Martin qualifiée, RDV en attente',  color: '#3462EE', time: '' },
]

const METRICS = [
  { label: 'Leads 24h',       value: '12',  sub: '+3 vs hier',      color: '#3462EE' },
  { label: 'Temps réponse',   value: '52s', sub: 'Objectif < 60s',  color: '#22c55e' },
  { label: 'SMS envoyés',     value: '9',   sub: '100% délivrés',   color: '#4A91A8' },
  { label: 'RDV bookés',      value: '3',   sub: 'Ce mois : 47',    color: '#C8F135' },
]

const TYPE_LABEL: Record<string, string> = {
  webhook: 'webhook', delegate: 'delegate', sms: 'sms out',
  qualify: 'qualify', report: 'report', devis: 'devis',
}

// ─── Node card ────────────────────────────────────────────────
function NodeCard({
  label, sub, color, icon: Icon, pulse = true, large = false, nodeRef,
}: {
  label: string; sub: string; color: string; icon: React.ElementType
  pulse?: boolean; large?: boolean; nodeRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div ref={nodeRef} className="flex flex-col items-center gap-1.5">
      <div
        className={`${large ? 'w-14 h-14' : 'w-10 h-10'} rounded-xl flex items-center justify-center relative`}
        style={{ background: color + '18', border: `1.5px solid ${color}40` }}
      >
        <Icon size={large ? 22 : 16} style={{ color }} />
        {pulse && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#070B12] animate-pulse"
            style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e80' }}
          />
        )}
      </div>
      <p className={`${large ? 'text-[11px]' : 'text-[10px]'} font-bold text-white/80 text-center leading-tight`}>{label}</p>
      <p className="text-[9px] text-white/25 text-center leading-tight max-w-[90px]">{sub}</p>
    </div>
  )
}

// ─── Gateway node ─────────────────────────────────────────────
function GatewayNode({ nodeRef }: { nodeRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={nodeRef} className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)' }}
      >
        <div className="absolute inset-0 rounded-2xl animate-pulse opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        <Activity size={30} className="text-white/50 relative z-10" />
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#070B12] animate-pulse"
          style={{ background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}
        />
      </div>
      <p className="text-[10px] font-bold text-white/60 tracking-wider uppercase">Soren Gateway</p>
      <p className="text-[9px] text-white/20">ws://localhost:18789</p>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function ArchitectureView() {
  const [events, setEvents]     = useState<LiveEvent[]>([])
  const [simulating, setSimulating] = useState(false)
  const [edges, setEdges]       = useState<Edge[]>([])
  const idRef = useRef(0)

  // Node refs
  const containerRef = useRef<HTMLDivElement>(null!)
  const gwRef        = useRef<HTMLDivElement>(null!)
  const sorenRef     = useRef<HTMLDivElement>(null!)
  const kaiRef       = useRef<HTMLDivElement>(null!)
  const miaRef       = useRef<HTMLDivElement>(null!)
  const metaRef      = useRef<HTMLDivElement>(null!)
  const teleRef      = useRef<HTMLDivElement>(null!)
  const ghlRef       = useRef<HTMLDivElement>(null!)
  const twilioRef    = useRef<HTMLDivElement>(null!)

  // Measure node positions → build SVG edges
  const measure = useCallback(() => {
    const cr = containerRef.current?.getBoundingClientRect()
    if (!cr) return
    function c(r: React.RefObject<HTMLDivElement>): Pt {
      if (!r.current) return { x: 0, y: 0 }
      const b = r.current.getBoundingClientRect()
      return { x: b.left + b.width / 2 - cr.left, y: b.top + b.height / 2 - cr.top }
    }
    const gw    = c(gwRef)
    const soren = c(sorenRef)
    const kai   = c(kaiRef)
    const mia   = c(miaRef)
    const meta  = c(metaRef)
    const tele  = c(teleRef)
    const ghl   = c(ghlRef)
    const twilio = c(twilioRef)

    setEdges([
      { id: 'meta-gw',    from: meta,   to: gw,    color: '#1877F2', dur: 2.8, delay: 0   },
      { id: 'gw-soren',   from: gw,     to: soren, color: '#3462EE', dur: 2.0, delay: 0.4 },
      { id: 'soren-gw',   from: soren,  to: gw,    color: '#3462EE', dur: 2.2, delay: 1.2 },
      { id: 'gw-kai',     from: gw,     to: kai,   color: '#4A91A8', dur: 2.5, delay: 0.8 },
      { id: 'gw-mia',     from: gw,     to: mia,   color: '#C8F135', dur: 3.0, delay: 1.6 },
      { id: 'soren-tele', from: soren,  to: tele,  color: '#2AABEE', dur: 3.5, delay: 2.0 },
      { id: 'kai-twilio', from: kai,    to: twilio,color: '#F22F46', dur: 2.0, delay: 0.6 },
      { id: 'kai-ghl',    from: kai,    to: ghl,   color: '#22c55e', dur: 3.2, delay: 1.4 },
      { id: 'mia-ghl',    from: mia,    to: ghl,   color: '#22c55e', dur: 2.8, delay: 2.2 },
    ])
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Live event stream
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    function schedule() {
      t = setTimeout(() => {
        const tpl = EVENTS[Math.floor(Math.random() * EVENTS.length)]
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        idRef.current++
        setEvents(prev => [{ id: idRef.current, ...tpl, time }, ...prev].slice(0, 22))
        schedule()
      }, 12000 + Math.random() * 10000)
    }
    schedule()
    return () => clearTimeout(t)
  }, [])

  // Simulate Meta lead flow — timeouts tracked pour cleanup
  const simTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { simTimersRef.current.forEach(clearTimeout) }, [])

  function simulateLead() {
    if (simulating) return
    setSimulating(true)
    simTimersRef.current.forEach(clearTimeout)
    simTimersRef.current = []
    LEAD_SEQUENCE.forEach((ev, i) => {
      const t = setTimeout(() => {
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        idRef.current++
        setEvents(prev => [{ id: idRef.current, ...ev, time }, ...prev].slice(0, 22))
        if (i === LEAD_SEQUENCE.length - 1) setSimulating(false)
      }, i * 1100)
      simTimersRef.current.push(t)
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#070B12] overflow-hidden select-none">

      {/* ── Module tabs ── */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <Link href="/equipe" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white/50 hover:text-white/90 transition-all">
            Équipe IA
          </Link>
          <Link href="/architecture" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white/10 text-white transition-all">
            Architecture
          </Link>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Système opérationnel
          </span>
          <span className="text-white/15">·</span>
          <span className="text-[11px] text-white/30">
            OpenClaw Gateway <span className="text-white/50 font-mono">ws://localhost:18789</span>
          </span>
          <span className="text-white/15">·</span>
          <span className="text-[11px] text-white/30">3 agents actifs · Uptime <span className="text-[#22c55e]">99.9%</span></span>
          <span className="text-white/15">·</span>
          <span className="text-[11px] text-white/30">
            Anthropic API <span className="text-white/50">Opus 4.6 · Sonnet 4.6 · Haiku 4.5</span>
          </span>
        </div>

        <button
          onClick={simulateLead}
          disabled={simulating}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60 flex-shrink-0"
          style={{
            background: simulating ? 'rgba(24,119,242,0.15)' : '#1877F2',
            color: 'white',
            border: simulating ? '1px solid rgba(24,119,242,0.3)' : 'none',
          }}
        >
          <Zap size={11} />
          {simulating ? 'Simulation en cours…' : 'Simuler lead Meta'}
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Topology ── */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">

          {/* SVG — connections + animated packets */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Static connection lines */}
            {edges.map(e => (
              <line
                key={`line-${e.id}`}
                x1={e.from.x} y1={e.from.y}
                x2={e.to.x}   y2={e.to.y}
                stroke={e.color}
                strokeWidth="1"
                strokeDasharray="5 4"
                opacity="0.25"
              />
            ))}

            {/* Animated data packets */}
            {edges.map(e => {
              const pathD = `M ${e.from.x} ${e.from.y} L ${e.to.x} ${e.to.y}`
              return (
                <g key={`packet-${e.id}`}>
                  <path id={`path-${e.id}`} d={pathD} fill="none" />
                  <circle r="3.5" fill={e.color} filter="url(#glow)" opacity="0.85">
                    <animateMotion
                      dur={`${e.dur}s`}
                      begin={`${e.delay}s`}
                      repeatCount="indefinite"
                    >
                      <mpath href={`#path-${e.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              )
            })}
          </svg>

          {/* ── Node layout — 3 rows ── */}
          <div className="absolute inset-0 flex flex-col justify-between py-8 px-12">

            {/* Row 1: External inputs */}
            <div className="flex items-start justify-between">
              <NodeCard label="Meta Ads" sub="Lead Forms webhook" color="#1877F2" icon={Globe}
                nodeRef={metaRef} />
              <NodeCard label="SOREN" sub="Orchestrateur · Claude Opus 4.6" color="#3462EE"
                icon={Cpu} large nodeRef={sorenRef} />
              <NodeCard label="Telegram" sub="Digest Thomas · grammY" color="#2AABEE"
                icon={Send} pulse={false} nodeRef={teleRef} />
            </div>

            {/* Row 2: Gateway (center) */}
            <div className="flex justify-center">
              <GatewayNode nodeRef={gwRef} />
            </div>

            {/* Row 3: Agents */}
            <div className="flex items-end justify-between">
              <div className="flex flex-col items-center gap-6">
                <NodeCard label="Twilio" sub="SMS sortant · entrant" color="#F22F46"
                  icon={Phone} pulse={false} nodeRef={twilioRef} />
              </div>

              <NodeCard label="KAI" sub="CSM Agent · Claude Sonnet 4.6" color="#4A91A8"
                icon={MessageSquare} large nodeRef={kaiRef} />

              <NodeCard label="MIA" sub="KB + Devis · Claude Haiku 4.5" color="#C8F135"
                icon={Database} large nodeRef={miaRef} />

              <div className="flex flex-col items-center gap-6">
                <NodeCard label="CRM" sub="Pipeline · Contacts · Agenda" color="#22c55e"
                  icon={GitMerge} pulse={false} nodeRef={ghlRef} />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-5 text-[9px] text-white/20">
            <span className="flex items-center gap-1.5">
              <span className="w-5 border-t border-dashed border-white/15" />
              connexion REST/webhook
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3462EE] opacity-80" />
              données actives
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 6px #22c55e' }} />
              agent online
            </span>
          </div>
        </div>

        {/* ── Event stream ── */}
        <div className="w-[340px] flex-shrink-0 border-l border-white/5 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
            <Radio size={11} className="text-[#22c55e] animate-pulse" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">
              Événements live
            </p>
            <span className="ml-auto text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full">
              LIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <p className="px-4 py-10 text-[11px] text-white/20 italic text-center">
                En attente d&apos;événements…
              </p>
            ) : events.map((ev, i) => (
              <div
                key={ev.id}
                className="px-4 py-2.5 border-b border-white/[0.04] flex items-start gap-2.5"
                style={{ background: i === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}
              >
                {/* Type badge */}
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 uppercase tracking-wider"
                  style={{ background: ev.color + '30', color: ev.color }}
                >
                  {TYPE_LABEL[ev.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] font-bold" style={{ color: ev.color }}>{ev.from}</span>
                    <span className="text-[9px] text-white/15">→</span>
                    <span className="text-[9px] text-white/35">{ev.to}</span>
                  </div>
                  <p className="text-[10px] text-white/60 leading-snug">{ev.msg}</p>
                </div>
                <span className="text-[8px] text-white/15 flex-shrink-0 font-mono mt-0.5">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metrics bar ── */}
      <div className="flex border-t border-white/5 flex-shrink-0">
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className="flex-1 px-6 py-3"
            style={{ borderRight: i < METRICS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
              <p className="text-[10px] text-white/40">{m.sub}</p>
            </div>
            <p className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
