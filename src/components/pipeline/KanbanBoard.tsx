'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { Plus, MoreHorizontal } from 'lucide-react'
import { type Lead, type Column, type ColumnId, COLUMNS, SOURCE_COLORS, INITIAL_LEADS } from './types'
import dynamic from 'next/dynamic'

const NewLeadModal = dynamic(() => import('./NewLeadModal'), { ssr: false })

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ initials }: { initials: string }) {
  const palette = ['#3462EE', '#4A91A8', '#C8F135', '#EFE347', '#8896AB']
  const bg = palette[initials.charCodeAt(0) % palette.length]
  const dark = bg === '#C8F135' || bg === '#EFE347'
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#1A2235] -ml-1.5 first:ml-0"
      style={{ background: bg, color: dark ? '#121721' : 'white' }}
    >
      {initials}
    </div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────
function LeadCard({ lead, isDragging = false }: { lead: Lead; isDragging?: boolean }) {
  const color = SOURCE_COLORS[lead.source]
  const date = new Date(lead.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className={`
      bg-[#121721] border rounded-xl p-3.5 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing select-none
      ${isDragging
        ? 'border-[#3462EE] shadow-[0_0_0_1px_#3462EE,0_8px_32px_rgba(52,98,238,0.3)] rotate-1 opacity-95'
        : 'border-[#232D3F] hover:border-[#3D4F6B] transition-colors'
      }
    `}>
      {/* Source + date */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color, background: color + '20' }}
        >
          {lead.source}
        </span>
        <span className="text-[10px] text-[#3D4F6B]">{date}</span>
      </div>

      {/* Name + company */}
      <div>
        <p className="text-sm font-semibold text-white leading-tight">{lead.name}</p>
        {lead.company && (
          <p className="text-[11px] text-[#8896AB] mt-0.5 truncate">{lead.company}</p>
        )}
      </div>

      {/* Value + avatars */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-sm font-bold text-white">
          {lead.value > 0 ? `€${lead.value.toLocaleString('fr-FR')}` : '—'}
        </span>
        <div className="flex items-center">
          {lead.initials.map((ini, i) => <Avatar key={i} initials={ini} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Draggable Card ───────────────────────────────────────────
function DraggableCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <LeadCard lead={lead} />
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────
function KanbanColumn({
  column,
  leads,
  isOver,
}: {
  column: Column
  leads: Lead[]
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const total = leads.reduce((sum, l) => sum + l.value, 0)

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
          <span className="text-xs font-semibold text-[#8896AB]">{column.label}</span>
          <span className="text-[10px] font-bold bg-[#232D3F] text-[#8896AB] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {leads.length}
          </span>
        </div>
        <button className="text-[#3D4F6B] hover:text-[#8896AB] transition-colors">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Column total */}
      {total > 0 && (
        <p className="text-xs text-[#3D4F6B] mb-3 px-0.5">
          {`€${total.toLocaleString('fr-FR')}`}
        </p>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors
          ${isOver ? 'bg-[#1A2235] ring-1 ring-[#3462EE]/40' : 'bg-[#1A2235]/30'}
        `}
      >
        {leads.map(lead => (
          <DraggableCard key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-[#3D4F6B]">Déposer ici</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Board wrapper with droppable state per column ────────────
function ColumnWithOver({ column, leads, overId }: {
  column: Column
  leads: Lead[]
  overId: string | null
}) {
  return <KanbanColumn column={column} leads={leads} isOver={overId === column.id} />
}

// ─── Main Board ───────────────────────────────────────────────
export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeLead = leads.find(l => l.id === activeId) ?? null

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

    const leadId = active.id as string
    const targetColumnId = over.id as ColumnId

    // Check target is a valid column
    if (!COLUMNS.find(c => c.id === targetColumnId)) return

    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, columnId: targetColumnId } : l)
    )
  }

  function handleAddLead(lead: Lead) {
    setLeads(prev => [lead, ...prev])
  }

  const totalPipeline = leads
    .filter(l => !['non_qualifie', 'perdu'].includes(l.columnId))
    .reduce((sum, l) => sum + l.value, 0)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-6 pt-6">
        <div>
          <h1 className="text-lg font-bold text-white">Pipeline</h1>
          <p className="text-xs text-[#8896AB] mt-0.5">
            {leads.filter(l => !['non_qualifie', 'perdu'].includes(l.columnId)).length} leads actifs
            · <span className="text-[#C8F135]">€{totalPipeline.toLocaleString('fr-FR')}</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#3462EE] hover:bg-[#2a50d4] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nouveau lead
        </button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-thin">
          {COLUMNS.map(column => (
            <ColumnWithOver
              key={column.id}
              column={column}
              leads={leads.filter(l => l.columnId === column.id)}
              overId={overId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Modal */}
      {showModal && (
        <NewLeadModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddLead}
        />
      )}
    </>
  )
}
