'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Radio } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type AgentId  = 'soren' | 'kai' | 'mia'
type LogLevel = 'info' | 'success' | 'error' | 'warning'

type LogEntry = {
  id: string
  time: string
  agent: AgentId
  level: LogLevel
  message: string
  detail?: string
  tool_used?: string | null
  created_at?: string
}

// ─── Meta ─────────────────────────────────────────────────────
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren:  { label: 'VividFlow',  color: '#4A91A8', bg: '#4A91A815' },
  kai:    { label: 'Kai',    color: '#1A5C38', bg: '#1A5C3815' },
  mia:    { label: 'Mia',    color: '#E8836A', bg: '#E8836A15' },
}

const LEVEL_META: Record<LogLevel, { label: string; color: string; bg: string }> = {
  info:    { label: 'INFO',    color: '#8896AB', bg: '#8896AB15' },
  success: { label: 'SUCCESS', color: '#8B5CF6', bg: '#8B5CF615' },
  error:   { label: 'ERROR',   color: '#EF4444', bg: '#EF444415' },
  warning: { label: 'WARNING', color: '#E8836A', bg: '#E8836A15' },
}

// ─── Seed logs ────────────────────────────────────────────────
function now() { return new Date().toLocaleTimeString('fr-FR') }

const SEED_LOGS: LogEntry[] = [
  { id: 'l01', time: now(), agent: 'soren', level: 'info',    message: 'Heartbeat exécuté — 3 leads analysés',                   detail: 'Pipeline ACQUISITION · leads actifs : Martin Dupont, Xavier Lambert, Inès Duprez' },
  { id: 'l02', time: now(), agent: 'kai',   level: 'success', message: 'Lead Martin Dupont qualifié — stage mis à jour',          detail: 'Opportunité #opp-447 → stage "Qualifié" · valeur €4,500' },
  { id: 'l03', time: now(), agent: 'kai',   level: 'info',    message: 'Message WhatsApp envoyé à +33612345001',                  detail: 'Contact : Martin Dupont · template : confirmation_rdv' },
  { id: 'l04', time: now(), agent: 'mia',   level: 'success', message: 'Devis généré — Rénovation façade €8,900',                 detail: 'Document PDF créé · envoi planifié demain 09h00 · BN Bâtiment' },
  { id: 'l05', time: now(), agent: 'soren', level: 'info',    message: 'Directive envoyée à Kai : relancer Xavier Lambert',       detail: 'Priorité haute · délai : 24h · canal : WhatsApp' },
  { id: 'l06', time: now(), agent: 'kai',   level: 'error',   message: 'Échec appel Vapi — Martin Dupont non joignable',          detail: 'Erreur Vapi : timeout 30s · tentative 2/3 · prochain essai dans 2h' },
  { id: 'l07', time: now(), agent: 'kai',   level: 'warning', message: 'Lead sans réponse depuis 48h — intervention recommandée', detail: 'Contact : Xavier Lambert · dernière interaction : 4 avril' },
  { id: 'l08', time: now(), agent: 'mia',   level: 'info',    message: 'Base de connaissance mise à jour',                        detail: 'Fichier MEMORY.md · 3 entrées ajoutées' },
  { id: 'l09', time: now(), agent: 'soren', level: 'success', message: 'Analyse pipeline terminée — rapport généré',              detail: 'Pipeline ACQUISITION · 12 opportunités · valeur totale €74,600' },
  { id: 'l10', time: now(), agent: 'kai',   level: 'info',    message: 'Nouveau lead détecté — Didier Fabre',                     detail: 'Source : formulaire web · score qualification : 72/100' },
  { id: 'l11', time: now(), agent: 'mia',   level: 'success', message: 'Document créé : Fiche client Xavier Lambert',             detail: 'Type : fiche_contact · ID : doc-0219 · taille : 2.4 Ko' },
  { id: 'l12', time: now(), agent: 'soren', level: 'info',    message: 'Connexion CRM vérifiée — 12 opportunités actives',        detail: 'Token valide · quota API : 847/1000 requêtes restantes' },
  { id: 'l13', time: now(), agent: 'kai',   level: 'success', message: 'RDV planifié — Inès Duprez 7 avril 14h',                  detail: 'Calendrier mis à jour · confirmation envoyée par email' },
  { id: 'l14', time: now(), agent: 'mia',   level: 'warning', message: 'Devis en attente de validation depuis 24h',               detail: 'Devis #dv-0114 — Plomberie chauffage · contact : Marie Colin' },
  { id: 'l15', time: now(), agent: 'soren', level: 'info',    message: 'Démarrage orchestrateur — agents actifs : 3/3',           detail: 'VividFlow v1.0 · Kai v1.0 · Mia v1.0 · modèle : claude-haiku-4-5' },
]

// ─── Live log generators ──────────────────────────────────────
let liveCounter = 100

const LIVE_TEMPLATES: { agent: AgentId; level: LogLevel; message: string; detail?: string }[] = [
  { agent: 'kai',   level: 'info',    message: 'Scan conversations entrantes — {n} nouvelles',           detail: 'Source : webhook · traitement en cours' },
  { agent: 'soren', level: 'info',    message: 'Heartbeat — pipeline actif · {n} opportunités ouvertes', detail: 'Délai prochain cycle : 3h00' },
  { agent: 'mia',   level: 'success', message: 'Synchronisation KB terminée — {n} documents',            detail: 'Fichiers mis à jour : MEMORY.md, kai.md' },
  { agent: 'kai',   level: 'success', message: 'Relance WhatsApp envoyée → Xavier Lambert',              detail: 'Template : relance_48h · score urgence : 87/100' },
  { agent: 'soren', level: 'success', message: 'Rapport digest Telegram envoyé',                         detail: 'Pipeline €74,6k · 12 leads actifs · 1 RDV cette semaine' },
  { agent: 'mia',   level: 'info',    message: 'Template devis chargé — {n} variantes disponibles',      detail: 'Secteur : rénovation façade · gamme : standard/premium' },
  { agent: 'kai',   level: 'info',    message: 'Score qualification calculé — lead {name} : {s}/100',    detail: 'Critères : budget, délai, décideur, besoin défini' },
  { agent: 'soren', level: 'warning', message: 'Lead inactif depuis 72h — escalade recommandée',         detail: 'Contact : Marie Colin · valeur estimée : €12,000' },
  { agent: 'kai',   level: 'success', message: 'Opportunité mise à jour → stade avancé',                 detail: 'Pipeline ACQUISITION · valeur : €45,000 · tag : prioritaire' },
  { agent: 'mia',   level: 'info',    message: 'Archivage mensuel — {n} fiches clients traitées',        detail: 'Mois : mars 2026 · statuts : won/lost/abandoned archivés' },
]

const NAMES = ['Martin Dupont', 'Sophie Renard', 'Didier Fabre', 'Inès Duprez', 'Xavier Lambert']

function generateLiveLog(): LogEntry {
  const tpl = LIVE_TEMPLATES[Math.floor(Math.random() * LIVE_TEMPLATES.length)]
  liveCounter++
  return {
    id: `live-${liveCounter}`,
    time: now(),
    agent: tpl.agent,
    level: tpl.level,
    message: tpl.message
      .replace('{n}', String(Math.floor(Math.random() * 8) + 1))
      .replace('{name}', NAMES[Math.floor(Math.random() * NAMES.length)])
      .replace('{s}', String(Math.floor(Math.random() * 25) + 65)),
    detail: tpl.detail,
  }
}

// ─── Filters ──────────────────────────────────────────────────
type AgentFilter = AgentId | 'all'
type LevelFilter = LogLevel | 'all'

const AGENT_OPTIONS: { id: AgentFilter; label: string }[] = [
  { id: 'all',    label: 'Tous' },
  { id: 'soren',  label: 'VividFlow' },
  { id: 'kai',    label: 'Kai' },
  { id: 'mia',    label: 'Mia' },
]
const LEVEL_OPTIONS: { id: LevelFilter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'info', label: 'Info' }, { id: 'success', label: 'Succès' },
  { id: 'error', label: 'Erreur' }, { id: 'warning', label: 'Warning' },
]

// ─── Log row ──────────────────────────────────────────────────
function LogRow({ entry, isNew }: { entry: LogEntry; isNew?: boolean }) {
  const [open, setOpen] = useState(false)
  const agent = AGENT_META[entry.agent]
  const level = LEVEL_META[entry.level]

  return (
    <div
      className={`relative border-b border-[#F3F4F6] last:border-0 transition-colors duration-500 ${isNew ? 'bg-soren-elevated' : 'hover:bg-[#FAFAFA]'}`}
      onClick={() => entry.detail && setOpen(o => !o)}
      style={{ cursor: entry.detail ? 'pointer' : 'default' }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-r-full transition-opacity"
        style={{ background: level.color, opacity: open ? 1 : 0.5 }}
      />

      {/* Main row */}
      <div className="flex items-center gap-3 pl-5 pr-4 py-2.5">
        {/* Time */}
        <span className="text-[10px] font-mono text-[#C8CBD0] flex-shrink-0 w-14 tabular-nums">
          {entry.time}
        </span>

        {/* Message — dominant element */}
        <span className="text-[12.5px] text-soren-muted font-medium flex-1 truncate">
          {entry.message}
        </span>

        {/* Agent chip — right side */}
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: agent.color, background: agent.bg }}
        >
          {agent.label}
        </span>
      </div>

      {/* Detail — slides in below */}
      {open && entry.detail && (
        <div className="pl-5 pr-4 pb-2.5 -mt-0.5">
          <p className="text-[11px] font-mono text-soren-muted leading-relaxed pl-[calc(0.25rem+3.5rem)]">
            {entry.detail}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function LogsView() {
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [query,       setQuery]       = useState('')
  const [liveMode,    setLiveMode]    = useState(true)
  const [logs,        setLogs]        = useState<LogEntry[]>(SEED_LOGS)
  const [realLoaded,  setRealLoaded]  = useState(false)
  const [newIds,      setNewIds]      = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!liveMode || realLoaded) return
    let timeout: ReturnType<typeof setTimeout>
    function schedule() {
      const delay = 15000 + Math.random() * 10000
      timeout = setTimeout(() => {
        const newLog = generateLiveLog()
        setLogs(prev => [newLog, ...prev.slice(0, 99)])
        setNewIds(prev => { const s = new Set(Array.from(prev)); s.add(newLog.id); return s })
        setTimeout(() => setNewIds(prev => { const s = new Set(Array.from(prev)); s.delete(newLog.id); return s }), 1500)
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [liveMode, realLoaded])

  // Charger les vrais logs Supabase
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res  = await fetch('/api/agent-logs?limit=100')
        const data = await res.json() as { logs: { id: string; agent: string; level: string; message: string; tool_used?: string | null; created_at: string }[] }
        if (data.logs && data.logs.length > 0) {
          const mapped: LogEntry[] = data.logs.map(l => ({
            id:       l.id,
            time:     new Date(l.created_at).toLocaleTimeString('fr-FR'),
            agent:    (l.agent as AgentId) in AGENT_META ? (l.agent as AgentId) : 'kai',
            level:    (['info', 'success', 'warning', 'error'].includes(l.level) ? l.level : 'info') as LogLevel,
            message:  l.message,
            detail:   l.tool_used ?? undefined,
            tool_used: l.tool_used,
            created_at: l.created_at,
          }))
          setLogs(mapped)
          setRealLoaded(true)
        }
      } catch { /* fallback sur SEED_LOGS */ }
    }
    void fetchLogs()
    // Polling toutes les 10s si liveMode
    const interval = setInterval(() => { if (liveMode) void fetchLogs() }, 10000)
    return () => clearInterval(interval)
  }, [liveMode])

  const filtered = useMemo(() => {
    let l = logs
    if (agentFilter !== 'all') l = l.filter(x => x.agent === agentFilter)
    if (levelFilter !== 'all') l = l.filter(x => x.level === levelFilter)
    if (query) {
      const q = query.toLowerCase()
      l = l.filter(x => x.message.toLowerCase().includes(q))
    }
    return l
  }, [logs, agentFilter, levelFilter, query])

  const successCount = logs.filter(l => l.level === 'success').length
  const warningCount = logs.filter(l => l.level === 'warning').length
  const errorCount   = logs.filter(l => l.level === 'error').length

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-soren-app">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0 bg-soren-card border-b border-[#F0F0EE]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-soren-text leading-none">Logs</h1>
            <p className="text-xs text-soren-subtle mt-1">Activité des agents en temps réel</p>
          </div>

          <div className="flex items-center gap-3">
            {/* KPI chips */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ color: LEVEL_META.success.color, background: LEVEL_META.success.bg }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: LEVEL_META.success.color }} />
                {successCount} OK
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ color: LEVEL_META.warning.color, background: LEVEL_META.warning.bg }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: LEVEL_META.warning.color }} />
                {warningCount} WARN
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ color: LEVEL_META.error.color, background: LEVEL_META.error.bg }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: LEVEL_META.error.color }} />
                {errorCount} ERR
              </span>
            </div>

            {/* Live toggle */}
            <button
              onClick={() => setLiveMode(l => !l)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                liveMode
                  ? 'bg-[#84CC16]/10 text-[#4D7C0F] border-[#84CC16]/30'
                  : 'bg-soren-elevated text-soren-subtle border-soren-border'
              }`}
            >
              <Radio size={10} className={liveMode ? 'animate-pulse' : ''} />
              {liveMode ? 'LIVE' : 'Pausé'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-soren-elevated border border-soren-border rounded-lg px-3 py-1.5 w-48">
            <Search size={11} className="text-soren-subtle flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-xs text-soren-text placeholder-[#9CA3AF] outline-none"
            />
          </div>

          {/* Agent filter */}
          <div className="flex gap-1 bg-black/5 rounded-xl p-1">
            {AGENT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setAgentFilter(o.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  agentFilter === o.id ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex gap-1 bg-black/5 rounded-xl p-1">
            {LEVEL_OPTIONS.map(o => {
              const active = levelFilter === o.id
              const meta   = o.id !== 'all' ? LEVEL_META[o.id as LogLevel] : null
              return (
                <button key={o.id} onClick={() => setLevelFilter(o.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    active && !meta ? 'bg-soren-card text-soren-text shadow-sm' : !active ? 'text-soren-muted hover:text-soren-text' : ''
                  }`}
                  style={active && meta ? { background: meta.bg, color: meta.color } : {}}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Log list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-soren-card">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-soren-subtle">Aucun log trouvé</p>
          </div>
        ) : (
          filtered.map(entry => <LogRow key={entry.id} entry={entry} isNew={newIds.has(entry.id)} />)
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-[#F0F0EE] bg-soren-card flex items-center justify-between flex-shrink-0">
        <p className="text-[10px] text-soren-subtle">{filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</p>
        {liveMode && (
          <p className="text-[10px] text-[#4D7C0F] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse inline-block" />
            Streaming en direct
          </p>
        )}
      </div>
    </div>
  )
}
