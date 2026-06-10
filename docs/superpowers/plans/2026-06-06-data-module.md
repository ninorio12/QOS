# Data Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le module Data (`/bibliotheque/data`) en un file store fonctionnel avec tags, recherche, filtres par catégorie et preview inline des fichiers.

**Architecture:** Ajout de `tags` et `description` dans le schéma Convex `library_items` + nouvelle mutation `updateItem`. DataView.tsx est refactoré en deux fichiers : le composant principal (search, tabs, grille) et un panneau de preview dédié (`DataPreviewPanel.tsx`). Tout le filtrage est client-side sur la liste Convex déjà chargée.

**Tech Stack:** Next.js 14 App Router, Convex (query/mutation), TypeScript, Tailwind CSS, `marked` (parser markdown)

---

## File Map

| Fichier | Action |
|---|---|
| `convex/schema.ts` | Modifier : ajouter `tags`, `description` à `library_items` (lignes 251-261) |
| `convex/library.ts` | Modifier : `list` retourne les nouveaux champs + nouvelle mutation `updateItem` |
| `src/components/bibliotheque/DataPreviewPanel.tsx` | Créer : panneau de preview slide-in |
| `src/components/bibliotheque/DataView.tsx` | Refonte complète : search, tabs, tag filters, cards |

---

## Task 1 — Convex schema : ajouter tags + description

**Files:**
- Modify: `convex/schema.ts:251-261`

- [ ] **Step 1 : Ouvrir `convex/schema.ts` et localiser la table `library_items` (autour de la ligne 251)**

Remplacer le bloc `library_items` par :

```ts
  library_items: defineTable({
    kind:        v.string(),             // 'file' | 'link'
    category:    v.string(),             // pdf | image | svg | markdown | doc | notion | github | vercel | link
    name:        v.string(),
    ext:         v.optional(v.string()),
    storageId:   v.optional(v.string()),
    url:         v.optional(v.string()),
    mime:        v.optional(v.string()),
    size:        v.optional(v.number()),
    addedAt:     v.string(),
    tags:        v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  }).index("by_category", ["category"]),
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /root/QOS && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur dans `convex/schema.ts`.

---

## Task 2 — Convex library.ts : updateItem + champs dans list

**Files:**
- Modify: `convex/library.ts`

- [ ] **Step 1 : Mettre à jour la query `list` pour retourner `tags` et `description`**

Dans `convex/library.ts`, remplacer le `out.map` de la query `list` par :

```ts
    const out = await Promise.all(rows.map(async (r) => ({
      id:          r._id,
      kind:        r.kind,
      category:    r.category,
      name:        r.name,
      ext:         r.ext ?? '',
      url:         r.kind === 'link' ? (r.url ?? '') : (r.storageId ? await ctx.storage.getUrl(r.storageId as never) ?? '' : ''),
      mime:        r.mime ?? '',
      size:        r.size ?? 0,
      addedAt:     r.addedAt,
      tags:        r.tags ?? [],
      description: r.description ?? '',
    })))
```

- [ ] **Step 2 : Ajouter la mutation `updateItem` à la fin de `convex/library.ts`**

```ts
export const updateItem = mutation({
  args: {
    id:          v.id("library_items"),
    name:        v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filtered)
  },
})
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd /root/QOS && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur.

---

## Task 3 — Installer marked

**Files:**
- `package.json` (modifié par npm)

- [ ] **Step 1 : Installer la dépendance**

```bash
cd /root/QOS && npm install marked && npm install --save-dev @types/marked
```

Attendu : `added X packages` sans erreur.

- [ ] **Step 2 : Vérifier que marked est importable**

```bash
cd /root/QOS && node -e "const { marked } = require('marked'); console.log(typeof marked)"
```

Attendu : `function`

---

## Task 4 — Créer DataPreviewPanel.tsx

**Files:**
- Create: `src/components/bibliotheque/DataPreviewPanel.tsx`

Le panneau de preview s'affiche en overlay (fixed full-screen backdrop + panel fixé à droite). Il gère : édition du nom, de la description, gestion des tags, et preview du contenu selon le type.

- [ ] **Step 1 : Créer `src/components/bibliotheque/DataPreviewPanel.tsx`**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, Download, Plus, Check } from 'lucide-react'
import { marked } from 'marked'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export type LibItem = {
  id: string
  kind: string
  category: string
  name: string
  ext: string
  url: string | null
  mime: string
  size: number
  addedAt: string
  tags: string[]
  description: string
}

interface Props {
  item: LibItem
  allTags: string[]
  onClose: () => void
}

function fmtSize(n: number) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mo`
  if (n >= 1_000) return `${Math.round(n / 1_000)} Ko`
  return `${n} o`
}

function FilePreview({ item }: { item: LibItem }) {
  const [mdHtml, setMdHtml] = useState<string | null>(null)
  const [mdLoading, setMdLoading] = useState(false)

  useEffect(() => {
    if (item.category !== 'markdown' || !item.url) return
    setMdLoading(true)
    fetch(item.url)
      .then(r => r.text())
      .then(text => setMdHtml(marked.parse(text) as string))
      .catch(() => setMdHtml('<p class="text-soren-subtle text-sm">Impossible de charger le fichier.</p>'))
      .finally(() => setMdLoading(false))
  }, [item.url, item.category])

  if (item.category === 'image' || item.category === 'svg') {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <img src={item.url ?? ''} alt={item.name} className="max-w-full max-h-full object-contain rounded-xl" />
      </div>
    )
  }

  if (item.category === 'pdf') {
    return (
      <iframe
        src={item.url ?? ''}
        title={item.name}
        className="w-full h-full border-0 rounded-b-3xl"
      />
    )
  }

  if (item.category === 'markdown') {
    if (mdLoading) return (
      <div className="flex flex-col gap-2 p-6">
        {[1,2,3,4,5].map(i => <div key={i} className="h-4 rounded bg-soren-elevated animate-pulse" style={{ width: `${50 + (i * 11) % 45}%` }} />)}
      </div>
    )
    return (
      <div
        className="prose prose-sm prose-invert max-w-none p-6 overflow-y-auto h-full text-soren-text"
        dangerouslySetInnerHTML={{ __html: mdHtml ?? '' }}
      />
    )
  }

  // Links (Notion, GitHub, Vercel, generic)
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-soren-elevated flex items-center justify-center">
        <ExternalLink size={24} className="text-soren-muted" />
      </div>
      <div>
        <p className="text-sm font-semibold text-soren-text truncate max-w-xs">{item.name}</p>
        <p className="text-[11px] text-soren-subtle mt-1 truncate max-w-xs">{item.url}</p>
      </div>
      <a
        href={item.url ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4D00] hover:bg-[#e64500] text-white text-[12px] font-semibold rounded-full transition-colors"
      >
        Ouvrir <ExternalLink size={12} />
      </a>
    </div>
  )
}

export default function DataPreviewPanel({ item, allTags, onClose }: Props) {
  const updateItem = useMutation(api.library.updateItem)

  const [name, setName]               = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [tagInput, setTagInput]       = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const tagRef = useRef<HTMLInputElement>(null)

  // Sync when item changes
  useEffect(() => { setName(item.name); setDescription(item.description) }, [item.id, item.name, item.description])

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    if (showTagInput) tagRef.current?.focus()
  }, [showTagInput])

  async function saveName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== item.name) await updateItem({ id: item.id as never, name: trimmed })
  }

  async function saveDescription() {
    if (description !== item.description) await updateItem({ id: item.id as never, description: description.trim() })
  }

  async function addTag(tag: string) {
    const t = tag.trim().toLowerCase().replace(/^#/, '')
    if (!t || item.tags.includes(t)) return
    await updateItem({ id: item.id as never, tags: [...item.tags, t] })
    setTagInput('')
    setShowTagInput(false)
  }

  async function removeTag(tag: string) {
    await updateItem({ id: item.id as never, tags: item.tags.filter(t => t !== tag) })
  }

  const suggestions = allTags.filter(t => !item.tags.includes(t) && t.includes(tagInput.toLowerCase()))

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative ml-auto w-full max-w-xl bg-soren-card flex flex-col h-full shadow-2xl"
        style={{ animation: 'slideInRight 200ms cubic-bezier(0.4,0,0.2,1) both' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-soren-border flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              className="flex-1 min-w-0 text-[15px] font-black text-soren-text bg-transparent outline-none border-b border-transparent focus:border-soren-border transition-colors"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.url && item.kind === 'file' && (
                <a href={item.url} download={item.name} title="Télécharger"
                   className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-[#FF4D00] hover:bg-soren-elevated transition-colors">
                  <Download size={14} />
                </a>
              )}
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Metadata row */}
          <p className="text-[10px] text-soren-subtle">
            {item.category.toUpperCase()}{item.ext ? ` · .${item.ext}` : ''}{item.size ? ` · ${fmtSize(item.size)}` : ''} · {new Date(item.addedAt).toLocaleDateString('fr-FR')}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags.map(t => (
              <span key={t}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#FF4D0015', color: '#FF4D00' }}>
                #{t}
                <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-[#c43800]">
                  <X size={8} />
                </button>
              </span>
            ))}

            {showTagInput ? (
              <div className="relative">
                <input
                  ref={tagRef}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { void addTag(tagInput); e.preventDefault() }
                    if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') }
                  }}
                  onBlur={() => { if (!tagInput) setShowTagInput(false) }}
                  placeholder="tag…"
                  className="text-[11px] bg-soren-elevated border border-soren-border rounded-full px-2.5 py-1 outline-none focus:ring-1 focus:ring-[#FF4D00]/40 w-20"
                />
                {suggestions.length > 0 && tagInput.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 bg-soren-card border border-soren-border rounded-xl shadow-lg z-10 py-1 min-w-max">
                    {suggestions.slice(0, 5).map(s => (
                      <button key={s} onMouseDown={() => { void addTag(s) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-soren-text hover:bg-soren-elevated transition-colors">
                        #{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors border border-dashed border-soren-border">
                <Plus size={9} /> tag
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <FilePreview item={item} />
        </div>

        {/* Description */}
        <div className="px-5 py-4 border-t border-soren-border flex-shrink-0">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Description ou note pour Hermès… (enregistrée automatiquement)"
            rows={2}
            className="w-full resize-none bg-soren-elevated border border-soren-border rounded-xl px-3.5 py-2.5 text-[11px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all"
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /root/QOS && npx tsc --noEmit 2>&1 | grep "DataPreviewPanel" | head -10
```

Attendu : aucune erreur sur ce fichier.

---

## Task 5 — Refonte DataView.tsx

**Files:**
- Modify: `src/components/bibliotheque/DataView.tsx`

DataView devient le composant principal : search bar, onglets catégorie, tag chips filtres, grille de cards. Il importe `DataPreviewPanel` pour la preview.

- [ ] **Step 1 : Remplacer entièrement `src/components/bibliotheque/DataView.tsx`**

```tsx
'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Upload, Plus, X, RefreshCw, Check,
  FileText, ImageIcon, Pen, Code, GitFork, Triangle, Link2, HardDrive,
  type LucideIcon,
} from 'lucide-react'
import DataPreviewPanel, { type LibItem } from './DataPreviewPanel'

const CATS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'pdf',      label: 'PDF',       Icon: FileText   },
  { id: 'image',    label: 'Images',    Icon: ImageIcon  },
  { id: 'svg',      label: 'SVG',       Icon: Pen        },
  { id: 'markdown', label: 'Markdown',  Icon: Code       },
  { id: 'doc',      label: 'Documents', Icon: FileText   },
  { id: 'notion',   label: 'Notion',    Icon: FileText   },
  { id: 'github',   label: 'GitHub',    Icon: GitFork    },
  { id: 'vercel',   label: 'Vercel',    Icon: Triangle   },
  { id: 'link',     label: 'Liens',     Icon: Link2      },
]
const ICON_MAP = Object.fromEntries(CATS.map(c => [c.id, c.Icon])) as Record<string, LucideIcon>
const LABEL_MAP = Object.fromEntries(CATS.map(c => [c.id, c.label]))

function fmtSize(n: number) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mo`
  if (n >= 1_000) return `${Math.round(n / 1_000)} Ko`
  return `${n} o`
}

function ItemCard({ item, onOpen }: { item: LibItem; onOpen: () => void }) {
  const Icon = ICON_MAP[item.category] ?? HardDrive
  return (
    <div
      onClick={onOpen}
      className="group flex flex-col bg-soren-card border border-soren-border rounded-2xl p-4 cursor-pointer hover:border-[#C8CBD0] hover:shadow-sm transition-all gap-2.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-soren-elevated flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-soren-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-soren-text truncate leading-snug">{item.name}</p>
          <p className="text-[10px] text-soren-subtle mt-0.5">
            {LABEL_MAP[item.category] ?? item.category}{item.size ? ` · ${fmtSize(item.size)}` : ''}
          </p>
        </div>
      </div>

      {item.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {item.tags.slice(0, 4).map(t => (
            <span key={t}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#FF4D0015', color: '#FF4D00' }}>
              #{t}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[9px] text-soren-subtle">+{item.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function DataView() {
  const itemsRaw = useQuery(api.library.list) as LibItem[] | undefined
  const items = useMemo(() => itemsRaw ?? [], [itemsRaw])

  const genUpload = useMutation(api.files.generateUploadUrl)
  const addFile   = useMutation(api.library.addFile)
  const addLink   = useMutation(api.library.addLink)
  const removeIt  = useMutation(api.library.remove)

  const [search,         setSearch]         = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTags,     setActiveTags]     = useState<string[]>([])
  const [previewItem,    setPreviewItem]     = useState<LibItem | null>(null)
  const [dragOver,       setDragOver]       = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [showLink,       setShowLink]       = useState(false)
  const [linkName,       setLinkName]       = useState('')
  const [linkUrl,        setLinkUrl]        = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync preview item when list refreshes (tags/description updated)
  const syncedPreview = useMemo(() => {
    if (!previewItem) return null
    return items.find(i => i.id === previewItem.id) ?? previewItem
  }, [previewItem, items])

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const it of items) m[it.category] = (m[it.category] ?? 0) + 1
    return m
  }, [items])

  const visibleTabs = useMemo(() => {
    const defined = CATS.filter(c => categoryCounts[c.id])
    const extra = Array.from(new Set(items.map(i => i.category)))
      .filter(c => !CATS.find(x => x.id === c))
      .map(id => ({ id, label: id, Icon: HardDrive as LucideIcon }))
    return [{ id: 'all', label: 'Tout', Icon: HardDrive as LucideIcon }, ...defined, ...extra]
  }, [items, categoryCounts])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) for (const t of it.tags) s.add(t)
    return Array.from(s).sort()
  }, [items])

  const filtered = useMemo(() => {
    let result = items
    if (activeCategory !== 'all') result = result.filter(i => i.category === activeCategory)
    if (activeTags.length > 0) result = result.filter(i => activeTags.some(t => i.tags.includes(t)))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, activeCategory, activeTags, search])

  const toggleTag = useCallback((t: string) => {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }, [])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const url = await genUpload()
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
        const { storageId } = await res.json() as { storageId: string }
        const ext = file.name.includes('.') ? file.name.split('.').pop()! : ''
        await addFile({ name: file.name, ext, storageId, mime: file.type || undefined, size: file.size })
      }
    } catch { /* ignore */ } finally { setUploading(false) }
  }

  async function submitLink() {
    const u = linkUrl.trim(); if (!u) return
    const name = linkName.trim() || u.replace(/^https?:\/\//, '').replace(/\/$/, '')
    await addLink({ name, url: u })
    setLinkName(''); setLinkUrl(''); setShowLink(false)
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files) }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, tag ou description…"
              className="w-full bg-soren-elevated border border-soren-border rounded-full px-4 py-2 text-[12px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-soren-muted hover:text-soren-text">
                <X size={12} />
              </button>
            )}
          </div>
          {/* Actions */}
          <button onClick={() => setShowLink(true)}
            className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-3 py-2 rounded-full hover:text-soren-text transition-colors flex-shrink-0">
            <Plus size={12} /> Lien
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3 py-2 rounded-full hover:bg-[#e64500] disabled:opacity-50 transition-colors flex-shrink-0">
            {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} Importer
          </button>
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) void uploadFiles(e.target.files); e.target.value = '' }} />
        </div>

        {/* Category tabs */}
        {itemsRaw !== undefined && visibleTabs.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {visibleTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                  activeCategory === tab.id
                    ? 'bg-soren-text text-soren-app'
                    : 'text-soren-muted hover:text-soren-text hover:bg-soren-elevated'
                }`}>
                {tab.label}
                {tab.id !== 'all' && categoryCounts[tab.id] ? (
                  <span className="ml-1 opacity-50">{categoryCounts[tab.id]}</span>
                ) : tab.id === 'all' ? (
                  <span className="ml-1 opacity-50">{items.length}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {allTags.map(t => {
              const on = activeTags.includes(t)
              return (
                <button key={t} onClick={() => toggleTag(t)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all"
                  style={on
                    ? { background: '#FF4D0015', color: '#FF4D00', borderColor: '#FF4D0050' }
                    : { color: '#9CA3AF', borderColor: 'var(--soren-border, #2A2A2A)' }}>
                  {on && <Check size={9} />}#{t}
                </button>
              )
            })}
            {activeTags.length > 0 && (
              <button onClick={() => setActiveTags([])} className="text-[10px] font-semibold text-soren-muted hover:text-soren-text px-2 py-1">
                Effacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {itemsRaw === undefined ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-2xl bg-soren-elevated animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <HardDrive size={28} className="text-soren-subtle" />
            <p className="text-[12px] text-soren-subtle">
              {search || activeTags.length > 0 || activeCategory !== 'all'
                ? 'Aucun résultat pour ces filtres.'
                : 'Aucun fichier. Glisse-en un ici ou utilise « Importer ».'}
            </p>
            {(search || activeTags.length > 0) && (
              <button onClick={() => { setSearch(''); setActiveTags([]) }}
                className="text-[11px] font-semibold text-[#FF4D00] hover:underline mt-1">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(item => (
              <ItemCard key={item.id} item={item} onOpen={() => setPreviewItem(item)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Drag overlay ── */}
      {dragOver && (
        <div className="absolute inset-0 z-40 bg-[#FF4D00]/10 border-2 border-dashed border-[#FF4D00] m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-[#FF4D00]">
            <Upload size={28} /><span className="text-sm font-bold">Déposer pour ajouter</span>
          </div>
        </div>
      )}

      {/* ── Add link modal ── */}
      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLink(false)} />
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-soren-text">Ajouter un lien</h2>
              <button onClick={() => setShowLink(false)} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-soren-elevated/80 transition-colors">
                <X size={14} className="text-soren-muted" />
              </button>
            </div>
            <p className="text-[11px] text-soren-subtle -mt-2">Notion, GitHub, Vercel ou tout autre lien — rangé automatiquement.</p>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" autoFocus
              className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/40" />
            <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Nom (optionnel)"
              onKeyDown={e => { if (e.key === 'Enter') void submitLink() }}
              className="w-full bg-soren-elevated border-0 rounded-2xl px-4 py-3 text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/40" />
            <button onClick={submitLink} disabled={!linkUrl.trim()}
              className="w-full bg-[#FF4D00] hover:bg-[#e64500] disabled:opacity-50 text-white font-semibold rounded-full py-3 text-sm transition-colors">
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* ── Preview panel ── */}
      {syncedPreview && (
        <DataPreviewPanel
          item={syncedPreview}
          allTags={allTags}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /root/QOS && npx tsc --noEmit 2>&1 | head -30
```

Attendu : 0 erreur.

---

## Task 6 — Deploy

- [ ] **Step 1 : Déployer en production**

```bash
cd /root/QOS && vercel --prod 2>&1 | tail -5
```

Attendu : `✅ Production: https://vividflow-service-execution-os.vercel.app`

- [ ] **Step 2 : Vérifier manuellement sur le SaaS**

1. Ouvrir `https://vividflow-service-execution-os.vercel.app/bibliotheque/data`
2. La barre de recherche et les onglets catégorie apparaissent
3. Uploader un fichier → il apparaît dans la grille
4. Cliquer sur le fichier → le panneau preview s'ouvre depuis la droite
5. Ajouter un tag `#test` → le tag apparaît sur la card
6. Taper `test` dans la barre de recherche → seul ce fichier est visible
7. Cliquer sur le tag filter `#test` → même résultat
8. Ajouter un lien Notion → il apparaît dans l'onglet Notion

---

## Résumé

| Task | Fichiers | Description |
|---|---|---|
| 1 | `convex/schema.ts` | Ajouter `tags`, `description` |
| 2 | `convex/library.ts` | `updateItem` + `list` retourne nouveaux champs |
| 3 | `package.json` | Installer `marked` |
| 4 | `DataPreviewPanel.tsx` (créer) | Panneau preview slide-in |
| 5 | `DataView.tsx` (refonte) | Search + tabs + tag filters + cards |
| 6 | — | `vercel --prod` |
