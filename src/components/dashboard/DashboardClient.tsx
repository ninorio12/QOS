'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Settings, TrendingUp, BotMessageSquare,
  GitMerge, Users, MessageSquare, CalendarDays,
  ArrowUpRight, Plus, X, Check,
  CheckSquare, FileText, ScrollText, Database, Wallet, Cpu,
  Circle, ChevronLeft, ChevronRight,
} from 'lucide-react'
const WeeklyBarChart        = dynamic(() => import('./WeeklyBarChart'),        { ssr: false })
const MonthlyAreaChart      = dynamic(() => import('./MonthlyAreaChart'),      { ssr: false })
const ClientTimelineChart   = dynamic(() => import('./ClientTimelineChart'),   { ssr: false })
import type { WeeklyDay, MonthlyPoint, ClientTimelinePoint, MetierBreakdown, Payment } from '@/lib/dashboard'
import { getAvatarColor } from '@/components/contacts/types'
import { PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer } from 'recharts'

const NewLeadWidget  = dynamic(() => import('@/components/shared/NewLeadWidget'),        { ssr: false })
const RollingNumber  = dynamic(() => import('@/components/dashboard/RollingNumber'),     { ssr: false })


// ─── Types ────────────────────────────────────────────────────
interface StageBreakdown {
  label: string
  count: number
  value: number
  color: string
  pct: number
}

interface RecentOpp {
  id: string
  contactName: string
  value: number
  stage: string
  tag: string
  date: string
  color: string
  textColor: string
}

interface DashboardProps {
  activeLeads:      number
  pipelineValue:    number
  wonLeads:         number
  totalLeads:       number
  stageBreakdown:   StageBreakdown[]
  recentOpps:       RecentOpp[]
  weeklyBreakdown:  WeeklyDay[]
  monthlyPipeline:  MonthlyPoint[]
  clientTimeline:   ClientTimelinePoint[]
  metierBreakdown:  MetierBreakdown[]
  payments:         Payment[]
  wonCA:            number
}

// ─── Helpers ──────────────────────────────────────────────────
function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
  return `€${Math.round(value).toLocaleString('fr-FR')}`
}

function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * ease))
      if (p < 1) requestAnimationFrame(step)
      else { setVal(target); fromRef.current = target }
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}


// ─── New Lead Modal ───────────────────────────────────────────
function NewLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [pipeline, setPipeline] = useState('ACQUISITION')
  const [value,    setValue]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, phone, pipeline, value }),
      })
      if (res.ok) { onClose(); onSuccess() }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center">
      <div
        className="bg-soren-card rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 mt-20"
        style={{ animation: 'fadeSlideUp 200ms ease-out both' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-soren-text">Nouveau Lead</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
            <X size={14} className="text-soren-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input required placeholder="Nom du contact" value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#3462EE]/40" />
          <input type="tel" placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#3462EE]/40" />
          <select value={pipeline} onChange={e => setPipeline(e.target.value)}
            className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none cursor-pointer">
            <option value="ACQUISITION">ACQUISITION</option>
            <option value="RÉACTIVATION">RÉACTIVATION</option>
            <option value="RÉCEPTION">RÉCEPTION</option>
          </select>
          <input type="number" placeholder="Valeur estimée (€)" value={value} onChange={e => setValue(e.target.value)}
            className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#3462EE]/40" />
          <button type="submit" disabled={loading || !name.trim()}
            className="w-full bg-soren-sidebar hover:bg-[#2a2a2a] disabled:opacity-50 text-white font-semibold rounded-full py-3 text-sm transition-colors mt-1">
            {loading ? 'Création...' : 'Créer le lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Date Range Calendar ──────────────────────────────────────
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['L','M','M','J','V','S','D']

const PRESETS = [
  { label: '7 derniers jours',     key: '7d'      },
  { label: '4 dernières semaines', key: '4w'      },
  { label: '6 derniers mois',      key: '6m'      },
  { label: '12 derniers mois',     key: '12m'     },
  { label: 'Mois en cours',        key: 'month'   },
  { label: 'Trimestre en cours',   key: 'quarter' },
  { label: 'Année en cours',       key: 'year'    },
  { label: 'Toutes les périodes',  key: 'all'     },
]

function getPresetRange(key: string): { start: Date; end: Date } {
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

function DateRangePicker({ onClose, onApply }: { onClose: () => void; onApply: (start: Date, end: Date, label: string) => void }) {
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

// ─── Toast ────────────────────────────────────────────────────
function Toast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-soren-sidebar text-white rounded-full px-5 py-2 text-sm font-medium shadow-xl pointer-events-none flex items-center gap-2"
      style={{ animation: 'fadeSlideUp 300ms ease-out both' }}
    >
      <Check size={14} className="text-[#FF4D00]" />
      Lead créé
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────
interface AgentTask {
  id: string
  title: string
  agent: string
  col: string
}
interface AgentLog {
  id: string
  message: string
  level: string
  agent: string
  created_at: string
}

// ─── Main export ──────────────────────────────────────────────
export default function DashboardClient({
  activeLeads      = 0,
  pipelineValue    = 0,
  wonLeads         = 0,
  totalLeads       = 0,
  stageBreakdown   = [],
  recentOpps       = [],
  weeklyBreakdown  = [],
  monthlyPipeline  = [],
  clientTimeline   = [],
  metierBreakdown  = [],
  payments         = [],
  wonCA            = 0,
}: DashboardProps) {
  const router = useRouter()
  const [showModal,       setShowModal]       = useState(false)
  const [showToast,       setShowToast]       = useState(false)
  const [tasks,           setTasks]           = useState<AgentTask[]>([])
  const [logs,            setLogs]            = useState<AgentLog[]>([])
  const [calendarOpen,    setCalendarOpen]    = useState(false)
  const [activeRange,     setActiveRange]     = useState<{ start: Date; end: Date; label: string } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then((d: { tasks?: AgentTask[] }) => setTasks(d.tasks?.slice(0, 4) ?? [])).catch(() => {})
    fetch('/api/agent-logs?limit=4').then(r => r.json()).then((d: { logs?: AgentLog[] }) => setLogs(d.logs?.slice(0, 4) ?? [])).catch(() => {})
  }, [])

  const leadsAnim    = useCountUp(activeLeads)
  const pipelineAnim = useCountUp(pipelineValue)
  const LEADS_TARGET = 50
  const leadsPct     = Math.min(Math.round((activeLeads / LEADS_TARGET) * 100), 100)
  const filledBars   = Math.min(Math.round((activeLeads / LEADS_TARGET) * 8), 8)

  function handleSuccess() {
    setShowToast(true)
    router.refresh()
    setTimeout(() => setShowToast(false), 3000)
  }

  const visibleStages = stageBreakdown.filter(s => s.count > 0).slice(0, 4)
  const r1Count = stageBreakdown.find(s => s.label.toLowerCase().includes('r1'))?.count ?? 0
  const r2Count = stageBreakdown.find(s => s.label.toLowerCase().includes('r2'))?.count ?? 0

  const FALLBACK_ACTIVITY = [
    { dot: '#FF4D00', name: 'Martin Dupont', action: 'Nouveau lead qualifié',  date: "Aujourd'hui 09:14" },
    { dot: '#111111', name: 'Kai (IA)',       action: 'Appel vocal envoyé',     date: "Aujourd'hui 08:45" },
    { dot: '#6B7280', name: 'Sophie Renard', action: 'Devis consulté',          date: 'Hier 17:32' },
    { dot: '#D1D5DB', name: 'Carlos Mendes', action: 'Relance automatique',    date: 'Hier 14:20' },
  ]

  const activity = recentOpps.length > 0
    ? recentOpps.slice(0, 4).map(o => ({
        dot:    o.color,
        name:   o.contactName,
        action: o.tag,
        date:   o.date,
      }))
    : FALLBACK_ACTIVITY

  const MONTH_LABEL = activeRange?.label ?? new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const filteredTimeline = useMemo(() => {
    if (!activeRange) return clientTimeline
    const { start, end } = activeRange
    return clientTimeline.filter(p => {
      const d = new Date(p.date)
      return d >= start && d <= end
    })
  }, [clientTimeline, activeRange])

  const filteredPayments = useMemo(() => {
    if (!activeRange) return payments
    const { start, end } = activeRange
    return payments.filter(p => {
      const d = new Date(p.date)
      return d >= start && d <= end
    })
  }, [payments, activeRange])

  const periodCA      = useMemo(() => filteredPayments.reduce((s, p) => s + p.montant, 0), [filteredPayments])
  const periodClients = filteredPayments.length

  const weeklyData = weeklyBreakdown

  const objectives = useMemo(() => {
    const qualCount  = stageBreakdown.find(s => s.label.toLowerCase().includes('qualif'))?.count ?? 0
    const convRate   = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
    const CA_TARGET  = 100_000
    const QUAL_TARGET = 30
    const CONV_TARGET = 25
    return [
      {
        label: "Chiffre d'affaires",
        current: fmt(pipelineValue),
        target: fmt(CA_TARGET),
        pct: Math.min(Math.round((pipelineValue / CA_TARGET) * 100), 100),
        barColor: '#FF4D00', textColor: '#ffffff',
        bg: '#FF4D00', labelC: '#556b00',
      },
      {
        label: 'Leads qualifiés',
        current: String(qualCount),
        target: String(QUAL_TARGET),
        pct: Math.min(Math.round((qualCount / QUAL_TARGET) * 100), 100),
        barColor: '#FF4D00', textColor: '#ffffff',
        bg: '#1C1C1E', labelC: '#666',
      },
      {
        label: 'Taux de conversion',
        current: `${convRate}%`,
        target: `${CONV_TARGET}%`,
        pct: Math.min(Math.round((convRate / CONV_TARGET) * 100), 100),
        barColor: '#111111', textColor: '#111111',
        bg: '#ffffff', labelC: '#888',
      },
    ]
  }, [pipelineValue, wonLeads, totalLeads, stageBreakdown])

  const ALL_MODULES = [
    { href: '/pipeline',      Icon: GitMerge,         label: 'Pipeline' },
    { href: '/contacts',      Icon: Users,            label: 'Contacts' },
    { href: '/conversations', Icon: MessageSquare,    label: 'Conversations' },
    { href: '/calendrier',    Icon: CalendarDays,     label: 'Calendrier' },
    { href: '/analyse',       Icon: TrendingUp,       label: 'Analyse' },
    { href: '/equipe',        Icon: BotMessageSquare, label: 'Équipe IA' },
    { href: '/taches',        Icon: CheckSquare,      label: 'Tâches' },
    { href: '/logs',          Icon: ScrollText,       label: 'Logs' },
    { href: '/knowledge',     Icon: Database,         label: 'Knowledge Base' },
    { href: '/budget',        Icon: Wallet,           label: 'Budget' },
    { href: '/parametres',    Icon: Settings,         label: 'Paramètres' },
  ]

  const pathname = usePathname()

  useEffect(() => {
    const match = ALL_MODULES.find(m => pathname.startsWith(m.href))
    if (!match) return
    const key = 'vividflow_recent_modules'
    const prev: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const next = [match.href, ...prev.filter(h => h !== match.href)].slice(0, 6)
    localStorage.setItem(key, JSON.stringify(next))
  }, [pathname])

  const recentModules = useMemo(() => {
    if (typeof window === 'undefined') return ALL_MODULES.slice(0, 6)
    const stored: string[] = JSON.parse(localStorage.getItem('vividflow_recent_modules') ?? '[]')
    if (stored.length === 0) return ALL_MODULES.slice(0, 6)
    return stored
      .map(href => ALL_MODULES.find(m => m.href === href))
      .filter(Boolean) as typeof ALL_MODULES
  }, [pathname])

  return (
    <>
      {/* ── Title ── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Calendar date range picker */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setCalendarOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                calendarOpen
                  ? 'bg-soren-sidebar text-white border-soren-sidebar'
                  : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-text'
              }`}
            >
              <CalendarDays size={13} />
              <span>Période</span>
            </button>
            {calendarOpen && (
              <DateRangePicker
                onClose={() => setCalendarOpen(false)}
                onApply={(start, end, label) => { setActiveRange({ start, end, label }); setCalendarOpen(false) }}
              />
            )}
          </div>
        </div>
        <div className="flex-shrink-0"><NewLeadWidget compact /></div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div
        className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3"
        style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}
      >
        {[
          { label: 'Clients',        value: String(activeRange ? periodClients : wonLeads),   sub: 'durant la période' },
          { label: 'CA encaissé',    value: fmt(activeRange ? periodCA : wonCA),              sub: 'durant la période' },
          { label: 'CA à collecter', value: '—',                sub: 'durant la période' },
          { label: 'Leads',          value: String(totalLeads), sub: 'actifs'            },
          { label: 'R1',             value: String(r1Count),    sub: 'effectués'         },
          { label: 'R2',             value: String(r2Count),    sub: 'effectués'         },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60">
            <span className="text-[11px] font-medium text-soren-muted leading-none">{label}</span>
            <RollingNumber value={value} className="text-[26px] md:text-[30px] font-black text-soren-text leading-none tabular-nums" />
            <span className="text-[10px] font-semibold text-[#FF4D00]/70">{sub}</span>
          </div>
        ))}
      </div>

      {/* ── Clients sur la période + Métiers clients ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">

        {/* Clients sur la période */}
        <div
          className="md:col-span-2 bg-soren-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col"
          style={{ animation: 'fadeSlideUp 400ms ease-out 350ms both' }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
            <div>
              <span className="font-jakarta text-[13px] font-semibold text-soren-text">Clients sur la période</span>
              <p className="font-jakarta text-[10px] font-normal text-soren-subtle mt-0.5">{MONTH_LABEL}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-soren-text bg-soren-elevated px-3 py-1 rounded-full">
                {wonLeads} client{wonLeads !== 1 ? 's' : ''}&nbsp;&nbsp;·&nbsp;&nbsp;CA encaissé total : {fmt(wonCA)}
              </span>
            </div>
          </div>
          <div className="h-[180px] md:h-[200px] px-2 pb-4">
            <ClientTimelineChart data={filteredTimeline} />
          </div>
        </div>

        {/* Métiers clients */}
        <div
          className="bg-soren-card rounded-2xl md:rounded-3xl p-5 shadow-sm flex flex-col gap-4"
          style={{ animation: 'fadeSlideUp 400ms ease-out 400ms both' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Métiers clients</span>
            <ArrowUpRight size={14} className="text-soren-muted" />
          </div>
          {metierBreakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-soren-subtle">Aucune donnée</div>
          ) : (
            <>
              <div className="relative h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metierBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={54}
                      strokeWidth={0}
                    >
                      {metierBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <PieTooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, padding: '6px 10px' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[22px] font-black text-soren-text">{wonLeads}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {metierBreakdown.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    <span className="text-[11px] text-soren-muted flex-1 truncate">{m.label}</span>
                    <span className="text-[11px] font-semibold text-soren-text">{m.count}</span>
                    <span className="text-[10px] text-soren-subtle w-9 text-right">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Paiements encaissés + Publicités ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">

        {/* Paiements encaissés — col-span-2 */}
        <div
          className="md:col-span-2 bg-soren-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex flex-col"
          style={{ animation: 'fadeSlideUp 400ms ease-out 450ms both' }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-soren-border/60 flex-shrink-0">
            <span className="font-jakarta text-[12px] font-semibold text-soren-text">Paiements encaissés</span>
            <span className="text-[10px] font-semibold text-[#FF4D00]/70">durant la période</span>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="px-5 py-6 text-center text-[11px] text-soren-subtle">Aucun paiement sur la période</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-soren-border/60">
                    {['DATE', 'CLIENT', 'ENTREPRISE', 'MONTANT', 'DESCRIPTION', 'STATUT'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold text-soren-subtle tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, i) => (
                    <tr key={i} className="border-b border-soren-border/40 hover:bg-soren-elevated/50 transition-colors">
                      <td className="px-4 py-2 text-[11px] text-soren-muted whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-[11px] font-medium text-soren-text whitespace-nowrap">{p.client}</td>
                      <td className="px-4 py-2 text-[11px] text-soren-muted whitespace-nowrap">{p.entreprise}</td>
                      <td className="px-4 py-2 text-[12px] font-bold text-[#FF4D00] whitespace-nowrap">{fmt(p.montant)}</td>
                      <td className="px-4 py-2 text-[11px] text-soren-muted max-w-[160px] truncate">{p.description}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">{p.statut}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Publicités investies */}
        <div
          className="bg-soren-card rounded-2xl md:rounded-3xl shadow-sm flex flex-col p-5 gap-4"
          style={{ animation: 'fadeSlideUp 400ms ease-out 480ms both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Publicités investies</span>
            <span className="text-[10px] font-semibold text-[#FF4D00]/70">durant la période</span>
          </div>

          {/* Platform + budget */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 291 191" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <defs>
                  <linearGradient id="mg1" x1="61" y1="117" x2="259" y2="127" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0064e1" offset="0"/><stop stopColor="#0064e1" offset="0.4"/>
                    <stop stopColor="#0073ee" offset="0.83"/><stop stopColor="#0082fb" offset="1"/>
                  </linearGradient>
                  <linearGradient id="mg2" x1="45" y1="139" x2="45" y2="66" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0082fb" offset="0"/><stop stopColor="#0064e0" offset="1"/>
                  </linearGradient>
                </defs>
                <path fill="#0081fb" d="m31.06,125.96c0,10.98 2.41,19.41 5.56,24.51 4.13,6.68 10.29,9.51 16.57,9.51 8.1,0 15.51-2.01 29.79-21.76 11.44-15.83 24.92-38.05 33.99-51.98l15.36-23.6c10.67-16.39 23.02-34.61 37.18-46.96 11.56-10.08 24.03-15.68 36.58-15.68 21.07,0 41.14,12.21 56.5,35.11 16.81,25.08 24.97,56.67 24.97,89.27 0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75l0-31.02c17.63,0 22.03-16.2 22.03-34.74 0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16.05c-18.2,32.27-22.81,39.62-31.91,51.75-15.95,21.24-29.57,29.29-47.5,29.29-21.27,0-34.72-9.21-43.05-23.09-6.8-11.31-10.14-26.15-10.14-43.06z"/>
                <path fill="url(#mg1)" d="m24.49,37.3c14.24-21.95 34.79-37.3 58.36-37.3 13.65,0 27.22,4.04 41.39,15.61 15.5,12.65 32.02,33.48 52.63,67.81l7.39,12.32c17.84,29.72 27.99,45.01 33.93,52.22 7.64,9.26 12.99,12.02 19.94,12.02 17.63,0 22.03-16.2 22.03-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71l-25.79-43.08c-12.94-21.62-24.81-37.74-31.68-45.04-7.39-7.85-16.89-17.33-32.05-17.33-12.27,0-22.69,8.61-31.41,21.78z"/>
                <path fill="url(#mg2)" d="m82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78-12.33,18.61-19.88,46.33-19.88,72.95 0,10.98 2.41,19.41 5.56,24.51l-26.48,17.44c-6.8-11.31-10.14-26.15-10.14-43.06 0-30.75 8.44-62.8 24.49-87.55 14.24-21.95 34.79-37.3 58.36-37.3z"/>
              </svg>
              <div>
                <p className="text-[11px] font-semibold text-soren-text leading-none">Meta Ads</p>
                <p className="text-[9px] text-soren-subtle mt-0.5">Facebook · Instagram</p>
              </div>
            </div>
            <p className="text-[20px] font-black text-soren-text tabular-nums">{fmt(1200)}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-2 pt-1 border-t border-soren-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-soren-muted">Leads générés</span>
              <span className="text-[13px] font-bold text-soren-text tabular-nums">8</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-soren-muted">Coût par lead</span>
              <span className="text-[13px] font-bold text-soren-text tabular-nums">{fmt(150)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-soren-muted">ROI estimé</span>
              <span className="text-[13px] font-bold tabular-nums" style={{ color: '#16a34a' }}>×{(periodCA/1200).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <NewLeadModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
<Toast visible={showToast} />
    </>
  )
}
