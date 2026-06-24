'use client'

/**
 * Base de connaissance — nav : Skills · Mémoire · SOPs · Playbooks.
 * Deep-links : /knowledge?tab=skills&q=... (ou &skill=id) ouvrent directement la bonne vue.
 * Tout élément important est cliquable ou mène à une vue utile.
 */

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Wrench, Brain, Search, ArrowLeft, Library, ListChecks, Footprints,
  ExternalLink, CheckSquare, ShieldCheck, User, Clock, FileText, Save, Trash2, Check,
  Star, Upload, Download, Workflow,
} from 'lucide-react'
import { Chip, Pill } from '@/components/agentic/ui'
import MarkdownView from '@/components/agentic/MarkdownView'
import MemorySection from './MemorySection'
import LoopEngineeringSection from './LoopEngineeringSection'
import { SOPS, PLAYBOOKS, DOC_STATUS, DOC_FILTERS, type SOP, type Playbook } from '@/components/agentic/sops'
import DocEditor from './DocEditor'

// Assignables pour l'action "Assigner" (agents + humains).
const ASSIGNEES = ['COO', 'Agent Analyse', 'Agent Support Client', 'Agent Operations', 'Agent KB', 'Jonathan', 'Thomas', 'Humain']

// Seed → page blanche Markdown (titres, points, checklists, étapes, liens — librement éditable ensuite).
function sopToMarkdown(s: SOP): string {
  const L: string[] = []
  L.push('## Objectif', s.objective, '')
  L.push('## Déclencheur', s.trigger, '')
  if (s.inputs.length) { L.push('## Pré-requis / Inputs'); s.inputs.forEach(x => L.push(`- ${x}`)); L.push('') }
  L.push('## Étapes'); s.steps.forEach(st => L.push(`- [ ] ${st.text}${st.owner ? ` — ${st.owner}` : ''}${st.tool ? ` (${st.tool})` : ''}`)); L.push('')
  if (s.output) L.push('## Résultat attendu', s.output, '')
  if (s.proofExpected) L.push('## Preuve / validation', s.proofExpected, '')
  return L.join('\n')
}

function playbookToMarkdown(p: Playbook): string {
  const L: string[] = []
  L.push('## Situation', p.situation, '')
  if (p.signals.length) { L.push('## Signaux à observer'); p.signals.forEach(x => L.push(`- ${x}`)); L.push('') }
  if (p.diagnosticQuestions.length) { L.push('## Questions de diagnostic'); p.diagnosticQuestions.forEach((x, i) => L.push(`${i + 1}. ${x}`)); L.push('') }
  if (p.options.length) { L.push('## Options possibles'); p.options.forEach(x => L.push(`- ${x}`)); L.push('') }
  if (p.decisionRules.length) { L.push('## Règles de décision'); p.decisionRules.forEach(r => L.push(`- Si ${r.if} → ${r.then}`)); L.push('') }
  if (p.recommendedAction) L.push('## Action recommandée', p.recommendedAction, '')
  if (p.escalation) L.push('## Escalade', p.escalation, '')
  return L.join('\n')
}

type TabId = 'skills' | 'memory' | 'sops' | 'playbooks' | 'loop'
type SkillMeta = { id: string; name: string; description: string; family: string; category?: string; path?: string; sourcePath?: string; tags: string[]; uploaded?: boolean; body?: string; uploadId?: string }
type UploadedSkill = { id: string; skillId: string; name: string; description?: string; tags?: string[]; body: string }

const FAV_KEY = 'vividflow.skills.favs'
const slugify = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'skill'

// Déclenche le téléchargement d'un .md côté navigateur.
function downloadMd(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename.replace(/\.(md|markdown)$/i, '') + '.md'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// Récupère le .md complet d'un skill : body uploadé direct, sinon fichier live (sourcePath) puis snapshot.
async function fetchSkillMd(s: SkillMeta): Promise<string | null> {
  if (s.uploaded) return s.body ?? null
  if (s.sourcePath) {
    try { const r = await fetch(`/api/skill?path=${encodeURIComponent(s.sourcePath)}`, { cache: 'no-store' }); if (r.ok) return await r.text() } catch { /* fallback */ }
  }
  try { const r = await fetch(`/agentic-skills/${s.id}.md`); if (r.ok) return await r.text() } catch { /* introuvable */ }
  return null
}

// Parse le front-matter YAML (name/description/tags) d'un .md ; repli sur le nom de fichier.
function parseSkillMd(text: string, filename: string): { name: string; description: string; tags: string[] } {
  let name = filename.replace(/\.(md|markdown)$/i, '')
  let description = ''
  let tags: string[] = []
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([\w-]+):\s*(.*)$/)
      if (!kv) continue
      const k = kv[1].toLowerCase(), val = kv[2].trim().replace(/^["']|["']$/g, '')
      if (k === 'name' && val) name = val
      else if (k === 'description' && val) description = val
      else if (k === 'tags' && val) tags = val.replace(/^\[|\]$/g, '').split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    }
  }
  if (!description) {
    const body = m ? text.slice(m[0].length) : text
    const first = body.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#') && !l.startsWith('---'))
    if (first) description = first.slice(0, 180)
  }
  return { name, description, tags }
}

const TAB_HINT: Record<TabId, string> = {
  skills: 'Méthodes agentiques. Voici ce que les agents savent utiliser.',
  memory: 'Mémoire opérationnelle : ce que le système capte, comprend, retient et charge avant d’agir.',
  sops: 'Procédures fixes. Voici exactement quoi faire.',
  playbooks: 'Guides de décision. Voici comment choisir quoi faire selon le contexte.',
  loop: 'Loops déterministes : ce que le système sait faire tourner de bout en bout, sans échec.',
}

export default function KnowledgeView() {
  const [tab, setTab] = useState<TabId>('skills')
  const [skillsQuery, setSkillsQuery] = useState('')
  const [openSkillId, setOpenSkillId] = useState<string | null>(null)

  // Deep-links (sans Suspense : lecture client de l'URL)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab') as TabId | null
    if (t && ['skills', 'memory', 'sops', 'playbooks', 'loop'].includes(t)) setTab(t)
    if (p.get('q')) { setSkillsQuery(p.get('q') || ''); setTab('skills') }
    if (p.get('skill')) { setOpenSkillId(p.get('skill')); setTab('skills') }
  }, [])

  const goTab = (t: string, q?: string) => { setTab(t as TabId); if (q !== undefined) { setSkillsQuery(q); setOpenSkillId(null) } }

  // SOPs & Playbooks retirés ici — déjà couverts par le module Process.
  const TABS: { id: TabId; label: string; Icon: typeof Wrench }[] = [
    { id: 'skills', label: 'Skills', Icon: Wrench },
    { id: 'loop', label: 'Loop engineering', Icon: Workflow },
    { id: 'memory', label: 'Mémoire', Icon: Brain },
  ]
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-2 flex-shrink-0 flex items-center gap-1.5 flex-wrap">
        {TABS.map(t => {
          const on = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${on ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
              <t.Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>
      <p className="px-6 pb-3 text-[11px] text-soren-subtle flex-shrink-0">{TAB_HINT[tab]}</p>
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {tab === 'skills' && <SkillsSection query={skillsQuery} setQuery={setSkillsQuery} openId={openSkillId} setOpenId={setOpenSkillId} />}
        {tab === 'loop' && <LoopEngineeringSection />}
        {tab === 'memory' && <MemorySection goTab={goTab} />}
      </div>
    </div>
  )
}

// ─── Communs ─────────────────────────────────────────────────────────────────

function ProcessBanner() {
  const procs = useQuery(api.processes.list, {}) as unknown[] | undefined
  return (
    <Link href="/bibliotheque/process" className="flex items-center justify-between gap-2 bg-soren-elevated rounded-xl px-3.5 py-2 hover:bg-[#E5E7EB]/60 transition-colors">
      <span className="text-[11px] text-soren-muted">Bibliothèque métier complète {procs ? `(${procs.length} process)` : ''} dans le module Process</span>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00]">Ouvrir <ExternalLink size={11} /></span>
    </Link>
  )
}

function StatusFilters({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {DOC_FILTERS.map(f => (
        <button key={f.id} onClick={() => onChange(f.id)} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${value === f.id ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>{f.label}</button>
      ))}
    </div>
  )
}

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-soren-elevated text-soren-muted text-[10px] font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-soren-subtle">{title}</span>
      </div>
      <div className="pl-7 text-[12px] text-soren-text leading-relaxed">{children}</div>
    </div>
  )
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text"><ArrowLeft size={14} /> {label}</button>
}

function MemList({ items }: { items: string[] }) {
  return <div className="flex items-center gap-1.5 flex-wrap">{items.map(m => <Chip key={m}>{m}</Chip>)}</div>
}

// Synthèse libre, en français, éditable et persistée (Convex os_kb_docs) par skill.
function SkillSynthesis({ skillId, skillName }: { skillId: string; skillName: string }) {
  const docId  = `skill:${skillId}`
  const note   = useQuery(api.osKbDocs.getByDocId, { docId }) as { body?: string } | null | undefined
  const upsert = useMutation(api.osKbDocs.upsert)
  const [body, setBody]           = useState('')
  const [dirty, setDirty]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    if (note !== undefined && loadedFor !== skillId) { setBody(note?.body ?? ''); setLoadedFor(skillId); setDirty(false) }
  }, [note, loadedFor, skillId])

  async function save() {
    setSaving(true)
    await upsert({ docId, title: `Synthèse — ${skillName}`, body: body.trim(), status: 'draft' })
    setDirty(false); setSaving(false)
  }
  async function clear() {
    setBody(''); await upsert({ docId, title: `Synthèse — ${skillName}`, body: '', status: 'draft' }); setDirty(false)
  }

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#FF4D00] uppercase tracking-wide inline-flex items-center gap-1.5"><FileText size={11} /> Synthèse</span>
        <div className="flex items-center gap-2">
          {body.trim() && <button onClick={clear} className="text-[10px] font-semibold text-soren-muted hover:text-[#EF4444] inline-flex items-center gap-1"><Trash2 size={11} /> Effacer</button>}
          <button onClick={save} disabled={!dirty || saving} className="text-[10px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 bg-[#FF4D00] text-white hover:bg-[#e64500]">{saving ? '…' : <><Check size={11} /> Enregistrer</>}</button>
        </div>
      </div>
      <textarea
        value={body}
        onChange={e => { setBody(e.target.value); setDirty(true) }}
        rows={4}
        placeholder="Écris ici, en français, ce que fait ce skill et quand l'utiliser… (libre, modifiable et supprimable à tout moment)"
        className="w-full text-[12px] text-soren-text bg-soren-elevated rounded-xl px-3 py-2 outline-none border border-soren-border resize-y leading-relaxed placeholder:text-[#9CA3AF]"
      />
    </div>
  )
}

// ─── 1. Skills (réels, VPS — 3 familles) ─────────────────────────────────────

const FAMILY_ORDER = ['Skills internes', 'Skills importés', 'Skills natifs']

/** Affiche le VRAI contenu du SKILL.md : lecture live du fichier (sourcePath) d'abord,
 *  snapshot bundlé en fallback. Frontmatter affiché proprement, markdown rendu fidèlement, scroll interne. */
function SkillContent({ sourcePath, fallbackUrl }: { sourcePath?: string; fallbackUrl: string }) {
  const [st, setSt] = useState<{ loading: boolean; text?: string; live?: boolean; error?: string }>({ loading: true })
  const [mode, setMode] = useState<'md' | 'raw'>('md')
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (sourcePath) {
        try {
          const r = await fetch(`/api/skill?path=${encodeURIComponent(sourcePath)}`, { cache: 'no-store' })
          if (r.ok) { const t = await r.text(); if (alive) setSt({ loading: false, text: t, live: true }); return }
        } catch { /* bascule snapshot */ }
      }
      try {
        const r = await fetch(fallbackUrl)
        if (!r.ok) throw new Error()
        const t = await r.text()
        if (alive) setSt({ loading: false, text: t, live: false })
      } catch {
        if (alive) setSt({ loading: false, error: sourcePath || fallbackUrl })
      }
    })()
    return () => { alive = false }
  }, [sourcePath, fallbackUrl])

  if (st.loading) return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-5 flex flex-col gap-2">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-3.5 rounded bg-soren-elevated animate-pulse" style={{ width: `${55 + (i * 11) % 40}%` }} />)}
    </div>
  )
  if (st.error) return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
      <p className="text-[12px] font-semibold text-[#DC2626]">Fichier introuvable</p>
      <p className="text-[11px] text-soren-subtle font-mono mt-1 break-all">{st.error}</p>
    </div>
  )
  const full = st.text ?? ''
  const m = full.match(/^---\n([\s\S]*?)\n---\n?/)
  const fm = m ? m[1] : null
  const body = m ? full.slice(m[0].length) : full
  return (
    <div className="flex flex-col gap-2">
      {/* Barre : badge source + bascule de mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${st.live ? 'text-[#16A34A]' : 'text-soren-muted bg-soren-elevated'}`} style={st.live ? { background: '#16A34A1A' } : undefined}>
          {st.live ? 'Lecture live du fichier VPS' : 'Version synchronisée au dernier déploiement'}
        </span>
        <div className="ml-auto inline-flex items-center gap-1 bg-soren-elevated rounded-full p-0.5">
          {(['md', 'raw'] as const).map(mo => (
            <button key={mo} onClick={() => setMode(mo)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${mode === mo ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'}`}>
              {mo === 'md' ? 'Aperçu Markdown' : 'Fichier brut'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-soren-card border border-soren-border rounded-2xl p-5 max-h-[68vh] overflow-auto">
        {mode === 'raw' ? (
          // Fidèle à l'octet : fichier complet (--- inclus), aucune transformation.
          <pre className="text-[11.5px] font-mono text-soren-text whitespace-pre leading-relaxed">{full}</pre>
        ) : (
          <div className="flex flex-col gap-3">
            {fm && <pre className="text-[11px] font-mono text-soren-muted bg-soren-elevated rounded-xl px-3 py-2 overflow-x-auto whitespace-pre-wrap">{fm}</pre>}
            <MarkdownView markdown={body} />
          </div>
        )}
      </div>
    </div>
  )
}

function SkillsSection({ query, setQuery, openId, setOpenId }: {
  query: string; setQuery: (v: string) => void; openId: string | null; setOpenId: (v: string | null) => void
}) {
  const [staticList, setStaticList] = useState<SkillMeta[]>([])
  const [fam, setFam] = useState('Tous')
  const [favs, setFavs] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploaded = useQuery(api.osSkills.list, {}) as UploadedSkill[] | undefined
  const createSkill = useMutation(api.osSkills.create)
  const removeSkill = useMutation(api.osSkills.remove)

  useEffect(() => { fetch('/agentic-skills/index.json').then(r => r.json()).then(setStaticList).catch(() => setStaticList([])) }, [])
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')) } catch { /* ignore */ } }, [])

  // Skills uploadés (Convex) fusionnés avec les natifs (fichiers statiques).
  const list = useMemo<SkillMeta[]>(() => {
    const up: SkillMeta[] = (uploaded ?? []).map(u => ({
      id: 'upload:' + u.skillId, name: u.name, description: u.description ?? '', family: 'Skills importés',
      tags: u.tags ?? [], uploaded: true, body: u.body, uploadId: u.id,
    }))
    return [...up, ...staticList]
  }, [staticList, uploaded])

  const isFav = (id: string) => favs.includes(id)
  const toggleFav = (id: string) => setFavs(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })

  const shown = useMemo(() => list.filter(s =>
    (fam === 'Tous' ? true : fam === '__fav' ? isFav(s.id) : s.family === fam) &&
    (!query.trim() || (s.name + ' ' + s.id + ' ' + (s.path ?? '') + ' ' + s.description + ' ' + s.tags.join(' ')).toLowerCase().includes(query.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name)), [list, query, fam, favs]) // eslint-disable-line react-hooks/exhaustive-deps

  const families = useMemo(() => ['Tous', ...FAMILY_ORDER.filter(f => list.some(s => s.family === f))], [list])

  // Import .md (clic ou drag-and-drop). Upsert par skillId → réimporter un .md édité met à jour le skill.
  async function onFiles(files: File[]) {
    const mds = files.filter(f => /\.(md|markdown)$/i.test(f.name))
    if (!mds.length) return
    setImporting(true)
    try {
      for (const file of mds) {
        const text = await file.text()
        const meta = parseSkillMd(text, file.name)
        await createSkill({ skillId: slugify(meta.name || file.name), name: meta.name || file.name, description: meta.description, tags: meta.tags, body: text })
      }
    } catch { /* ignore */ } finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function exportSkill(s: SkillMeta) {
    setExporting(true)
    try {
      const md = await fetchSkillMd(s)
      if (md) downloadMd(slugify(s.name || s.id), md)
    } finally { setExporting(false) }
  }

  const open = openId ? list.find(s => s.id === openId) : null

  if (open) return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <BackBtn onClick={() => setOpenId(null)} label="Skills" />
        <div className="flex items-center gap-3">
          <button onClick={() => void exportSkill(open)} disabled={exporting}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-soren-text transition-colors disabled:opacity-50"><Download size={12} /> {exporting ? 'Export…' : 'Exporter .md'}</button>
          {open.uploaded && open.uploadId && (
            <button onClick={() => { void removeSkill({ id: open.uploadId as never }); setOpenId(null) }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-[#DC2626] transition-colors"><Trash2 size={12} /> Supprimer</button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-[15px] font-bold text-soren-text">{open.name}</h2><Chip>{open.family}</Chip>{open.category && <Chip>{open.category}</Chip>}
        <button onClick={() => toggleFav(open.id)} className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${isFav(open.id) ? 'text-[#F59E0B]' : 'text-soren-subtle hover:text-soren-text'}`}>
          <Star size={13} className={isFav(open.id) ? 'fill-[#F59E0B]' : ''} /> {isFav(open.id) ? 'Favori' : 'Favoris'}
        </button>
      </div>
      {open.path && <p className="text-[10px] text-soren-subtle font-mono -mt-1">{open.path}</p>}
      {open.uploaded
        ? <div className="bg-soren-card border border-soren-border rounded-2xl p-5"><MarkdownView markdown={open.body} /></div>
        : <><SkillSynthesis skillId={open.id} skillName={open.name} /><SkillContent sourcePath={open.sourcePath} fallbackUrl={`/agentic-skills/${open.id}.md`} /></>}
    </div>
  )

  return (
    <div className="relative flex flex-col gap-3"
      onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); void onFiles(Array.from(e.dataTransfer.files)) }}>
      {dragOver && (
        <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-[#FF4D00] bg-[#FF4D00]/5 flex items-center justify-center pointer-events-none">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#FF4D00]"><Upload size={16} /> Déposez vos .md pour les importer</span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-full px-3.5 py-2 flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="text-soren-subtle" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un skill…" className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          <span className="text-[10px] text-soren-subtle">{shown.length}</span>
        </div>
        <input ref={fileRef} type="file" accept=".md,.markdown,text/markdown" multiple className="hidden" onChange={e => { void onFiles(Array.from(e.target.files ?? [])) }} />
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          className="inline-flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3 py-2 rounded-full hover:bg-[#e64500] transition-colors disabled:opacity-60 flex-shrink-0">
          <Upload size={13} /> {importing ? 'Import…' : 'Importer un skill'}
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setFam('__fav')} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${fam === '__fav' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
          <Star size={11} className={fam === '__fav' ? 'fill-white' : ''} /> Favoris{favs.length > 0 && <span className="ml-0.5 opacity-80">{favs.length}</span>}
        </button>
        {families.map(f => (
          <button key={f} onClick={() => setFam(f)} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${fam === f ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
            {f}{f !== 'Tous' && <span className="ml-1 opacity-70">{list.filter(s => s.family === f).length}</span>}
          </button>
        ))}
      </div>
      {staticList.length === 0 && (uploaded?.length ?? 0) === 0 ? <p className="text-[12px] text-soren-subtle py-16 text-center">Chargement de la bibliothèque…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-stagger>
          {shown.map(s => (
            <div key={s.id} onClick={() => setOpenId(s.id)} className="relative cursor-pointer text-left bg-soren-card border border-soren-border rounded-2xl p-3.5 hover:border-[#C8CBD0] hover:shadow-sm transition-all flex flex-col gap-1.5">
              <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toggleFav(s.id) }}
                className={`absolute top-2.5 right-2.5 p-1 rounded-lg transition-colors ${isFav(s.id) ? 'text-[#F59E0B]' : 'text-soren-subtle/50 hover:text-[#F59E0B]'}`} title={isFav(s.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                <Star size={15} className={isFav(s.id) ? 'fill-[#F59E0B]' : ''} />
              </span>
              <div className="flex items-start gap-2.5 pr-6">
                <div className="w-8 h-8 rounded-xl bg-[#3462EE]/10 flex items-center justify-center flex-shrink-0"><Wrench size={14} className="text-[#3462EE]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-normal text-soren-text truncate">{s.name}</p>
                  <p className="text-[11px] text-soren-muted line-clamp-2 leading-snug">{s.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Chip className="flex-shrink-0">{s.family}</Chip>
                {s.path && <span className="text-[9px] text-soren-subtle font-mono truncate">{s.path}</span>}
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="text-[12px] text-soren-subtle py-10 text-center col-span-full">{fam === '__fav' ? 'Aucun favori pour l’instant — clique l’étoile sur un skill.' : `Aucun skill pour « ${query} ».`}</p>}
        </div>
      )}
    </div>
  )
}

// ─── 3. SOPs ─────────────────────────────────────────────────────────────────

function SopsSection() {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<SOP | null>(null)
  const match = DOC_FILTERS.find(f => f.id === filter)?.match ?? (() => true)
  const shown = SOPS.filter(s => match(s.status))
  if (open) return <SopDetail sop={open} onBack={() => setOpen(null)} />
  return (
    <div className="flex flex-col gap-3">
      <ProcessBanner />
      <StatusFilters value={filter} onChange={setFilter} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-stagger>
        {shown.map(s => { const st = DOC_STATUS[s.status]; return (
          <button key={s.id} onClick={() => setOpen(s)} className="text-left bg-soren-card border border-soren-border rounded-2xl p-4 hover:border-[#C8CBD0] hover:shadow-sm transition-all flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2"><p className="text-[12px] font-normal text-soren-text">{s.title}</p><Pill color={st.color} dot className="flex-shrink-0">{st.label}</Pill></div>
            <p className="text-[12px] text-soren-muted leading-snug">{s.objective}</p>
            <p className="text-[10px] text-soren-subtle"><span className="font-semibold">Déclencheur :</span> {s.trigger}</p>
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-soren-subtle">
              <span className="inline-flex items-center gap-1"><User size={10} /> {s.owner}</span>
              {s.estimatedTime && <span className="inline-flex items-center gap-1"><Clock size={10} /> {s.estimatedTime}</span>}
              {s.linkedTo && <Chip>{s.linkedTo}</Chip>}
              <span className="ml-auto">MAJ {s.updatedAt}</span>
            </div>
          </button>
        )})}
      </div>
    </div>
  )
}

function SopDetail({ sop, onBack }: { sop: SOP; onBack: () => void }) {
  const seed = useMemo(() => sopToMarkdown(sop), [sop.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-4 w-full">
      <BackBtn onClick={onBack} label="SOPs" />
      <DocEditor docId={`sop:${sop.id}`} seedTitle={sop.title} seedBody={seed} seedStatus={sop.status} seedOwner={sop.owner} assignees={ASSIGNEES} />
    </div>
  )
}

// ─── 4. Playbooks ────────────────────────────────────────────────────────────

function PlaybooksSection() {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<Playbook | null>(null)
  const match = DOC_FILTERS.find(f => f.id === filter)?.match ?? (() => true)
  const shown = PLAYBOOKS.filter(p => match(p.status))
  if (open) return <PlaybookDetail pb={open} onBack={() => setOpen(null)} />
  return (
    <div className="flex flex-col gap-3">
      <ProcessBanner />
      <StatusFilters value={filter} onChange={setFilter} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-stagger>
        {shown.map(p => { const st = DOC_STATUS[p.status]; return (
          <button key={p.id} onClick={() => setOpen(p)} className="text-left bg-soren-card border border-soren-border rounded-2xl p-4 hover:border-[#C8CBD0] hover:shadow-sm transition-all flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2"><p className="text-[12px] font-normal text-soren-text">{p.title}</p><Pill color={st.color} dot className="flex-shrink-0">{st.label}</Pill></div>
            <p className="text-[12px] text-soren-muted leading-snug">{p.situation}</p>
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-soren-subtle">
              <span className="inline-flex items-center gap-1"><User size={10} /> {p.owner}</span>
              {p.usedBy.length > 0 && <span>· {p.usedBy.length} agent{p.usedBy.length > 1 ? 's' : ''}</span>}
              <span className="ml-auto">MAJ {p.updatedAt}</span>
            </div>
          </button>
        )})}
      </div>
    </div>
  )
}

function PlaybookDetail({ pb, onBack }: { pb: Playbook; onBack: () => void }) {
  const seed = useMemo(() => playbookToMarkdown(pb), [pb.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-4 w-full">
      <BackBtn onClick={onBack} label="Playbooks" />
      <DocEditor docId={`pb:${pb.id}`} seedTitle={pb.title} seedBody={seed} seedStatus={pb.status} seedOwner={pb.owner} assignees={ASSIGNEES} />
    </div>
  )
}
