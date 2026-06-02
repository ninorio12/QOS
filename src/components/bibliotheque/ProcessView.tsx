'use client'

import { useState } from 'react'
import { Plus, ChevronRight, FileText, CheckCircle2, Circle, Network, ArrowUpRight } from 'lucide-react'

type Step = { id: string; label: string; done: boolean }
type Process = { id: string; title: string; description?: string; category: string; steps: Step[] }

const MOCK: Process[] = [
  {
    id: 'p1',
    title: 'Onboarding nouveau client',
    description: 'Étapes à suivre dès la signature du contrat.',
    category: 'Commercial',
    steps: [
      { id: 's1', label: 'Envoyer le contrat signé', done: true },
      { id: 's2', label: 'Créer le dossier client', done: true },
      { id: 's3', label: 'Planifier le kick-off', done: false },
      { id: 's4', label: 'Accès outils partagés', done: false },
    ],
  },
  {
    id: 'p2',
    title: 'Relance prospect froid',
    description: 'Séquence de relance après 14 jours sans réponse.',
    category: 'Acquisition',
    steps: [
      { id: 's1', label: 'Email de relance J+14', done: false },
      { id: 's2', label: 'Appel de suivi J+17', done: false },
      { id: 's3', label: 'LinkedIn message J+21', done: false },
    ],
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Commercial:   { bg: '#EFF6FF', color: '#2563EB' },
  Acquisition:  { bg: '#FFF7ED', color: '#EA580C' },
  Opérationnel: { bg: '#F0FDF4', color: '#16A34A' },
}

const LUCID_EDIT_URL = 'https://lucid.app/lucidchart/088cac20-7f26-4737-a6bb-e05b3b7cfc1e/edit?invitationId=inv_8d3273d0-34b2-4152-bfe7-81235fc443dc'

export default function ProcessView() {
  const [processes, setProcesses] = useState<Process[]>(MOCK)
  const [open, setOpen] = useState<string | null>(null)

  function toggleStep(pid: string, sid: string) {
    setProcesses(prev => prev.map(p => p.id !== pid ? p : {
      ...p,
      steps: p.steps.map(s => s.id === sid ? { ...s, done: !s.done } : s),
    }))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-soren-subtle mt-1">{processes.length + 1} processus</p>
        </div>
        <button className="flex items-center gap-1.5 bg-[#FF4D00] hover:bg-[#e64500] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors">
          <Plus size={12} />
          Nouveau
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-3">

        {/* ── Processus internes — Lucidchart ── */}
        <a
          href={LUCID_EDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-150 hover:scale-[1.01] hover:shadow-lg group"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,120,0,0.15)', border: '1px solid rgba(255,120,0,0.3)' }}>
            <Network size={18} style={{ color: '#FF4D00' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">Processus internes</p>
            <p className="text-[11px] text-white/40 mt-0.5">Schéma organisationnel · Lucidchart</p>
          </div>
          <ArrowUpRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
        </a>

        {/* ── Process checklists ── */}
        {processes.map(p => {
          const isOpen = open === p.id
          const doneCount = p.steps.filter(s => s.done).length
          const cat = CATEGORY_COLORS[p.category] ?? { bg: '#F3F4F6', color: '#374151' }
          return (
            <div key={p.id} className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : p.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-soren-elevated/50 transition-colors"
              >
                <FileText size={16} className="text-soren-subtle flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-soren-text truncate">{p.title}</p>
                  {p.description && <p className="text-[11px] text-soren-subtle truncate mt-0.5">{p.description}</p>}
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cat.bg, color: cat.color }}>
                  {p.category}
                </span>
                <span className="text-[11px] text-soren-subtle flex-shrink-0">{doneCount}/{p.steps.length}</span>
                <ChevronRight size={14} className={`text-soren-subtle transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-soren-border px-5 py-3 flex flex-col gap-2">
                  {p.steps.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleStep(p.id, s.id)}
                      className="flex items-center gap-3 py-1.5 text-left group"
                    >
                      {s.done
                        ? <CheckCircle2 size={15} className="text-[#22c55e] flex-shrink-0" />
                        : <Circle size={15} className="text-soren-border flex-shrink-0 group-hover:text-soren-muted transition-colors" />
                      }
                      <span className={`text-[12px] ${s.done ? 'line-through text-soren-subtle' : 'text-soren-text'}`}>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <button className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-dashed border-soren-border text-soren-subtle hover:text-soren-text hover:border-soren-text/30 transition-colors text-sm">
          <Plus size={14} />
          Ajouter un processus
        </button>
      </div>
    </div>
  )
}
