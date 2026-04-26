'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { type Appointment, STATUS_META } from './types'
import { type GHLCalendar } from '@/lib/ghl'
import dynamic from 'next/dynamic'

const NewAppointmentModal = dynamic(() => import('./NewAppointmentModal'), { ssr: false })

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

type ViewMode = 'month' | 'week'

// ─── Date helpers ─────────────────────────────────────────────
function mondayOf(d: Date): Date {
  const c   = new Date(d)
  const dow = c.getDay()
  c.setDate(c.getDate() - (dow === 0 ? 6 : dow - 1))
  c.setHours(0, 0, 0, 0)
  return c
}

function getMonthGrid(year: number, month: number): Date[] {
  const first  = new Date(year, month, 1)
  const last   = new Date(year, month + 1, 0)
  const start  = mondayOf(first)
  const endDow = last.getDay()
  const end    = new Date(last)
  end.setDate(end.getDate() + (endDow === 0 ? 0 : 7 - endDow))
  const days: Date[] = []
  const cur = new Date(start)
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return days
}

function getWeekDays(weekOffset: number): Date[] {
  const monday = mondayOf(new Date())
  monday.setDate(monday.getDate() + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function duration(s: string, e: string) {
  const m = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000)
  return m < 60 ? `${m}min` : `${Math.floor(m/60)}h${m%60||''}`
}

// ─── Mini calendar (right sidebar) ───────────────────────────
function MiniCal({
  year, month, selected, onSelect, onNav,
}: {
  year: number; month: number
  selected: Date | null
  onSelect: (d: Date) => void
  onNav:    (y: number, m: number) => void
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const grid  = getMonthGrid(year, month)

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { const d = new Date(year, month - 1, 1); onNav(d.getFullYear(), d.getMonth()) }}
          className="w-6 h-6 rounded-full hover:bg-soren-elevated flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={13} className="text-soren-muted" />
        </button>
        <p className="text-xs font-bold text-soren-text">{MONTHS_FR[month]} {year}</p>
        <button
          onClick={() => { const d = new Date(year, month + 1, 1); onNav(d.getFullYear(), d.getMonth()) }}
          className="w-6 h-6 rounded-full hover:bg-soren-elevated flex items-center justify-center transition-colors"
        >
          <ChevronRight size={13} className="text-soren-muted" />
        </button>
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <p key={d} className="text-center text-[9px] font-semibold text-soren-subtle py-0.5">{d[0]}</p>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((day, i) => {
          const isThisMonth = day.getMonth() === month
          const isToday     = sameDay(day, today)
          const isSel       = selected && sameDay(day, selected)
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-medium transition-colors
                ${isToday  ? 'bg-[#3462EE] text-white font-bold' : ''}
                ${isSel && !isToday ? 'bg-[#E2FF8D] text-soren-text font-bold' : ''}
                ${!isToday && !isSel && isThisMonth  ? 'text-soren-text hover:bg-soren-elevated' : ''}
                ${!isThisMonth ? 'text-[#D1D5DB]' : ''}
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event pill ───────────────────────────────────────────────
function EventPill({ appt, onClick }: { appt: Appointment; onClick: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={e => { e.stopPropagation(); onClick() }}
        className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-semibold truncate transition-all hover:brightness-95"
        style={{ background: appt.color + '22', color: appt.color, borderLeft: `2px solid ${appt.color}` }}
      >
        {fmt(appt.startTime)} {appt.title}
      </button>
      {appt.notes && (
        <div
          className="absolute left-0 bottom-full mb-1.5 z-50 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
        >
          <div className="bg-soren-sidebar text-white text-[10px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-line">
            {appt.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Month grid ───────────────────────────────────────────────
function MonthGrid({
  year, month, appointments, selectedDay, onDayClick, onApptClick,
}: {
  year: number; month: number
  appointments: Appointment[]
  selectedDay: Date | null
  onDayClick:  (d: Date) => void
  onApptClick: (a: Appointment) => void
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const grid  = getMonthGrid(year, month)
  const weeks: Date[][] = []
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7))

  return (
    <div className="flex flex-col flex-1 bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-7 border-b border-soren-border">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-soren-subtle uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="flex flex-col flex-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 flex-1 border-b border-soren-border last:border-0" style={{ minHeight: 96 }}>
            {week.map((day, di) => {
              const isThisMonth = day.getMonth() === month
              const isToday     = sameDay(day, today)
              const isSel       = selectedDay && sameDay(day, selectedDay)
              const dayAppts    = appointments
                .filter(a => { const d = new Date(a.startTime); d.setHours(0,0,0,0); return sameDay(d, day) })
                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

              return (
                <div
                  key={di}
                  onClick={() => onDayClick(day)}
                  className={`
                    relative p-1.5 border-r border-soren-border last:border-r-0 cursor-pointer transition-colors
                    ${isSel ? 'bg-soren-elevated' : 'hover:bg-[#FAFAF8]'}
                    ${!isThisMonth ? 'bg-[#FAFAF8]' : ''}
                  `}
                >
                  {/* Date number */}
                  <div className="flex justify-end mb-1">
                    <span className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold
                      ${isToday  ? 'bg-[#3462EE] text-white' : ''}
                      ${!isToday && isThisMonth  ? 'text-soren-text' : ''}
                      ${!isThisMonth ? 'text-[#C4C4C0]' : ''}
                    `}>
                      {day.getDate()}
                    </span>
                  </div>
                  {/* Events */}
                  <div className="flex flex-col gap-0.5">
                    {dayAppts.slice(0, 3).map(appt => (
                      <EventPill key={appt.id} appt={appt} onClick={() => onApptClick(appt)} />
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[9px] text-soren-subtle pl-1">+{dayAppts.length - 3} autres</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Week grid constants ──────────────────────────────────────
const HOUR_H     = 80
const HOUR_START = 7
const HOUR_END   = 21

const DAYS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
void DAYS_LONG // used as reference, suppress unused warning

function fmtHour(h: number)  { return `${h}h00` }
function fmtDD(d: Date)      { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}` }
void fmtDD // suppress unused warning

// ─── WeekCard (redesigned: flat, colored left border) ────────
function WeekCard({
  appt, cardH, onClick, onDelete, isDragging,
}: {
  appt: Appointment
  cardH: number
  onClick?: () => void
  onDelete?: (e: React.MouseEvent) => void
  isDragging?: boolean
}) {
  const color = appt.color || '#3462EE'
  const bg    = color + '14' // ~8% opacity

  const name    = appt.contactName !== '—' ? appt.contactName : appt.title
  const subtext = appt.contactName !== '—' ? appt.title : null
  const isGoogle = appt.source === 'google'

  return (
    <div className="absolute inset-0 group/card">
      {/* Tooltip notes — appears above on hover */}
      {appt.notes && (
        <div
          className="absolute left-0 bottom-full mb-1.5 z-50 w-52 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
        >
          <div className="bg-soren-sidebar text-white text-[10px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-line">
            {appt.notes}
          </div>
        </div>
      )}
      <div
        className="absolute inset-0 overflow-hidden group"
        style={{
          borderRadius:    6,
          background:      bg,
          border:          `1px solid ${color}30`,
          borderLeftWidth: 3,
          borderLeftColor: color,
          opacity:         isDragging ? 0.4 : 1,
          cursor:          isDragging ? 'grabbing' : 'grab',
        }}
      >
        <button
          onClick={onClick}
          className="absolute inset-0 text-left"
          style={{ cursor: 'inherit' }}
        />
        {/* Delete button — visible on hover */}
        {onDelete && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="absolute top-0.5 right-0.5 z-10 w-4 h-4 rounded-full bg-soren-card/80 text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-[#EF4444] hover:text-white"
            title="Supprimer"
          >
            <X size={9} />
          </button>
        )}
        <div className="flex flex-col px-2 py-1.5 pointer-events-none" style={{ height: cardH }}>
          {/* Top row: contact/title + Google dot */}
          <div className="flex items-start gap-1 min-w-0">
            <p
              className="text-[11px] font-semibold leading-snug flex-1 truncate"
              style={{ color }}
            >
              {name}
            </p>
            {isGoogle && (
              <span
                className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full"
                style={{ background: '#34A853' }}
                title="Google Calendar"
              />
            )}
          </div>

          {/* Subtext (title if contact shown) */}
          {cardH > 52 && subtext && (
            <p className="text-[10px] truncate leading-snug mt-0.5" style={{ color: color + 'BB' }}>
              {subtext}
            </p>
          )}

          {/* Notes inline (if card tall enough) */}
          {cardH > 52 && appt.notes && (
            <p className="text-[9px] leading-snug truncate mt-0.5" style={{ color: color + '88' }}>
              {appt.notes}
            </p>
          )}

          {/* Time at bottom right */}
          {cardH > 40 && (
            <div className="mt-auto flex justify-end">
              <span
                className="text-[10px] font-mono"
                style={{ color: color + 'AA' }}
              >
                {fmt(appt.startTime)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Overlap layout ───────────────────────────────────────────
function computeOverlapLayout(appts: Appointment[]): Map<string, { leftPct: number; widthPct: number }> {
  const result = new Map<string, { leftPct: number; widthPct: number }>()
  if (appts.length === 0) return result

  // Build overlap map
  const overlaps = new Map<string, Set<string>>()
  for (const a of appts) {
    overlaps.set(a.id, new Set())
    for (const b of appts) {
      if (a.id === b.id) continue
      const aS = new Date(a.startTime).getTime(), aE = new Date(a.endTime).getTime()
      const bS = new Date(b.startTime).getTime(), bE = new Date(b.endTime).getTime()
      if (aS < bE && aE > bS) overlaps.get(a.id)!.add(b.id)
    }
  }

  // Greedy column assignment
  const cols = new Map<string, number>()
  const sorted = [...appts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  for (const appt of sorted) {
    const used = new Set<number>()
    for (const id of overlaps.get(appt.id)!) { if (cols.has(id)) used.add(cols.get(id)!) }
    let c = 0; while (used.has(c)) c++
    cols.set(appt.id, c)
  }

  // Width = 1 / max simultaneous columns
  for (const appt of appts) {
    const myCol = cols.get(appt.id)!
    let maxCol = myCol
    for (const id of overlaps.get(appt.id)!) maxCol = Math.max(maxCol, cols.get(id) ?? 0)
    const numCols = maxCol + 1
    result.set(appt.id, { leftPct: (myCol / numCols) * 100, widthPct: (1 / numCols) * 100 })
  }
  return result
}

// ─── DraggableWeekCard ────────────────────────────────────────
function DraggableWeekCard({
  appt, cardH, top, leftPct, widthPct, onClick, onDelete,
}: {
  appt: Appointment
  cardH: number
  top: number
  leftPct: number
  widthPct: number
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   appt.id,
    data: { appt },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute"
      style={{ top, height: cardH, touchAction: 'none', left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
    >
      <WeekCard appt={appt} cardH={cardH} onClick={onClick} onDelete={onDelete} isDragging={isDragging} />
    </div>
  )
}

// ─── DragOverlay ghost card ───────────────────────────────────
function GhostCard({ appt, cardH }: { appt: Appointment; cardH: number }) {
  const color = appt.color || '#3462EE'
  const bg    = color + '20'

  const name = appt.contactName !== '—' ? appt.contactName : appt.title

  return (
    <div
      style={{
        width:           120,
        height:          cardH,
        borderRadius:    6,
        background:      bg,
        borderLeft:      `3px solid ${color}`,
        border:          `1px solid ${color}40`,
        borderLeftWidth: 3,
        borderLeftColor: color,
        opacity:         0.85,
        cursor:          'grabbing',
        overflow:        'hidden',
        padding:         '6px 8px',
        pointerEvents:   'none',
      }}
    >
      <p className="text-[11px] font-semibold truncate" style={{ color }}>
        {name}
      </p>
      <p className="text-[10px] font-mono mt-auto" style={{ color: color + 'AA' }}>
        {fmt(appt.startTime)}
      </p>
    </div>
  )
}

// ─── Main WeekGrid ────────────────────────────────────────────
function WeekGrid({
  weekOffset, appointments, onApptClick, onUpdateAppt, onDeleteAppt,
}: {
  weekOffset:    number
  appointments:  Appointment[]
  onApptClick:   (a: Appointment) => void
  onUpdateAppt:  (id: string, newStart: string, newEnd: string) => void
  onDeleteAppt:  (id: string, source?: 'ghl' | 'google') => void
}) {
  const today      = new Date(); today.setHours(0,0,0,0)
  const now        = new Date()
  const days       = getWeekDays(weekOffset)
  const hours      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const totalH     = HOUR_H * hours.length
  const scrollRef  = useRef<HTMLDivElement>(null)
  const colsRef    = useRef<HTMLDivElement>(null)

  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [weekOffset])

  const nowMins     = (now.getHours() - HOUR_START) * 60 + now.getMinutes()
  const nowTop      = (nowMins / 60) * HOUR_H
  const showNowLine = now.getHours() >= HOUR_START && now.getHours() < HOUR_END

  function handleDragStart(event: DragStartEvent) {
    const appt = (event.active.data.current as { appt: Appointment }).appt
    setActiveAppt(appt)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAppt(null)

    const { delta, active } = event
    if (!delta.x && !delta.y) return

    const appt = (active.data.current as { appt: Appointment }).appt

    // Column width from the container
    const colW = colsRef.current
      ? colsRef.current.getBoundingClientRect().width / 7
      : 0

    const dayDelta  = colW > 0 ? Math.round(delta.x / colW) : 0
    const minsDelta = Math.round((delta.y / HOUR_H) * 60 / 15) * 15 // snap to 15min

    if (dayDelta === 0 && minsDelta === 0) return

    const origStart = new Date(appt.startTime)
    const origEnd   = new Date(appt.endTime)
    const durMs     = origEnd.getTime() - origStart.getTime()

    const newStart = new Date(origStart.getTime() + dayDelta * 86400000 + minsDelta * 60000)
    const newEnd   = new Date(newStart.getTime() + durMs)

    onUpdateAppt(appt.id, newStart.toISOString(), newEnd.toISOString())

    // Fire-and-forget API calls
    if (appt.source === 'google') {
      const googleId = appt.id.replace('google-', '')
      fetch(`/api/google-events/${googleId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() }),
      }).catch(console.error)
    } else {
      fetch(`/api/calendar-event/${appt.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() }),
      }).catch(console.error)
    }
  }

  const activeCardH = activeAppt
    ? Math.max(
        (Math.round((new Date(activeAppt.endTime).getTime() - new Date(activeAppt.startTime).getTime()) / 60000) / 60) * HOUR_H - 4,
        44,
      )
    : 44

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-soren-card"
      style={{ borderRadius: 32, border: '1px solid #E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
    >
      {/* ── Day headers — sticky ── */}
      <div
        className="flex flex-shrink-0 border-b border-[#E8E8E6] sticky top-0 z-20 bg-soren-card"
        style={{ borderRadius: '32px 32px 0 0', overflow: 'hidden' }}
      >
        {/* Gutter */}
        <div className="w-20 flex-shrink-0 border-r border-[#E8E8E6] bg-soren-card" />
        {days.map((day, i) => {
          const isToday = sameDay(day, today)
          return (
            <div
              key={i}
              className="flex-1 py-3 px-2 border-r border-[#E8E8E6] last:border-r-0 flex flex-col items-center gap-0.5"
              style={{ background: isToday ? 'var(--bg-app)' : 'white' }}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-[#3462EE]' : 'text-soren-subtle'}`}>
                {DAYS_SHORT[i]}
              </p>
              <p className={`text-[22px] font-black leading-none ${isToday ? 'text-[#3462EE]' : 'text-soren-text'}`}>
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Scrollable time body ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto calendar-scroll">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex" style={{ height: totalH }}>

            {/* Time labels column */}
            <div className="w-20 flex-shrink-0 bg-soren-card border-r border-[#E8E8E6] flex flex-col">
              {hours.map((h, hi) => (
                <div
                  key={h}
                  className="flex-shrink-0 flex items-start justify-end pr-3.5"
                  style={{ height: HOUR_H }}
                >
                  <span className="text-[11px] text-[#ADADAD] font-medium" style={{ marginTop: hi === 0 ? 4 : -9 }}>
                    {fmtHour(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns + now-line wrapper */}
            <div ref={colsRef} className="flex flex-1 relative">

              {/* Current time line — purple, full width */}
              {showNowLine && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  style={{ top: nowTop }}
                >
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: 10, height: 10,
                      borderRadius: '50%',
                      background: '#B899D9',
                      border: '2px solid white',
                      marginLeft: -5,
                      boxShadow: '0 0 0 1px #B899D9',
                    }}
                  />
                  <div className="flex-1" style={{ height: 1.5, background: '#B899D9' }} />
                </div>
              )}

              {/* Individual day columns */}
              {days.map((day, di) => {
                const isToday  = sameDay(day, today)
                const dayAppts = appointments.filter(a => {
                  const d = new Date(a.startTime); d.setHours(0,0,0,0)
                  return sameDay(d, day)
                })

                return (
                  <div
                    key={di}
                    className="flex-1 relative border-r border-[#E8E8E6] last:border-r-0"
                    style={{
                      height: totalH,
                      background: isToday ? 'rgba(221,229,226,0.3)' : '#F5F5F3',
                    }}
                  >
                    {/* Hour lines */}
                    {hours.map((_, hi) => (
                      <div
                        key={hi}
                        className="absolute left-0 right-0"
                        style={{ top: hi * HOUR_H, borderTop: '1px solid #EAEAE8' }}
                      />
                    ))}
                    {/* Half-hour lines */}
                    {hours.map((_, hi) => (
                      <div
                        key={`hh-${hi}`}
                        className="absolute left-0 right-0"
                        style={{ top: hi * HOUR_H + HOUR_H / 2, borderTop: '1px dashed #F0F0EE' }}
                      />
                    ))}

                    {/* Event cards */}
                    {(() => {
                      const layout = computeOverlapLayout(dayAppts)
                      return dayAppts.map(appt => {
                        const s     = new Date(appt.startTime)
                        const e     = new Date(appt.endTime)
                        const mins  = (s.getHours() - HOUR_START) * 60 + s.getMinutes()
                        const dur   = Math.round((e.getTime() - s.getTime()) / 60000)
                        const top   = (mins / 60) * HOUR_H
                        const cardH = Math.max((dur / 60) * HOUR_H - 4, 44)
                        if (mins < 0 || mins > (HOUR_END - HOUR_START) * 60) return null
                        const { leftPct, widthPct } = layout.get(appt.id) ?? { leftPct: 0, widthPct: 100 }

                        return (
                          <DraggableWeekCard
                            key={appt.id}
                            appt={appt}
                            cardH={cardH}
                            top={top}
                            leftPct={leftPct}
                            widthPct={widthPct}
                            onClick={() => onApptClick(appt)}
                            onDelete={e => { e.stopPropagation(); onDeleteAppt(appt.id, appt.source) }}
                          />
                        )
                      })
                    })()}
                  </div>
                )
              })}
            </div>
          </div>

          <DragOverlay>
            {activeAppt && (
              <GhostCard appt={activeAppt} cardH={activeCardH} />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

// ─── Detail card (redesigned) ─────────────────────────────────
function DetailCard({
  appt, onClose, onDelete,
}: {
  appt:     Appointment
  onClose:  () => void
  onDelete: (id: string, source?: 'ghl' | 'google') => void
}) {
  const status    = STATUS_META[appt.status]
  const isGoogle  = appt.source === 'google'
  const dotColor  = isGoogle ? '#34A853' : '#B899D9'
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    onDelete(appt.id, appt.source)
  }

  return (
    <div className="bg-soren-card border border-soren-border overflow-hidden" style={{ borderRadius: 12 }}>
      {/* Header — dark */}
      <div
        className="flex items-start justify-between gap-2 px-4 py-3"
        style={{ background: '#111111' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: dotColor }}
            title={isGoogle ? 'Google Calendar' : 'GHL'}
          />
          <p className="text-[13px] font-bold text-white leading-snug truncate">{appt.title}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white/40 hover:text-white transition-colors mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-0 divide-y divide-[#F0F0EE] overflow-y-auto max-h-[60vh]">
        <DetailRow label="Statut">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </span>
        </DetailRow>

        <DetailRow label="Heure">
          <span className="text-[12px] font-semibold text-soren-text">
            {fmt(appt.startTime)} – {fmt(appt.endTime)}
            <span className="text-soren-subtle font-normal ml-1">({duration(appt.startTime, appt.endTime)})</span>
          </span>
        </DetailRow>

        {appt.contactName !== '—' && (
          <DetailRow label="Contact">
            <span className="text-[12px] text-soren-text">{appt.contactName}</span>
          </DetailRow>
        )}

        <DetailRow label="Calendrier">
          <span className="text-[12px] text-soren-text">{appt.calendarName}</span>
        </DetailRow>

        {appt.meetLink && (
          <DetailRow label="Meet">
            <a
              href={appt.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#1A73E8] hover:bg-[#1558B0] px-2.5 py-1 rounded-full transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
              Rejoindre Meet
            </a>
          </DetailRow>
        )}

        {appt.notes && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-soren-subtle font-semibold uppercase tracking-wider mb-1">Notes</p>
            <p className="text-[12px] text-soren-muted leading-relaxed whitespace-pre-line">{appt.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[#F0F0EE]">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[11px] font-semibold text-[#EF4444] hover:text-white hover:bg-[#EF4444] px-3 py-1.5 rounded-full border border-[#EF4444]/40 hover:border-[#EF4444] transition-all disabled:opacity-50"
        >
          {deleting ? 'Suppression…' : 'Supprimer'}
        </button>
        <button
          onClick={onClose}
          className="text-[11px] font-semibold text-soren-muted hover:text-soren-text px-3 py-1.5 rounded-full border border-soren-border hover:border-[#111111] transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-4 py-2.5">
      <p className="text-[10px] text-soren-subtle font-medium w-16 pt-0.5 flex-shrink-0">{label}</p>
      <div>{children}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function CalendarView({
  appointments: initial,
  calendars,
  googleConfigured = false,
}: {
  appointments:     Appointment[]
  calendars:        GHLCalendar[]
  googleConfigured?: boolean
}) {
  const router = useRouter()
  const now = new Date()
  const [appointments, setAppointments] = useState<Appointment[]>(initial)

  // Sync state when server refreshes data (e.g. after router.refresh())
  useEffect(() => {
    setAppointments(initial)
  }, [initial])
  const [refreshing, setRefreshing]     = useState(false)
  const [view,         setView]         = useState<ViewMode>('month')
  const [year,         setYear]         = useState(now.getFullYear())
  const [month,        setMonth]        = useState(now.getMonth())
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [selectedDay,  setSelectedDay]  = useState<Date | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showModal,    setShowModal]    = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    await new Promise(r => setTimeout(r, 1200))
    setRefreshing(false)
  }

  // Auto-sync: refresh when tab becomes visible + every 2 minutes
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') handleRefresh() }
    document.addEventListener('visibilitychange', onVisibility)
    const interval = setInterval(handleRefresh, 2 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(interval)
    }
  }, [])

  function prevPeriod() {
    if (view === 'month') { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
    else setWeekOffset(o => o - 1)
  }
  function nextPeriod() {
    if (view === 'month') { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
    else setWeekOffset(o => o + 1)
  }
  function goToday() {
    setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekOffset(0)
  }

  const periodLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS_FR[month]} ${year}`
    const days  = getWeekDays(weekOffset)
    const first = days[0]; const last = days[6]
    if (first.getMonth() === last.getMonth())
      return `${first.getDate()}–${last.getDate()} ${MONTHS_FR[first.getMonth()]} ${first.getFullYear()}`
    return `${first.getDate()} ${MONTHS_FR[first.getMonth()]} – ${last.getDate()} ${MONTHS_FR[last.getMonth()]}`
  }, [view, year, month, weekOffset])

  const upcomingOnDay = useMemo(() => {
    if (!selectedDay) return []
    return appointments
      .filter(a => { const d = new Date(a.startTime); d.setHours(0,0,0,0); return sameDay(d, selectedDay) })
      .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [selectedDay, appointments])

  // ── Update appointment times (after drag) ──────────────────
  function handleUpdateAppt(id: string, newStart: string, newEnd: string) {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, startTime: newStart, endTime: newEnd } : a),
    )
    // Also update selected appt if it's the one being moved
    setSelectedAppt(prev =>
      prev?.id === id ? { ...prev, startTime: newStart, endTime: newEnd } : prev,
    )
  }

  // ── Delete appointment ─────────────────────────────────────
  function handleDelete(id: string, source?: 'ghl' | 'google') {
    // Optimistic remove
    setAppointments(prev => prev.filter(a => a.id !== id))
    setSelectedAppt(null)

    if (source === 'google') {
      const googleId = id.replace('google-', '')
      fetch(`/api/google-events/${googleId}`, { method: 'DELETE' }).catch(console.error)
    } else {
      // GHL (or unknown source — try GHL)
      fetch(`/api/calendar-event/${id}`, { method: 'DELETE' }).catch(console.error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 gap-2 min-w-0">
          {/* Left: title + nav */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <h1 className="text-2xl font-black text-soren-text leading-none whitespace-nowrap">Calendrier</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={goToday}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-soren-card border border-soren-border text-soren-muted hover:bg-soren-elevated hover:text-soren-text transition-colors whitespace-nowrap"
              >
                Aujourd'hui
              </button>
              <button
                onClick={prevPeriod}
                className="w-6 h-6 rounded-full bg-soren-card border border-soren-border flex items-center justify-center text-soren-muted hover:bg-soren-elevated transition-colors"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={nextPeriod}
                className="w-6 h-6 rounded-full bg-soren-card border border-soren-border flex items-center justify-center text-soren-muted hover:bg-soren-elevated transition-colors"
              >
                <ChevronRight size={12} />
              </button>
              <span className="text-sm font-bold text-soren-text ml-1 whitespace-nowrap">{periodLabel}</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Google badge */}
            {googleConfigured ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#34A853]/30 bg-[#34A853]/10 text-[11px] font-semibold text-[#34A853] whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#34A853] flex-shrink-0" />
                Google Calendar
              </div>
            ) : (
              <a
                href="/api/auth/google"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-soren-border text-[11px] font-semibold text-soren-muted hover:text-soren-text hover:border-[#111111] transition-colors whitespace-nowrap"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connecter Google
              </a>
            )}
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Rafraîchir"
              className="w-7 h-7 rounded-full bg-soren-card border border-soren-border flex items-center justify-center text-soren-muted hover:bg-soren-elevated disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {/* View tabs */}
            <div className="flex items-center bg-soren-card border border-soren-border rounded-full p-0.5">
              {(['month', 'week'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    view === v ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text'
                  }`}
                >
                  {v === 'month' ? 'Mois' : 'Semaine'}
                </button>
              ))}
            </div>
            {/* New button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-soren-sidebar hover:bg-[#2a2a2a] text-white text-[13px] font-semibold px-3.5 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              <Plus size={12} />
              Nouveau RDV
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden flex">
          {view === 'month' ? (
            <MonthGrid
              year={year}
              month={month}
              appointments={appointments}
              selectedDay={selectedDay}
              onDayClick={d => { setSelectedDay(d); setSelectedAppt(null) }}
              onApptClick={a => { setSelectedAppt(a); setSelectedDay(null) }}
            />
          ) : (
            <WeekGrid
              weekOffset={weekOffset}
              appointments={appointments}
              onApptClick={a => { setSelectedAppt(a); setSelectedDay(null) }}
              onUpdateAppt={handleUpdateAppt}
              onDeleteAppt={handleDelete}
            />
          )}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-l border-soren-border bg-soren-app">

        {/* Mini calendar */}
        <MiniCal
          year={year}
          month={month}
          selected={selectedDay}
          onSelect={d => { setSelectedDay(d); setSelectedAppt(null); setYear(d.getFullYear()); setMonth(d.getMonth()) }}
          onNav={(y, m) => { setYear(y); setMonth(m) }}
        />

        {/* Selected appointment detail */}
        {selectedAppt && (
          <DetailCard
            appt={selectedAppt}
            onClose={() => setSelectedAppt(null)}
            onDelete={handleDelete}
          />
        )}

        {/* Events on selected day */}
        {selectedDay && !selectedAppt && upcomingOnDay.length > 0 && (
          <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
            <p className="text-[10px] font-bold text-soren-subtle uppercase tracking-wider px-4 pt-3 pb-2">
              {selectedDay.getDate()} {MONTHS_FR[selectedDay.getMonth()]}
            </p>
            {upcomingOnDay.map(appt => (
              <button
                key={appt.id}
                onClick={() => setSelectedAppt(appt)}
                className="w-full text-left px-4 py-2.5 border-t border-[#F0F0EE] hover:bg-[#F9F9F7] transition-colors flex items-start gap-2"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: appt.color }} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-soren-text truncate">{appt.title}</p>
                  <p className="text-[10px] text-soren-subtle">{fmt(appt.startTime)} – {fmt(appt.endTime)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected day empty state */}
        {selectedDay && !selectedAppt && upcomingOnDay.length === 0 && (
          <div className="bg-soren-card border border-soren-border rounded-2xl p-4 text-center">
            <p className="text-xs text-soren-subtle">Aucun RDV ce jour</p>
          </div>
        )}

        {/* Upcoming appointments */}
        {!selectedDay && !selectedAppt && (
          <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
            <p className="text-[10px] font-bold text-soren-subtle uppercase tracking-wider px-4 pt-3 pb-2">À venir</p>
            {appointments
              .filter(a => new Date(a.startTime) >= new Date())
              .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 6)
              .map(appt => (
                <button
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  className="w-full text-left px-4 py-2.5 border-t border-[#F0F0EE] hover:bg-[#F9F9F7] transition-colors flex items-start gap-2"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: appt.color }} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-soren-text truncate">{appt.title}</p>
                    <p className="text-[10px] text-soren-subtle">
                      {new Date(appt.startTime).getDate()} {MONTHS_FR[new Date(appt.startTime).getMonth()]} · {fmt(appt.startTime)}
                    </p>
                  </div>
                </button>
              ))}
            {appointments.filter(a => new Date(a.startTime) >= new Date()).length === 0 && (
              <p className="text-xs text-soren-subtle text-center py-4">Aucun rendez-vous à venir</p>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <NewAppointmentModal
          calendars={calendars}
          onClose={() => setShowModal(false)}
          onCreated={appt => {
            setAppointments(prev => [appt, ...prev])
            setSelectedAppt(appt)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
