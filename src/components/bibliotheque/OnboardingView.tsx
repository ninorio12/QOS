'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, Circle, ChevronRight, Users } from 'lucide-react'

type Task = { id: string; label: string; done: boolean }
type Phase = { id: string; label: string; tasks: Task[] }
type OnboardingFlow = { id: string; client: string; phase: number; phases: Phase[] }

const MOCK: OnboardingFlow[] = [
  {
    id: 'o1',
    client: 'Karim Minozan',
    phase: 1,
    phases: [
      {
        id: 'ph1',
        label: 'Semaine 1 — Lancement',
        tasks: [
          { id: 't1', label: 'Envoi contrat & accès outils', done: true },
          { id: 't2', label: 'Kick-off call planifié', done: true },
          { id: 't3', label: 'Présentation équipe', done: false },
        ],
      },
      {
        id: 'ph2',
        label: 'Semaine 2 — Setup',
        tasks: [
          { id: 't4', label: 'Intégration CRM', done: false },
          { id: 't5', label: 'Formation pipeline', done: false },
          { id: 't6', label: 'Accès dashboard', done: false },
        ],
      },
      {
        id: 'ph3',
        label: 'Semaine 3 — Go Live',
        tasks: [
          { id: 't7', label: 'Premier lead traité', done: false },
          { id: 't8', label: 'Revue hebdo planifiée', done: false },
        ],
      },
    ],
  },
]

export default function OnboardingView() {
  const [flows, setFlows] = useState<OnboardingFlow[]>(MOCK)
  const [openFlow, setOpenFlow] = useState<string | null>('o1')

  function toggleTask(flowId: string, phaseId: string, taskId: string) {
    setFlows(prev => prev.map(f => f.id !== flowId ? f : {
      ...f,
      phases: f.phases.map(ph => ph.id !== phaseId ? ph : {
        ...ph,
        tasks: ph.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      }),
    }))
  }

  function totalProgress(flow: OnboardingFlow) {
    const all  = flow.phases.flatMap(p => p.tasks)
    return { done: all.filter(t => t.done).length, total: all.length }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-soren-subtle mt-1">{flows.length} client{flows.length !== 1 ? 's' : ''} en cours</p>
        </div>
        <button className="flex items-center gap-1.5 bg-[#FF4D00] hover:bg-[#e64500] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors">
          <Plus size={12} />
          Nouveau
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4">
        {flows.map(flow => {
          const isOpen = openFlow === flow.id
          const { done, total } = totalProgress(flow)
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div key={flow.id} className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setOpenFlow(isOpen ? null : flow.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-soren-elevated/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-[#FF4D00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-soren-text">{flow.client}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-soren-border rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF4D00] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-soren-subtle flex-shrink-0">{done}/{total}</span>
                  </div>
                </div>
                <ChevronRight size={14} className={`text-soren-subtle transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Phases */}
              {isOpen && (
                <div className="border-t border-soren-border divide-y divide-soren-border/50">
                  {flow.phases.map(phase => {
                    const phaseDone = phase.tasks.filter(t => t.done).length
                    return (
                      <div key={phase.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-soren-muted uppercase tracking-wide">{phase.label}</p>
                          <span className="text-[10px] text-soren-subtle">{phaseDone}/{phase.tasks.length}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {phase.tasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => toggleTask(flow.id, phase.id, task.id)}
                              className="flex items-center gap-3 py-1 text-left group"
                            >
                              {task.done
                                ? <CheckCircle2 size={14} className="text-[#22c55e] flex-shrink-0" />
                                : <Circle size={14} className="text-soren-border flex-shrink-0 group-hover:text-soren-muted transition-colors" />
                              }
                              <span className={`text-[12px] ${task.done ? 'line-through text-soren-subtle' : 'text-soren-text'}`}>{task.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <button className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-soren-border text-soren-subtle hover:text-soren-text hover:border-soren-text/30 transition-colors text-sm">
          <Plus size={14} />
          Ajouter un client
        </button>
      </div>
    </div>
  )
}
