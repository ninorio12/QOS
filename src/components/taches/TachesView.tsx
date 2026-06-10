'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, AlertTriangle, Trash2, Check, MessageSquare, Send, User, Pencil, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import Select from '@/components/ui/Select'
import { AGENT_PROFILES } from '@/components/agentic/agentProfiles'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCoarsePointer } from '@/hooks/useCoarsePointer'

type Comment = { authorType: string; authorId: string; authorName?: string; authorAvatar?: string; text: string; at: string }
type Task = {
  id: string; title: string; description?: string; status: string; priority: string
  assigneeType: string; assigneeId?: string; source: string; order?: number
  comments?: Comment[]
  createdBy: string; createdAt: string; updatedAt: string
}

const COLUMNS = [
  { id: 'todo',        label: 'À faire',  color: '#6B7280' },
  { id: 'in_progress', label: 'En cours', color: '#3462EE' },
  { id: 'human',       label: 'Bloqué',   color: '#D97706' },
  { id: 'history',     label: 'Historique', color: '#9CA3AF' },
]
// Colonne → statut persisté (le drop met à jour le statut)
const COL_STATUS: Record<string, string> = { todo: 'todo', in_progress: 'in_progress', human: 'blocked', history: 'done' }
function columnOf(status: string): string {
  if (status === 'done' || status === 'cancelled') return 'history'
  if (status === 'blocked') return 'human'
  if (status === 'in_progress') return 'in_progress'
  return 'todo'
}

const AGENT_BY_NAME: Record<string, { avatar?: string }> = Object.fromEntries(AGENT_PROFILES.map(a => [a.name, a]))
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ0-9]/.test(w[0] ?? ''))
  const ini = ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
  return ini || (name.replace(/[^a-zA-Z0-9]/g, '')[0] ?? '?').toUpperCase()
}

// Badge minimaliste : avatar de l'agent (img) ou pastille d'initiales pour les profils.
function AssigneeBadge({ type, name }: { type: string; name: string }) {
  if (type === 'agent') {
    const av = AGENT_BY_NAME[name]?.avatar
    return av
      ? <img src={av} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
      : <span className="w-4 h-4 rounded bg-soren-elevated flex items-center justify-center text-[7px] font-bold text-soren-muted flex-shrink-0">{initials(name)}</span>
  }
  return name
    ? <span className="w-4 h-4 rounded-full bg-[#3462EE]/12 text-[#3462EE] flex items-center justify-center text-[7px] font-bold flex-shrink-0">{initials(name)}</span>
    : <span className="w-4 h-4 rounded-full bg-soren-elevated flex items-center justify-center flex-shrink-0"><User size={9} className="text-soren-muted" /></span>
}
// Avatar rond générique (image ou pastille d'initiales) — utilisé pour les commentaires.
function RoundAvatar({ type, name, avatar, size = 16 }: { type: string; name: string; avatar?: string; size?: number }) {
  const img = avatar || (type === 'agent' ? AGENT_BY_NAME[name]?.avatar : undefined)
  if (img) return <img src={img} alt="" className="rounded-full object-cover flex-shrink-0 border border-soren-border" style={{ width: size, height: size }} />
  const cls = type === 'agent' ? 'bg-soren-elevated text-soren-muted' : 'bg-[#3462EE]/12 text-[#3462EE]'
  return <span className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${cls}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>{initials(name || '?')}</span>
}
function commenterName(c: Comment): string {
  return c.authorName || (c.authorId?.includes(':') ? c.authorId.split(':')[1] : c.authorId) || 'Anonyme'
}
// Commentateurs uniques (plus récents d'abord) pour l'affichage sur la card.
function uniqueCommenters(comments?: Comment[]): Comment[] {
  const seen = new Set<string>(); const out: Comment[] = []
  for (const c of [...(comments ?? [])].reverse()) { const k = commenterName(c); if (!seen.has(k)) { seen.add(k); out.push(c) } }
  return out
}

function AssigneeChip({ t }: { t: Task }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold pl-0.5 pr-1.5 py-0.5 rounded-full bg-soren-elevated text-soren-muted">
      <AssigneeBadge type={t.assigneeType} name={t.assigneeId ?? ''} />
      {t.assigneeId || (t.assigneeType === 'agent' ? 'Agent' : 'Non assigné')}
    </span>
  )
}

// ── Options dropdown : profils VividFlow (humains) + agents — libellés propres, sans emoji.
function useAssigneeOptions() {
  const users = (useQuery(api.users.list, {}) ?? []) as { id: string; name: string }[]
  return useMemo(() => [
    ...users.map(u => ({ value: `human:${u.name}`, label: u.name })),
    ...AGENT_PROFILES.map(a => ({ value: `agent:${a.name}`, label: a.name })),
  ], [users])
}
function parseAssignee(v: string): { assigneeType: string; assigneeId: string } {
  const i = v.indexOf(':')
  return { assigneeType: v.slice(0, i), assigneeId: v.slice(i + 1) }
}

// ── Contenu visuel d'une card (réutilisé dans la colonne + le DragOverlay)
function CardBody({ t, onValidate, overlay = false }: { t: Task; onValidate?: (e: React.MouseEvent) => void; overlay?: boolean }) {
  const done = t.status === 'done' || t.status === 'cancelled'
  return (
    <div className={`relative bg-soren-card border rounded-lg p-2.5 pl-7 flex flex-col gap-1 select-none
      ${overlay ? 'border-[#FF4D00] shadow-lg rotate-1 cursor-grabbing' : 'border-soren-border hover:border-[#C8CBD0] hover:shadow-sm'}`}>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onValidate}
        title={done ? 'Restaurer' : 'Valider'}
        className={`absolute top-2.5 left-2 w-4 h-4 rounded-full flex items-center justify-center transition-colors
          ${done ? 'bg-[#16A34A] text-white' : 'border-[1.5px] border-[#C8CBD0] text-transparent hover:border-[#16A34A] hover:text-[#16A34A]'}`}>
        <Check size={10} strokeWidth={3} />
      </button>
      <p className={`text-[11px] font-normal text-soren-text leading-snug line-clamp-2 ${done ? 'line-through text-soren-subtle' : ''}`}>{t.title}</p>
      {t.description && <p className="text-[10px] text-soren-muted leading-snug line-clamp-2">{t.description}</p>}
      <div className="flex items-center gap-1">
        <AssigneeChip t={t} />
        {t.priority === 'urgent' && !done && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]"><AlertTriangle size={9} /> Urgent</span>
        )}
        {/* Avatars des commentateurs — en bas à droite */}
        {(t.comments?.length ?? 0) > 0 && (
          <span className="ml-auto flex items-center -space-x-1.5 pl-1" title={`${t.comments!.length} commentaire(s)`}>
            {uniqueCommenters(t.comments).slice(0, 3).map((c, i) => (
              <RoundAvatar key={i} type={c.authorType} name={commenterName(c)} avatar={c.authorAvatar} size={15} />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Card triable (dnd-kit)
function SortableTaskCard({ t, onOpen, onValidate, wasDragged, onMove, canPrev = false, canNext = false }: { t: Task; onOpen: () => void; onValidate: (e: React.MouseEvent) => void; wasDragged: React.MutableRefObject<boolean>; onMove?: (t: Task, dir: number) => void; canPrev?: boolean; canNext?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({ id: t.id, transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' } })
  const coarse = useCoarsePointer()
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div ref={setNodeRef} {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}>
      <div {...(coarse ? {} : listeners)} onClick={() => { if (!wasDragged.current) onOpen() }} className="md:cursor-grab md:active:cursor-grabbing">
        <CardBody t={t} onValidate={onValidate} />
      </div>
      {/* déplacer entre colonnes — mobile (au doigt) */}
      {onMove && (
        <div className="md:hidden flex items-center gap-1.5 mt-1">
          <button type="button" disabled={!canPrev} onPointerDown={stop} onClick={e => { stop(e); onMove(t, -1) }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-soren-card border border-soren-border text-[11px] font-semibold text-soren-muted disabled:opacity-30"><ChevronLeft size={13} /> Colonne</button>
          <button type="button" disabled={!canNext} onPointerDown={stop} onClick={e => { stop(e); onMove(t, 1) }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-soren-card border border-soren-border text-[11px] font-semibold text-soren-muted disabled:opacity-30">Colonne <ChevronRight size={13} /></button>
        </div>
      )}
    </div>
  )
}

// ── Colonne droppable
function Column({ col, tasks, isOver, onOpen, onValidate, wasDragged, mobileActive = true, colIndex = 0, colCount = 1, onMove }: {
  col: typeof COLUMNS[number]; tasks: Task[]; isOver: boolean
  onOpen: (t: Task) => void; onValidate: (t: Task, e: React.MouseEvent) => void; wasDragged: React.MutableRefObject<boolean>
  mobileActive?: boolean; colIndex?: number; colCount?: number; onMove?: (t: Task, dir: number) => void
}) {
  const { setNodeRef } = useDroppable({ id: col.id })
  return (
    <div className={`${mobileActive ? 'flex w-full' : 'hidden md:flex'} flex-col md:w-56 flex-shrink-0`}>
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
        <span className="text-[11px] font-bold text-soren-text leading-tight">{col.label}</span>
        <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 flex flex-col gap-1.5 rounded-xl p-1.5 overflow-y-auto transition-colors min-h-[120px] ${isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.03]'} ${col.id === 'history' ? 'opacity-90' : ''}`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <SortableTaskCard key={t.id} t={t} onOpen={() => onOpen(t)} onValidate={e => onValidate(t, e)} wasDragged={wasDragged} onMove={onMove} canPrev={colIndex > 0} canNext={colIndex < colCount - 1} />)}
        </SortableContext>
        {tasks.length === 0 && <p className="text-[10px] text-soren-subtle text-center py-5">—</p>}
      </div>
    </div>
  )
}

// ── Fiche simple : création (task=null) ou édition.
function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const create = useMutation(api.osTasks.create)
  const update = useMutation(api.osTasks.update)
  const removeT = useMutation(api.osTasks.remove)
  const addComment = useMutation(api.osTasks.addComment)
  const editComment = useMutation(api.osTasks.editComment)
  const deleteComment = useMutation(api.osTasks.deleteComment)
  const assigneeOptions = useAssigneeOptions()
  const { me } = useCurrentUser()
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [assignee, setAssignee] = useState(task ? `${task.assigneeType}:${task.assigneeId ?? ''}` : '')
  const [urgent, setUrgent] = useState(task?.priority === 'urgent')
  const [comment, setComment] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  function postComment() {
    if (!comment.trim() || !task) return
    addComment({ id: task.id as never, authorType: 'human', authorId: me?.name || 'Moi', authorName: me?.name || 'Moi', authorAvatar: me?.avatarUrl || undefined, text: comment.trim() })
    setComment('')
  }
  function saveEdit(i: number) {
    if (!task) return
    const v = editText.trim()
    if (v) editComment({ id: task.id as never, index: i, text: v })
    setEditIdx(null); setEditText('')
  }

  useEffect(() => setMounted(true), [])
  useEffect(() => { if (!task && !assignee && assigneeOptions.length) setAssignee(assigneeOptions[0].value) }, [assigneeOptions, assignee, task])

  function save() {
    if (!title.trim()) return
    const a = assignee ? parseAssignee(assignee) : { assigneeType: 'human', assigneeId: '' }
    const fields = { title: title.trim(), description: description.trim() || undefined, assigneeType: a.assigneeType, assigneeId: a.assigneeId || undefined, priority: urgent ? 'urgent' : 'normal' }
    if (task) update({ id: task.id as never, ...fields }); else create(fields)
    onClose()
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="px-6 py-4 border-b border-soren-border flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-soren-text">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={14} className="text-soren-muted" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Titre</span>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }}
              placeholder="Titre de la tâche…" className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[13px] font-semibold text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Description</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={240}
              placeholder="Courte description (optionnel)…" className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none resize-none leading-relaxed" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Assigné à</span>
            <Select value={assignee} onChange={setAssignee} options={assigneeOptions} placeholder="Assigner à…" className="w-full" />
          </label>
          <button onClick={() => setUrgent(u => !u)}
            className={`self-start inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${urgent ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
            <AlertTriangle size={12} /> Urgent
          </button>

          {task && (
            <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-soren-border">
              <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle flex items-center gap-1"><MessageSquare size={11} /> Commentaires</span>
              {(task.comments ?? []).map((c, i) => (
                <div key={i} className="group/c bg-soren-elevated rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <RoundAvatar type={c.authorType} name={commenterName(c)} avatar={c.authorAvatar} size={18} />
                    <span className="text-[11px] font-semibold text-soren-text">{commenterName(c)}</span>
                    <span className="text-[9px] text-soren-subtle">{new Date(c.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="ml-auto flex items-center gap-1 opacity-0 group-hover/c:opacity-100 transition-opacity">
                      <button onClick={() => { setEditIdx(i); setEditText(c.text) }} title="Modifier" className="text-soren-subtle hover:text-soren-text"><Pencil size={11} /></button>
                      <button onClick={() => deleteComment({ id: task.id as never, index: i })} title="Supprimer" className="text-soren-subtle hover:text-[#DC2626]"><Trash2 size={11} /></button>
                    </span>
                  </div>
                  {editIdx === i ? (
                    <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(i); if (e.key === 'Escape') { setEditIdx(null); setEditText('') } }}
                      onBlur={() => saveEdit(i)}
                      className="w-full mt-1 bg-soren-card border border-soren-border rounded-lg px-2 py-1 text-[12px] text-soren-text outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
                  ) : (
                    <p className="text-[12px] text-soren-text mt-1 pl-[24px]">{c.text}</p>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') postComment() }}
                  placeholder="Ajouter un commentaire…" className="flex-1 bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text outline-none" />
                <button onClick={postComment} className="w-8 h-8 rounded-xl bg-[#FF4D00] text-white flex items-center justify-center flex-shrink-0"><Send size={13} /></button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-soren-border flex items-center justify-between gap-3">
          {task ? (
            <button onClick={() => { removeT({ id: task.id as never }); onClose() }} className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-[#DC2626]"><Trash2 size={12} /> Supprimer</button>
          ) : <span />}
          <button onClick={save} disabled={!title.trim()}
            className="flex items-center gap-1.5 bg-[#FF4D00] text-white text-[12px] font-semibold px-5 py-2 rounded-full hover:bg-[#e64500] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {task ? <><Save size={13} /> Enregistrer</> : <><Plus size={13} /> Créer</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function TachesView() {
  const remoteTasks = (useQuery(api.osTasks.list, {}) ?? []) as Task[]
  const update = useMutation(api.osTasks.update)
  const [local, setLocal] = useState<Task[]>([])
  const draggingRef = useRef(false)
  const wasDragged = useRef(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [agent, setAgent] = useState<string>('all')
  const [mobileCol, setMobileCol] = useState<string>(COLUMNS[0].id)  // colonne affichée sur mobile
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  // Mirror live data → local (sauf pendant un drag, pour ne pas écraser l'optimiste)
  useEffect(() => { if (!draggingRef.current) setLocal(remoteTasks) }, [remoteTasks])

  const editTask = local.find(t => t.id === editId) ?? null
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('task')) setEditId(p.get('task'))
    const asg = p.get('assignee')
    if (asg && AGENT_PROFILES.some(a => a.name === asg)) setAgent(asg)
  }, [])

  const boardTasks = useMemo(() => {
    if (agent === 'all') return local
    return local.filter(t => (t.assigneeId ?? '').toLowerCase().includes(agent.toLowerCase()))
  }, [local, agent])

  const byCol = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const c of COLUMNS) m[c.id] = []
    for (const t of boardTasks) m[columnOf(t.status)].push(t)
    for (const c of COLUMNS) m[c.id].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
    return m
  }, [boardTasks])

  function validate(t: Task, e: React.MouseEvent) {
    e.stopPropagation()
    update({ id: t.id as never, status: (t.status === 'done' || t.status === 'cancelled') ? 'todo' : 'done' })
  }

  function handleDragStart({ active }: DragStartEvent) { setActiveId(active.id as string); wasDragged.current = true; draggingRef.current = true }
  function handleDragOver({ over }: DragOverEvent) {
    if (!over) { setOverCol(null); return }
    const oid = over.id as string
    setOverCol(COLUMNS.some(c => c.id === oid) ? oid : columnOf(local.find(t => t.id === oid)?.status ?? 'todo'))
  }
  // Déplacer une tâche d'une colonne (sans drag) — mobile
  function moveTask(t: Task, dir: number) {
    const idx = COLUMNS.findIndex(c => c.id === columnOf(t.status))
    const target = COLUMNS[idx + dir]
    if (!target) return
    const targetStatus = COL_STATUS[target.id]
    setLocal(prev => prev.map(x => x.id === t.id ? { ...x, status: targetStatus } : x))
    update({ id: t.id as never, status: targetStatus })
    setMobileCol(target.id)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null); setOverCol(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    setTimeout(() => { draggingRef.current = false }, 600)
    if (!over) return
    const id = active.id as string
    const overId = over.id as string
    const moved = local.find(t => t.id === id)
    if (!moved) return

    const targetCol = COLUMNS.some(c => c.id === overId) ? overId : columnOf(local.find(t => t.id === overId)?.status ?? 'todo')
    const targetStatus = COL_STATUS[targetCol]

    // Position cible (ordre fractionnaire) dans la colonne de destination
    const colList = byCol[targetCol].filter(t => t.id !== id)
    let idx = colList.length
    if (!COLUMNS.some(c => c.id === overId)) { const k = colList.findIndex(t => t.id === overId); if (k >= 0) idx = k }
    const above = colList[idx - 1]?.order
    const below = colList[idx]?.order
    let newOrder: number
    if (above != null && below != null) newOrder = (above + below) / 2
    else if (below != null) newOrder = below + 1000
    else if (above != null) newOrder = above - 1000
    else newOrder = Date.now()

    if (columnOf(moved.status) === targetCol && (moved.order ?? 0) === newOrder) return
    setLocal(prev => prev.map(t => t.id === id ? { ...t, status: targetStatus, order: newOrder } : t))
    update({ id: id as never, status: targetStatus, order: newOrder })
  }

  const activeTask = local.find(t => t.id === activeId) ?? null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-2.5 flex-shrink-0 flex items-center gap-2">
        <button onClick={() => setCreating(true)}
          className="ml-auto flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-[#e64500] transition-colors"><Plus size={13} /> Nouvelle tâche</button>
      </div>

      <div className="px-6 pb-3 flex-shrink-0 flex items-center gap-1.5 flex-wrap">
        {['all', ...AGENT_PROFILES.map(a => a.name)].map(name => (
          <button key={name} onClick={() => setAgent(name)}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${agent === name ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
            {name === 'all' ? 'Tous' : name}
          </button>
        ))}
      </div>

      {/* Sélecteur de colonne — mobile */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto px-3 pb-2.5 flex-shrink-0 kanban-scroll">
        {COLUMNS.map(c => {
          const on = c.id === mobileCol
          return (
            <button key={c.id} onClick={() => setMobileCol(c.id)}
              className={`flex-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${on ? 'bg-[#FF4D00] border-[#FF4D00]' : 'bg-soren-card border-soren-border'}`}>
              <span className={`text-[11px] font-semibold whitespace-nowrap ${on ? 'text-white' : 'text-soren-muted'}`}>{c.label}</span>
              <span className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full ${on ? 'bg-white/25 text-white' : 'bg-soren-elevated text-soren-subtle'}`}>{(byCol[c.id] ?? []).length}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-x-auto px-3 md:px-6 pb-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full md:min-w-max">
            {COLUMNS.map((c, ci) => (
              <Column key={c.id} col={c} tasks={byCol[c.id] ?? []} isOver={overCol === c.id}
                onOpen={t => setEditId(t.id)} onValidate={validate} wasDragged={wasDragged} mobileActive={c.id === mobileCol}
                colIndex={ci} colCount={COLUMNS.length} onMove={moveTask} />
            ))}
          </div>
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay>{activeTask && <CardBody t={activeTask} overlay />}</DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>

      {creating && <TaskModal task={null} onClose={() => setCreating(false)} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditId(null)} />}
    </div>
  )
}
