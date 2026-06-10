'use client'

/**
 * Mémoire — 5 couches du système nerveux :
 *  1. Perception (signaux entrants)        — informatif (statuts honnêtes)
 *  2. Mémoire épisodique (Second Brain/raw) — explorateur fichiers RÉELS du VPS
 *  3. Mémoire sémantique (Wiki + Supermemory) — wiki réel + Supermemory (UI officielle / honnête)
 *  4. Mémoire procédurale (Skills/SOPs/Playbooks) — liens vers les onglets
 *  5. Mémoire de travail (GBrain)           — fichiers GBrain récents réels
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Inbox, BookOpen, Sparkles, Wrench, Brain, ArrowLeft, ArrowRight, Search, FileText,
  ExternalLink, Folder, Eye, History, BrainCircuit, Hand, Focus, type LucideIcon,
} from 'lucide-react'
import { Chip, Pill } from '@/components/agentic/ui'
import MarkdownView from '@/components/agentic/MarkdownView'

type Status = 'on' | 'partial' | 'off'
const STATUS: Record<Status, { label: string; color: string }> = {
  on: { label: 'Branché', color: '#16A34A' },
  partial: { label: 'Partiel', color: '#D97706' },
  off: { label: 'Non branché', color: '#9CA3AF' },
}

type SBFile = { id: string; name: string; family: string; path: string; ext: string; size: number; mtime: number; hasContent: boolean }
type GBFile = { id: string; name: string; path: string; size: number; mtime: number; hasContent: boolean }

const frDate = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const koSize = (b: number) => b >= 1_000_000 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1000))} Ko`

export default function MemorySection({ goTab }: { goTab: (t: string, q?: string) => void }) {
  const [layer, setLayer] = useState<number | null>(null)

  const LAYERS: { n: number; title: string; tech: string; def: string; system: string; status: Status; Icon: LucideIcon; color: string }[] = [
    { n: 1, title: 'Perception', tech: 'Signaux entrants', def: 'Ce qui entre dans le système : messages, mails, documents, appels.', system: 'Telegram · Slack · Email · Drive · Data OS', status: 'partial', Icon: Eye, color: '#0EA5E9' },
    { n: 2, title: 'Mémoire épisodique', tech: 'Second Brain / raw', def: 'Ce qui s’est passé : logs, notes brutes, comptes rendus, preuves.', system: 'Second Brain', status: 'on', Icon: History, color: '#16A34A' },
    { n: 3, title: 'Mémoire sémantique', tech: 'Wiki / Supermemory', def: 'Ce que le système comprend : connaissances validées, doctrines, rappel par le sens.', system: 'Wiki · Supermemory', status: 'partial', Icon: BrainCircuit, color: '#8B5CF6' },
    { n: 4, title: 'Mémoire procédurale', tech: 'Skills / SOPs / Playbooks', def: 'Ce que le système sait faire.', system: 'Skills · SOPs · Playbooks', status: 'on', Icon: Hand, color: '#3462EE' },
    { n: 5, title: 'Mémoire de travail', tech: 'GBrain', def: 'Ce que l’agent charge avant d’agir : contexte, sources, contraintes.', system: 'GBrain', status: 'on', Icon: Focus, color: '#FF4D00' },
  ]

  if (layer === 2) return <Detail title="Mémoire épisodique — Second Brain" onBack={() => setLayer(null)}><SecondBrainExplorer /></Detail>
  if (layer === 3) return <Detail title="Mémoire sémantique" onBack={() => setLayer(null)}><SemanticView /></Detail>
  if (layer === 4) return <Detail title="Mémoire procédurale" onBack={() => setLayer(null)}><ProceduralView goTab={goTab} /></Detail>
  if (layer === 5) return <Detail title="Mémoire de travail — GBrain" onBack={() => setLayer(null)}><GbrainView /></Detail>
  if (layer === 1) return <Detail title="Perception — signaux entrants" onBack={() => setLayer(null)}><PerceptionView /></Detail>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3" data-stagger>
        {LAYERS.map(l => {
          const st = STATUS[l.status]
          return (
            <button key={l.n} onClick={() => setLayer(l.n)}
              className="text-left rounded-3xl p-4 flex items-center gap-4 transition-colors group"
              style={{ background: l.color + '0D' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: l.color + '1A' }}>
                <l.Icon size={22} strokeWidth={1.6} style={{ color: l.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-soren-subtle">{l.n}</span>
                  <span className="text-[14px] font-bold text-soren-text">{l.title}</span>
                  <span className="text-[10px] text-soren-subtle">· {l.tech}</span>
                  <Pill color={st.color} dot>{st.label}</Pill>
                </div>
                <p className="text-[12px] text-soren-muted leading-relaxed mt-1">{l.def}</p>
                <p className="text-[10px] text-soren-subtle mt-1">{l.system}</p>
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-soren-muted group-hover:text-[#FF4D00] pr-1">
                Voir <ArrowRight size={13} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Detail({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text"><ArrowLeft size={14} /> Mémoire</button>
      <h2 className="text-[15px] font-black text-soren-text">{title}</h2>
      {children}
    </div>
  )
}

// ── Couche 1 — Perception ──
function PerceptionView() {
  const sources: { name: string; status: Status }[] = [
    { name: 'Telegram', status: 'on' }, { name: 'Slack', status: 'partial' }, { name: 'Email', status: 'off' },
    { name: 'Drive / documents', status: 'off' }, { name: 'Appels', status: 'off' }, { name: 'Data OS', status: 'on' },
    { name: 'Navigateur / recherches', status: 'off' },
  ]
  return (
    <>
      <p className="text-[12px] text-soren-muted">Capturer les signaux bruts avant qu’ils deviennent mémoire.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map(s => { const st = STATUS[s.status]; return (
          <div key={s.name} className="bg-soren-card border border-soren-border rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-[12px] text-soren-text">{s.name}</span>
            <Pill color={st.color} dot>{st.label}</Pill>
          </div>
        )})}
      </div>
    </>
  )
}

// ── Couche 2 — Second Brain explorer (RÉEL) ──
function SecondBrainExplorer() {
  const [data, setData] = useState<{ root: string; files: SBFile[] } | null>(null)
  const [fam, setFam] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<SBFile | null>(null)

  useEffect(() => { fetch('/memory-fs/second-brain.json').then(r => r.json()).then(setData).catch(() => setData({ root: '', files: [] })) }, [])

  const families = useMemo(() => ['all', ...Array.from(new Set((data?.files ?? []).map(f => f.family)))], [data])
  const shown = useMemo(() => (data?.files ?? []).filter(f =>
    (fam === 'all' || f.family === fam) && (!q.trim() || f.path.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 200), [data, fam, q])

  if (open) return (
    <div className="flex flex-col gap-2">
      <button onClick={() => setOpen(null)} className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text"><ArrowLeft size={14} /> Second Brain</button>
      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-[14px] font-bold text-soren-text">{open.name}</h3><Chip>{open.family}</Chip></div>
      <p className="text-[10px] text-soren-subtle font-mono">{open.path} · {koSize(open.size)} · {frDate(open.mtime)}</p>
      <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
        {open.hasContent ? <MarkdownView url={`/memory-fs/sb/${open.id}.txt`} plain={open.ext !== 'md'} /> : <p className="text-[12px] text-soren-subtle">Aperçu non disponible (fichier volumineux). Chemin : {open.path}</p>}
      </div>
    </div>
  )

  if (!data) return <p className="text-[12px] text-soren-subtle py-10 text-center">Lecture du Second Brain…</p>
  if (data.files.length === 0) return <Empty label="Second Brain non trouvé sur le VPS." sub="Aucun dossier vividflow-second-brain détecté." />

  return (
    <>
      <p className="text-[11px] text-soren-subtle font-mono">{data.root} · {data.files.length} fichiers</p>
      <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-full px-3.5 py-2 max-w-md">
        <Search size={14} className="text-soren-subtle" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un fichier…" className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {families.map(f => (
          <button key={f} onClick={() => setFam(f)} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${fam === f ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
            {f === 'all' ? 'Tous' : f}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5" data-stagger>
        {shown.map(f => (
          <button key={f.id} onClick={() => setOpen(f)} className="text-left bg-soren-card border border-soren-border rounded-xl px-3.5 py-2.5 hover:border-[#C8CBD0] transition-all flex items-center gap-2.5">
            <FileText size={14} className="text-soren-subtle flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-normal text-soren-text truncate">{f.name}</p>
              <p className="text-[10px] text-soren-subtle font-mono truncate">{f.path}</p>
            </div>
            <Chip className="flex-shrink-0">{f.family}</Chip>
            <span className="text-[10px] text-soren-subtle flex-shrink-0">{frDate(f.mtime)}</span>
          </button>
        ))}
      </div>
    </>
  )
}

// ── Couche 3 — Sémantique (Wiki réel + Supermemory honnête) ──
function SemanticView() {
  const SUPERMEMORY_UI = 'ui://memory-graph/mcp-app.html'
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2"><BookOpen size={15} className="text-[#16A34A]" /><span className="text-[12px] font-bold text-soren-text">Wiki validé</span><Pill color="#16A34A" dot>Branché</Pill></div>
        <p className="text-[12px] text-soren-muted">Connaissances structurées et validées. Disponibles dans la mémoire épisodique → famille « Wiki ».</p>
      </div>
      <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: '#8B5CF60D' }}>
        <div className="flex items-center gap-2"><Sparkles size={15} className="text-[#8B5CF6]" /><span className="text-[12px] font-bold text-soren-text">Supermemory — rappel sémantique</span><Pill color="#8B5CF6" dot>Vue officielle MCP</Pill></div>
        <p className="text-[12px] text-soren-muted">Supermemory aide à retrouver par le sens. Il ne remplace pas la vérité Data OS.</p>
        <div className="bg-soren-card border border-soren-border rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Graphe officiel</span>
          <code className="text-[11px] text-[#8B5CF6] font-mono flex-1 truncate">{SUPERMEMORY_UI}</code>
        </div>
        <p className="text-[10px] text-soren-subtle">Container par défaut : <code className="font-mono">vividflow_memory_os</code> · données via <code className="font-mono">fetch_graph_data</code>. L’aperçu local intégré s’affiche dès que ce flux est exposé à l’app déployée.</p>
      </div>
    </div>
  )
}

// ── Couche 4 — Procédurale (liens) ──
function ProceduralView({ goTab }: { goTab: (t: string, q?: string) => void }) {
  const items: { label: string; tab: string; Icon: LucideIcon; color: string; desc: string }[] = [
    { label: 'Skills', tab: 'skills', Icon: Wrench, color: '#3462EE', desc: 'Méthodes agentiques exécutables.' },
    { label: 'SOPs', tab: 'sops', Icon: FileText, color: '#16A34A', desc: 'Procédures fixes, étape par étape.' },
    { label: 'Playbooks', tab: 'playbooks', Icon: Brain, color: '#8B5CF6', desc: 'Guides de décision selon le contexte.' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {items.map(i => (
        <button key={i.tab} onClick={() => goTab(i.tab)} className="text-left bg-soren-card border border-soren-border rounded-2xl p-4 hover:border-[#C8CBD0] transition-all flex flex-col gap-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: i.color + '18' }}><i.Icon size={18} style={{ color: i.color }} /></div>
          <span className="text-[12px] font-normal text-soren-text">{i.label}</span>
          <p className="text-[11px] text-soren-muted">{i.desc}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] mt-auto">Ouvrir <ArrowRight size={11} /></span>
        </button>
      ))}
    </div>
  )
}

// ── Couche 5 — GBrain (RÉEL, récents) ──
function GbrainView() {
  const [data, setData] = useState<{ root: string; exists: boolean; files: GBFile[] } | null>(null)
  const [open, setOpen] = useState<GBFile | null>(null)
  useEffect(() => { fetch('/memory-fs/gbrain.json').then(r => r.json()).then(setData).catch(() => setData({ root: '', exists: false, files: [] })) }, [])

  if (open) return (
    <div className="flex flex-col gap-2">
      <button onClick={() => setOpen(null)} className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text"><ArrowLeft size={14} /> GBrain</button>
      <h3 className="text-[14px] font-bold text-soren-text">{open.name}</h3>
      <p className="text-[10px] text-soren-subtle font-mono">{open.path} · {koSize(open.size)} · {frDate(open.mtime)}</p>
      <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
        {open.hasContent ? <MarkdownView url={`/memory-fs/gb/${open.id}.txt`} /> : <p className="text-[12px] text-soren-subtle">Aperçu non disponible.</p>}
      </div>
    </div>
  )

  if (!data) return <p className="text-[12px] text-soren-subtle py-10 text-center">Lecture de GBrain…</p>
  if (!data.exists) return <Empty label="GBrain non branché." sub="Aucun dossier /home/hermes/gbrain détecté." />

  return (
    <>
      <p className="text-[12px] text-soren-muted">Charge le contexte avant action. Dossier détecté : <code className="text-[11px] font-mono">{data.root}</code></p>
      <p className="text-[11px] text-soren-subtle">{data.files.length} fichiers récents</p>
      <div className="flex flex-col gap-1.5" data-stagger>
        {data.files.map(f => (
          <button key={f.id} onClick={() => setOpen(f)} className="text-left bg-soren-card border border-soren-border rounded-xl px-3.5 py-2.5 hover:border-[#C8CBD0] transition-all flex items-center gap-2.5">
            <Folder size={14} className="text-soren-subtle flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-normal text-soren-text truncate">{f.name}</p>
              <p className="text-[10px] text-soren-subtle font-mono truncate">{f.path}</p>
            </div>
            <span className="text-[10px] text-soren-subtle flex-shrink-0">{frDate(f.mtime)}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function Empty({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <ExternalLink size={20} className="text-soren-subtle" />
      <p className="text-[13px] font-bold text-soren-text">{label}</p>
      {sub && <p className="text-[12px] text-soren-muted">{sub}</p>}
    </div>
  )
}
