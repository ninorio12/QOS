'use client'

/**
 * Graphe Second Brain (mémoire épisodique) — rendu 3D force-directed via Graph3D (three.js).
 * Hubs = familles ; chaque note reliée à sa famille ; liens transverses = wikilinks [[...]].
 * Glisser = rotation, glisser un nœud = déplacer, molette = zoom. Raw exclu de « Tout » (trop dense).
 */

import { useMemo } from 'react'
import Graph3D from '@/components/agentic/Graph3D'

export type SBGNode = { id: string; name: string; family: string; links?: string[] }

const PALETTE = ['#22C55E', '#FF4D00', '#3B82F6', '#A78BFA', '#0EA5E9', '#F59E0B', '#EF4444', '#14B8A6']
const CAP = 500 // perf : Raw (~1900 fichiers) chargé séparément, jamais dans « Tout »

export default function SecondBrainGraph({
  files, activeFamily, onOpen, onFamily,
}: {
  files: SBGNode[]
  activeFamily: string // 'all' | nom de famille
  onOpen: (id: string) => void
  onFamily: (fam: string) => void
}) {
  const { g3nodes, g3links } = useMemo(() => {
    const allFamilies = Array.from(new Set(files.map(f => f.family))).sort()
    const colorOf: Record<string, string> = {}
    allFamilies.forEach((f, i) => { colorOf[f] = PALETTE[i % PALETTE.length] })

    // « Tout » exclut le Raw (trop dense → bugs). Le Raw se voit en sélectionnant SA famille (chargé séparément, plafonné).
    const base = files
      .filter(f => activeFamily === 'all' ? f.family !== 'Raw' : f.family === activeFamily)
      .slice(0, CAP)
    const ids = new Set(base.map(f => f.id))
    const fams = Array.from(new Set(base.map(f => f.family)))

    const nodes = [
      ...fams.map(fam => ({ id: `fam:${fam}`, label: fam, color: colorOf[fam] ?? '#9CA3AF', val: 9 })),
      ...base.map(f => ({
        id: f.id, label: f.name, color: colorOf[f.family] ?? '#9CA3AF',
        val: 1.5 + (f.links?.filter(l => ids.has(l)).length ?? 0),
      })),
    ]
    const links: { source: string; target: string }[] = []
    for (const f of base) {
      links.push({ source: f.id, target: `fam:${f.family}` })
      for (const t of f.links ?? []) if (ids.has(t)) links.push({ source: f.id, target: t })
    }
    return { g3nodes: nodes, g3links: links }
  }, [files, activeFamily])

  return (
    <Graph3D
      nodes={g3nodes}
      links={g3links}
      labelEveryNode={g3nodes.length <= 120}
      onNodeClick={(id) => { if (id.startsWith('fam:')) onFamily(id.slice(4)); else onOpen(id) }}
    />
  )
}
