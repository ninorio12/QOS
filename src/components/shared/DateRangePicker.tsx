'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['L','M','M','J','V','S','D']

export const PRESETS = [
  { label: '7 derniers jours',     key: '7d'      },
  { label: '4 dernières semaines', key: '4w'      },
  { label: '6 derniers mois',      key: '6m'      },
  { label: '12 derniers mois',     key: '12m'     },
  { label: 'Mois en cours',        key: 'month'   },
  { label: 'Trimestre en cours',   key: 'quarter' },
  { label: 'Année en cours',       key: 'year'    },
  { label: 'Toutes les périodes',  key: 'all'     },
]

export function getPresetRange(key: string): { start: Date; end: Date } {
  const today = new Date(); today.setHours(0,0,0,0)
  const end   = new Date(today)
  switch (key) {
    case '7d':      { const s = new Date(today); s.setDate(today.getDate()-6);              return { start: s, end } }
    case '4w':      { const s = new Date(today); s.setDate(today.getDate()-27);             return { start: s, end } }
    case '6m':      { const s = new Date(today); s.setMonth(today.getMonth()-6);            return { start: s, end } }
    case '12m':     { const s = new Date(today); s.setFullYear(today.getFullYear()-1);      return { start: s, end } }
    case 'month':   { return { start: new Date(today.getFullYear(), today.getMonth(), 1), end } }
    case 'quarter': { const q = Math.floor(today.getMonth()/3); return { start: new Date(today.getFullYear(), q*3, 1), end } }
    case 'year':    { return { start: new Date(today.getFullYear(), 0, 1), end } }
    default:        { return { start: new Date(today.getFullYear(), 0, 1), end } }
  }
}

function fmtDateInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().slice(0,10)
}

function MonthGrid({
  year, month, start, end, hover,
  onDayClick, onDayHover, hasEnd,
}: {
  year: number; month: number
  start: Date|null; end: Date|null; hover: Date|null
  onDayClick: (d: Date) => void
  onDayHover: (d: Date|null) => void
  hasEnd: boolean
}) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const offset      = (firstDay + 6) % 7
  const cells: (Date|null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  function isSel(day: Date)   { return (start && day.toDateString()===start.toDateString()) || (end && day.toDateString()===end.toDateString()) || false }
  function isStart(day: Date) { return start ? day.toDateString()===start.toDateString() : false }
  function isEnd(day: Date)   { return end   ? day.toDateString()===end.toDateString()   : false }
  function inRange(day: Date) {
    const s = start; const e = end ?? hover
    if (!s || !e) return false
    const lo = s<=e?s:e; const hi = s<=e?e:s
    return day>lo && day<hi
  }

  return (
    <div>
      <p className="text-[13px] font-bold text-[#111] mb-3 capitalize">{MONTHS_FR[month]} {year}</p>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d,i) => <div key={i} className="text-center text-[11px] font-semibold text-[#9CA3AF] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const sel   = isSel(day)
          const range = inRange(day)
          const start_ = isStart(day)
          const end_   = isEnd(day)
          return (
            <div
              key={i}
              className={`relative flex items-center justify-center h-8 text-[12px] cursor-pointer select-none
                ${range ? 'bg-[#FF4D00]/10' : ''}
                ${start_ && end ? 'rounded-l-full' : ''}
                ${end_          ? 'rounded-r-full' : ''}
                ${start_ && !end ? 'rounded-full' : ''}
              `}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => !hasEnd && onDayHover(day)}
            >
              <span className={`
                w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-medium transition-colors
                ${sel   ? 'bg-[#FF4D00] text-white font-bold' : ''}
                ${!sel && range ? 'text-[#FF4D00]' : ''}
                ${!sel && !range ? 'hover:bg-[#F3F4F6] text-[#111]' : ''}
              `}>
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({ onClose, onApply }: { onClose: () => void; onApply: (start: Date, end: Date, label: string) => void }) {
  const today        = new Date(); today.setHours(0,0,0,0)
  const initial      = getPresetRange('4w')
  const [preset,     setPreset]    = useState('4w')
  const [start,      setStart]     = useState<Date|null>(initial.start)
  const [end,        setEnd]       = useState<Date|null>(initial.end)
  const [hover,      setHover]     = useState<Date|null>(null)
  const [leftYear,   setLeftYear]  = useState(initial.start.getFullYear())
  const [leftMonth,  setLeftMonth] = useState(initial.start.getMonth())

  const rightMonth = leftMonth === 11 ? 0  : leftMonth + 1
  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear

  function prevLeft() {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear(y=>y-1) }
    else setLeftMonth(m=>m-1)
  }
  function nextLeft() {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear(y=>y+1) }
    else setLeftMonth(m=>m+1)
  }

  function handlePreset(key: string) {
    setPreset(key)
    if (key === 'custom') { setStart(null); setEnd(null); return }
    const { start: s, end: e } = getPresetRange(key)
    setStart(s); setEnd(e)
    setLeftYear(s.getFullYear()); setLeftMonth(s.getMonth())
  }

  function handleDayClick(day: Date) {
    setPreset('custom')
    if (!start || (start && end)) { setStart(day); setEnd(null) }
    else {
      if (day < start) { setEnd(start); setStart(day) }
      else setEnd(day)
    }
  }

  function handleInputChange(which: 'start'|'end', val: string) {
    if (!val) return
    const d = new Date(val); d.setHours(0,0,0,0)
    if (which==='start') { setStart(d); setLeftYear(d.getFullYear()); setLeftMonth(d.getMonth()) }
    else setEnd(d)
    setPreset('custom')
  }

  return (
    <div
      className="absolute top-full mt-2 left-0 z-50 flex rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
      style={{ animation: 'fadeSlideUp 180ms ease-out both', minWidth: 640 }}
      onMouseLeave={() => setHover(null)}
    >
      {/* Left — Presets */}
      <div className="bg-[#F9F9F7] border-r border-[#E5E7EB] py-4 px-1 flex flex-col gap-0.5 min-w-[175px]">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`text-left px-4 py-2 text-[13px] rounded-lg transition-colors w-full
              ${preset===p.key ? 'text-[#FF4D00] font-semibold' : 'text-[#374151] hover:bg-[#F0F0EE]'}
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Right — Calendars */}
      <div className="bg-white flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[16px] font-black text-[#111]">Calendrier</h2>
          <span className="text-[12px] text-[#9CA3AF]">Sélection précise</span>
        </div>

        {/* Du / Au inputs */}
        <div className="flex items-center gap-4 px-5 pb-4">
          <div className="flex-1">
            <p className="text-[11px] text-[#9CA3AF] mb-1 font-medium">Du</p>
            <input
              type="date"
              value={fmtDateInput(start)}
              onChange={e => handleInputChange('start', e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111] outline-none focus:border-[#FF4D00] transition-colors"
            />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-[#9CA3AF] mb-1 font-medium">Au</p>
            <input
              type="date"
              value={fmtDateInput(end)}
              onChange={e => handleInputChange('end', e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111] outline-none focus:border-[#FF4D00] transition-colors"
            />
          </div>
        </div>

        {/* Two months */}
        <div className="flex items-start gap-0 px-5 pb-4">
          {/* Month nav left */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevLeft} className="w-7 h-7 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center">
                <ChevronLeft size={13} className="text-[#9CA3AF]" />
              </button>
              <div className="flex-1" />
            </div>
            <MonthGrid
              year={leftYear} month={leftMonth}
              start={start} end={end} hover={hover}
              onDayClick={handleDayClick}
              onDayHover={d => setHover(d)}
              hasEnd={!!end}
            />
          </div>

          <div className="w-6" />

          {/* Month nav right */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1" />
              <button onClick={nextLeft} className="w-7 h-7 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center">
                <ChevronRight size={13} className="text-[#9CA3AF]" />
              </button>
            </div>
            <MonthGrid
              year={rightYear} month={rightMonth}
              start={start} end={end} hover={hover}
              onDayClick={handleDayClick}
              onDayHover={d => setHover(d)}
              hasEnd={!!end}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 pb-4">
          <button
            onClick={() => {
              if (start && end) {
                const label = preset === 'custom'
                  ? `${start.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })} – ${end.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}`
                  : (PRESETS.find(p => p.key === preset)?.label ?? 'Période')
                onApply(start, end, label)
              }
              onClose()
            }}
            className="bg-[#111111] hover:bg-[#222] text-white text-[13px] font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}
