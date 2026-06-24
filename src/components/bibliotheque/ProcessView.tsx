'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { DndContext, DragOverlay, useDraggable, useDroppable, pointerWithin, defaultDropAnimationSideEffects, type DragEndEvent, type DragStartEvent, type DropAnimation } from '@dnd-kit/core'
import { useKanbanSensors } from '@/hooks/useKanbanSensors'
import { api } from '../../../convex/_generated/api'
import { Modal } from '@/components/ui/Modal'
import {
  Plus, ArrowLeft, ArrowUpRight, Trash2, X, Image as ImageIcon, Camera, RefreshCw, Search, Link2, ChevronDown, FolderPlus, Check, Maximize2, Pencil, Copy,
  Workflow, GitMerge, Target, Rocket, Users, FileText, Settings, Zap, Layers,
  CheckSquare, MessageSquare, TrendingUp, Calendar, Database, CreditCard, Mail, Folder, Star, Flag,
  type LucideIcon,
} from 'lucide-react'
import DocEditor from './DocEditor'
import FicheMarkdown from './FicheMarkdown'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Markdown → HTML (pour afficher/éditer une fiche .md dans l'éditeur WYSIWYG, ou importer un .md).
function mdToHtml(md: string): string {
  if (!md || !md.trim()) return ''
  const raw = marked.parse(md) as string
  return typeof window === 'undefined' ? raw : DOMPurify.sanitize(raw)
}

type Block = { type: string; text: string }

// Legacy block arrays → HTML for the document editor; new docs store a single { type:'doc', text:html }.
function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function blocksToHtml(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return ''
  if (blocks.length === 1 && blocks[0].type === 'doc') return blocks[0].text
  let out = '', inList = false
  for (const b of blocks) {
    if (b.type === 'bullet') { if (!inList) { out += '<ul>'; inList = true } out += `<li>${escapeHtml(b.text)}</li>`; continue }
    if (inList) { out += '</ul>'; inList = false }
    if (b.type === 'h1' || b.type === 'h2') out += `<h2>${escapeHtml(b.text)}</h2>`
    else out += `<p>${escapeHtml(b.text) || '<br>'}</p>`
  }
  if (inList) out += '</ul>'
  return out
}
type Process = { id: string; title: string; icon: string; link: string; previewUrl: string; blocks: Block[]; category: string; subfolder: string; linkedClientId: string; assignedUserIds: string[]; order: number; updatedAt: string }

// ─── SOPs & Playbooks = documents Markdown ─────────────────────
// Stockés en un seul bloc { type:'md', text:<markdown brut> } — pas de migration (le schéma accepte tout type string).
const SOP_TEMPLATE = `# SOP #N — [Titre du SOP]

**Responsable :** [Nom (Rôle)]
**Exécutant :** [Rôle]
**Statut :** Actif
**Dernière revue :** ${'AAAA-MM-JJ'}

---

## 🎯 Objectif
[Ce que ce SOP accomplit, en une phrase.]

## ✅ Si on le suit
[Conséquence positive.]

## ❌ Si on ne le suit pas
[Conséquence négative.]

## 📥 Inputs
- [Ce qu'il faut AVANT de commencer]

## 📤 Outputs
- [Ce qu'on obtient APRÈS]

## 📋 Checklist (max 8 étapes)
1. **[Titre étape]** — [Manuel — … / Skill /nom — …]
2. …

## ❓ FAQ
**Q : …**
R : …

---

<details>
<summary>📋 Template à copier — [nom du livrable]</summary>

\`\`\`
[Colle ici le contenu prêt à copier-coller pour chaque exécution…]
\`\`\`
</details>
`

const PLAYBOOK_TEMPLATE = `# Playbook — [Nom du playbook]

**Owner :** [Nom]
**Version :** v1.0
**Date :** ${'AAAA-MM-JJ'}
**Statut :** Draft / En cours / Validé

---

## 🧭 Quand utiliser ce playbook
[Situation déclencheuse.]

## 🎯 Objectif
[Résultat visé.]

## 🪜 Étapes
1. …
2. …

## 🧩 Décisions clés
- **Si … → …**

## 🛠️ Ressources & SOPs liés
- [Lien / SOP]

## 📊 Comment savoir que c'est réussi
- [Métrique / signal observable]

---

<details>
<summary>📋 Template à copier — [nom du livrable]</summary>

\`\`\`
[Colle ici le contenu prêt à copier-coller à chaque utilisation…]
\`\`\`
</details>
`

// Sous-dossier → type de doc Markdown (sinon null = éditeur Word classique).
function mdKindOf(subfolder: string): 'SOP' | 'Playbook' | null {
  const sf = (subfolder || '').toLowerCase()
  if (sf === 'sops') return 'SOP'
  if (sf === 'playbooks') return 'Playbook'
  return null
}
function mdFromBlocks(blocks: Block[]): string {
  return (blocks?.length === 1 && blocks[0].type === 'md') ? blocks[0].text : ''
}
// Strip léger de la syntaxe markdown pour l'aperçu des cartes.
function stripMarkdown(s: string): string {
  return s
    .replace(/^---+$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .trim()
}

// Aperçu texte : 1er bloc non vide, tags HTML retirés (fallback quand pas d'image).
function textPreview(blocks: Block[]): string {
  if (blocks?.length === 1 && blocks[0].type === 'md') return stripMarkdown(blocks[0].text)
  const first = (blocks ?? []).map(b => (b.text ?? '').trim()).find(Boolean) ?? ''
  return first
    .replace(/<li[^>]*>/gi, '• ')                       // puces
    .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol)>/gi, '\n')  // fins de blocs → saut de ligne
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')                            // autres balises
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')                             // espaces multiples (préserve \n)
    .split('\n').map(l => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')                          // max une ligne vide
    .trim()
}
// ─── Doc Markdown friendly (SOPs & Playbooks) ──────────────────
// Lecture = carte COPIER-COLLER (toggle Aperçu rendu ↔ source + « Copier tout »).
// Édition = textarea markdown brut + aperçu live + bouton « Insérer le template ».
function MarkdownDoc({ md, readOnly, onChange, kind }: { md: string; readOnly: boolean; onChange: (md: string) => void; kind: 'SOP' | 'Playbook' }) {
  const [draft, setDraft] = useState(md)
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const template = kind === 'SOP' ? SOP_TEMPLATE : PLAYBOOK_TEMPLATE

  function change(v: string) {
    setDraft(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 600)
  }
  function copy() {
    try { navigator.clipboard?.writeText(md) } catch { /* noop */ }
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }

  // ── Mode édition : markdown brut + aperçu live ──
  if (!readOnly) {
    return (
      <div className="flex flex-col gap-3">
        {!draft.trim() && (
          <div className="flex justify-end">
            <button onClick={() => change(template)} className="text-[11px] font-semibold text-[#FF4D00] hover:underline">Insérer le template {kind}</button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={e => change(e.target.value)}
          onBlur={() => { if (timer.current) clearTimeout(timer.current); onChange(draft) }}
          placeholder={`# ${kind}…`}
          spellCheck={false}
          className="w-full min-h-[360px] bg-[#FCFBF9] text-[#37352F] placeholder-[#A39E90] font-mono text-[12px] leading-relaxed rounded-2xl border border-[#E8E5DC] px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#FF4D00]/40 resize-y"
        />
        {draft.trim() && (
          <div className="rounded-2xl border border-soren-border bg-soren-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle mb-2">Aperçu</p>
            <FicheMarkdown markdown={draft} />
          </div>
        )}
      </div>
    )
  }

  // ── Mode lecture : carte COPIER-COLLER ──
  if (!md.trim()) {
    return <p className="text-[12px] text-soren-subtle italic py-6">Aucun contenu. Clique « Modifier » pour rédiger ce {kind}.</p>
  }
  return (
    <div className="rounded-2xl border border-soren-border bg-soren-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-soren-border bg-soren-elevated/60">
        <div className="flex items-center gap-0.5 bg-soren-card border border-soren-border rounded-full p-0.5">
          {([['preview', 'Aperçu'], ['source', 'Copier-coller']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full transition-colors ${view === v ? 'bg-[#FF4D00] text-white' : 'text-soren-muted hover:text-soren-text'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-[10.5px] font-semibold text-soren-muted hover:text-soren-text bg-soren-card border border-soren-border rounded-full px-2.5 py-1 transition-colors">
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? 'Copié' : 'Copier tout'}
        </button>
      </div>
      <div className="p-4">
        {view === 'preview'
          ? <FicheMarkdown markdown={md} />
          : <pre className="text-[11.5px] font-mono text-soren-text whitespace-pre-wrap leading-relaxed">{md}</pre>}
      </div>
    </div>
  )
}

type ClientLite = { _id: string; ghl_contact_id?: string; name: string }
type UserLite = { id: string; name: string; avatarUrl?: string }

const DEFAULT_CATS = ['Process internes', 'Process clients']

// Animation de drop fluide (identique pipeline/prospection).
const PROCESS_DROP_ANIM: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

// ─── Avatars de profils ───────────────────────────────────────
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?'
const AV_COLORS = ['#FF4D00', '#3462EE', '#16A34A', '#8B5CF6', '#D97706', '#0EA5E9', '#DC2626', '#0F766E']
const avatarColor = (id: string) => AV_COLORS[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % AV_COLORS.length]
function Avatar({ u, size = 22 }: { u: UserLite; size?: number }) {
  if (u.avatarUrl) return <img src={u.avatarUrl} alt={u.name} title={u.name} className="rounded-full object-cover ring-2 ring-soren-card" style={{ width: size, height: size }} />
  return <span title={u.name} className="rounded-full flex items-center justify-center font-bold text-white ring-2 ring-soren-card flex-shrink-0" style={{ width: size, height: size, background: avatarColor(u.id), fontSize: Math.round(size * 0.4) }}>{initials(u.name)}</span>
}

// ─── Sélecteur multi-profils (dropdown) ───────────────────────
function PeoplePicker({ users, selected, onToggle }: { users: UserLite[]; selected: string[]; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) } document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const sel = users.filter(u => selected.includes(u.id))
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold text-soren-muted hover:text-soren-text transition-colors">
        <Users size={12} className="text-soren-subtle flex-shrink-0" />
        {sel.length === 0
          ? <span>Assigner des profils</span>
          : <span className="flex items-center gap-1"><span className="flex -space-x-1.5">{sel.slice(0, 4).map(u => <Avatar key={u.id} u={u} size={18} />)}</span>{sel.length > 4 && <span className="text-soren-muted">+{sel.length - 4}</span>}</span>}
        <ChevronDown size={12} className="text-soren-subtle flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl py-1.5 min-w-[240px] max-h-72 overflow-y-auto">
          {users.length === 0 && <p className="px-3 py-2 text-[11px] text-soren-subtle">Aucun profil</p>}
          {users.map(u => {
            const on = selected.includes(u.id)
            return (
              <button key={u.id} type="button" onClick={() => onToggle(u.id)} className="w-full flex items-center gap-2.5 text-left px-3 py-1.5 hover:bg-soren-elevated transition-colors">
                <Avatar u={u} size={24} />
                <span className={`flex-1 truncate text-[12px] ${on ? 'text-soren-text font-semibold' : 'text-soren-muted'}`}>{u.name}</span>
                {on && <Check size={13} className="text-[#FF4D00] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ICONS: Record<string, LucideIcon> = {
  workflow: Workflow, gitMerge: GitMerge, target: Target, rocket: Rocket, users: Users,
  fileText: FileText, settings: Settings, zap: Zap, layers: Layers, checkSquare: CheckSquare,
  message: MessageSquare, trending: TrendingUp, calendar: Calendar, database: Database,
  card: CreditCard, mail: Mail, folder: Folder, star: Star, flag: Flag,
}
const IconOf = ({ k, ...p }: { k?: string; size?: number; className?: string }) => {
  const C = ICONS[k ?? 'workflow'] ?? Workflow
  return <C {...p} />
}
function IconPicker({ current, onPick }: { current: string; onPick: (k: string) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) } document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="w-12 h-12 rounded-2xl bg-[#FF4D00]/10 flex items-center justify-center hover:bg-[#FF4D00]/20 transition-colors"><IconOf k={current} size={22} className="text-[#FF4D00]" /></button>
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl p-2 grid grid-cols-6 gap-1 w-64">
          {Object.keys(ICONS).map(k => <button key={k} onClick={() => { onPick(k); setOpen(false) }} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${current === k ? 'bg-[#FF4D00]/15 text-[#FF4D00]' : 'text-soren-muted hover:bg-soren-elevated'}`}><IconOf k={k} size={16} /></button>)}
        </div>
      )}
    </div>
  )
}

// Modern dropdown (replaces native select) — optional search + empty option
function Picker({ value, placeholder, options, onSelect, searchable, emptyLabel, icon }: {
  value: string; placeholder: string; options: { value: string; label: string }[]; onSelect: (v: string) => void
  searchable?: boolean; emptyLabel?: string; icon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) } document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const current = options.find(o => o.value === value)?.label
  const shown = searchable && q.trim() ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1.5 bg-soren-elevated rounded-full pl-3 pr-2.5 py-1.5 text-[11px] font-semibold text-soren-text hover:bg-[#E5E7EB]/50 transition-colors max-w-[200px]">
        {icon}<span className="truncate">{current ?? <span className="text-soren-subtle font-medium">{placeholder}</span>}</span>
        <ChevronDown size={12} className="text-soren-subtle flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-soren-card border border-soren-border rounded-2xl shadow-xl py-1.5 min-w-[220px] max-h-72 overflow-y-auto">
          {searchable && <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="mx-2 mb-1 w-[calc(100%-1rem)] bg-soren-elevated rounded-lg px-2.5 py-1.5 text-[11px] text-soren-text placeholder-[#9CA3AF] outline-none" />}
          {emptyLabel !== undefined && (
            <button onClick={() => { onSelect(''); setOpen(false); setQ('') }} className={`w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-[12px] hover:bg-soren-elevated ${!value ? 'text-[#FF4D00] font-semibold' : 'text-soren-muted'}`}>{emptyLabel}{!value && <Check size={12} />}</button>
          )}
          {shown.map(o => (
            <button key={o.value} onClick={() => { onSelect(o.value); setOpen(false); setQ('') }} className={`w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-[12px] hover:bg-soren-elevated ${o.value === value ? 'text-[#FF4D00] font-semibold' : 'text-soren-text'}`}>
              <span className="truncate">{o.label}</span>{o.value === value && <Check size={12} className="flex-shrink-0" />}
            </button>
          ))}
          {shown.length === 0 && <p className="px-3 py-2 text-[11px] text-soren-subtle">Aucun résultat</p>}
        </div>
      )}
    </div>
  )
}

// Petit bouton « Copier » le contenu texte d'une fiche (lecture).
function CopyDocButton({ text }: { text: string }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={() => { try { navigator.clipboard?.writeText(text) } catch { /* noop */ } setC(true); setTimeout(() => setC(false), 1400) }}
      className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-soren-muted hover:text-soren-text bg-soren-card border border-soren-border rounded-full px-2.5 py-1 transition-colors">
      {c ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}{c ? 'Copié' : 'Copier le contenu'}
    </button>
  )
}

function ProcessDetail({ proc, categories, subfolderOptions, clients, users, onBack, cannotEdit = false }: { proc: Process; categories: string[]; subfolderOptions: string[]; clients: ClientLite[]; users: UserLite[]; onBack: () => void; cannotEdit?: boolean }) {
  const update = useMutation(api.processes.update)
  const removeP = useMutation(api.processes.remove)
  const toggleUser = (uid: string) => {
    const next = proc.assignedUserIds.includes(uid)
      ? proc.assignedUserIds.filter(x => x !== uid)
      : [...proc.assignedUserIds, uid]
    void update({ id: proc.id as never, assignedUserIds: next })
  }
  const genUpload = useMutation(api.files.generateUploadUrl)
  const [title, setTitle] = useState(proc.title)
  const [link, setLink]   = useState(proc.link)
  const [editingLink, setEditingLink] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Lecture seule par défaut (protégé). L'admin clique "Modifier" pour éditer, "Sauvegarder" pour reverrouiller.
  const [editing, setEditing] = useState(false)
  const readOnly = cannotEdit || !editing

  function saveDoc(html: string) { void update({ id: proc.id as never, blocks: [{ type: 'doc', text: html }] }) }

  // SOPs & Playbooks = document éditable « papier clair » (WYSIWYG). On édite l'aperçu directement,
  // pas de markdown brut. Le contenu est stocké en HTML ; un éventuel ancien bloc `md` est rendu en
  // HTML à l'affichage (mdToHtml) et migré en HTML dès la 1re édition.
  const subfolderKind = mdKindOf(proc.subfolder)        // SOP/Playbook indépendamment du contenu actuel
  const blocksAsHtml = (proc.blocks?.length === 1 && proc.blocks[0].type === 'md')
    ? mdToHtml(proc.blocks[0].text)
    : blocksToHtml(proc.blocks)

  // ── Import d'un fichier .md (drag-and-drop ou bouton) sur une fiche SOP/Playbook ──
  // Le .md est converti en HTML rendu et chargé dans l'éditeur (confirmation si contenu existant).
  const [dragMd, setDragMd] = useState(false)
  const [overrideHtml, setOverrideHtml] = useState<string | null>(null)
  const [editorNonce, setEditorNonce] = useState(0)
  const mdFileRef = useRef<HTMLInputElement>(null)
  // Réinitialise l'éditeur quand on change de fiche.
  useEffect(() => { setOverrideHtml(null); setEditorNonce(0) }, [proc.id])
  async function importMd(file: File) {
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { alert('Dépose un fichier .md (Markdown).'); return }
    const text = await file.text()
    const hasContent = blocksAsHtml.replace(/<[^>]*>/g, '').trim() !== ''
    if (hasContent && !window.confirm(`Remplacer le contenu de « ${proc.title} » par le fichier ${file.name} ?`)) return
    const html = mdToHtml(text)
    saveDoc(html)
    setOverrideHtml(html); setEditorNonce(n => n + 1)   // force le ré-affichage immédiat de l'éditeur
    setEditing(true)                                     // bascule en édition avec le contenu chargé
  }

  async function uploadPreview(file: File) {
    setUploading(true)
    try {
      const url = await genUpload()
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      const { storageId } = await res.json() as { storageId: string }
      await update({ id: proc.id as never, previewStorageId: storageId })
    } catch { /* ignore */ } finally { setUploading(false) }
  }

  return (
    <>
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-6 flex flex-col gap-3 max-w-4xl">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text transition-colors"><ArrowLeft size={14} /> Process</button>
          {!cannotEdit && (editing ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { void removeP({ id: proc.id as never }); onBack() }} className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-[#DC2626] transition-colors"><Trash2 size={12} /> Supprimer</button>
              <button onClick={() => { void update({ id: proc.id as never, title: title.trim() || 'Sans titre', link: link.trim() }); setEditing(false) }} className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#16A34A] px-3 py-1.5 rounded-full hover:bg-[#15803D] transition-colors"><Check size={13} /> Sauvegarder</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#FF4D00] px-3 py-1.5 rounded-full hover:bg-[#e64500] transition-colors"><Pencil size={13} /> Modifier</button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {readOnly
            ? <div className="w-12 h-12 rounded-2xl bg-[#FF4D00]/10 flex items-center justify-center"><IconOf k={proc.icon} size={22} className="text-[#FF4D00]" /></div>
            : <IconPicker current={proc.icon} onPick={k => update({ id: proc.id as never, icon: k })} />}
          <input value={title} readOnly={readOnly} onChange={e => setTitle(e.target.value)} onBlur={() => { if (!readOnly) update({ id: proc.id as never, title: title.trim() || 'Sans titre' }) }} placeholder="Titre du process" className="flex-1 text-2xl font-black text-soren-text bg-transparent outline-none placeholder-soren-muted" />
        </div>

        {/* Catégorie + Client lié — dropdowns modernes */}
        <div className="flex items-center gap-2 flex-wrap">
          {readOnly ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted bg-soren-elevated rounded-full px-3 py-1.5"><FolderPlus size={12} className="text-soren-subtle" /> {proc.category}</span>
              {proc.subfolder && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted bg-soren-elevated rounded-full px-3 py-1.5"><Folder size={12} className="text-soren-subtle" /> {proc.subfolder}</span>}
              {proc.linkedClientId && clients.find(c => (c.ghl_contact_id ?? c._id) === proc.linkedClientId) && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted bg-soren-elevated rounded-full px-3 py-1.5"><Users size={12} className="text-soren-subtle" /> {clients.find(c => (c.ghl_contact_id ?? c._id) === proc.linkedClientId)?.name}</span>
              )}
            </>
          ) : (
            <>
              <Picker
                value={proc.category} placeholder="Catégorie"
                options={categories.map(c => ({ value: c, label: c }))}
                onSelect={v => update({ id: proc.id as never, category: v || 'Process internes' })}
                icon={<FolderPlus size={12} className="text-soren-subtle flex-shrink-0" />}
              />
              <Picker
                value={proc.subfolder} placeholder="Sous-dossier" emptyLabel="Aucun"
                options={subfolderOptions.map(s => ({ value: s, label: s }))}
                onSelect={v => update({ id: proc.id as never, subfolder: v })}
                icon={<Folder size={12} className="text-soren-subtle flex-shrink-0" />}
              />
              <Picker
                value={proc.linkedClientId} placeholder="Lier un client" searchable emptyLabel="Aucun client"
                options={clients.map(c => ({ value: c.ghl_contact_id ?? c._id, label: c.name }))}
                onSelect={v => update({ id: proc.id as never, linkedClientId: v })}
                icon={<Users size={12} className="text-soren-subtle flex-shrink-0" />}
              />
            </>
          )}
        </div>

        {/* Profils assignés — admin uniquement. Définit qui voit ce process (hors admins, qui voient tout). */}
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-subtle"><Users size={12} /> Assigné à</span>
            <PeoplePicker users={users} selected={proc.assignedUserIds} onToggle={toggleUser} />
            {proc.assignedUserIds.length === 0 && <span className="text-[10px] text-soren-subtle">Personne (admins seulement)</span>}
          </div>
        )}

        {/* Lien discret éditable */}
        <div>
          {readOnly ? (
            link ? <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-soren-subtle hover:text-soren-text transition-colors"><Link2 size={11} /> <span className="truncate max-w-md">{link.replace(/^https?:\/\//, '')}</span> <ArrowUpRight size={11} /></a> : null
          ) : editingLink ? (
            <div className="flex items-center gap-2 bg-soren-card border border-soren-border rounded-lg px-2.5 py-1.5">
              <Link2 size={12} className="text-soren-subtle flex-shrink-0" />
              <input autoFocus value={link} onChange={e => setLink(e.target.value)}
                onBlur={() => { update({ id: proc.id as never, link: link.trim() }); setEditingLink(false) }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="https://lucid.app/…" className="flex-1 bg-transparent text-[11px] text-soren-text outline-none placeholder-[#9CA3AF]" />
            </div>
          ) : (
            <button onClick={() => setEditingLink(true)} className="inline-flex items-center gap-1.5 text-[11px] text-soren-subtle hover:text-soren-text transition-colors">
              <Link2 size={11} /> {link ? <span className="truncate max-w-md">{link.replace(/^https?:\/\//, '')}</span> : 'Ajouter un lien'} <span className="text-soren-subtle">· éditer</span>
            </button>
          )}
        </div>

        {/* Image + blocs — groupe compact */}
        <div className="flex flex-col gap-2">

        {/* Image = action principale (ouvre le lien) */}
        {proc.previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-soren-border group">
            <button onClick={() => setZoomed(true)} className="block w-full">
              <img src={proc.previewUrl} alt={proc.title} className="w-full max-h-80 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-[11px] font-semibold text-[#111] px-3 py-1.5 rounded-full flex items-center gap-1.5">Agrandir <Maximize2 size={12} /></span>
              </div>
            </button>
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              {!readOnly && <button onClick={() => fileRef.current?.click()} title="Remplacer l'image"
                className="w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors">
                <Camera size={14} />
              </button>}
              {!readOnly && <button onClick={() => update({ id: proc.id as never, previewStorageId: '' })} title="Supprimer la photo"
                className="w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-[#EF4444] transition-colors">
                <Trash2 size={13} />
              </button>}
            </div>
          </div>
        ) : readOnly ? null : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed border-soren-border hover:border-[#C8CBD0] transition-colors text-soren-subtle">
            {uploading ? <RefreshCw size={20} className="animate-spin" /> : <ImageIcon size={20} />}
            <span className="text-[11px] font-medium">Ajouter une image de preview (Lucidchart…)</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadPreview(f); e.target.value = '' }} />

        {/* Barre Importer un .md + Copier — visible pour qui peut éditer (lecture comme édition), tout process */}
        {!cannotEdit && (
          <div className="flex items-center justify-between gap-2 -mb-1">
            <span className="text-[10.5px] text-soren-subtle">Glisse un fichier <code className="text-soren-muted">.md</code> ici, ou :</span>
            <div className="flex items-center gap-2">
              {textPreview(proc.blocks).trim() && <CopyDocButton text={textPreview(proc.blocks)} />}
              <button onClick={() => mdFileRef.current?.click()} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-white bg-[#FF4D00] hover:bg-[#e64500] rounded-full px-2.5 py-1 transition-colors">
                <FileText size={12} /> Importer un .md
              </button>
            </div>
            <input ref={mdFileRef} type="file" accept=".md,.markdown,.txt,text/markdown" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void importMd(f); e.target.value = '' }} />
          </div>
        )}

        {/* Document éditable. Drop d'un .md possible partout (pour qui peut éditer). */}
        <div
          onDragOver={!cannotEdit ? (e => { e.preventDefault(); if (!dragMd) setDragMd(true) }) : undefined}
          onDragLeave={!cannotEdit ? (e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragMd(false) }) : undefined}
          onDrop={!cannotEdit ? (e => { e.preventDefault(); setDragMd(false); const f = Array.from(e.dataTransfer.files)[0]; if (f) void importMd(f) }) : undefined}
          className={`relative rounded-2xl transition-all ${dragMd ? 'ring-2 ring-[#FF4D00]/70' : ''}`}
        >
          {dragMd && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FF4D00]/10 rounded-2xl border-2 border-dashed border-[#FF4D00] pointer-events-none">
              <span className="text-[12px] font-bold text-[#FF4D00] flex items-center gap-1.5"><FileText size={14} /> Déposer le .md ici</span>
            </div>
          )}
          <DocEditor key={`${proc.id}:${editorNonce}`} html={overrideHtml ?? blocksAsHtml} onChange={saveDoc} readOnly={readOnly} paper={!!subfolderKind} />
        </div>
        </div>{/* end image+doc group */}
      </div>
    </div>

    {/* Zoom lightbox — portal vers body pour passer AU-DESSUS du header/sidebar */}
    {zoomed && proc.previewUrl && typeof document !== 'undefined' && createPortal((
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8"
        onClick={() => setZoomed(false)}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
        <div className="relative max-w-6xl w-full" onClick={e => e.stopPropagation()}>
          {!readOnly && (
            <button onClick={() => { update({ id: proc.id as never, previewStorageId: '' }); setZoomed(false) }} title="Jeter la photo"
              className="absolute -top-10 right-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-[#EF4444] transition-colors text-white">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setZoomed(false)} title="Quitter"
            className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
            <X size={14} />
          </button>
          <img src={proc.previewUrl} alt={proc.title}
            className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          {link && (
            <a href={link} target="_blank" rel="noreferrer"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 hover:bg-white text-[#111] text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors">
              Ouvrir <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      </div>
    ), document.body)}
    </>
  )
}

export default function ProcessView() {
  const sp = useSearchParams()
  const router = useRouter()
  const clientFilter = sp?.get('client') || sp?.get('contact') || ''
  const clientName = sp?.get('name') ? decodeURIComponent(sp.get('name')!) : ''

  const { clerkUser, isAdmin, isLoaded } = useCurrentUser()
  // On attend que Clerk soit chargé pour interroger la liste avec le bon rôle (évite de flasher la liste admin).
  const procs = useQuery(api.processes.list, isLoaded ? { clerkUserId: clerkUser?.id } : 'skip') as Process[] | undefined
  const items = useMemo(() => procs ?? [], [procs])
  const usersRaw = useQuery(api.users.list) as UserLite[] | undefined
  const users = useMemo(() => usersRaw ?? [], [usersRaw])
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users])
  const clientsRaw = useQuery(api.pipeline_clients.list) as ClientLite[] | undefined
  const clients = useMemo(() => (clientsRaw ?? []).map(c => ({ _id: c._id, ghl_contact_id: c.ghl_contact_id, name: c.name })), [clientsRaw])
  const clientNameOf = useMemo(() => { const m: Record<string, string> = {}; clients.forEach(c => { m[c.ghl_contact_id ?? c._id] = c.name }); return m }, [clients])

  const create = useMutation(api.processes.create)
  const updateProc = useMutation(api.processes.update)
  const dndSensors = useKanbanSensors()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    const procId = String(e.active.id)
    const d = e.over?.data?.current as { category: string; subfolder: string } | undefined
    if (!d) return
    const p = items.find(x => x.id === procId)
    if (!p) return
    if ((p.category || 'Process internes') === d.category && (p.subfolder || '') === (d.subfolder || '')) return
    void updateProc({ id: procId as never, category: d.category, subfolder: d.subfolder || '' })
  }
  const persistedCats = (useQuery(api.processCategories.list) ?? []) as { id: string; name: string }[]
  const createCat = useMutation(api.processCategories.create)
  const subfoldersRaw = useQuery(api.processSubfolders.list) as { id: string; category: string; name: string }[] | undefined
  const subfolders = useMemo(() => subfoldersRaw ?? [], [subfoldersRaw])
  const createSubfolder = useMutation(api.processSubfolders.create)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null) // catégorie cible
  const [subName, setSubName] = useState('')

  // Auto-création des sous-dossiers SOPs + Playbooks sous « Process internes » (une fois).
  const seededRef = useRef(false)
  useEffect(() => {
    if (!isAdmin || subfoldersRaw === undefined || seededRef.current) return
    seededRef.current = true
    const have = new Set(subfolders.filter(s => s.category === 'Process internes').map(s => s.name.toLowerCase()))
    ;['SOPs', 'Playbooks'].forEach(n => { if (!have.has(n.toLowerCase())) void createSubfolder({ category: 'Process internes', name: n }) })
  }, [isAdmin, subfoldersRaw, subfolders, createSubfolder])

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATS)
    persistedCats.forEach(c => set.add(c.name))
    items.forEach(p => { if (p.category) set.add(p.category) })
    return Array.from(set)
  }, [items, persistedCats])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return items.filter(p =>
      (!clientFilter || p.linkedClientId === clientFilter) &&
      (!q || p.title.toLowerCase().includes(q))
    )
  }, [items, query, clientFilter])

  const byCat = useMemo(() => { const m: Record<string, Process[]> = {}; filtered.forEach(p => { (m[p.category || 'Process internes'] ??= []).push(p) }); return m }, [filtered])
  const visibleCats = useMemo(() => {
    // Les catégories vides ne s'affichent que pour l'admin (qui peut y ajouter des process).
    const showEmpty = !query.trim() && !clientFilter && isAdmin
    return categories.filter(c => (byCat[c]?.length ?? 0) > 0 || showEmpty)
  }, [categories, byCat, query, clientFilter, isAdmin])

  const selected = items.find(p => p.id === selectedId) ?? null

  async function addProcess() {
    const id = await create(clientFilter
      ? { title: 'Nouveau process', category: 'Process clients', linkedClientId: clientFilter }
      : { title: 'Nouveau process' })
    setSelectedId(id as unknown as string)
  }

  if (selected) {
    const selCat = selected.category || 'Process internes'
    const subOpts = Array.from(new Set([
      ...subfolders.filter(s => s.category === selCat).map(s => s.name),
      ...items.filter(p => (p.category || 'Process internes') === selCat && p.subfolder).map(p => p.subfolder),
    ]))
    return <ProcessDetail key={selected.id} proc={selected} categories={categories} subfolderOptions={subOpts} clients={clients} users={users} onBack={() => setSelectedId(null)} cannotEdit={!isAdmin} />
  }

  function DropZone({ category, subfolder, children, className }: { category: string; subfolder: string; children: React.ReactNode; className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id: `move:${category}:${subfolder}`, data: { category, subfolder } })
    return <div ref={setNodeRef} className={`${className ?? ''} rounded-xl transition-all ${isOver ? 'ring-2 ring-[#FF4D00]/60 bg-[#FF4D00]/5' : ''}`}>{children}</div>
  }

  // Visuel pur (réutilisé par la carte ET le DragOverlay) — pas de hook DnD ici.
  function CardVisual({ p, overlay = false }: { p: Process; overlay?: boolean }) {
    const link = p.link && <a href={p.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Ouvrir le lien" className="w-6 h-6 rounded-lg flex items-center justify-center text-soren-muted hover:text-[#FF4D00] hover:bg-soren-elevated transition-colors flex-shrink-0"><ArrowUpRight size={14} /></a>
    const clientLine = p.linkedClientId && clientNameOf[p.linkedClientId] && <span className="text-[9.5px] text-soren-subtle truncate block">{clientNameOf[p.linkedClientId]}</span>
    return (
      <div className={`bg-soren-card border rounded-xl overflow-hidden flex flex-col h-full transition-all ${overlay ? 'border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_10px_28px_rgba(0,0,0,0.18)] rotate-2 cursor-grabbing' : 'border-soren-border hover:border-[#C8CBD0] hover:shadow-sm'}`}>
        {/* Titre EN HAUT — toujours */}
        <div className="p-2.5 flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0"><IconOf k={p.icon} size={13} className="text-[#FF4D00]" /></div>
          <div className="min-w-0 flex-1"><span className="text-[12px] font-medium text-soren-text truncate block">{p.title}</span>{clientLine}</div>
          {link}
        </div>
        {/* Milieu : photo OU aperçu du texte écrit (sauts de ligne), hauteur fixe pour aligner les cards */}
        {p.previewUrl ? (
          <div className="h-24 bg-soren-elevated overflow-hidden flex-shrink-0"><img src={p.previewUrl} alt={p.title} className="w-full h-full object-cover" /></div>
        ) : (
          <div className="px-2.5 h-24 overflow-hidden flex-shrink-0">
            {(() => { const t = textPreview(p.blocks); return t
              ? <p className="text-[10.5px] text-soren-muted leading-snug whitespace-pre-line line-clamp-5">{t}</p>
              : <p className="text-[10.5px] text-soren-subtle italic">Pas encore de description</p> })()}
          </div>
        )}
        {/* Assignés — TOUJOURS en bas, même place pour chaque card */}
        <div className="px-2.5 py-2 mt-auto border-t border-soren-border/60 flex items-center min-h-[36px] flex-shrink-0">
          {p.assignedUserIds.length === 0
            ? <span className="text-[8.5px] font-semibold text-soren-subtle bg-soren-elevated rounded-full px-2 py-0.5">Non assigné</span>
            : <span className="flex -space-x-1.5">{p.assignedUserIds.map(id => userMap[id]).filter(Boolean).slice(0, 6).map(u => <Avatar key={u.id} u={u} size={18} />)}</span>}
        </div>
      </div>
    )
  }

  function Card({ p }: { p: Process }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, data: { process: p } })
    return (
      <div ref={setNodeRef} {...attributes} {...listeners} onClick={() => setSelectedId(p.id)}
        className={`h-full cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}>
        <CardVisual p={p} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md bg-soren-card border border-soren-border rounded-full px-3.5 py-2">
          <Search size={13} className="text-soren-subtle flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un process…" className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
        </div>
        <div className="flex items-center gap-2">
          {clientFilter && (
            <button onClick={() => router.push('/bibliotheque/process')} className="flex items-center gap-1 text-[11px] font-semibold text-soren-muted hover:text-soren-text bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
              <X size={12} /> {clientName || clientNameOf[clientFilter] || 'Client'}
            </button>
          )}
          {isAdmin && <button onClick={() => setAddingCat(true)} className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-3 py-1.5 rounded-full hover:text-soren-text transition-colors"><FolderPlus size={12} /> Ajouter une catégorie</button>}
          {isAdmin && <button onClick={addProcess} className="flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#e64500] transition-colors"><Plus size={12} /> Ajouter un process</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {procs === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-soren-elevated animate-pulse" />)}</div>
        ) : visibleCats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-soren-elevated flex items-center justify-center"><Workflow size={20} className="text-soren-muted" /></div>
            <p className="text-[12px] text-soren-subtle">{query || clientFilter ? 'Aucun process trouvé.' : isAdmin ? 'Aucun process. Clique « Ajouter un process ».' : 'Aucun process ne t’est assigné pour le moment.'}</p>
          </div>
        ) : (
          <DndContext sensors={dndSensors} collisionDetection={pointerWithin}
            onDragStart={(e: DragStartEvent) => setDraggingId(String(e.active.id))}
            onDragEnd={handleDragEnd} onDragCancel={() => setDraggingId(null)}>
          <div className="flex flex-col gap-6">
            {visibleCats.map(cat => {
              const all    = byCat[cat] ?? []
              const direct = all.filter(p => !p.subfolder)
              const subs   = Array.from(new Set([
                ...subfolders.filter(s => s.category === cat).map(s => s.name),
                ...all.map(p => p.subfolder).filter(Boolean),
              ]))
              return (
                <div key={cat} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-soren-muted">{cat}</span>
                    <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-subtle px-1.5 py-0.5 rounded-full">{all.length}</span>
                    {isAdmin && <button onClick={() => { setAddingSubFor(cat); setSubName('') }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-soren-subtle hover:text-soren-text"><FolderPlus size={11} /> Sous-dossier</button>}
                  </div>

                  {/* Zone catégorie (sans sous-dossier) — droppable */}
                  <DropZone category={cat} subfolder="">
                    {direct.length > 0
                      ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5" data-stagger>{direct.map(p => <Card key={p.id} p={p} />)}</div>
                      : isAdmin ? <p className="text-[10px] text-soren-subtle px-1 py-3">Glisse un process ici</p> : null}
                  </DropZone>

                  {subs.map(sub => {
                    const subProcs = all.filter(p => p.subfolder === sub)
                    return (
                      <DropZone key={sub} category={cat} subfolder={sub} className="pl-3 ml-0.5 border-l-2 border-soren-border">
                        <div className="flex flex-col gap-2 py-1">
                          <div className="flex items-center gap-1.5">
                            <Folder size={12} className="text-[#FF4D00]" />
                            <span className="text-[11px] font-semibold text-soren-text">{sub}</span>
                            <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-subtle px-1.5 py-0.5 rounded-full">{subProcs.length}</span>
                          </div>
                          {subProcs.length > 0
                            ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5" data-stagger>{subProcs.map(p => <Card key={p.id} p={p} />)}</div>
                            : <p className="text-[10px] text-soren-subtle pl-0.5 py-1">Dossier vide — glisse un process ici</p>}
                        </div>
                      </DropZone>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <DragOverlay dropAnimation={PROCESS_DROP_ANIM}>
            {draggingId ? (() => { const dp = items.find(p => p.id === draggingId); return dp ? <div className="w-[200px]"><CardVisual p={dp} overlay /></div> : null })() : null}
          </DragOverlay>
          </DndContext>
        )}
      </div>

      {addingCat && (
        <Modal onClose={() => setAddingCat(false)}>
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-soren-text">Nouvelle catégorie</h2>
              <button onClick={() => setAddingCat(false)} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={14} className="text-soren-muted" /></button>
            </div>
            <input value={catName} onChange={e => setCatName(e.target.value)} autoFocus placeholder="Nom du groupe (ex: Process partenaires)"
              onKeyDown={e => { if (e.key === 'Enter' && catName.trim()) { createCat({ name: catName.trim() }); setCatName(''); setAddingCat(false) } }}
              className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/40" />
            <button onClick={() => { if (catName.trim()) { createCat({ name: catName.trim() }); setCatName(''); setAddingCat(false) } }} disabled={!catName.trim()}
              className="w-full bg-[#FF4D00] hover:bg-[#e64500] disabled:opacity-50 text-white font-semibold rounded-full py-3 text-sm transition-colors">Créer la catégorie</button>
          </div>
        </Modal>
      )}

      {addingSubFor && (
        <Modal onClose={() => setAddingSubFor(null)}>
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-soren-text">Nouveau sous-dossier</h2>
              <button onClick={() => setAddingSubFor(null)} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={14} className="text-soren-muted" /></button>
            </div>
            <p className="text-[11px] text-soren-subtle -mt-2">Dans <span className="font-semibold text-soren-text">{addingSubFor}</span></p>
            <input value={subName} onChange={e => setSubName(e.target.value)} autoFocus placeholder="Nom du sous-dossier (ex: SOPs, Playbooks)"
              onKeyDown={e => { if (e.key === 'Enter' && subName.trim()) { createSubfolder({ category: addingSubFor, name: subName.trim() }); setSubName(''); setAddingSubFor(null) } }}
              className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/40" />
            <button onClick={() => { if (subName.trim()) { createSubfolder({ category: addingSubFor, name: subName.trim() }); setSubName(''); setAddingSubFor(null) } }} disabled={!subName.trim()}
              className="w-full bg-[#FF4D00] hover:bg-[#e64500] disabled:opacity-50 text-white font-semibold rounded-full py-3 text-sm transition-colors">Créer le sous-dossier</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
