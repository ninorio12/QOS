'use client'

/**
 * Organigramme agentique simple — lecture immédiate de "qui coordonne qui".
 * Coordinateur en haut, agents d'exécution en dessous, connecteurs sobres.
 * Pas un graphe : un org-chart statique.
 */

import { Bot } from 'lucide-react'

export type OrgNode = { id: string; name: string; role: string; active: boolean; avatar?: string }

function Box({ n, coordinator, onSelect }: { n: OrgNode; coordinator?: boolean; onSelect?: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect?.(n.id)}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 bg-soren-card border text-left hover:border-[#C8CBD0] hover:shadow-sm transition-all ${coordinator ? 'border-[#FF4D00]/50' : 'border-soren-border'} ${n.active ? '' : 'opacity-55'}`}
    >
      {n.avatar ? (
        <img src={n.avatar} alt={n.name} className={`w-7 h-7 rounded-lg object-cover flex-shrink-0 ${n.active ? '' : 'grayscale'}`} />
      ) : (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${coordinator ? 'bg-[#FF4D00]/12' : 'bg-soren-elevated'}`}>
          <Bot size={14} className={coordinator ? 'text-[#FF4D00]' : 'text-soren-muted'} />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-normal text-soren-text truncate">{n.name}</span>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.active ? '#16A34A' : '#9CA3AF' }} />
        </div>
        <p className="text-[10px] text-soren-muted truncate max-w-[160px]">{n.role}</p>
      </div>
    </button>
  )
}

export default function OrgChart({ coordinator, reports, onSelect }: { coordinator: OrgNode; reports: OrgNode[]; onSelect?: (id: string) => void }) {
  return (
    <div className="bg-soren-app/40 border border-soren-border rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-wide font-bold text-soren-subtle mb-4">Organisation agentique</p>
      <div className="flex flex-col items-center">
        <Box n={coordinator} coordinator onSelect={onSelect} />
        <div className="w-px h-5 bg-soren-border" />
        <div className="relative w-full flex justify-center pt-5">
          {reports.length > 1 && (
            <div className="absolute top-0 h-px bg-soren-border hidden sm:block" style={{ left: '18%', right: '18%' }} />
          )}
          <div className="flex items-start justify-center gap-3 sm:gap-5 flex-wrap">
            {reports.map(r => (
              <div key={r.id} className="flex flex-col items-center">
                <div className="w-px h-5 bg-soren-border" />
                <Box n={r} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-soren-subtle mt-4">Coordination → exécution</p>
      </div>
    </div>
  )
}
