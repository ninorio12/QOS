'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })
import { useKanbanSensors } from '@/hooks/useKanbanSensors'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAvatarColor } from '@/components/contacts/types'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

type ClientStage = { id: string; name: string; color: string; position: number }
type Client = {
  id: string
  ghl_contact_id?: string
  name: string
  company: string
  value: number
  createdAt: string
  initials: string
  stageId: string
}

const CLIENT_STAGES: ClientStage[] = [
  { id: 'nouveau-client',     name: 'Nouveau client',      color: '#6366F1', position: 0 },
  { id: 'onboarding-envoye',  name: 'Onboarding envoyé',   color: '#F59E0B', position: 1 },
  { id: 'onboarding-complet', name: 'Onboarding complété', color: '#3B82F6', position: 2 },
  { id: 'kickoff-booke',      name: 'Kickoff booké',       color: '#8B5CF6', position: 3 },
  { id: 'setup-cree',         name: 'Setup créé',          color: '#EC4899', position: 4 },
  { id: 'consulting',         name: 'Consulting',          color: '#10B981', position: 5 },
]

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

function Avatar({ initials }: { initials: string }) {
  const color = getAvatarColor(initials)
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-white"
      style={{ background: color + '22', color }}
    >
      {initials}
    </div>
  )
}

function ClientCard({ client, isDragging = false }: { client: Client; isDragging?: boolean }) {
  const date = new Date(client.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return (
    <div className={`
      bg-soren-card border rounded-lg px-3 py-2 flex flex-col gap-1 select-none transition-all
      ${isDragging
        ? 'border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_4px_16px_rgba(200,241,53,0.15)] rotate-1 opacity-95 cursor-grabbing'
        : 'border-soren-border hover:border-[#C8CBD0] hover:shadow-sm cursor-grab'
      }
    `}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 min-w-0 text-[10.5px] font-normal text-soren-text leading-tight truncate">{client.name}</p>
        <span className="text-[10px] text-soren-subtle shrink-0">{date}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-soren-text truncate min-w-0">
          {client.value > 0 ? `${client.value.toLocaleString('fr-FR')} CHF` : '—'}
        </span>
        <Avatar initials={client.initials} />
      </div>
    </div>
  )
}

function SortableClientCard({ client, wasDragged, onCardClick, onMove, canPrev = false, canNext = false }: { client: Client; wasDragged: React.MutableRefObject<boolean>; onCardClick: () => void; onMove?: (client: Client, dir: number) => void; canPrev?: boolean; canNext?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: client.id,
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      {/* mobile : flèches latérales pour déplacer la carte de colonne en colonne (sans drag) */}
      <div className="flex items-stretch gap-1">
        {onMove && (
          <button type="button" disabled={!canPrev} aria-label="Étape précédente"
            onPointerDown={stop} onClick={e => { stop(e); onMove(client, -1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronLeft size={15} />
          </button>
        )}
        <div {...listeners} onClick={() => { if (!wasDragged.current) onCardClick() }} className="flex-1 min-w-0 cursor-grab active:cursor-grabbing">
          <ClientCard client={client} />
        </div>
        {onMove && (
          <button type="button" disabled={!canNext} aria-label="Étape suivante"
            onPointerDown={stop} onClick={e => { stop(e); onMove(client, 1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

function ClientColumn({ stage, clients, isOver, wasDragged, onCardClick, mobileActive = true, onMove, stageIndex = 0, stageCount = 1 }: {
  stage: ClientStage
  clients: Client[]
  isOver: boolean
  wasDragged: React.MutableRefObject<boolean>
  onCardClick: (c: Client) => void
  mobileActive?: boolean
  onMove?: (client: Client, dir: number) => void
  stageIndex?: number
  stageCount?: number
}) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const total = clients.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col w-[200px] md:w-48 flex-shrink-0 h-full">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="text-[11px] font-semibold text-[#374151] truncate max-w-[120px]">{stage.name}</span>
          <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
            {clients.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[9px] text-soren-subtle font-medium">{total.toLocaleString('fr-FR')} CHF</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col rounded-xl p-2 transition-colors overflow-hidden ${
          isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.04]'
        }`}
      >
        <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 min-h-0 overflow-y-auto kanban-col flex flex-col gap-1.5">
            {clients.map(client => (
              <SortableClientCard key={client.id} client={client} wasDragged={wasDragged} onCardClick={() => onCardClick(client)}
                onMove={onMove} canPrev={stageIndex > 0} canNext={stageIndex < stageCount - 1} />
            ))}
            {clients.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-[11px] text-soren-subtle">Déposer ici</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function ClientsBoard() {
  const [clients, setClients] = useState<Client[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId,   setOverId]   = useState<string | null>(null)
  const [mobileStageId, setMobileStageId] = useState<string>(CLIENT_STAGES[0].id)
  const [scrolled, setScrolled] = useState(false)
  const [editContact, setEditContact] = useState<Record<string, unknown> | null>(null)
  const boardRef   = useRef<HTMLDivElement>(null)
  const wasDragged = useRef(false)
  const { toasts, toast, dismiss } = useToast()

  const activeClient = clients.find(c => c.id === activeId) ?? null

  async function openClientEdit(client: Client) {
    if (!client.ghl_contact_id) { toast('Aucune fiche contact liée', 'error'); return }
    try {
      const res = await fetch(`/api/contact/${client.ghl_contact_id}`)
      const data = await res.json() as { contact?: Record<string, unknown> }
      if (data.contact) setEditContact({ ...data.contact, id: client.ghl_contact_id })
      else toast('Fiche contact introuvable', 'error')
    } catch { toast('Erreur de chargement', 'error') }
  }

  // Reactive live data from Convex — updates instantly on any change, anywhere
  const liveClients = useQuery(api.pipeline_clients.list)
  const draggingRef = useRef(false)
  useEffect(() => {
    if (!liveClients || draggingRef.current) return
    setClients((liveClients as (Omit<Client, 'id'> & { _id: string })[]).map(c => ({ ...c, id: c._id, ghl_contact_id: c.ghl_contact_id })))
  }, [liveClients])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const clampH = (v: number) => Math.max(0, Math.min(el.scrollWidth - el.clientWidth, v))
    let hTarget = el.scrollLeft
    let hRaf: number | null = null
    let vCol: HTMLElement | null = null
    let vTarget = 0
    let vRaf: number | null = null

    function hAnimate() {
      if (!el) return
      const diff = hTarget - el.scrollLeft
      if (Math.abs(diff) < 0.5) { el.scrollLeft = hTarget; hRaf = null; return }
      el.scrollLeft += diff * 0.16
      hRaf = requestAnimationFrame(hAnimate)
    }
    function vAnimate() {
      if (!vCol) { vRaf = null; return }
      const diff = vTarget - vCol.scrollTop
      if (Math.abs(diff) < 0.5) { vCol.scrollTop = vTarget; vRaf = null; return }
      vCol.scrollTop += diff * 0.2
      vRaf = requestAnimationFrame(vAnimate)
    }

    const onWheel = (e: WheelEvent) => {
      // Intentional horizontal: trackpad pan or Shift+wheel → scroll board left/right
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        hTarget = clampH(hTarget + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY))
        if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
        return
      }
      // Cursor over a column → scroll THAT column vertically (smooth). Never spill to horizontal.
      const col = document.elementsFromPoint(e.clientX, e.clientY)
        .find(c => c.classList.contains('kanban-col')) as HTMLElement | undefined
      if (col) {
        e.preventDefault()
        if (col.scrollHeight > col.clientHeight) {
          if (vCol !== col) { vCol = col; vTarget = col.scrollTop }
          vTarget = Math.max(0, Math.min(col.scrollHeight - col.clientHeight, vTarget + e.deltaY))
          if (!vRaf) vRaf = requestAnimationFrame(vAnimate)
        }
        return
      }
      // Not over any column (gaps / empty board area) → scroll board horizontally
      e.preventDefault()
      hTarget = clampH(hTarget + e.deltaY)
      if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
    }

    const onScroll = () => setScrolled(el.scrollLeft > 10)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      if (hRaf) cancelAnimationFrame(hRaf)
      if (vRaf) cancelAnimationFrame(vRaf)
    }
  }, [])

  const sensors = useKanbanSensors()

  const collisionDetection: CollisionDetection = useCallback((args) => {
    return closestCenter(args)
  }, [])

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    wasDragged.current = true
    draggingRef.current = true
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? (over.id as string) : null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    // Release reactive sync shortly after, so the persisted change is reflected
    setTimeout(() => { draggingRef.current = false }, 800)
    if (!over) return

    const activeId   = active.id as string
    const overId     = over.id as string
    const activeClient = clients.find(c => c.id === activeId)
    if (!activeClient) return

    const targetStage = CLIENT_STAGES.find(s => s.id === overId)
    if (targetStage) {
      if (activeClient.stageId !== targetStage.id) {
        setClients(prev => prev.map(c => c.id === activeId ? { ...c, stageId: targetStage.id } : c))
        fetch(`/api/pipeline/clients/${activeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stageId: targetStage.id }),
        }).catch(() => setClients(prev => prev.map(c => c.id === activeId ? { ...c, stageId: activeClient.stageId } : c)))
      }
      return
    }

    const overClient = clients.find(c => c.id === overId)
    if (!overClient) return

    if (activeClient.stageId === overClient.stageId) {
      setClients(prev => {
        const col  = prev.filter(c => c.stageId === activeClient.stageId)
        const rest = prev.filter(c => c.stageId !== activeClient.stageId)
        const from = col.findIndex(c => c.id === activeId)
        const to   = col.findIndex(c => c.id === overId)
        return [...rest, ...arrayMove(col, from, to)]
      })
    } else {
      setClients(prev => {
        const without = prev.filter(c => c.id !== activeId)
        const col     = without.filter(c => c.stageId === overClient.stageId)
        const rest    = without.filter(c => c.stageId !== overClient.stageId)
        const idx     = col.findIndex(c => c.id === overId)
        const moved   = { ...activeClient, stageId: overClient.stageId }
        col.splice(idx, 0, moved)
        return [...rest, ...col]
      })
      fetch(`/api/pipeline/clients/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: overClient.stageId }),
      }).catch(() => setClients(prev => prev.map(c => c.id === activeId ? { ...c, stageId: activeClient.stageId } : c)))
    }
  }

  // Déplacement par flèches (mobile) : carte → étape adjacente du board Clients (persiste comme un drag).
  const moveClient = useCallback((client: Client, dir: number) => {
    const idx = CLIENT_STAGES.findIndex(s => s.id === client.stageId)
    const target = CLIENT_STAGES[idx + dir]
    if (!target) return
    setMobileStageId(target.id)
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, stageId: target.id } : c))
    fetch(`/api/pipeline/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId: target.id }),
    }).catch(() => setClients(prev => prev.map(c => c.id === client.id ? { ...c, stageId: client.stageId } : c)))
  }, [])

  const totalValue = clients.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Toaster toasts={toasts} dismiss={dismiss} />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs text-soren-muted mt-1">
              {clients.length} clients · <span className="font-semibold text-soren-text">{totalValue.toLocaleString('fr-FR')} CHF</span>
            </p>
          </div>
          {/* Modal creates contact + client server-side; reactive query shows it instantly */}
          <NewLeadWidget mode="clients" />
        </div>

        {/* Board */}
        <div className="relative flex-1 min-h-0">
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-4 w-8 z-10 transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to right, var(--bg-app) 40%, transparent)' }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-4 w-8 z-10"
            style={{ background: 'linear-gradient(to left, var(--bg-app) 40%, transparent)' }}
          />
          <div className="hidden">
            {CLIENT_STAGES.map(stage => {
              const on = stage.id === mobileStageId
              return (
                <button key={stage.id} onClick={() => setMobileStageId(stage.id)}
                  className={`flex-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${on ? 'bg-[#FF4D00] border-[#FF4D00]' : 'bg-soren-card border-soren-border'}`}>
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${on ? 'text-white' : 'text-soren-muted'}`}>{stage.name}</span>
                  <span className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full ${on ? 'bg-white/25 text-white' : 'bg-soren-elevated text-soren-subtle'}`}>{clients.filter(c => c.stageId === stage.id).length}</span>
                </button>
              )
            })}
          </div>
          <div ref={boardRef} className="flex gap-3 overflow-x-auto px-3 md:px-6 pb-4 kanban-scroll kanban-board-row">
            {CLIENT_STAGES.map(stage => (
              <ClientColumn
                key={stage.id}
                stage={stage}
                clients={clients.filter(c => c.stageId === stage.id)}
                isOver={overId === stage.id}
                wasDragged={wasDragged}
                onCardClick={openClientEdit}
                mobileActive={stage.id === mobileStageId}
                onMove={moveClient}
                stageIndex={CLIENT_STAGES.findIndex(s => s.id === stage.id)}
                stageCount={CLIENT_STAGES.length}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeClient && <ClientCard client={activeClient} isDragging />}
        </DragOverlay>
      </DndContext>

      {editContact && (
        <NewContactModal
          contact={editContact as never}
          onClose={() => setEditContact(null)}
          onSave={() => setEditContact(null)}
        />
      )}
    </div>
  )
}
