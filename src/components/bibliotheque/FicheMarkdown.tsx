'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'
import MarkdownView from '../agentic/MarkdownView'

// ─── Rendu de fiche Markdown « façon Notion » (SOPs & Playbooks) ──────────────
// Document CLAIR fixe (indépendant du thème sombre du Data OS), calé sur la fiche de référence :
//   • fond blanc, texte gris foncé #37352F, petit, interligne standard ;
//   • blocs ```…``` → carte « COPIER-COLLER » beige monospace + bouton Copier ;
//   • <details><summary>…</summary> → section repliable (toggle).
// Le corps d'un toggle est rendu récursivement.

type Seg =
  | { kind: 'prose'; text: string }
  | { kind: 'code'; code: string }
  | { kind: 'toggle'; title: string; body: string }

const DETAILS_RE = /<details>([\s\S]*?)<\/details>/i
const FENCE_RE = /```[^\n]*\n([\s\S]*?)```/
const SUMMARY_RE = /<summary>([\s\S]*?)<\/summary>/i

function segmentFiche(src: string): Seg[] {
  const segs: Seg[] = []
  let rest = src
  while (rest.length) {
    const dM = rest.match(DETAILS_RE)
    const fM = rest.match(FENCE_RE)
    const dIdx = dM ? dM.index! : Infinity
    const fIdx = fM ? fM.index! : Infinity
    if (dIdx === Infinity && fIdx === Infinity) {
      if (rest.trim()) segs.push({ kind: 'prose', text: rest })
      break
    }
    if (dIdx <= fIdx) {
      const pre = rest.slice(0, dIdx)
      if (pre.trim()) segs.push({ kind: 'prose', text: pre })
      const inner = dM![1]
      const sM = inner.match(SUMMARY_RE)
      const title = sM ? sM[1].trim() : 'Détails'
      const body = (sM ? inner.replace(sM[0], '') : inner).trim()
      segs.push({ kind: 'toggle', title, body })
      rest = rest.slice(dIdx + dM![0].length)
    } else {
      const pre = rest.slice(0, fIdx)
      if (pre.trim()) segs.push({ kind: 'prose', text: pre })
      segs.push({ kind: 'code', code: fM![1].replace(/\n$/, '') })
      rest = rest.slice(fIdx + fM![0].length)
    }
  }
  return segs
}

// ── Bloc « COPIER-COLLER » : beige clair + monospace + bouton Copier ──
function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    try { navigator.clipboard?.writeText(code) } catch { /* noop */ }
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="rounded-lg border border-[#E8E5DC] bg-[#F5F3EC] overflow-hidden my-2.5">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[#E8E5DC]">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A39E90]">COPIER-COLLER</span>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#8A8576] hover:text-[#5C5644] transition-colors">
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre className="text-[11px] font-mono text-[#37352F] whitespace-pre-wrap leading-relaxed px-4 py-3.5 overflow-x-auto">{code}</pre>
    </div>
  )
}

// ── Section repliable (toggle), claire ──
function Toggle({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-[#EAE8E3] bg-[#FCFBF9] overflow-hidden my-2.5">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[#F2F0EB] transition-colors">
        <span className="text-[13px] font-semibold text-[#37352F]">{title}</span>
        <ChevronDown size={15} className={`text-[#9B968C] flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-3.5 pb-3 pt-0.5"><Segments src={body} /></div>}
    </div>
  )
}

function Segments({ src }: { src: string }) {
  const segs = useMemo(() => segmentFiche(src), [src])
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === 'code') return <CopyBlock key={i} code={s.code} />
        if (s.kind === 'toggle') return <Toggle key={i} title={s.title} body={s.body} />
        return <MarkdownView key={i} markdown={s.text} paper />
      })}
    </>
  )
}

// Papier clair fixe (façon Notion) — encadre le document quel que soit le thème de l'app.
export default function FicheMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="bg-[#FCFBF9] text-[#37352F] rounded-xl px-4 py-3.5">
      <Segments src={markdown ?? ''} />
    </div>
  )
}
