'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Brain, Play, Pause, CheckSquare, ScrollText } from 'lucide-react'
import { CHANNEL_LOGO } from '@/components/agentic/BrandLogos'
import {
  AGENT_PROFILES, resolveProfile, loadRuntime, saveRuntime, loadOverrides,
  type AgentProfile, type AgentRuntime,
} from '@/components/agentic/agentProfiles'
import AgentSheet from '@/components/agentic/AgentSheet'
import OrgChart, { type OrgNode } from '@/components/agentic/OrgChart'
import { Chip } from '@/components/agentic/ui'

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function MicroLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[9px] uppercase tracking-wide font-bold text-soren-subtle">{children}</span>
}

export default function EquipeView() {
  const router = useRouter()
  const [openId, setOpenId] = React.useState<string | null>(null)
  // État runtime persistant (localStorage) — chargé après montage (évite tout mismatch SSR).
  const [runtime, setRuntime] = React.useState<Record<string, AgentRuntime>>({})
  const [overrides, setOverrides] = React.useState<Record<string, Partial<AgentProfile>>>({})
  React.useEffect(() => { setRuntime(loadRuntime()); setOverrides(loadOverrides()) }, [])

  const agents = React.useMemo(
    () => AGENT_PROFILES.map(p => resolveProfile(p, overrides, runtime)),
    [overrides, runtime],
  )
  const selected = agents.find(a => a.id === openId) ?? null

  // Deep-link ?agent=<id|name>
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const v = new URLSearchParams(window.location.search).get('agent')
    if (!v) return
    const m = agents.find(a => a.id === v || a.name.toLowerCase().includes(v.toLowerCase()))
    if (m) setOpenId(m.id)
  }, [agents])

  const isActive = (a: AgentProfile) => a.status === 'active'
  function toggleStatus(a: AgentProfile, e: React.MouseEvent) {
    e.stopPropagation() // n'ouvre pas la fiche
    const next = isActive(a) ? 'paused' : 'active'
    saveRuntime(a.id, { status: next })                 // persistance immédiate
    setRuntime(prev => ({ ...prev, [a.id]: { ...prev[a.id], status: next } }))
  }

  const coordinator = agents.find(a => a.id === 'coo') ?? agents[0]
  const reports = agents.filter(a => a.id !== coordinator?.id)
  const orgNode = (a: AgentProfile): OrgNode => ({ id: a.id, name: a.name, role: a.role, active: isActive(a), avatar: a.avatar })

  const goSkill = (name: string, e: React.MouseEvent) => { e.stopPropagation(); router.push(`/knowledge?tab=skills&q=${encodeURIComponent(name)}`) }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <p className="text-[11px] text-soren-subtle">{agents.length} agents gouvernés · observés · tracés</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4">
        {coordinator && <OrgChart coordinator={orgNode(coordinator)} reports={reports.map(orgNode)} onSelect={setOpenId} />}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2" data-stagger>
          {agents.map(a => {
            const active = isActive(a)
            return (
              <div
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className={`relative bg-soren-card border border-soren-border rounded-2xl p-3 flex flex-col gap-2 cursor-pointer hover:border-[#C8CBD0] hover:shadow-sm transition-all ${active ? '' : 'opacity-60'}`}
              >
                {/* Point d'état — haut à droite */}
                <span className="absolute top-2.5 right-2.5 flex w-2 h-2" title={active ? 'Actif' : 'Inactif'}>
                  {active ? (
                    <>
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full w-2 h-2 bg-[#16A34A]" />
                    </>
                  ) : <span className="relative inline-flex rounded-full w-2 h-2 bg-[#9CA3AF]" />}
                </span>

                {/* Identité */}
                <div className="flex items-center gap-2 pr-3">
                  {a.avatar ? (
                    <img src={a.avatar} alt={a.name} className={`w-8 h-8 rounded-lg object-cover flex-shrink-0 ${active ? '' : 'grayscale'}`} />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-soren-elevated flex items-center justify-center flex-shrink-0"><Bot size={15} className="text-soren-muted" /></div>
                  )}
                  <p className="text-[11px] font-normal text-soren-text leading-tight min-w-0 break-words">{a.name}</p>
                </div>
                <p className="text-[10px] text-soren-muted leading-snug line-clamp-2">{a.role}</p>

                {/* Canaux (logos officiels) */}
                <div className="flex items-center gap-1">
                  {a.channels.filter(c => CHANNEL_LOGO[c]).map(c => { const Logo = CHANNEL_LOGO[c]; return (
                    <span key={c} title={c.charAt(0).toUpperCase() + c.slice(1)} className="w-5 h-5 rounded-md bg-soren-elevated flex items-center justify-center"><Logo size={13} /></span>
                  )})}
                </div>

                {/* Tâches principales — 2 max */}
                <div className="flex flex-col gap-0.5">
                  <MicroLabel>Priorités</MicroLabel>
                  <ul className="flex flex-col gap-0.5">
                    {a.soul.priorities.slice(0, 2).map((t, i) => (
                      <li key={i} className="flex items-start gap-1 text-[10.5px] text-soren-text leading-snug"><span className="text-soren-subtle">•</span><span className="min-w-0">{t}</span></li>
                    ))}
                  </ul>
                </div>

                {/* Skills — 2 max, cliquables */}
                {a.activeSkills.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {a.activeSkills.slice(0, 2).map(s => (
                      <button key={s.name} onClick={e => goSkill(s.name, e)} title={`Voir « ${s.name} »`}><Chip>{s.name}</Chip></button>
                    ))}
                  </div>
                )}

                {/* Footer : actions à gauche, toggle Actif/Inactif en bas à droite */}
                <div className="mt-auto pt-1 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-0.5">
                    <button onClick={e => { e.stopPropagation(); setOpenId(a.id) }} title="Voir le cerveau" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FF4D00] hover:bg-[#FF4D00]/10"><Brain size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); router.push(`/taches?assignee=${encodeURIComponent(a.name)}`) }} title="Voir ses tâches" className="w-7 h-7 rounded-lg flex items-center justify-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated"><CheckSquare size={13} /></button>
                    <button onClick={e => { e.stopPropagation(); router.push(`/logs?actor=${encodeURIComponent(a.name)}`) }} title="Voir ses logs" className="w-7 h-7 rounded-lg flex items-center justify-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated"><ScrollText size={13} /></button>
                  </div>
                  <button
                    onClick={e => toggleStatus(a, e)}
                    title={active ? 'Actif — cliquer pour mettre en pause' : 'Inactif — cliquer pour activer'}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full transition-colors flex-shrink-0 ${active ? 'text-[#16A34A]' : 'bg-soren-elevated text-soren-subtle hover:text-soren-muted'}`}
                    style={active ? { background: '#16A34A1A' } : undefined}
                  >
                    {active ? <><Play size={9} fill="currentColor" /> Actif</> : <><Pause size={9} /> Inactif</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-soren-subtle">Dernière synchro : statut persistant (local) · {fmtDate(coordinator?.health.lastRun)}</p>
      </div>

      {/* Fiche agent — SOUL OS */}
      {selected && (
        <AgentSheet
          profile={selected}
          onClose={() => { setOpenId(null); setOverrides(loadOverrides()) }}
        />
      )}
    </div>
  )
}
