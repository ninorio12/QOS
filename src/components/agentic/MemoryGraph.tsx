'use client'

/**
 * Graphe mémoire — première version simple et lisible du système nerveux :
 * agents, méthodes, mémoires, documents, runs, preuves. Couleurs par scope.
 * SVG léger (pas de dépendance), nœuds cliquables.
 */

import { MEMORY_GRAPH, MEMORY_SCOPES, NODE_TYPE, scopeById, type GraphNode, type GraphNodeType } from './doctrine'
import { Bot, Wrench, Brain, FileText, Play, ShieldCheck, type LucideIcon } from 'lucide-react'

const W = 1000, H = 620
const TYPE_ICON: Record<GraphNodeType, LucideIcon> = {
  agent: Bot, skill: Wrench, memory: Brain, document: FileText, run: Play, proof: ShieldCheck,
}
const radius = (t: GraphNodeType) => (t === 'agent' ? 26 : t === 'memory' ? 20 : 17)

export default function MemoryGraph({ selectedId, onSelect }: { selectedId: string | null; onSelect: (n: GraphNode) => void }) {
  const { nodes, edges } = MEMORY_GRAPH
  const byId = (id: string) => nodes.find(n => n.id === id)

  return (
    <div className="flex flex-col gap-3">
      {/* Légende scopes */}
      <div className="flex items-center gap-3 flex-wrap">
        {MEMORY_SCOPES.map(s => (
          <span key={s.id} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-soren-muted">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>

      <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: '62vh' }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const a = byId(e.from), b = byId(e.to)
            if (!a || !b) return null
            const active = selectedId === e.from || selectedId === e.to
            return (
              <line key={i} x1={a.x * W} y1={a.y * H} x2={b.x * W} y2={b.y * H}
                stroke={active ? '#FF4D00' : '#CBD0D6'} strokeWidth={active ? 2 : 1.25} strokeOpacity={active ? 0.9 : 0.5} />
            )
          })}
          {/* Nodes */}
          {nodes.map(n => {
            const color = scopeById(n.scope)?.color ?? '#6B7280'
            const r = radius(n.type)
            const Icon = TYPE_ICON[n.type]
            const sel = selectedId === n.id
            return (
              <g key={n.id} transform={`translate(${n.x * W},${n.y * H})`} style={{ cursor: 'pointer' }} onClick={() => onSelect(n)}>
                {sel && <circle r={r + 6} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.5} />}
                <circle r={r} fill={color} fillOpacity={n.type === 'agent' ? 0.95 : 0.16} stroke={color} strokeWidth={1.75} />
                <foreignObject x={-9} y={-9} width={18} height={18} style={{ pointerEvents: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
                    <Icon size={14} color={n.type === 'agent' ? '#fff' : color} />
                  </div>
                </foreignObject>
                <text textAnchor="middle" y={r + 14} fontSize={13} fontWeight={700} fill="#374151">{n.label}</text>
                <text textAnchor="middle" y={r + 28} fontSize={11} fill="#9CA3AF">{NODE_TYPE[n.type].label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
