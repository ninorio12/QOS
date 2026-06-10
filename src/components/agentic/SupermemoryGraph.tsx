'use client'

/**
 * Graphe Supermemory — vue réelle, cliquable, avec zoom/pan.
 * Nœuds = documents (Second Brain réel) + mémoires (rappel sémantique).
 * Liens = associations document ↔ mémoire. Pas d'agents/skills/actions ici (V1 lisible).
 */

import { useMemo, useRef, useState } from 'react'
import { FileText, Brain } from 'lucide-react'
import { scopeById, type MemoryScopeId } from './doctrine'

export type SGNode = {
  id: string; label: string; type: 'document' | 'memory'
  container?: MemoryScopeId; summary?: string; source?: string; date?: string
}
export type SGEdge = { from: string; to: string }

const W = 1000, H = 640

/** Layout déterministe : mémoires sur un anneau intérieur, documents sur l'anneau extérieur. */
function layout(nodes: SGNode[]): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}
  const mem = nodes.filter(n => n.type === 'memory')
  const doc = nodes.filter(n => n.type === 'document')
  const place = (arr: SGNode[], r: number) => arr.forEach((n, i) => {
    const a = (i / Math.max(1, arr.length)) * Math.PI * 2 - Math.PI / 2
    pos[n.id] = { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r }
  })
  place(mem, Math.min(W, H) * 0.18)
  place(doc, Math.min(W, H) * 0.40)
  if (mem.length === 1) pos[mem[0].id] = { x: W / 2, y: H / 2 }
  return pos
}

export default function SupermemoryGraph({
  nodes, edges, filter, selectedId, onSelect,
}: {
  nodes: SGNode[]; edges: SGEdge[]; filter: string; selectedId: string | null; onSelect: (n: SGNode) => void
}) {
  const pos = useMemo(() => layout(nodes), [nodes])
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  const visible = (n: SGNode) => {
    if (filter === 'all') return true
    if (filter === 'document') return n.type === 'document'
    if (filter === 'memory') return n.type === 'memory'
    return n.container === filter // par container (scope)
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setView(v => ({ ...v, k: Math.min(2.5, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.12 : 0.89))) }))
  }
  function onDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    setView(v => ({ ...v, tx: drag.current!.tx + dx, ty: drag.current!.ty + dy }))
  }
  function onUp() { drag.current = null }

  const color = (n: SGNode) => n.type === 'document' ? '#16A34A' : (scopeById(n.container ?? 'vividflow_partage')?.color ?? '#8B5CF6')

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden relative">
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5">
        <button onClick={() => setView(v => ({ ...v, k: Math.min(2.5, v.k * 1.15) }))} className="w-7 h-7 rounded-lg bg-soren-elevated text-soren-muted text-[14px] font-bold hover:text-soren-text">+</button>
        <button onClick={() => setView(v => ({ ...v, k: Math.max(0.5, v.k * 0.87) }))} className="w-7 h-7 rounded-lg bg-soren-elevated text-soren-muted text-[14px] font-bold hover:text-soren-text">−</button>
        <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} className="h-7 px-2 rounded-lg bg-soren-elevated text-soren-muted text-[10px] font-semibold hover:text-soren-text">Réinit.</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none" style={{ maxHeight: '60vh', cursor: drag.current ? 'grabbing' : 'grab' }}
        onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
          {edges.map((e, i) => {
            const a = pos[e.from], b = pos[e.to]; if (!a || !b) return null
            const na = nodes.find(n => n.id === e.from), nb = nodes.find(n => n.id === e.to)
            if (!na || !nb || !visible(na) || !visible(nb)) return null
            const on = selectedId === e.from || selectedId === e.to
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? '#8B5CF6' : '#CBD0D6'} strokeWidth={on ? 2 : 1} strokeOpacity={on ? 0.9 : 0.45} />
          })}
          {nodes.filter(visible).map(n => {
            const p = pos[n.id]; if (!p) return null
            const c = color(n), r = n.type === 'document' ? 15 : 19, sel = selectedId === n.id
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
                onClick={() => { if (!drag.current?.moved) onSelect(n) }}>
                {sel && <circle r={r + 6} fill="none" stroke={c} strokeWidth={2} strokeOpacity={0.5} />}
                <circle r={r} fill={c} fillOpacity={n.type === 'memory' ? 0.18 : 0.9} stroke={c} strokeWidth={1.75} />
                <foreignObject x={-8} y={-8} width={16} height={16} style={{ pointerEvents: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
                    {n.type === 'document' ? <FileText size={12} color="#fff" /> : <Brain size={12} color={c} />}
                  </div>
                </foreignObject>
                <text textAnchor="middle" y={r + 13} fontSize={12} fontWeight={600} fill="#374151">{n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
