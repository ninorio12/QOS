'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import { Plus, LayoutGrid, List, Phone, MessageCircle, Tag, FileText, CheckSquare, CalendarPlus, UserCircle2, Trophy, Ban } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type GHLPipelineData, type GHLStage, type Opportunity } from './types'
import { type GHLContact } from '@/lib/ghl'

const OppDetailModal  = dynamic(() => import('./OppDetailModal'),                     { ssr: false })
const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })

interface Props {
  pipelines:     GHLPipelineData[]
  opportunities: Opportunity[]
}

const CARD_ACTIONS = [
  { icon: Phone,         title: 'Appel' },
  { icon: MessageCircle, title: 'Conversations' },
  { icon: Tag,           title: 'Mots-clés' },
  { icon: FileText,      title: 'Remarque' },
  { icon: CheckSquare,   title: 'Tâche' },
  { icon: CalendarPlus,  title: 'RDV' },
]

// ─── Won / Lost drop zones ─────────────────────────────────────
function WonZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: '__won__' })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex items-center justify-center gap-2 h-16 rounded-2xl border-2 border-dashed transition-all ${
        isOver ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'border-[#22C55E]/40 bg-[#22C55E]/5'
      }`}
    >
      <Trophy size={16} className="text-[#22C55E]" />
      <span className="text-sm font-semibold text-[#22C55E]">Gagné</span>
    </div>
  )
}

function LostZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: '__lost__' })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex items-center justify-center gap-2 h-16 rounded-2xl border-2 border-dashed transition-all ${
        isOver ? 'bg-[#EF4444]/20 border-[#EF4444]' : 'border-[#EF4444]/40 bg-[#EF4444]/5'
      }`}
    >
      <Ban size={16} className="text-[#EF4444]" />
      <span className="text-sm font-semibold text-[#EF4444]">Abandonné</span>
    </div>
  )
}

// ─── Opportunity card ──────────────────────────────────────────
function OppCard({
  opp,
  isDragging = false,
  onOpen,
}: {
  opp:        Opportunity
  isDragging?: boolean
  onOpen?:    () => void
}) {
  return (
    <div
      onClick={onOpen}
      className={`
        bg-white rounded-xl px-3 pt-2.5 pb-2 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing select-none
        border border-[#E5E7EB] shadow-sm
        ${isDragging
          ? 'shadow-xl rotate-1 opacity-95 border-[#E2FF8D]'
          : 'hover:shadow-md hover:border-[#D1D5DB] transition-all'}
      `}
    >
      {/* Row 1 : name + assigned avatar */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-[13px] font-bold text-[#111111] leading-snug truncate">{opp.name}</p>
        <div className="flex-shrink-0 w-6 h-6 rounded-full border border-[#E5E7EB] bg-[#F5F5F0] flex items-center justify-center">
          <UserCircle2 size={13} className="text-[#9CA3AF]" />
        </div>
      </div>

      {/* Row 2 : value + source badge — fixed height so all cards align */}
      <div className="flex items-center gap-1.5 h-5">
        <span className="text-[12px] font-black text-[#111111] leading-none">
          {opp.value > 0 ? `€${opp.value.toLocaleString('fr-FR')}` : '—'}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 rounded-full truncate max-w-[80px] leading-5 ${
          opp.source ? 'bg-[#E2FF8D] text-[#111111]' : 'invisible'
        }`}>
          {opp.source || 'x'}
        </span>
      </div>

      {/* Row 3 : action icons */}
      <div className="flex items-center justify-between pt-0.5 border-t border-[#F0F0F0]">
        {CARD_ACTIONS.map(({ icon: Icon, title }) => (
          <button
            key={title}
            data-tooltip={title}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="p-1 rounded-md text-[#9CA3AF] hover:text-[#111111] hover:bg-[#F5F5F0] transition-colors"
          >
            <Icon size={12} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Draggable wrapper ────────────────────────────────────────
function DraggableCard({ opp, onOpen }: { opp: Opportunity; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.25 : 1 }}>
      <OppCard opp={opp} onOpen={onOpen} />
    </div>
  )
}

function stripEmoji(str: string) {
  return Array.from(str)
    .filter(ch => {
      const cp = ch.codePointAt(0) ?? 0
      return cp < 0x2600 || (cp > 0x27BF && cp < 0x1F000) || cp > 0x1FFFF
    })
    .join('')
    .trim()
}

// ─── Kanban column ────────────────────────────────────────────
function KanbanColumn({
  stage, opps, isOver, onOpenOpp,
}: {
  stage:      GHLStage
  opps:       Opportunity[]
  isOver:     boolean
  onOpenOpp:  (opp: Opportunity) => void
}) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const total    = opps.reduce((s, o) => s + o.value, 0)
  const isYellow = stage.color === '#E2FF8D'

  return (
    <div className="flex flex-col w-[200px] flex-shrink-0">
      {/* Header */}
      <div className="mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: isYellow ? 'transparent' : stage.color,
              border:     isYellow ? '2px solid #BFD400' : 'none',
            }}
          />
          <span className="text-sm font-semibold text-[#111111] truncate flex-1">{stripEmoji(stage.name)}</span>
          <span className="text-[10px] font-bold bg-[#F5F5F0] text-[#6B7280] px-2 py-0.5 rounded-full flex-shrink-0">
            {opps.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-[11px] text-[#9CA3AF] mt-0.5 ml-[18px]">
            €{total.toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      {/* Drop zone — min height = 3 cards, scroll when more */}
      <div
        ref={setNodeRef}
        className={`
          kanban-col flex flex-col gap-2 max-h-[calc(100vh-260px)] overflow-y-auto rounded-2xl p-2.5 transition-all
          ${isOver
            ? 'bg-[#E2FF8D]/20 ring-2 ring-[#E2FF8D] ring-offset-0'
            : 'bg-[#F0F2ED]'
          }
        `}
        style={{ minHeight: 312 }}
      >
        {opps.map(opp => (
          <DraggableCard key={opp.id} opp={opp} onOpen={() => onOpenOpp(opp)} />
        ))}
      </div>
    </div>
  )
}

function ColumnWithOver({
  stage, opps, overId, onOpenOpp,
}: {
  stage:     GHLStage
  opps:      Opportunity[]
  overId:    string | null
  onOpenOpp: (opp: Opportunity) => void
}) {
  return (
    <KanbanColumn
      stage={stage}
      opps={opps}
      isOver={overId === stage.id}
      onOpenOpp={onOpenOpp}
    />
  )
}

// ─── Main board ───────────────────────────────────────────────
export default function KanbanBoard({ pipelines, opportunities }: Props) {
  const [selectedId,   setSelectedId]   = useState(pipelines[0]?.id ?? '')
  const [opps,         setOpps]         = useState<Opportunity[]>(opportunities)
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [overId,       setOverId]       = useState<string | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [loadingOpps,  setLoadingOpps]  = useState(false)
  const [selectedOpp,  setSelectedOpp]  = useState<Opportunity | null>(null)
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid')

  const fetchOppsForPipeline = useCallback(async (pipelineId: string) => {
    setLoadingOpps(true)
    try {
      const res  = await fetch(`/api/pipeline-opps?pipelineId=${pipelineId}`)
      const data = await res.json() as { opps: Opportunity[] }
      setOpps(prev => [
        ...prev.filter(o => o.pipelineId !== pipelineId),
        ...data.opps,
      ])
    } catch (err) {
      console.error('[KanbanBoard] fetchOpps failed:', err)
    } finally {
      setLoadingOpps(false)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const selectedPipeline = pipelines.find(p => p.id === selectedId) ?? pipelines[0]
  const stages           = selectedPipeline?.stages ?? []
  const pipelineOpps     = opps.filter(o => o.pipelineId === selectedId)
  const totalValue       = pipelineOpps.reduce((s, o) => s + o.value, 0)
  const activeOpp        = opps.find(o => o.id === activeId) ?? null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }
  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? (over.id as string) : null)
  }
  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    if (!over) return
    const targetId = over.id as string

    if (targetId === '__won__' || targetId === '__lost__') {
      const newStatus = targetId === '__won__' ? 'won' : 'abandoned'
      // Optimistic: remove from board
      setOpps(prev => prev.filter(o => o.id !== active.id))
      // Fire and forget API call
      fetch(`/api/opp/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(console.error)
      return
    }

    if (!stages.find(s => s.id === targetId)) return
    const movedOpp = opps.find(o => o.id === active.id)
    setOpps(prev => prev.map(o =>
      o.id === active.id ? { ...o, stageId: targetId } : o
    ))
    // Sync to CRM
    if (movedOpp) {
      fetch(`/api/opp/${movedOpp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId:      movedOpp.pipelineId,
          pipelineStageId: targetId,
          status:          movedOpp.status,
        }),
      }).catch(console.error)
    }
  }

  function handleAddOpp(opp: Opportunity) {
    setOpps(prev => [opp, ...prev])
  }

  // suppress unused variable warning — totalValue kept for potential future use
  void totalValue

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black text-[#111111] leading-tight">Pipeline</h1>

          {/* Pipeline tabs */}
          <div className="flex items-center gap-2 mt-1.5">
            {pipelines.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id)
                  fetchOppsForPipeline(p.id)
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  p.id === selectedId
                    ? 'bg-[#111111] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F5F5F0]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Grid / list toggle */}
          <div className="flex items-center bg-[#F0F2ED] rounded-full p-0.5">
            <button
              data-tooltip="Vue grille"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutGrid size={14} className={viewMode === 'grid' ? 'text-[#111111]' : 'text-[#9CA3AF]'} />
            </button>
            <button
              data-tooltip="Vue liste"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List size={14} className={viewMode === 'list' ? 'text-[#111111]' : 'text-[#9CA3AF]'} />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            data-tooltip="Nouveau lead"
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#2a2a2a] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <Plus size={13} />
            Ajouter
          </button>

        </div>
      </div>

      {/* ── Vue liste ── */}
      {viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loadingOpps ? (
            <div className="flex items-center justify-center h-40 gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
              <p className="text-sm text-[#9CA3AF]">Chargement…</p>
            </div>
          ) : (
            <table className="w-full bg-white rounded-2xl overflow-hidden shadow-sm">
              <thead>
                <tr className="border-b border-[#F0F0EC]">
                  {['Lead', 'Stage', 'Valeur', 'Source', 'Créé le', 'Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipelineOpps.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Aucun lead dans ce pipeline</td></tr>
                ) : pipelineOpps.map((opp, i) => {
                  const stage = stages.find(s => s.id === opp.stageId)
                  return (
                    <tr
                      key={opp.id}
                      onClick={() => setSelectedOpp(opp)}
                      className={`border-b border-[#F0F0EC] last:border-0 hover:bg-[#F5F5F0] cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFAF8]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#E2FF8D] flex items-center justify-center text-[10px] font-bold text-[#111111] flex-shrink-0">{opp.initials}</div>
                          <div>
                            <p className="text-[12px] font-semibold text-[#111111] truncate max-w-[140px]">{opp.name}</p>
                            <p className="text-[10px] text-[#9CA3AF] truncate max-w-[140px]">{opp.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0EC] text-[#6B7280]">
                          {stage?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[#111111]">
                        {opp.value > 0 ? `€${opp.value.toLocaleString('fr-FR')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#6B7280]">{opp.source || '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-[#9CA3AF]">
                        {new Date(opp.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          opp.status === 'won'  ? 'bg-green-100 text-green-700' :
                          opp.status === 'lost' ? 'bg-red-100 text-red-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {opp.status === 'won' ? 'Gagné' : opp.status === 'lost' ? 'Perdu' : 'Ouvert'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
      /* ── Vue grille (Kanban) ── */
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-scroll flex gap-3 pb-4 px-6 flex-1 items-start">
          {loadingOpps ? (
            <div className="flex-1 flex items-center justify-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
              <p className="text-sm text-[#9CA3AF]">Chargement du pipeline…</p>
            </div>
          ) : stages.length > 0
            ? stages.map(stage => (
                <ColumnWithOver
                  key={stage.id}
                  stage={stage}
                  opps={pipelineOpps.filter(o => o.stageId === stage.id)}
                  overId={overId}
                  onOpenOpp={setSelectedOpp}
                />
              ))
            : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-[#9CA3AF]">
                  {pipelines.length === 0
                    ? 'Impossible de charger les pipelines CRM.'
                    : 'Aucun stage dans ce pipeline.'}
                </p>
              </div>
            )
          }
        </div>

        {/* Won / Lost drop zones — visible only while dragging */}
        {activeId && (
          <div className="flex gap-3 px-6 pb-4 flex-shrink-0">
            <WonZone  isOver={overId === '__won__'} />
            <LostZone isOver={overId === '__lost__'} />
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          {activeOpp && <OppCard opp={activeOpp} isDragging />}
        </DragOverlay>
      </DndContext>
      )}

      {showModal && (
        <NewContactModal
          onClose={() => setShowModal(false)}
          onAdd={(_c: GHLContact) => {}}
          onAddOpp={opp => { handleAddOpp(opp); setShowModal(false) }}
        />
      )}

      {selectedOpp && (
        <OppDetailModal
          opp={selectedOpp}
          pipelines={pipelines}
          onClose={() => setSelectedOpp(null)}
          onUpdate={updated => {
            setOpps(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, ...updated } : o))
            setSelectedOpp(null)
          }}
        />
      )}
    </>
  )
}
