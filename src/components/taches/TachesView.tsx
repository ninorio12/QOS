'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DndContext, DragOverlay, closestCenter,
  useDroppable, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, AlertTriangle, Trash2, Check, MessageSquare, Send, User, Pencil, Save, ChevronLeft, ChevronRight, Target, RotateCcw, ExternalLink } from 'lucide-react'
import Select from '@/components/ui/Select'
import { AGENT_PROFILES } from '@/components/agentic/agentProfiles'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useKanbanSensors } from '@/hooks/useKanbanSensors'

type Comment = { authorType: string; authorId: string; authorName?: string; authorAvatar?: string; text: string; at: string }
type Task = {
  id: string; title: string; description?: string; objective?: string; status: string; priority: string
  assigneeType: string; assigneeId?: string; source: string; order?: number
  linkedClientId?: string
  objectiveAchieved?: boolean; completionNote?: string; completedAt?: string; archivedAt?: string
  comments?: Comment[]
  createdBy: string; createdAt: string; updatedAt: string
}

// Une tâche validée reste dans la colonne « Validé » HISTORY_DAYS jours, puis bascule dans la table Historique.
const HISTORY_DAYS = 5
function isRecentDone(t: Task): boolean {
  const ts = t.completedAt ?? t.updatedAt
  if (!ts) return true
  return (Date.now() - new Date(ts).getTime()) < HISTORY_DAYS * 86_400_000
}
// Une tâche est dans l'Historique si elle a été archivée explicitement, OU validée depuis plus de HISTORY_DAYS jours.
function isHistory(t: Task): boolean {
  if (t.archivedAt) return true
  return (t.status === 'done' || t.status === 'cancelled') && !isRecentDone(t)
}

const COLUMNS = [
  { id: 'todo',        label: 'À faire',  color: '#6B7280' },
  { id: 'in_progress', label: 'En cours', color: '#3462EE' },
  { id: 'urgent',      label: 'Urgent',   color: '#DC2626' },
  { id: 'done',        label: 'Validé',   color: '#16A34A' },
]
// Colonne → statut persisté (le drop met à jour le statut)
const COL_STATUS: Record<string, string> = { todo: 'todo', in_progress: 'in_progress', urgent: 'urgent', done: 'done' }
function columnOf(status: string): string {
  if (status === 'done' || status === 'cancelled') return 'done'
  if (status === 'urgent') return 'urgent'
  if (status === 'in_progress' || status === 'blocked') return 'in_progress'
  return 'todo'
}

const AGENT_BY_NAME: Record<string, { avatar?: string }> = Object.fromEntries(AGENT_PROFILES.map(a => [a.name, a]))
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ0-9]/.test(w[0] ?? ''))
  const ini = ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
  return ini || (name.replace(/[^a-zA-Z0-9]/g, '')[0] ?? '?').toUpperCase()
}

// ── Vue « Par agent » : palette d'accent (style Équipe IA) + résolution du profil ──
type AP = (typeof AGENT_PROFILES)[number]
const AGENT_ACCENT: Record<string, string> = {
  coo: '#FF4D00', 'agent-analyse': '#6366F1', 'agent-support-client': '#1A5C38',
  'agent-operations': '#0F766E', 'agent-kb': '#3462EE', 'agent-media-buyer': '#E8836A', 'agent-debug': '#DC2626',
}
const accentOf = (id: string) => AGENT_ACCENT[id] ?? '#6B7280'
// Lisibilité carte : titre tronqué à N mots (les agents écrivent parfois trop long).
function clampWords(s: string | undefined, n: number): string {
  const w = (s ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length <= n ? (s ?? '').trim() : w.slice(0, n).join(' ') + '…'
}
// L'assigneeId d'une tâche peut être l'id-slug (créée par un agent via MCP) OU le nom (créée dans l'UI) → on résout les deux.
function agentOf(t: Task): AP | null {
  if (t.assigneeType !== 'agent') return null
  const v = (t.assigneeId ?? '').toLowerCase().trim()
  return AGENT_PROFILES.find(a => a.id.toLowerCase() === v || a.name.toLowerCase() === v) ?? null
}
// Avatar agent (image /agents/*.png, fallback pastille couleur + initiales).
function AgentFace({ id, name, avatar, size = 26 }: { id: string; name: string; avatar?: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (avatar && !err) return <img src={avatar} alt="" onError={() => setErr(true)} className="rounded-full object-cover border border-soren-border flex-shrink-0" style={{ width: size, height: size }} />
  return <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: accentOf(id) }}>{initials(name)}</span>
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
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold pl-0.5 pr-1.5 py-0.5 rounded-full bg-soren-elevated text-soren-muted whitespace-nowrap flex-shrink-0 max-w-full">
      <AssigneeBadge type={t.assigneeType} name={t.assigneeId ?? ''} />
      <span className="truncate">{t.assigneeId || (t.assigneeType === 'agent' ? 'Agent' : 'Non assigné')}</span>
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
      <p title={t.title} className={`text-[11px] font-semibold text-soren-text leading-snug truncate ${done ? 'line-through text-soren-subtle' : ''}`}>{clampWords(t.title, 4)}</p>
      {t.description && <p title={t.description} className="text-[10px] text-soren-muted leading-snug line-clamp-3">{t.description}</p>}
      <div className="flex items-center gap-1">
        <AssigneeChip t={t} />
        {t.status === 'urgent' && !done && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]"><AlertTriangle size={9} /> Urgent</span>
        )}
        {t.objective && <span title="Objectif défini" className="flex-shrink-0 inline-flex"><Target size={11} className="text-soren-subtle" /></span>}
        {/* Lien vers la fiche lead/client liée */}
        {t.linkedClientId && (
          <a href={`/contacts/${t.linkedClientId}`} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
            title="Ouvrir la fiche" className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3462EE] hover:bg-[#E0E7FF] transition-colors">
            <ExternalLink size={9} /> Fiche
          </a>
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
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div ref={setNodeRef} {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}>
      <div {...listeners} onClick={() => { if (!wasDragged.current) onOpen() }} className="cursor-grab active:cursor-grabbing">
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
    <div className={`${mobileActive ? 'flex w-full' : 'hidden md:flex'} flex-col md:w-48 flex-shrink-0`}>
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
        <span className="text-[11px] font-bold text-soren-text leading-tight">{col.label}</span>
        <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 flex flex-col gap-1.5 rounded-xl p-1.5 overflow-y-auto transition-colors min-h-[120px] ${isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.03]'} ${col.id === 'done' ? 'opacity-90' : ''}`}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <SortableTaskCard key={t.id} t={t} onOpen={() => onOpen(t)} onValidate={e => onValidate(t, e)} wasDragged={wasDragged} onMove={onMove} canPrev={colIndex > 0} canNext={colIndex < colCount - 1} />)}
        </SortableContext>
        {tasks.length === 0 && <p className="text-[10px] text-soren-subtle text-center py-5">—</p>}
      </div>
    </div>
  )
}

// ── Colonne « par agent » : les tâches d'un agent. Drop d'une carte = réassignation.
function AgentColumn({ agent, tasks, isOver, onOpen, onValidate, wasDragged }: {
  agent: { id: string; name: string; role: string; avatar?: string }; tasks: Task[]; isOver: boolean
  onOpen: (t: Task) => void; onValidate: (t: Task, e: React.MouseEvent) => void; wasDragged: React.MutableRefObject<boolean>
}) {
  const { setNodeRef } = useDroppable({ id: `agentcol:${agent.id}` })
  const accent = accentOf(agent.id)
  const open = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  return (
    <div className="flex flex-col w-48 flex-shrink-0">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <AgentFace id={agent.id} name={agent.name} avatar={agent.avatar} size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-soren-text leading-tight truncate">{agent.name}</p>
          <p className="text-[8px] text-soren-subtle leading-tight truncate">{agent.role}</p>
        </div>
        <span className="text-[8.5px] font-bold text-white px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: accent }}>{open}</span>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 flex flex-col gap-1.5 rounded-xl p-1.5 overflow-y-auto min-h-[120px] transition-colors border-t-2 ${isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.03]'}`}
        style={{ borderTopColor: accent }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <SortableTaskCard key={t.id} t={t} onOpen={() => onOpen(t)} onValidate={e => onValidate(t, e)} wasDragged={wasDragged} />)}
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
  const archive = useMutation(api.osTasks.archive)
  const addComment = useMutation(api.osTasks.addComment)
  const editComment = useMutation(api.osTasks.editComment)
  const deleteComment = useMutation(api.osTasks.deleteComment)
  const assigneeOptions = useAssigneeOptions()
  const { me } = useCurrentUser()
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [objective, setObjective] = useState(task?.objective ?? '')
  const [assignee, setAssignee] = useState(task ? `${task.assigneeType}:${task.assigneeId ?? ''}` : '')
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
    const fields = { title: title.trim(), description: description.trim() || undefined, objective: objective.trim() || undefined, assigneeType: a.assigneeType, assigneeId: a.assigneeId || undefined }
    if (task) update({ id: task.id as never, ...fields }); else create(fields)
    onClose()
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]" style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="px-6 py-4 border-b border-soren-border flex items-center justify-between gap-3 flex-shrink-0">
          <h2 className="text-base font-black text-soren-text">{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={14} className="text-soren-muted" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-3 overflow-y-auto">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Titre</span>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }}
              placeholder="Titre de la tâche…" className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[13px] font-semibold text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle flex items-center gap-1"><Target size={11} className="text-[#FF4D00]" /> Objectif à atteindre</span>
            <input value={objective} onChange={e => setObjective(e.target.value)} maxLength={140}
              placeholder="Résultat concret qui valide la tâche…" className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-soren-text">Description</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={8} maxLength={4000}
              placeholder="Décris la tâche en détail…" className="w-full bg-soren-elevated rounded-xl px-3.5 py-3 text-[13px] text-soren-text placeholder-[#9CA3AF] outline-none resize-y leading-relaxed min-h-[140px]" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Assigné à</span>
            <Select value={assignee} onChange={setAssignee} options={assigneeOptions} placeholder="Assigner à…" className="w-full" />
          </label>

          {task && (task.status === 'done' || task.status === 'cancelled') && task.objectiveAchieved !== undefined && (
            <div className={`rounded-xl px-3 py-2.5 border ${task.objectiveAchieved ? 'bg-[#16A34A]/8 border-[#16A34A]/25' : 'bg-[#DC2626]/8 border-[#DC2626]/25'}`}>
              <p className={`text-[11px] font-bold flex items-center gap-1.5 ${task.objectiveAchieved ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {task.objectiveAchieved ? <><Check size={12} /> Objectif atteint</> : <><X size={12} /> Objectif non atteint</>}
              </p>
              {task.completionNote && <p className="text-[12px] text-soren-text mt-1 leading-relaxed">{task.completionNote}</p>}
            </div>
          )}

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
                    <p className="text-[12px] text-soren-text mt-1 pl-[24px] max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{c.text}</p>
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
        <div className="px-6 py-3 border-t border-soren-border flex items-center justify-between gap-3 flex-shrink-0">
          {task ? (
            <div className="flex items-center gap-3">
              <button onClick={() => { removeT({ id: task.id as never }); onClose() }} className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-[#DC2626]"><Trash2 size={12} /> Supprimer</button>
              {!task.archivedAt && (
                <button onClick={() => { archive({ id: task.id as never }); onClose() }} className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-soren-text"><RotateCcw size={12} /> Archiver</button>
              )}
            </div>
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

// ── Fiche de validation : « l'objectif est-il atteint ? » (au drop sur Validé ou via la coche)
function CompletionModal({ task, onCancel, onConfirm }: { task: Task; onCancel: () => void; onConfirm: (achieved: boolean, note: string) => void }) {
  const [mounted, setMounted] = useState(false)
  const [achieved, setAchieved] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="px-6 py-4 border-b border-soren-border flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-[#16A34A]/12 flex items-center justify-center"><Check size={14} className="text-[#16A34A]" /></span>
          <h2 className="text-base font-black text-soren-text">Valider la tâche</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-semibold text-soren-text">{task.title}</p>
            {task.objective
              ? <p className="text-[11px] text-soren-muted mt-1.5 flex gap-1.5"><Target size={13} className="mt-0.5 flex-shrink-0 text-[#FF4D00]" /> {task.objective}</p>
              : <p className="text-[11px] text-soren-subtle mt-1.5 italic">Aucun objectif défini pour cette tâche.</p>}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-soren-text mb-2">L&apos;objectif est-il atteint ?</p>
            <div className="flex gap-2">
              <button onClick={() => setAchieved(true)} className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${achieved === true ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>Oui</button>
              <button onClick={() => setAchieved(false)} className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${achieved === false ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>Non</button>
            </div>
          </div>
          {achieved !== null && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">{achieved ? 'Qu’avez-vous accompli ?' : 'Qu’est-ce qui reste / pourquoi ?'}</span>
              <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder={achieved ? 'Brève description du résultat…' : 'Optionnel…'}
                className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none resize-none leading-relaxed" />
            </label>
          )}
        </div>
        <div className="px-6 py-3 border-t border-soren-border flex items-center justify-end gap-2">
          <button onClick={onCancel} className="text-[12px] font-semibold text-soren-muted hover:text-soren-text px-3 py-2">Annuler</button>
          <button onClick={() => onConfirm(achieved === true, note.trim())} disabled={achieved === null || (achieved === true && !note.trim())}
            className="flex items-center gap-1.5 bg-[#16A34A] text-white text-[12px] font-semibold px-5 py-2 rounded-full hover:bg-[#15803d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><Check size={13} /> Valider</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Colonne « Historique » : tâches validées il y a plus de 5 jours.
// Même structure qu'une colonne du board (en-tête + zone), mais lecture seule (pas de drop).
function HistoryColumn({ tasks, onOpen, onRestore, mobileActive = true }: { tasks: Task[]; onOpen: (t: Task) => void; onRestore: (t: Task) => void; mobileActive?: boolean }) {
  return (
    <div className={`${mobileActive ? 'flex w-full' : 'hidden md:flex'} flex-col md:w-48 flex-shrink-0`}>
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <span className="w-2 h-2 rounded-full bg-soren-subtle" />
        <span className="text-[11px] font-bold text-soren-text leading-tight">Historique</span>
        <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 rounded-xl p-1.5 overflow-y-auto min-h-[120px] bg-black/[0.03]">
        {tasks.map(t => (
          <div key={t.id} onClick={() => onOpen(t)}
            className="group rounded-lg border border-soren-border bg-black/[0.02] hover:bg-black/[0.04] px-2.5 py-2 cursor-pointer flex flex-col gap-1 transition-colors opacity-90">
            <div className="flex items-start gap-1.5">
              <p className="flex-1 min-w-0 text-[11px] text-soren-text/70 line-through truncate" title={t.title}>{t.title}</p>
              <button onClick={e => { e.stopPropagation(); onRestore(t) }} title="Restaurer dans le board"
                className="flex-shrink-0 text-soren-subtle hover:text-soren-text transition-all opacity-0 group-hover:opacity-100"><RotateCcw size={12} /></button>
            </div>
            <div className="flex items-center gap-2 text-[9.5px]">
              {t.objectiveAchieved === undefined ? <span className="text-soren-subtle">—</span>
                : t.objectiveAchieved ? <span className="inline-flex items-center gap-0.5 text-[#16A34A] font-semibold"><Check size={10} /> Atteint</span>
                : <span className="inline-flex items-center gap-0.5 text-[#DC2626] font-semibold"><X size={10} /> Non atteint</span>}
              <span className="ml-auto text-soren-subtle whitespace-nowrap tabular-nums">{new Date(t.completedAt ?? t.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-[10px] text-soren-subtle text-center py-6">—</p>}
      </div>
    </div>
  )
}

export default function TachesView() {
  // useQuery renvoie undefined pendant le chargement ; `?? []` créait un nouveau tableau
  // à chaque render → l'effet ci-dessous bouclait (Maximum update depth). On mémoïse pour
  // garder une référence stable tant que la donnée ne change pas.
  const remoteTasksRaw = useQuery(api.osTasks.list, {})
  const remoteTasks = useMemo<Task[]>(() => (remoteTasksRaw ?? []) as Task[], [remoteTasksRaw])
  const update = useMutation(api.osTasks.update)
  const unarchive = useMutation(api.osTasks.unarchive)
  const [local, setLocal] = useState<Task[]>([])
  const draggingRef = useRef(false)
  const wasDragged = useRef(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [agent, setAgent] = useState<string>('all')
  const [mobileCol, setMobileCol] = useState<string>(COLUMNS[0].id)  // colonne affichée sur mobile
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [view, setView] = useState<'status' | 'agent'>('status')
  const [overAgentId, setOverAgentId] = useState<string | null>(null)
  const [pendingValidate, setPendingValidate] = useState<Task | null>(null)
  const [pendingOrder, setPendingOrder] = useState<number>(0)

  // Mirror live data → local (sauf pendant un drag, pour ne pas écraser l'optimiste)
  useEffect(() => { if (!draggingRef.current) setLocal(remoteTasks) }, [remoteTasks])

  const editTask = local.find(t => t.id === editId) ?? null
  const sensors = useKanbanSensors()

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
    for (const t of boardTasks) {
      if (isHistory(t)) continue   // archivée ou ancienne validée → table Historique
      m[columnOf(t.status)].push(t)
    }
    for (const c of COLUMNS) m[c.id].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
    return m
  }, [boardTasks])

  // Historique : tâches archivées OU validées il y a plus de HISTORY_DAYS jours (plus récentes en haut).
  const history = useMemo(() =>
    boardTasks
      .filter(isHistory)
      .sort((a, b) => ((b.archivedAt ?? b.completedAt ?? b.updatedAt) < (a.archivedAt ?? a.completedAt ?? a.updatedAt) ? -1 : 1)),
    [boardTasks])

  // Vue « par agent » : tâches groupées par agent (toutes colonnes ; on masque les vieilles validées).
  const STATUS_WEIGHT: Record<string, number> = { urgent: 0, in_progress: 1, blocked: 1, todo: 2, done: 3, cancelled: 3 }
  const byAgent = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const a of AGENT_PROFILES) m[a.id] = []
    const unassigned: Task[] = []
    for (const t of local) {
      if (isHistory(t)) continue
      const a = agentOf(t)
      if (a) m[a.id].push(t); else unassigned.push(t)
    }
    const sortFn = (a: Task, b: Task) => (STATUS_WEIGHT[a.status] ?? 2) - (STATUS_WEIGHT[b.status] ?? 2) || (b.order ?? 0) - (a.order ?? 0)
    for (const k of Object.keys(m)) m[k].sort(sortFn)
    unassigned.sort(sortFn)
    return { m, unassigned }
  }, [local])

  function validate(t: Task, e: React.MouseEvent) {
    e.stopPropagation()
    // Restaurer une tâche validée → direct ; valider une tâche active → fiche objectif.
    if (t.status === 'done' || t.status === 'cancelled') { update({ id: t.id as never, status: 'todo' }); return }
    setPendingOrder(t.order ?? Date.now()); setPendingValidate(t)
  }

  function restoreTask(t: Task) {
    // Restaure depuis l'Historique : on vide aussi archivedAt/completedAt (sinon ça reste en Historique).
    setLocal(prev => prev.map(x => x.id === t.id ? { ...x, status: 'todo', archivedAt: undefined, completedAt: undefined } : x))
    unarchive({ id: t.id as never, status: 'todo' })
  }

  function confirmValidate(achieved: boolean, note: string) {
    const t = pendingValidate
    if (!t) return
    const now = new Date().toISOString()
    setLocal(prev => prev.map(x => x.id === t.id ? { ...x, status: 'done', order: pendingOrder, objectiveAchieved: achieved, completionNote: note, completedAt: now } : x))
    update({ id: t.id as never, status: 'done', order: pendingOrder, objectiveAchieved: achieved, completionNote: note || undefined, completedAt: now })
    setPendingValidate(null)
  }

  function handleDragStart({ active }: DragStartEvent) { setActiveId(active.id as string); wasDragged.current = true; draggingRef.current = true }
  function handleDragOver({ over }: DragOverEvent) {
    if (view === 'agent') {
      const oid = over?.id as string | undefined
      if (!oid) { setOverAgentId(null); return }
      setOverAgentId(oid.startsWith('agentcol:') ? oid.slice('agentcol:'.length) : (agentOf(local.find(t => t.id === oid) as Task)?.id ?? null))
      return
    }
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
    if (target.id === 'done' && columnOf(t.status) !== 'done') { setPendingOrder(t.order ?? Date.now()); setPendingValidate(t); return }
    setLocal(prev => prev.map(x => x.id === t.id ? { ...x, status: targetStatus } : x))
    update({ id: t.id as never, status: targetStatus })
    setMobileCol(target.id)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null); setOverCol(null); setOverAgentId(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    setTimeout(() => { draggingRef.current = false }, 600)
    if (!over) return
    const id = active.id as string
    const overId = over.id as string
    const moved = local.find(t => t.id === id)
    if (!moved) return

    // Vue « par agent » : un drop réassigne la tâche à l'agent de la colonne cible.
    if (view === 'agent') {
      let targetAgentId: string | null = overId.startsWith('agentcol:') ? overId.slice('agentcol:'.length) : null
      if (!targetAgentId) { const ot = local.find(t => t.id === overId); targetAgentId = ot ? (agentOf(ot)?.id ?? null) : null }
      if (!targetAgentId || targetAgentId === '__none' || agentOf(moved)?.id === targetAgentId) return
      setLocal(prev => prev.map(t => t.id === id ? { ...t, assigneeType: 'agent', assigneeId: targetAgentId! } : t))
      update({ id: id as never, assigneeType: 'agent', assigneeId: targetAgentId })
      return
    }

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
    // Entrée dans « Validé » → fiche de validation (objectif atteint ?) avant de figer le statut.
    if (targetCol === 'done' && columnOf(moved.status) !== 'done') { setPendingOrder(newOrder); setPendingValidate(moved); return }
    setLocal(prev => prev.map(t => t.id === id ? { ...t, status: targetStatus, order: newOrder } : t))
    update({ id: id as never, status: targetStatus, order: newOrder })
  }

  const activeTask = local.find(t => t.id === activeId) ?? null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 md:px-6 pt-3 md:pt-4 pb-3 flex-shrink-0 flex items-center gap-2 md:gap-3">
        {/* Toggle de vue */}
        <div className="inline-flex items-center gap-0.5 bg-soren-elevated rounded-full p-0.5 flex-shrink-0">
          {([['status', 'Statuts'], ['agent', 'Par agent']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-colors ${view === v ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'}`}>{label}</button>
          ))}
        </div>
        {/* Filtre par agent — avatars seuls (nom au survol) pour tenir sur une ligne */}
        {view === 'status' && (
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 kanban-scroll">
            <button onClick={() => setAgent('all')} title="Tous les agents"
              className={`flex-shrink-0 text-[9px] font-bold px-2 h-[26px] rounded-full border transition-colors ${agent === 'all' ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>Tous</button>
            {AGENT_PROFILES.map(a => (
              <button key={a.id} onClick={() => setAgent(a.name)} title={a.name}
                className={`flex-shrink-0 rounded-full transition-all ${agent === a.name ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                <AgentFace id={a.id} name={a.name} avatar={a.avatar} size={26} />
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setCreating(true)}
          className="ml-auto flex-shrink-0 flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-[#e64500] transition-colors"><Plus size={13} /> Nouvelle tâche</button>
      </div>

      {/* Sélecteur de colonne — mobile (vue statuts uniquement) */}
      <div className={`${view === 'agent' ? 'hidden' : 'md:hidden'} flex gap-1.5 overflow-x-auto px-3 pb-2.5 flex-shrink-0 kanban-scroll`}>
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
        {history.length > 0 && (
          <button onClick={() => setMobileCol('history')}
            className={`flex-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${mobileCol === 'history' ? 'bg-[#FF4D00] border-[#FF4D00]' : 'bg-soren-card border-soren-border'}`}>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${mobileCol === 'history' ? 'text-white' : 'text-soren-muted'}`}>Historique</span>
            <span className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full ${mobileCol === 'history' ? 'bg-white/25 text-white' : 'bg-soren-elevated text-soren-subtle'}`}>{history.length}</span>
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto px-3 md:px-6 pb-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          {view === 'agent' ? (
            <div className="flex gap-2 h-full md:min-w-max">
              {AGENT_PROFILES.map(a => (
                <AgentColumn key={a.id} agent={a} tasks={byAgent.m[a.id] ?? []} isOver={overAgentId === a.id}
                  onOpen={t => setEditId(t.id)} onValidate={validate} wasDragged={wasDragged} />
              ))}
              {byAgent.unassigned.length > 0 && (
                <AgentColumn agent={{ id: '__none', name: 'Non assigné', role: 'Humains & non assignées' }}
                  tasks={byAgent.unassigned} isOver={overAgentId === '__none'}
                  onOpen={t => setEditId(t.id)} onValidate={validate} wasDragged={wasDragged} />
              )}
            </div>
          ) : (
            <div className="flex gap-2 h-full md:min-w-max">
              {COLUMNS.map((c, ci) => (
                <Column key={c.id} col={c} tasks={byCol[c.id] ?? []} isOver={overCol === c.id}
                  onOpen={t => setEditId(t.id)} onValidate={validate} wasDragged={wasDragged} mobileActive={c.id === mobileCol}
                  colIndex={ci} colCount={COLUMNS.length} onMove={moveTask} />
              ))}
              {history.length > 0 && (
                <HistoryColumn tasks={history} onOpen={t => setEditId(t.id)} onRestore={restoreTask} mobileActive={mobileCol === 'history'} />
              )}
            </div>
          )}
          {typeof document !== 'undefined' && createPortal(
            <DragOverlay>{activeTask && <CardBody t={activeTask} overlay />}</DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>

      {creating && <TaskModal task={null} onClose={() => setCreating(false)} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditId(null)} />}
      {pendingValidate && <CompletionModal task={pendingValidate} onCancel={() => setPendingValidate(null)} onConfirm={confirmValidate} />}
    </div>
  )
}
