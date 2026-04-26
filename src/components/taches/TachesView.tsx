'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Circle, Clock, AlertTriangle, CheckCircle2, AlertCircle, Plus, X, History } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type ColId     = 'todo' | 'inprogress' | 'error' | 'done' | 'archived'
type AgentId   = 'soren' | 'kai' | 'mia'
type FilterTab = 'all' | 'human'

type Task = {
  id: string
  title: string
  agent: AgentId
  col: ColId
  human?: boolean
  created_at: string
}

// ─── Static meta ──────────────────────────────────────────────
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren: { label: 'Soren', color: '#4A91A8', bg: '#4A91A815' },
  kai:   { label: 'Kai',   color: '#1A5C38', bg: '#1A5C3815' },
  mia:   { label: 'Mia',   color: '#E8836A', bg: '#E8836A15' },
}

type ColMeta = { label: string; icon: React.ElementType; iconColor: string; color: string; muted?: boolean }
const COLS: Record<ColId, ColMeta> = {
  todo:       { label: 'À FAIRE',    icon: Circle,        iconColor: '#8896AB', color: '#8896AB' },
  inprogress: { label: 'EN COURS',   icon: Clock,         iconColor: '#D4A017', color: '#D4A017' },
  error:      { label: 'ERREUR',     icon: AlertTriangle, iconColor: '#EF4444', color: '#EF4444' },
  done:       { label: 'TERMINÉ',    icon: CheckCircle2,  iconColor: '#22c55e', color: '#22c55e' },
  archived:   { label: 'HISTORIQUE', icon: History,       iconColor: '#C8CBD0', color: '#C8CBD0', muted: true },
}
const COL_ORDER: ColId[] = ['todo', 'inprogress', 'error', 'done', 'archived']

const AGENTS_FILTER: { id: AgentId | 'all'; label: string }[] = [
  { id: 'all',   label: 'Tous' },
  { id: 'soren', label: 'Soren' },
  { id: 'kai',   label: 'Kai' },
  { id: 'mia',   label: 'Mia' },
]

// ─── Add task modal ───────────────────────────────────────────
function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, agent: AgentId) => void }) {
  const [title,  setTitle]  = useState('')
  const [agent,  setAgent]  = useState<AgentId>('kai')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onAdd(title.trim(), agent)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
      <div className="bg-soren-card rounded-2xl shadow-2xl p-5 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-soren-text">Nouvelle tâche</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-soren-elevated flex items-center justify-center">
            <X size={13} className="text-soren-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre de la tâche…"
            className="w-full bg-soren-elevated rounded-xl px-3 py-2.5 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#4A91A8]/30"
          />
          <div className="flex gap-2">
            {(['soren', 'kai', 'mia'] as AgentId[]).map(a => {
              const m = AGENT_META[a]
              return (
                <button key={a} type="button" onClick={() => setAgent(a)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={agent === a
                    ? { background: m.bg, color: m.color, border: `1px solid ${m.color}40` }
                    : { background: '#F5F5F0', color: '#6B7280', border: '1px solid transparent' }
                  }
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          <button type="submit" disabled={saving || !title.trim()}
            className="bg-soren-sidebar disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#2a2a2a] transition-colors"
          >
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────
function TaskCard({ task, onMove, onSelect }: { task: Task; onMove: (id: string, col: ColId) => void; onSelect: (task: Task) => void }) {
  const agent    = AGENT_META[task.agent]
  const col      = COLS[task.col]
  const ColIcon  = col.icon
  const date     = new Date(task.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  const archived = task.col === 'archived'

  const nextCol: Record<ColId, ColId | null> = {
    todo: 'inprogress', inprogress: 'done', error: 'todo', done: 'archived', archived: null,
  }
  const nextLabel: Partial<Record<ColId, string>> = { done: 'Archiver' }

  return (
    <div
      onClick={() => onSelect(task)}
      className={`border rounded-lg px-3 py-2 flex flex-col gap-1 select-none transition-all group cursor-pointer ${
      archived
        ? 'bg-[#F9FAFB] border-soren-border opacity-60'
        : 'bg-soren-card border-soren-border hover:border-[#C8CBD0] hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-semibold leading-tight flex-1 ${archived ? 'text-soren-subtle line-through' : 'text-soren-text'}`}>
          {task.title}
        </p>
        <span className="text-[10px] text-soren-subtle shrink-0">{date}</span>
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <ColIcon size={10} className="flex-shrink-0" style={{ color: archived ? '#C8CBD0' : col.iconColor }} />
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-[64px]"
            style={archived
              ? { color: '#9CA3AF', background: '#F3F4F6' }
              : { color: agent.color, background: agent.bg }
            }>
            {agent.label}
          </span>
          {task.human && !archived && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] shrink-0">
              <AlertCircle size={8} />
              Intervention
            </span>
          )}
        </div>
        {nextCol[task.col] && (
          <button
            onClick={() => onMove(task.id, nextCol[task.col]!)}
            className="text-[9px] font-medium text-soren-subtle opacity-0 group-hover:opacity-100 transition-all shrink-0 hover:text-[#4A91A8]"
          >
            {nextLabel[task.col] ?? '→'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────
function KanbanCol({ colId, tasks, onMove, onSelect }: { colId: ColId; tasks: Task[]; onMove: (id: string, col: ColId) => void; onSelect: (task: Task) => void }) {
  const meta   = COLS[colId]
  const Icon   = meta.icon
  const muted  = meta.muted === true

  return (
    <div className="flex flex-col w-56 flex-shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Icon size={13} style={{ color: meta.iconColor }} />
        <span className={`text-[11px] font-semibold truncate ${muted ? 'text-[#C8CBD0]' : 'text-[#374151]'}`}>
          {meta.label}
        </span>
        <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full min-w-[16px] text-center ml-auto ${
          muted ? 'bg-[#F3F4F6] border-soren-border text-[#C8CBD0]' : 'bg-soren-card border-soren-border text-soren-muted shadow-sm'
        }`}>
          {tasks.length}
        </span>
      </div>

      {/* Body */}
      <div className={`flex-1 flex flex-col rounded-xl p-2 overflow-hidden ${
        muted ? 'bg-black/[0.02] border border-dashed border-soren-border' : 'bg-black/[0.04]'
      }`}>
        <div className="flex-1 min-h-0 overflow-y-auto kanban-col flex flex-col gap-1.5">
          {tasks.map(t => <TaskCard key={t.id} task={t} onMove={onMove} onSelect={onSelect} />)}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className={`text-[11px] ${muted ? 'text-[#D1D5DB]' : 'text-soren-subtle'}`}>Aucune tâche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Types logs ───────────────────────────────────────────────
type AgentLog = {
  id: string
  agent: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  tool_used: string | null
  created_at: string
}

const LOG_LEVEL_COLOR: Record<string, string> = {
  info: '#8896AB', success: '#22c55e', warning: '#F59E0B', error: '#EF4444',
}

// ─── Log drawer ───────────────────────────────────────────────
function LogDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agent-logs?taskId=${task.id}&limit=50`)
      .then(r => r.json())
      .then((d: { logs: AgentLog[] }) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [task.id])

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-soren-card border-l border-soren-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE] flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-soren-text truncate">{task.title}</p>
          <p className="text-[10px] text-soren-subtle mt-0.5">Logs d&apos;exécution</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-soren-elevated flex items-center justify-center ml-2 flex-shrink-0">
          <X size={13} className="text-soren-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-soren-subtle">Chargement…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-soren-subtle">Aucun log pour cette tâche</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {logs.map((log, i) => (
              <div key={log.id} className="relative px-4 py-2.5 border-b border-[#F9FAFB] last:border-0">
                {/* Timeline dot */}
                <div className="absolute left-4 top-3.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: LOG_LEVEL_COLOR[log.level] ?? '#8896AB' }} />
                {i < logs.length - 1 && (
                  <div className="absolute left-[18px] top-5 bottom-0 w-px bg-[#F3F4F6]" />
                )}
                <div className="pl-4">
                  <p className="text-[11px] text-[#374151] leading-tight">{log.message}</p>
                  {log.tool_used && (
                    <p className="text-[9px] font-mono text-soren-subtle mt-0.5">{log.tool_used}</p>
                  )}
                  <p className="text-[9px] text-[#C8CBD0] mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function TachesView() {
  const [tabFilter,   setTabFilter]   = useState<FilterTab>('all')
  const [agentFilter, setAgentFilter] = useState<AgentId | 'all'>('all')
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [scrolled,    setScrolled]    = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  // ── Same smooth scroll logic as Pipeline ──
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    let target = el.scrollLeft
    let raf: number | null = null

    function animate() {
      if (!el) return
      const diff = target - el.scrollLeft
      if (Math.abs(diff) < 0.5) { el.scrollLeft = target; raf = null; return }
      el.scrollLeft += diff * 0.12
      raf = requestAnimationFrame(animate)
    }

    const onWheel = (e: WheelEvent) => {
      const evTarget = e.target as Element
      const col = evTarget.closest('.kanban-col') as HTMLElement | null
      if (col && col.scrollHeight > col.clientHeight) {
        const goingDown = e.deltaY > 0
        const atBottom  = col.scrollTop + col.clientHeight >= col.scrollHeight - 1
        const atTop     = col.scrollTop <= 0
        if ((goingDown && !atBottom) || (!goingDown && !atTop)) return
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target + e.deltaY))
      if (!raf) raf = requestAnimationFrame(animate)
    }

    const onScroll = () => setScrolled(el.scrollLeft > 10)

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res  = await fetch('/api/tasks')
      const data = await res.json() as { tasks: Task[] }
      setTasks(data.tasks.length > 0 ? data.tasks : SEED_TASKS)
    } catch {
      setTasks(SEED_TASKS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchTasks() }, [fetchTasks])

  async function addTask(title: string, agent: AgentId) {
    const optimistic: Task = { id: `opt-${Date.now()}`, title, agent, col: 'todo', human: false, created_at: new Date().toISOString() }
    setTasks(prev => [optimistic, ...prev])
    try {
      const res  = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, agent }) })
      const data = await res.json() as { task?: Task }
      if (data.task) setTasks(prev => prev.map(t => t.id === optimistic.id ? data.task! : t))
    } catch { /* keep optimistic */ }
  }

  async function moveTask(id: string, col: ColId) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, col } : t))
    try {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, col }) })
    } catch { /* keep optimistic */ }
  }

  const filtered = useMemo(() => {
    let t = tasks
    if (tabFilter === 'human') t = t.filter(x => x.human)
    if (agentFilter !== 'all') t = t.filter(x => x.agent === agentFilter)
    return t
  }, [tasks, tabFilter, agentFilter])

  const humanCount = tasks.filter(t => t.human).length
  const doneToday  = tasks.filter(t => t.col === 'done').length
  const errorCount = tasks.filter(t => t.col === 'error').length

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <div>
          <h1 className="text-2xl font-black text-soren-text leading-none">Tâches</h1>
          <p className="text-xs text-soren-muted mt-1">Suivez l'activité de vos agents en temps réel</p>
        </div>

        <div className="flex items-center gap-3">
          {/* KPI chips */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-medium text-soren-subtle">Total</span>
              <span className="text-sm font-bold text-soren-text">{tasks.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-xl px-3 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0" />
              <span className="text-[10px] font-medium text-soren-subtle">Terminées</span>
              <span className="text-sm font-bold text-soren-text">{doneToday}</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-xl px-3 py-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                <span className="text-[10px] font-medium text-soren-subtle">Erreurs</span>
                <span className="text-sm font-bold text-soren-text">{errorCount}</span>
              </div>
            )}
          </div>

          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-soren-sidebar hover:bg-[#222] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={13} />
            Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-6 pb-3 flex-shrink-0" style={{ animation: 'fadeSlideUp 400ms ease-out 70ms both' }}>
        <div className="flex gap-1">
          <button onClick={() => setTabFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              tabFilter === 'all' ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text hover:bg-soren-card'
            }`}
          >
            Tous
          </button>
          <button onClick={() => setTabFilter('human')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              tabFilter === 'human' ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text hover:bg-soren-card'
            }`}
          >
            <Clock size={11} />
            Intervention humaine
            {humanCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                {humanCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-1 bg-black/5 rounded-xl p-1">
          {AGENTS_FILTER.map(a => (
            <button key={a.id} onClick={() => setAgentFilter(a.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                agentFilter === a.id ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex flex-col gap-2 px-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-soren-card rounded-xl px-4 py-3 border border-soren-border">
              <div className="w-4 h-4 rounded bg-[#E5E7EB] flex-shrink-0" />
              <div className="flex-1">
                <div className="h-2.5 bg-[#D9DDD6] rounded mb-1.5" style={{ width: `${50 + (i * 17) % 35}%` }} />
                <div className="h-2 bg-[#E5E7EB] rounded" style={{ width: `${30 + (i * 11) % 25}%` }} />
              </div>
              <div className="h-5 w-16 bg-[#E5E7EB] rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          {/* Left fade mask */}
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-4 w-8 z-10 transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to right, var(--bg-app) 40%, transparent)' }}
          />
          {/* Right fade mask */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-4 w-8 z-10"
            style={{ background: 'linear-gradient(to left, var(--bg-app) 40%, transparent)' }}
          />
          <div ref={boardRef} className="flex gap-4 overflow-x-auto px-6 pb-4 items-stretch h-full">
            {COL_ORDER.map(colId => (
              <KanbanCol key={colId} colId={colId}
                tasks={filtered.filter(t => t.col === colId)}
                onMove={moveTask}
                onSelect={setSelectedTask}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTask && <LogDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onAdd={addTask} />}
    </div>
  )
}

// ─── Seed fallback ────────────────────────────────────────────
const SEED_TASKS: Task[] = [
  { id: 't1',  title: 'Qualifier lead Martin Dupont — Réno Pro',  agent: 'kai',   col: 'inprogress', created_at: '2026-04-05T10:30:00Z' },
  { id: 't2',  title: 'Envoyer devis façade — Thomas Bernard',    agent: 'mia',   col: 'todo',       created_at: '2026-04-05T09:15:00Z' },
  { id: 't3',  title: 'Relancer Xavier Lambert — XL BTP',         agent: 'kai',   col: 'todo',       created_at: '2026-04-04T16:00:00Z' },
  { id: 't4',  title: 'Analyser pipeline ACQUISITION',            agent: 'soren', col: 'done',       created_at: '2026-04-04T10:45:00Z' },
  { id: 't5',  title: 'Générer rapport hebdo Telegram',           agent: 'soren', col: 'done',       created_at: '2026-04-04T08:00:00Z' },
  { id: 't6',  title: 'Créer fiche contact Didier Fabre',         agent: 'mia',   col: 'done',       created_at: '2026-04-03T14:20:00Z' },
  { id: 't7',  title: 'Appel Vapi Martin Dupont — non joignable', agent: 'kai',   col: 'error', human: true, created_at: '2026-04-05T10:42:00Z' },
  { id: 't8',  title: 'Synchroniser Knowledge Base — 47 fiches',  agent: 'mia',   col: 'inprogress', created_at: '2026-04-05T09:50:00Z' },
  { id: 't9',  title: 'RDV confirmé — Inès Duprez 7 avril 14h',   agent: 'soren', col: 'todo',       created_at: '2026-04-05T08:00:00Z' },
  { id: 't10', title: 'Archiver leads perdus mars 2026',          agent: 'mia',   col: 'todo',       created_at: '2026-04-05T07:30:00Z' },
  { id: 't11', title: 'Webhook Meta Ads — test leads entrants',   agent: 'soren', col: 'inprogress', created_at: '2026-04-05T11:00:00Z' },
]
