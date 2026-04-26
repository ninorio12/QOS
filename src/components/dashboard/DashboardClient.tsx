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
} from 'lucide-react'
const WeeklyBarChart   = dynamic(() => import('./WeeklyBarChart'),   { ssr: false })
const MonthlyAreaChart = dynamic(() => import('./MonthlyAreaChart'), { ssr: false })
import type { WeeklyDay, MonthlyPoint } from '@/lib/dashboard'
import { getAvatarColor } from '@/components/contacts/types'

const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })


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
}

// ─── Helpers ──────────────────────────────────────────────────
function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
  return `€${Math.round(value).toLocaleString('fr-FR')}`
}

function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * ease))
      if (p < 1) requestAnimationFrame(step)
      else setVal(target)
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

// ─── Toast ────────────────────────────────────────────────────
function Toast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-soren-sidebar text-white rounded-full px-5 py-2 text-sm font-medium shadow-xl pointer-events-none flex items-center gap-2"
      style={{ animation: 'fadeSlideUp 300ms ease-out both' }}
    >
      <Check size={14} className="text-[#E2FF8D]" />
      Lead créé
    </div>
  )
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
}: DashboardProps) {
  const router = useRouter()
  const [showModal,   setShowModal]   = useState(false)
  const [showToast,   setShowToast]   = useState(false)

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

  const FALLBACK_ACTIVITY = [
    { dot: '#E2FF8D', name: 'Martin Dupont', action: 'Nouveau lead qualifié',  date: "Aujourd'hui 09:14" },
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

  const MONTH_LABEL = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

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
        barColor: '#E2FF8D', textColor: '#111111',
        bg: '#E2FF8D', labelC: '#556b00',
      },
      {
        label: 'Leads qualifiés',
        current: String(qualCount),
        target: String(QUAL_TARGET),
        pct: Math.min(Math.round((qualCount / QUAL_TARGET) * 100), 100),
        barColor: '#E2FF8D', textColor: '#ffffff',
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
    const key = 'soren_recent_modules'
    const prev: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const next = [match.href, ...prev.filter(h => h !== match.href)].slice(0, 6)
    localStorage.setItem(key, JSON.stringify(next))
  }, [pathname])

  const recentModules = useMemo(() => {
    if (typeof window === 'undefined') return ALL_MODULES.slice(0, 6)
    const stored: string[] = JSON.parse(localStorage.getItem('soren_recent_modules') ?? '[]')
    if (stored.length === 0) return ALL_MODULES.slice(0, 6)
    return stored
      .map(href => ALL_MODULES.find(m => m.href === href))
      .filter(Boolean) as typeof ALL_MODULES
  }, [pathname])

  return (
    <>
      {/* ── Title ── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-4xl font-extrabold text-soren-text leading-tight tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>
          Gérez vos Leads &amp; Workflows
        </h1>
        <NewLeadWidget />
      </div>

      {/* ── Grid layout ── */}
      <div className="grid grid-cols-[1fr_1fr_1fr_300px] grid-rows-[auto_1fr] gap-4 flex-1 min-h-0">

        {/* ── Card 1 — Leads actifs + breakdown ── */}
        <Link
          href="/pipeline"
          className="bg-soren-card rounded-3xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
          style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Leads actifs</span>
            <span className="bg-[#E2FF8D] text-soren-text text-[10px] font-bold px-2 py-0.5 rounded-full">{activeLeads} total</span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-outfit text-[36px] font-bold text-soren-text leading-none tabular-nums">{leadsAnim}</span>
            <span className="font-jakarta text-[13px] font-medium text-soren-subtle">leads</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            {stageBreakdown.filter(s => s.count > 0).slice(0, 4).map(stage => (
              <div key={stage.label} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                <span className="text-[11px] text-soren-muted flex-1 truncate">{stage.label}</span>
                <div className="w-16 h-1 bg-[#F0F0EB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, background: stage.color }} />
                </div>
                <span className="text-[11px] font-semibold text-soren-text w-4 text-right">{stage.count}</span>
              </div>
            ))}
          </div>
        </Link>

        {/* ── Card 2 — Valeur Pipeline ── */}
        <div
          className="bg-[#E2FF8D] rounded-3xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer"
          style={{ animation: 'fadeSlideUp 400ms ease-out 100ms both' }}
          onClick={() => router.push('/pipeline')}
        >
          {/* Top — label + badge (aligné card 1) */}
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Valeur Pipeline</span>
            <span className="bg-soren-card/60 text-soren-text text-[10px] font-bold px-2 py-0.5 rounded-full">{activeLeads} leads</span>
          </div>

          {/* Chiffre principal — même position que card 1 */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-outfit text-[36px] font-bold text-soren-text leading-none tabular-nums">
              {fmt(pipelineAnim).replace('€', '')}
            </span>
            <span className="font-jakarta text-[13px] font-medium text-soren-text/40">€</span>
          </div>

          {/* 3 chips */}
          <div className="flex gap-1.5">
            <div className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl bg-soren-card/75">
              <span className="font-outfit text-[18px] font-bold text-soren-text leading-none tabular-nums">{activeLeads}</span>
              <span className="font-jakarta text-[9px] font-semibold text-soren-text/55">leads</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl bg-soren-card/75">
              <span className="font-outfit text-[18px] font-bold text-soren-text leading-none tabular-nums">{wonLeads}</span>
              <span className="font-jakarta text-[9px] font-semibold text-soren-text/55">gagnés</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl bg-soren-card/75">
              <span className="font-outfit text-[18px] font-bold text-soren-text leading-none tabular-nums">
                {totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0}%
              </span>
              <span className="font-jakarta text-[9px] font-semibold text-soren-text/55">conv.</span>
            </div>
          </div>

          {/* Voir plus */}
          <div className="mt-auto flex items-center gap-1 text-soren-text/50 hover:text-soren-text transition-colors">
            <span className="font-jakarta text-[11px] font-semibold">Voir le pipeline</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* ── Card 3 — Agentique · Frosted Dark ── */}
        <Link
          href="/equipe"
          className="rounded-3xl flex flex-col shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200 overflow-hidden relative"
          style={{
            background: '#080808',
            animation: 'fadeSlideUp 400ms ease-out 200ms both',
          }}
        >
          {/* Double radial gradient — exactement comme le démo */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 30% 0%, rgba(52,98,238,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(226,255,141,0.08) 0%, transparent 60%)',
          }} />
          {/* Frosted glass layer */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'inherit',
          }} />
          {/* Content */}
          <div className="relative p-6 flex flex-col flex-1 justify-between gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[13px] font-semibold text-[#E2FF8D]">Agentique</span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/15 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse inline-block" />
              2 actifs
            </span>
          </div>

          {/* 3 agents */}
          <div className="flex justify-around items-center flex-1">
            {([
              { name: 'Soren', role: 'Orchestrateur', color: '#3462EE', Icon: Cpu,          online: true  },
              { name: 'Kai',   role: 'Commercial',     color: '#4A91A8', Icon: MessageSquare, online: true  },
              { name: 'Mia',   role: 'Connaissance',   color: '#C8F135', Icon: Database,      online: false },
            ] as const).map(agent => (
              <div key={agent.name} className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center relative"
                  style={{
                    background: `${agent.color}18`,
                    border: `2px solid ${agent.online ? agent.color + '60' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: agent.online ? `0 0 16px ${agent.color}35` : 'none',
                  }}
                >
                  <agent.Icon size={16} style={{ color: agent.online ? agent.color : '#555' }} />
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111]"
                    style={{ background: agent.online ? '#22c55e' : '#3f3f46', boxShadow: agent.online ? '0 0 6px #22c55e' : 'none' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-white leading-none">{agent.name}</p>
                  <p className="text-[10px] text-white/35 mt-1">{agent.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/30">2 actifs sur 3</span>
              <span className="text-[10px] text-white/30">67%</span>
            </div>
            <div className="h-1 bg-soren-card/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#E2FF8D]" style={{ width: '67%' }} />
            </div>
          </div>
          </div>{/* /content */}
        </Link>

        {/* ── Right panel — row-span-2 ── */}
        <div
          className="row-span-2 bg-soren-card rounded-3xl shadow-sm overflow-hidden flex flex-col"
          style={{ animation: 'fadeSlideUp 400ms ease-out 300ms both' }}
        >
          <div className="flex-1 overflow-y-auto p-5">
          <p className="font-jakarta text-[13px] font-semibold text-soren-text">Modules Soren</p>
          <p className="font-jakarta text-[10px] font-normal text-soren-subtle mt-0.5 mb-3">Récemment visités</p>

          <div className="grid grid-cols-2 gap-2">
            {recentModules.map(({ href, Icon, label }) => (
              <Link
                key={label}
                href={href}
                className="relative bg-soren-elevated rounded-2xl p-3 flex flex-col gap-2 hover:bg-soren-sidebar transition-all duration-150 group"
              >
                <ArrowUpRight size={11}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[#E2FF8D] transition-opacity" />
                <Icon size={18} className="text-soren-muted group-hover:text-[#E2FF8D] transition-colors" />
                <span className="text-xs font-semibold text-soren-text group-hover:text-[#E2FF8D] transition-colors">{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mt-5 mb-2">
            <p className="font-jakarta text-[13px] font-semibold text-soren-text">Opportunités</p>
            <Link href="/pipeline" className="text-[10px] font-medium text-soren-muted hover:text-soren-text transition-colors">Tout voir →</Link>
          </div>
          <div className="flex flex-col">
            {recentOpps.length === 0 ? (
              <p className="text-[11px] text-soren-subtle italic">Aucune opportunité récente</p>
            ) : recentOpps.map((opp) => {
              const initials = opp.contactName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
              // Soft pastel bg derived from card color
              const avatarBg: Record<string, string> = {
                '#3462EE': '#EEF3FF', '#EFE347': '#FFFBEB',
                '#4A91A8': '#E8F4F7', '#1A2235': '#F0F2F5',
              }
              const bg = avatarBg[opp.color] ?? '#F3F4F6'
              // Pill style by stage
              const stageLower = opp.tag.toLowerCase()
              const pill = stageLower.includes('qualif') || stageLower.includes('signé') || stageLower.includes('rdv')
                ? { bg: 'rgba(143,184,26,0.12)', color: '#6B9612' }
                : stageLower.includes('nouveau') || stageLower.includes('contact') || stageLower.includes('1er')
                ? { bg: 'rgba(52,98,238,0.10)', color: '#3462EE' }
                : stageLower.includes('convers')
                ? { bg: 'rgba(74,145,168,0.12)', color: '#4A91A8' }
                : { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
              return (
                <Link
                  key={opp.id}
                  href="/pipeline"
                  className="flex items-center gap-3 py-2.5 border-b border-[#F0F0EB] last:border-0 hover:bg-[#F8F9F7] -mx-3 px-3 rounded-xl transition-colors group"
                >
                  <span
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-semibold"
                    style={{ background: bg, color: opp.color }}
                  >
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-soren-text truncate group-hover:text-[#3462EE] transition-colors">{opp.contactName}</p>
                    <p className="text-[11px] text-soren-subtle truncate">{opp.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold text-soren-text">{fmt(opp.value)}</p>
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                      style={{ background: pill.bg, color: pill.color }}
                    >
                      {opp.tag}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Live agent activity */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="font-jakarta text-[13px] font-semibold text-soren-text">Agents IA</p>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse inline-block" />
                LIVE
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-soren-subtle italic">En attente d&apos;activité…</p>
            </div>
          </div>
          </div>
        </div>

        {/* ── Leads par semaine — col-span-2 ── */}
        <div
          className="col-span-2 bg-soren-card rounded-3xl shadow-sm overflow-hidden flex flex-col"
          style={{ animation: 'fadeSlideUp 400ms ease-out 300ms both' }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
            <div>
              <span className="font-jakarta text-[13px] font-semibold text-soren-text">Leads par semaine</span>
              <p className="font-jakarta text-[10px] font-normal text-soren-subtle mt-0.5">Nouveaux leads · 7 derniers jours</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-soren-muted">
                <span className="inline-block w-2.5 h-2 rounded-sm bg-[#E2FF8D]" />
                Leads
              </span>
              <span className="flex items-center gap-1.5 text-soren-muted">
                <span className="inline-block w-2.5 h-2 rounded-sm bg-soren-sidebar" />
                Signés
              </span>
              <span className="flex items-center gap-1.5 text-soren-muted">
                <span className="inline-block w-2.5 h-2 rounded-sm bg-[#3462EE]" />
                RDV
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 px-2 pb-4">
            <WeeklyBarChart data={weeklyData} />
          </div>
        </div>

        {/* ── Évolution pipeline — col-span-1 ── */}
        <div
          className="col-span-1 bg-soren-card rounded-3xl shadow-sm overflow-hidden flex flex-col"
          style={{ animation: 'fadeSlideUp 400ms ease-out 350ms both' }}
        >
          <div className="px-6 pt-5 pb-2 flex-shrink-0">
            <span className="font-jakarta text-[13px] font-semibold text-soren-text">Évolution pipeline</span>
            <p className="font-jakarta text-[10px] font-normal text-soren-subtle mt-0.5">Valeur cumulée · 6 mois</p>
          </div>

          <div className="flex-1 min-h-0 px-2 pb-4">
            <MonthlyAreaChart data={monthlyPipeline} />
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
