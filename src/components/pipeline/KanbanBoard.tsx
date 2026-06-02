'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
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
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { type GHLPipelineData, type GHLStage, type Opportunity, type Lead, SOURCE_COLORS } from './types'
import { getAvatarColor } from '@/components/contacts/types'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'
import ContactSlideOver from './ContactSlideOver'

const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

const LOST_PREFIX = 'lost-'

// ─── Avatar ───────────────────────────────────────────────────
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

// ─── Opportunity Card ─────────────────────────────────────────
function OppCard({ opp, isDragging = false, muted = false, hideValue = false }: { opp: Opportunity; isDragging?: boolean; muted?: boolean; hideValue?: boolean }) {
  const date = new Date(opp.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const sourceType: 'inbound' | 'outbound' = (() => {
    try {
      const m = JSON.parse(localStorage.getItem('vividflow_contact_source') ?? '{}') as Record<string, string>
      return (m[opp.contactId] as 'inbound' | 'outbound') ?? 'inbound'
    } catch { return 'inbound' }
  })()

  return (
    <div className={`
      border rounded-lg px-3 py-2 flex flex-col gap-1 select-none transition-all
      ${muted
        ? 'bg-soren-card/50 border-soren-border/50 opacity-60 grayscale'
        : isDragging
          ? 'bg-soren-card border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_4px_16px_rgba(200,241,53,0.15)] rotate-1 opacity-95 cursor-grabbing'
          : 'bg-soren-card border-soren-border hover:border-[#C8CBD0] hover:shadow-sm cursor-grab'
      }
    `}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-soren-text leading-tight truncate">{opp.name}</p>
        <span className="text-[10px] text-soren-subtle shrink-0">{date}</span>
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {!hideValue && (
            <span className="text-xs font-bold text-soren-text shrink-0">
              {opp.value > 0 ? `€${opp.value.toLocaleString('fr-FR')}` : '—'}
            </span>
          )}
          {sourceType === 'inbound'
            ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>inbound</span>
            : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF9C3', color: '#CA8A04' }}>outbound</span>
          }
        </div>
        <Avatar initials={opp.initials} />
      </div>
    </div>
  )
}

// ─── Sortable Card ────────────────────────────────────────────
function SortableCard({ opp, onCardClick, wasDragged }: { opp: Opportunity; onCardClick: () => void; wasDragged: React.MutableRefObject<boolean>; }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: opp.id,
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => { if (!wasDragged.current) onCardClick() }}
      style={{
        opacity:    isDragging ? 0.3 : 1,
        transform:  CSS.Transform.toString(transform),
        transition,
      }}
    >
      <OppCard opp={opp} hideValue />
    </div>
  )
}

// ─── Lost Zone ────────────────────────────────────────────────
function LostZone({ stageId, isOver }: { stageId: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: `${LOST_PREFIX}${stageId}` })
  return (
    <div
      ref={setNodeRef}
      className={`
        mt-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150 cursor-default select-none
        ${isOver
          ? 'bg-red-500/15 border-2 border-red-400 py-3 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]'
          : 'border border-dashed border-red-400/30 py-1.5 hover:border-red-400/50'
        }
      `}
    >
      <span className={`text-[10px] font-semibold transition-colors ${isOver ? 'text-red-500' : 'text-red-400/50'}`}>
        {isOver ? '↓ Marquer perdu' : 'Zone perdu'}
      </span>
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────
interface KanbanColumnProps {
  stage: GHLStage
  opps: Opportunity[]
  isOver: boolean
  onCardClick: (opp: Opportunity) => void
  wasDragged: React.MutableRefObject<boolean>
  showLost: boolean
  isLostOver: boolean
  isLastStage?: boolean
}

function KanbanColumn({ stage, opps, isOver, onCardClick, wasDragged, showLost, isLostOver, isLastStage }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const total = opps.reduce((sum, o) => sum + o.value, 0)

  return (
    <div className="flex flex-col w-56 flex-shrink-0 h-full">
      <div className={`flex items-center justify-between mb-2 px-0.5 transition-opacity ${showLost ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isLastStage ? '#10B981' : stage.color }} />
          <span className={`text-[11px] font-semibold truncate max-w-[120px] ${isLastStage ? 'text-[#10B981]' : 'text-[#374151]'}`}>{stage.name}</span>
          <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
            {opps.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[9px] text-soren-subtle font-medium">€{total.toLocaleString('fr-FR')}</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col rounded-xl p-2 transition-colors overflow-hidden ${
          showLost
            ? 'bg-black/[0.02]'
            : isLastStage
              ? isOver ? 'bg-[#84cc16]/40 ring-2 ring-[#65a30d]' : 'bg-[#84cc16]/20 ring-1 ring-[#84cc16]/60'
              : isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.04]'
        }`}
      >
        {showLost ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
            {opps.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[11px] text-soren-subtle">Aucun perdu</p>
              </div>
            ) : (
              opps.map(opp => (
                <div key={opp.id}>
                  <OppCard opp={opp} muted />
                </div>
              ))
            )}
          </div>
        ) : (
          <SortableContext items={opps.map(o => o.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 min-h-0 overflow-y-auto kanban-col flex flex-col gap-1.5">
              {opps.map(opp => <SortableCard key={opp.id} opp={opp} onCardClick={() => onCardClick(opp)} wasDragged={wasDragged} />)}
              {opps.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[11px] text-soren-subtle">Déposer ici</p>
                </div>
              )}
            </div>
          </SortableContext>
        )}

        {!showLost && !isLastStage && <LostZone stageId={stage.id} isOver={isLostOver} />}
      </div>
    </div>
  )
}

// ─── Trash Zone ──────────────────────────────────────────────
const TRASH_ID = '__trash__'

function TrashZone({ isOver, visible }: { isOver: boolean; visible: boolean }) {
  const { setNodeRef } = useDroppable({ id: TRASH_ID })
  return (
    <div
      ref={setNodeRef}
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-5 h-11 rounded-2xl border-2 transition-all duration-200 cursor-default select-none
        ${visible ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'}
        ${isOver
          ? 'bg-red-500 border-red-400 scale-105 shadow-[0_0_0_4px_rgba(239,68,68,0.25),0_8px_24px_rgba(239,68,68,0.3)]'
          : 'bg-soren-card border-dashed border-red-300 shadow-lg'
        }
      `}
    >
      <Trash2 size={14} className={isOver ? 'text-white' : 'text-red-400'} />
      <span className={`text-[12px] font-semibold whitespace-nowrap transition-colors ${isOver ? 'text-white' : 'text-red-400'}`}>
        {isOver ? 'Relâcher pour supprimer' : 'Glisser ici pour supprimer'}
      </span>
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────
interface KanbanBoardProps {
  initialPipelines:     GHLPipelineData[]
  initialOpportunities: Opportunity[]
}

export default function KanbanBoard({ initialPipelines, initialOpportunities }: KanbanBoardProps) {
  const [opps,           setOpps]           = useState<Opportunity[]>(initialOpportunities)
  const [lostOpps,       setLostOpps]       = useState<Opportunity[]>([])
  const [showLost,       setShowLost]       = useState(false)
  const [selectedOpp,    setSelectedOpp]    = useState<Opportunity | null>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const wasDragged = useRef(false)
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => {
    const bc = new BroadcastChannel('soren-opp-updates')
    bc.onmessage = (e: MessageEvent<Record<string, unknown>>) => {
      if (e.data.type === 'opp-updated') {
        const d = e.data as { id: string; pipelineId: string; stageId: string; status: string; value: number }
        setOpps(prev => prev.map(o =>
          o.id === d.id
            ? { ...o, stageId: d.stageId, pipelineId: d.pipelineId, status: d.status as Opportunity['status'], value: d.value }
            : o
        ))
      }
      if (e.data.type === 'contact-updated') {
        const d = e.data as { contactId: string; name: string; email: string; phone: string }
        setOpps(prev => prev.map(o =>
          o.contactId === d.contactId
            ? { ...o, name: d.name || o.name, email: d.email || o.email, phone: d.phone || o.phone }
            : o
        ))
      }
    }
    return () => bc.close()
  }, [])

  const persistStageMove = useCallback(async (oppId: string, newStageId: string, prevStageId: string) => {
    try {
      const res = await fetch(`/api/opp/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStageId: newStageId }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
    } catch {
      setOpps(prev => prev.map(o => o.id === oppId ? { ...o, stageId: prevStageId } : o))
      toast('Erreur — déplacement annulé', 'error')
    }
  }, [toast])

  const [activeId,          setActiveId]          = useState<string | null>(null)
  const [overId,            setOverId]            = useState<string | null>(null)
  const [pendingConversion, setPendingConversion] = useState<Opportunity | null>(null)
  const [dealValue,         setDealValue]         = useState('')
  const [pipelineIdx, setPipelineIdx] = useState(() => {
    const pid = searchParams.get('pipelineId')
    if (!pid) return 0
    const idx = initialPipelines.findIndex(p => p.id === pid)
    return idx >= 0 ? idx : 0
  })
  const [scrolled, setScrolled] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

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

  const pipeline     = initialPipelines[pipelineIdx] ?? initialPipelines[0]
  const stages       = pipeline?.stages ?? []
  const activeOpp    = opps.find(o => o.id === activeId) ?? null
  const pipelineOpps = opps.filter(o => o.pipelineId === pipeline?.id)
  const totalPipeline = showLost
    ? lostOpps.filter(o => o.pipelineId === pipeline?.id).reduce((sum, o) => sum + o.value, 0)
    : pipelineOpps.reduce((sum, o) => sum + o.value, 0)

  const getColOpps = useCallback((stageId: string) => {
    if (showLost) {
      return lostOpps.filter(o => o.stageId === stageId && o.pipelineId === pipeline?.id)
    }
    return pipelineOpps.filter(o => o.stageId === stageId)
  }, [showLost, lostOpps, pipelineOpps, pipeline?.id])

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    wasDragged.current = true
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? (over.id as string) : null)
  }

  async function deleteOpp(oppId: string) {
    const snapshot = opps.find(o => o.id === oppId)
    setOpps(prev => prev.filter(o => o.id !== oppId))
    try {
      const res = await fetch(`/api/opp/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'abandoned' }),
      })
      if (!res.ok) throw new Error()
      toast('Opportunité supprimée', 'success')
    } catch {
      if (snapshot) setOpps(prev => [snapshot, ...prev.filter(o => o.id !== oppId)])
      toast('Erreur — suppression échouée', 'error')
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    if (!over) return

    const activeId  = active.id as string
    const overId    = over.id as string
    const activeOpp = opps.find(o => o.id === activeId)
    if (!activeOpp) return

    // Dropped on trash
    if (overId === TRASH_ID) {
      void deleteOpp(activeId)
      return
    }

    // Dropped on lost zone
    if (overId.startsWith(LOST_PREFIX)) {
      const targetStageId = overId.slice(LOST_PREFIX.length)
      setOpps(prev => prev.filter(o => o.id !== activeId))
      setLostOpps(prev => [
        ...prev.filter(o => o.id !== activeId),
        { ...activeOpp, stageId: targetStageId, status: 'lost' as const },
      ])
      toast('Lead marqué comme perdu', 'success')
      return
    }

    // Dropped on a column (stage)
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      const isLast = stages[stages.length - 1]?.id === targetStage.id
      if (isLast) {
        setOpps(prev => prev.filter(o => o.id !== activeId))
        setPendingConversion(activeOpp)
        setDealValue('')
        return
      }
      if (activeOpp.stageId !== targetStage.id) {
        const prevStageId = activeOpp.stageId
        setOpps(prev => prev.map(o => o.id === activeId ? { ...o, stageId: targetStage.id } : o))
        persistStageMove(activeId, targetStage.id, prevStageId)
      }
      return
    }

    // Dropped on another card
    const overOpp = opps.find(o => o.id === overId)
    if (!overOpp) return

    if (activeOpp.stageId === overOpp.stageId) {
      setOpps(prev => {
        const col  = prev.filter(o => o.stageId === activeOpp.stageId)
        const rest = prev.filter(o => o.stageId !== activeOpp.stageId)
        const from = col.findIndex(o => o.id === activeId)
        const to   = col.findIndex(o => o.id === overId)
        return [...rest, ...arrayMove(col, from, to)]
      })
    } else {
      const prevStageId = activeOpp.stageId
      setOpps(prev => {
        const without = prev.filter(o => o.id !== activeId)
        const col     = without.filter(o => o.stageId === overOpp.stageId)
        const rest    = without.filter(o => o.stageId !== overOpp.stageId)
        const idx     = col.findIndex(o => o.id === overId)
        const moved   = { ...activeOpp, stageId: overOpp.stageId }
        col.splice(idx, 0, moved)
        return [...rest, ...col]
      })
      persistStageMove(activeId, overOpp.stageId, prevStageId)
    }
  }

  function confirmConversion() {
    if (!pendingConversion) return
    try {
      const existing = JSON.parse(localStorage.getItem('vividflow_clients') ?? '[]') as unknown[]
      const newClient = {
        id:        pendingConversion.id,
        name:      pendingConversion.name,
        company:   pendingConversion.company,
        value:     parseFloat(dealValue.replace(',', '.')) || 0,
        createdAt: pendingConversion.createdAt,
        initials:  pendingConversion.initials,
        stageId:   'nouveau-client',
      }
      localStorage.setItem('vividflow_clients', JSON.stringify([newClient, ...existing]))
    } catch {}
    toast('Deal clôturé — bienvenue au client !', 'success')
    setPendingConversion(null)
    setDealValue('')
  }

  function cancelConversion() {
    if (!pendingConversion) return
    setOpps(prev => [pendingConversion, ...prev])
    setPendingConversion(null)
    setDealValue('')
  }

  function handleAddOpp(lead: Opportunity | Lead) {
    const opp: Opportunity = 'stageId' in lead
      ? (lead as Opportunity)
      : {
          id: lead.id, name: lead.name, company: lead.company, value: lead.value,
          source: lead.source, createdAt: lead.createdAt,
          initials: Array.isArray(lead.initials) ? (lead.initials[0] ?? '?') : lead.initials,
          stageId: stages[0]?.id ?? '', pipelineId: pipeline?.id ?? '',
          email: lead.email ?? '', phone: lead.phone ?? '', contactId: '', tags: [], status: 'open',
        }
    setOpps(prev => [opp, ...prev])
  }

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const overTrash = pointerWithin(args).find(c => c.id === TRASH_ID)
    if (overTrash) return [overTrash]
    const overLost = pointerWithin(args).find(c => String(c.id).startsWith(LOST_PREFIX))
    if (overLost) return [overLost]
    return closestCenter(args)
  }, [])

  const totalCount = showLost
    ? lostOpps.filter(o => o.pipelineId === pipeline?.id).length
    : pipelineOpps.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Toaster toasts={toasts} dismiss={dismiss} />
      <ContactSlideOver
        opp={selectedOpp}
        stage={selectedOpp ? stages.find(s => s.id === selectedOpp.stageId)?.name : null}
        onClose={() => setSelectedOpp(null)}
      />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-xs text-soren-muted mt-1">
                {totalCount} {showLost ? 'perdus' : 'opportunités'} ·{' '}
                <span className="font-semibold text-soren-text">€{totalPipeline.toLocaleString('fr-FR')}</span>
              </p>
            </div>
            {initialPipelines.length > 1 && (
              <div className="flex gap-1 bg-black/5 rounded-xl p-1">
                {initialPipelines.map((p, i) => (
                  <button key={p.id} onClick={() => setPipelineIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      pipelineIdx === i ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLost(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
                showLost
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
              }`}
            >
              {showLost ? <Eye size={12} /> : <EyeOff size={12} />}
              {showLost ? 'Voir actifs' : 'Voir perdus'}
            </button>
            {!showLost && (
              <NewLeadWidget
                compact
                mode="leads"
                onAddOpp={handleAddOpp}
              />
            )}
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
          <div ref={boardRef} className="flex gap-4 overflow-x-auto px-6 pb-4 kanban-scroll items-stretch h-full">
            {stages.map((stage, i) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opps={getColOpps(stage.id)}
                isOver={!showLost && overId === stage.id}
                onCardClick={opp => opp.contactId ? setSelectedOpp(opp) : null}
                wasDragged={wasDragged}
                showLost={showLost}
                isLostOver={overId === `${LOST_PREFIX}${stage.id}`}
                isLastStage={i === stages.length - 1}
              />
            ))}
          </div>
        </div>

        {!showLost && <TrashZone visible={!!activeId} isOver={overId === TRASH_ID} />}

        <DragOverlay dropAnimation={dropAnimation}>
          {activeOpp && <OppCard opp={activeOpp} isDragging hideValue />}
        </DragOverlay>
      </DndContext>

      {pendingConversion && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelConversion} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">🎉</div>
            <div>
              <h2 className="text-lg font-black text-[#111]">Félicitations !</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                <span className="font-semibold text-[#111]">{pendingConversion.name}</span> devient client !
              </p>
            </div>
            <div className="w-full">
              <label className="block text-xs font-semibold text-[#374151] mb-2 text-left">Montant du deal (€)</label>
              <input
                autoFocus
                type="number"
                placeholder="ex: 3500"
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmConversion()}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-lg font-bold text-[#111] placeholder-[#D1D5DB] outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#10B981] transition-all text-center"
              />
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={cancelConversion}
                className="flex-1 py-2.5 rounded-full border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmConversion}
                className="flex-1 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-colors shadow-sm"
              >
                Confirmer le deal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
