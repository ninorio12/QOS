'use client'

/**
 * Graphe 3D force-directed (three.js via react-force-graph-3d).
 * Glisser pour faire tourner la scène, glisser un nœud pour le déplacer, molette pour zoomer,
 * physique 3D en continu (mouvement vivant façon Obsidian 3D). Chargé côté client uniquement.
 */

import { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import SpriteText from 'three-spritetext'

// three.js a besoin de window → import client only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false }) as any

export type G3Node = { id: string; label: string; color: string; val?: number }
export type G3Link = { source: string; target: string }

export default function Graph3D({
  nodes, links, onNodeClick, height = '62vh', background = '#0a0a12', labelEveryNode = true,
}: {
  nodes: G3Node[]; links: G3Link[]; onNodeClick?: (id: string) => void; height?: string; background?: string
  // false sur les gros graphes : seuls les hubs portent un label permanent (les autres au survol)
  labelEveryNode?: boolean
}) {
  const wrap = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const [dim, setDim] = useState({ w: 800, h: 520 })

  // Mesure AVANT le 1er paint → canvas à la bonne taille tout de suite (sinon le drag est mal mappé à l'arrivée).
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return
    const measure = () => setDim({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Layout compact + chauffe initiale. Retry nettoyé au démontage (évite les bugs au changement de mode).
  useEffect(() => {
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    const apply = () => {
      if (cancelled) return
      const fg = fgRef.current
      if (!fg || !fg.d3Force) { if (tries++ < 25) timer = setTimeout(apply, 120); return }
      try {
        fg.d3Force('charge')?.strength(-9)
        fg.d3Force('link')?.distance(9)?.strength(1.4)
        fg.d3ReheatSimulation?.()
      } catch {}
    }
    apply()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [nodes, links])

  // Copie défensive (react-force-graph mute les objets en y ajoutant x/y/z/vx…).
  const data = useMemo(() => ({
    nodes: nodes.map(n => ({ ...n })),
    links: links.map(l => ({ ...l })),
  }), [nodes, links])

  return (
    <div ref={wrap} style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-soren-border relative">
      <ForceGraph3D
        ref={fgRef}
        width={dim.w}
        height={dim.h}
        graphData={data}
        enableNodeDrag={true}
        backgroundColor={background}
        showNavInfo={false}
        rendererConfig={{ antialias: false, powerPreference: 'high-performance' }}
        nodeLabel={(n: G3Node) => n.label}
        nodeColor={(n: G3Node) => n.color}
        nodeVal={(n: G3Node) => n.val ?? 1}
        nodeOpacity={0.95}
        nodeResolution={6}
        d3VelocityDecay={0.5}
        nodeThreeObjectExtend={true}
        nodeThreeObject={(n: G3Node) => {
          // Label permanent : tous les nœuds si labelEveryNode, sinon seulement les hubs (val élevé).
          if (!labelEveryNode && (n.val ?? 1) < 6) return undefined
          const s = new SpriteText(n.label.length > 32 ? n.label.slice(0, 31) + '…' : n.label)
          s.color = '#e8e8ef'
          s.textHeight = 3
          s.fontWeight = '600'
          s.position.set(0, -(Math.cbrt(n.val ?? 1) * 4 + 4), 0)
          return s
        }}
        linkColor={() => '#6b6b82'}
        linkOpacity={0.3}
        linkWidth={0.4}
        warmupTicks={4}
        cooldownTicks={55}
        onNodeClick={(n: G3Node) => onNodeClick?.(n.id)}
      />
    </div>
  )
}
