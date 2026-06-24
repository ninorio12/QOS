'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import PipelineMobileTabs from '@/components/pipeline/PipelineMobileTabs'
import { Modal } from '@/components/ui/Modal'
const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })
import { useKanbanSensors } from '@/hooks/useKanbanSensors'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
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
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react'
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
        <span className="text-[11px] font-bold text-soren-text whitespace-nowrap shrink-0 tabular-nums">
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
      <div className="flex items-center justify-between gap-1.5 mb-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="text-[11px] font-semibold text-[#374151] truncate">{stage.name}</span>
          <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm flex-shrink-0">
            {clients.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[9px] text-soren-subtle font-medium whitespace-nowrap flex-shrink-0 tabular-nums">{total.toLocaleString('fr-FR')} CHF</span>
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
  const [searchQuery, setSearchQuery] = useState('')
  const matchSearch = (c: Client) => { const q = searchQuery.trim().toLowerCase(); return !q || [c.name, c.company].some(f => f?.toLowerCase().includes(q)) }
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId,   setOverId]   = useState<string | null>(null)
  const [mobileStageId, setMobileStageId] = useState<string>(CLIENT_STAGES[0].id)
  const [scrolled, setScrolled] = useState(false)
  const [editContact, setEditContact] = useState<Record<string, unknown> | null>(null)
  // Retour en arrière d'un client (régression d'étape onboarding) : autorisé mais avec confirmation (règle Thomas, comme le board Leads).
  const [pendingBackMove, setPendingBackMove] = useState<{ client: Client; toStageId: string } | null>(null)
  const isMoveAllowed = (fromStageId: string, toStageId: string) => {
    const from = CLIENT_STAGES.findIndex(s => s.id === fromStageId)
    const to   = CLIENT_STAGES.findIndex(s => s.id === toStageId)
    if (from === -1 || to === -1) return true
    return to >= from
  }
  const persistClientStage = (id: string, toStageId: string, fromStageId: string) => {
    fetch(`/api/pipeline/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stageId: toStageId }) })
      .catch(() => setClients(prev => prev.map(c => c.id === id ? { ...c, stageId: fromStageId } : c)))
  }
  const confirmBackMove = () => {
    if (!pendingBackMove) return
    const { client, toStageId } = pendingBackMove
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, stageId: toStageId } : c))
    persistClientStage(client.id, toStageId, client.stageId)
    setMobileStageId(toStageId)
    setPendingBackMove(null)
  }
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
    // Précision : on suit le POINTEUR (colonne/carte réellement sous le curseur), pas le centre de la carte.
    // On préfère une carte (insertion exacte) à la colonne si les deux sont sous le pointeur.
    const within = pointerWithin(args)
    if (within.length) {
      const cards = within.filter(c => !CLIENT_STAGES.some(s => s.id === c.id))
      return cards.length ? cards : within
    }
    // Repli (pointeur dans un vide) : colonne la plus proche.
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
        if (!isMoveAllowed(activeClient.stageId, targetStage.id)) { setPendingBackMove({ client: activeClient, toStageId: targetStage.id }); return }
        setClients(prev => prev.map(c => c.id === activeId ? { ...c, stageId: targetStage.id } : c))
        persistClientStage(activeId, targetStage.id, activeClient.stageId)
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
      if (!isMoveAllowed(activeClient.stageId, overClient.stageId)) { setPendingBackMove({ client: activeClient, toStageId: overClient.stageId }); return }
      setClients(prev => {
        const without = prev.filter(c => c.id !== activeId)
        const col     = without.filter(c => c.stageId === overClient.stageId)
        const rest    = without.filter(c => c.stageId !== overClient.stageId)
        const idx     = col.findIndex(c => c.id === overId)
        const moved   = { ...activeClient, stageId: overClient.stageId }
        col.splice(idx, 0, moved)
        return [...rest, ...col]
      })
      persistClientStage(activeId, overClient.stageId, activeClient.stageId)
    }
  }

  // Déplacement par flèches (mobile) : carte → étape adjacente du board Clients (persiste comme un drag).
  const moveClient = useCallback((client: Client, dir: number) => {
    const idx = CLIENT_STAGES.findIndex(s => s.id === client.stageId)
    const target = CLIENT_STAGES[idx + dir]
    if (!target) return
    if (!isMoveAllowed(client.stageId, target.id)) { setPendingBackMove({ client, toStageId: target.id }); return }
    setMobileStageId(target.id)
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, stageId: target.id } : c))
    persistClientStage(client.id, target.id, client.stageId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalValue = clients.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Toaster toasts={toasts} dismiss={dismiss} />

      <PipelineMobileTabs />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs text-soren-muted mt-1">
              {clients.length} clients · <span className="font-semibold text-soren-text">{totalValue.toLocaleString('fr-FR')} CHF</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Recherche soft, à gauche de « Nouveau client » */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-36 focus:w-52 bg-soren-card border border-soren-border rounded-full pl-8 pr-3 py-1.5 text-[11px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]/40 transition-all duration-300"
              />
            </div>
            {/* Modal creates contact + client server-side; reactive query shows it instantly */}
            <NewLeadWidget mode="clients" />
          </div>
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
          <div ref={boardRef} className="flex gap-3 overflow-x-auto px-3 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] kanban-scroll kanban-board-row">
            {CLIENT_STAGES.map(stage => (
              <ClientColumn
                key={stage.id}
                stage={stage}
                clients={clients.filter(c => c.stageId === stage.id && matchSearch(c))}
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

      {pendingBackMove && (
        <Modal onClose={() => setPendingBackMove(null)}>
          <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
            <p className="text-[15px] font-bold text-soren-text mb-2">Revenir en arrière ?</p>
            <p className="text-[12.5px] text-soren-muted leading-relaxed mb-5">
              Tu déplaces <span className="font-semibold text-soren-text">{pendingBackMove.client.name}</span> de
              {' '}« {CLIENT_STAGES.find(s => s.id === pendingBackMove.client.stageId)?.name ?? '?'} » vers
              {' '}« {CLIENT_STAGES.find(s => s.id === pendingBackMove.toStageId)?.name ?? '?'} » : un retour en arrière dans l&apos;onboarding. Confirmer ?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingBackMove(null)} className="text-[13px] font-semibold text-soren-muted border border-soren-border rounded-xl px-4 py-2 hover:bg-soren-elevated">Annuler</button>
              <button onClick={confirmBackMove} className="text-[13px] font-semibold text-white bg-[#FF4D00] rounded-xl px-4 py-2 shadow-sm hover:bg-[#e84400]">Confirmer le retour</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
