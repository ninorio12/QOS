'use client'

/**
 * Dashboard — la grande card de pilotage à droite des KPI.
 *
 * Tous les objectifs Meta éditables au même endroit : la jauge budget/jour,
 * puis les cibles (CPL, leads/semaine, plancher CTR, fréquence max).
 * Chaque changement écrit un message ordinaire dans le fil de la card
 * concernée, au nom de la personne : aucun bouton « appliquer ».
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Target, SlidersHorizontal } from 'lucide-react'

const OBJECTIVES: { key: string; label: string; suffix: string; gauge?: boolean; max?: number; step?: number }[] = [
  { key: 'budgetPerDay', label: 'Budget / jour',          suffix: 'CHF',   gauge: true, max: 100, step: 1 },
  { key: 'leadsWeekly',  label: 'Objectif leads / semaine', suffix: 'leads', step: 1 },
]

const fmtWhen = (t: number) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Levers = Record<string, { value: number; updatedBy: string; updatedAt: number }>

export default function MediaDashboard() {
  const ov = useQuery(api.cardThreads.overview) as { levers: Levers } | undefined
  const setLever = useMutation(api.cardThreads.setLever)
  const [drafts, setDrafts] = useState<Record<string, number | null>>({})

  const commit = (key: string, val: number, prev?: number) => {
    setDrafts((d) => ({ ...d, [key]: null }))
    if (!Number.isFinite(val) || val === prev) return
    void setLever({ key, value: val })
  }

  return (
    <div className="bg-soren-card rounded-2xl p-4 md:p-5 shadow-sm border border-soren-border/60 flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={14} className="text-soren-accent" />
        <span className="text-[13px] font-bold text-soren-text">Dashboard</span>
      </div>

      {OBJECTIVES.map((o) => {
        const state = ov?.levers?.[o.key]
        const draft = drafts[o.key]
        const value = draft ?? state?.value
        return (
          <div key={o.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-soren-muted">
                {!o.gauge && <Target size={10} className="text-soren-accent" />}
                {o.label}
              </span>
              {o.gauge && (
                <span className="text-[11.5px] font-bold text-soren-text tabular-nums">
                  {value != null ? `${Math.round(value)} ${o.suffix}` : '—'}
                </span>
              )}
            </div>

            {o.gauge ? (
              <div className="flex flex-col gap-1">
                <input
                  type="range" min={0} max={o.max ?? 100} step={o.step ?? 1}
                  value={value ?? 0}
                  onChange={(e) => setDrafts((d) => ({ ...d, [o.key]: Number(e.target.value) }))}
                  onPointerUp={(e) => commit(o.key, Number((e.target as HTMLInputElement).value), state?.value)}
                  className="vf-range"
                  style={{ ['--pct' as string]: `${Math.round(((value ?? 0) / (o.max ?? 100)) * 100)}%` }}
                />
                <div className="flex justify-between text-[9px] text-soren-subtle tabular-nums">
                  <span>0</span><span>{o.max ?? 100} {o.suffix}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} step={o.step}
                  value={draft ?? state?.value ?? ''}
                  placeholder="—"
                  onChange={(e) => setDrafts((d) => ({ ...d, [o.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                  onBlur={() => { if (draft != null) commit(o.key, draft, state?.value) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && draft != null) commit(o.key, draft, state?.value) }}
                  className="w-24 text-[12px] font-bold bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-text outline-none focus:border-soren-accent/50 tabular-nums"
                />
                {o.suffix && <span className="text-[10px] text-soren-subtle">{o.suffix}</span>}
              </div>
            )}

            {state && (
              <span className="text-[9px] text-soren-subtle">
                modifié le {fmtWhen(state.updatedAt)} par <span className="font-semibold text-soren-muted">{state.updatedBy}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
