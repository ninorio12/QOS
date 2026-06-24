'use client'

/**
 * Graphe mémoire (sémantique) — rendu 3D force-directed via Graph3D (three.js).
 * Glisser = rotation de la scène, glisser un nœud = le déplacer, molette = zoom, physique 3D vivante.
 * Conserve l'interface SGNode/SGEdge pour rester compatible avec MemorySection.
 */

import { useMemo } from 'react'
import Graph3D from './Graph3D'
import { scopeById, type MemoryScopeId } from './doctrine'

export type SGNode = {
  id: string; label: string; type: 'document' | 'memory'
  container?: MemoryScopeId; summary?: string; source?: string; date?: string
}
export type SGEdge = { from: string; to: string }

const colorOf = (n: SGNode) => n.type === 'document' ? '#22C55E' : (scopeById(n.container ?? 'vividflow_partage')?.color ?? '#A78BFA')

export default function SupermemoryGraph({
  nodes, edges, filter, selectedId, onSelect,
}: {
  nodes: SGNode[]; edges: SGEdge[]; filter: string; selectedId: string | null; onSelect: (n: SGNode) => void
}) {
  void selectedId
  const { g3nodes, g3links } = useMemo(() => {
    const visible = (n: SGNode) =>
      filter === 'all' ? true
      : filter === 'document' ? n.type === 'document'
      : filter === 'memory' ? n.type === 'memory'
      : n.container === filter
    const vis = nodes.filter(visible)
    const ids = new Set(vis.map(n => n.id))
    const deg = new Map<string, number>()
    for (const e of edges) if (ids.has(e.from) && ids.has(e.to)) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1); deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
    }
    return {
      g3nodes: vis.map(n => ({ id: n.id, label: n.label, color: colorOf(n), val: 1.5 + (deg.get(n.id) ?? 0) })),
      g3links: edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => ({ source: e.from, target: e.to })),
    }
  }, [nodes, edges, filter])

  return (
    <Graph3D
      nodes={g3nodes}
      links={g3links}
      labelEveryNode={g3nodes.length <= 120}
      onNodeClick={(id) => { const n = nodes.find(x => x.id === id); if (n) onSelect(n) }}
    />
  )
}
