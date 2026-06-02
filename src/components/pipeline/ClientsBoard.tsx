'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
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
import { Plus } from 'lucide-react' // kept for potential future use
import { getAvatarColor } from '@/components/contacts/types'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

type ClientStage = { id: string; name: string; color: string; position: number }
type Client = {
  id: string
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
        <p className="text-xs font-semibold text-soren-text leading-tight truncate">{client.name}</p>
        <span className="text-[10px] text-soren-subtle shrink-0">{date}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-soren-text">
          {client.value > 0 ? `€${client.value.toLocaleString('fr-FR')}` : '—'}
        </span>
        <Avatar initials={client.initials} />
      </div>
    </div>
  )
}

function SortableClientCard({ client, wasDragged }: { client: Client; wasDragged: React.MutableRefObject<boolean> }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: client.id,
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}
    >
      <ClientCard client={client} />
    </div>
  )
}

function ClientColumn({ stage, clients, isOver, wasDragged }: {
  stage: ClientStage
  clients: Client[]
  isOver: boolean
  wasDragged: React.MutableRefObject<boolean>
}) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const total = clients.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col w-56 flex-shrink-0 h-full">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
          <span className="text-[11px] font-semibold text-[#374151] truncate max-w-[120px]">{stage.name}</span>
          <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
            {clients.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[9px] text-soren-subtle font-medium">€{total.toLocaleString('fr-FR')}</span>
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
              <SortableClientCard key={client.id} client={client} wasDragged={wasDragged} />
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
  const [clients, setClients] = useState<Client[]>(() => {
    try { return JSON.parse(localStorage.getItem('vividflow_clients') ?? '[]') as Client[] } catch { return [] }
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId,   setOverId]   = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const boardRef   = useRef<HTMLDivElement>(null)
  const wasDragged = useRef(false)
  const { toasts, toast, dismiss } = useToast()

  const activeClient = clients.find(c => c.id === activeId) ?? null

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const collisionDetection: CollisionDetection = useCallback((args) => {
    return closestCenter(args)
  }, [])

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    wasDragged.current = true
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? (over.id as string) : null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    if (!over) return

    const activeId   = active.id as string
    const overId     = over.id as string
    const activeClient = clients.find(c => c.id === activeId)
    if (!activeClient) return

    const targetStage = CLIENT_STAGES.find(s => s.id === overId)
    if (targetStage) {
      if (activeClient.stageId !== targetStage.id) {
        setClients(prev => prev.map(c => c.id === activeId ? { ...c, stageId: targetStage.id } : c))
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
    }
  }

  useEffect(() => {
    try { localStorage.setItem('vividflow_clients', JSON.stringify(clients)) } catch {}
  }, [clients])

  const totalValue = clients.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Toaster toasts={toasts} dismiss={dismiss} />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs text-soren-muted mt-1">
              {clients.length} clients · <span className="font-semibold text-soren-text">€{totalValue.toLocaleString('fr-FR')}</span>
            </p>
          </div>
          <NewLeadWidget
            mode="clients"
            onAdd={c => {
              const name = c.contactName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
              const initials = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
              const existing = JSON.parse(localStorage.getItem('vividflow_clients') ?? '[]') as Client[]
              const found = existing.find(cl => cl.id === c.id)
              if (found) setClients(prev => [found, ...prev.filter(cl => cl.id !== c.id)])
              else setClients(prev => [{ id: c.id, name, company: c.companyName ?? '', value: 0, createdAt: new Date().toISOString().split('T')[0], initials, stageId: CLIENT_STAGES[0].id }, ...prev])
            }}
          />
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
          <div ref={boardRef} className="flex gap-4 overflow-x-auto px-6 pb-4 kanban-scroll items-stretch h-full">
            {CLIENT_STAGES.map(stage => (
              <ClientColumn
                key={stage.id}
                stage={stage}
                clients={clients.filter(c => c.stageId === stage.id)}
                isOver={overId === stage.id}
                wasDragged={wasDragged}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeClient && <ClientCard client={activeClient} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
