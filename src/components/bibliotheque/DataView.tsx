'use client'

import { useState, useRef, useMemo, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Upload, Plus, X, RefreshCw, ArrowLeft, ExternalLink,
  FileText, ImageIcon, Code, GitFork, Triangle, Link2, HardDrive, ChevronDown, Users, BookOpen, Briefcase,
  Folder, FolderPlus, ChevronRight, Pencil, Trash2, Search, Tag, ArrowDownUp, Check,
  type LucideIcon,
} from 'lucide-react'
import DataPreviewPanel, { type LibItem } from './DataPreviewPanel'
import CodeView from './CodeView'
import { MotionStagger, MotionItem } from '@/components/ui/Motion'

// ─── Folder groups ───────────────────────────────────────────────────────────

// Dossiers de BASE (toujours présents à la racine, avec leur icône). L'utilisateur
// peut en créer d'autres + des sous-dossiers à n'importe quel niveau (arborescence).
const BASE_FOLDERS: { name: string; Icon: LucideIcon; color: string }[] = [
  { name: 'Projets',        Icon: Briefcase, color: '#3462EE' },
  { name: 'Skills',         Icon: Code,      color: '#8B5CF6' },
  { name: 'Documentations', Icon: BookOpen,  color: '#0EA5E9' },
]

// Le TYPE n'est plus un dossier : c'est un filtre transversal. Les dossiers
// servent à l'usage (projet/client), le type classe le contenu.
const TYPE_FILTERS: { id: string; label: string; match: (i: LibItem) => boolean }[] = [
  { id: 'pdf',      label: 'PDF',      match: i => i.category === 'pdf' },
  { id: 'image',    label: 'Images',   match: i => i.category === 'image' || i.category === 'svg' },
  { id: 'markdown', label: 'Markdown', match: i => i.category === 'markdown' },
  { id: 'link',     label: 'Liens',    match: i => i.kind === 'link' },
  { id: 'doc',      label: 'Fichiers', match: i => i.kind !== 'link' && !['pdf', 'image', 'svg', 'markdown'].includes(i.category) },
]

// Icône/couleur d'un dossier : dossier de base à la racine → son identité ; sinon générique.
function folderVisual(path: string, name: string): { Icon: LucideIcon; color: string } {
  if (!path.includes('/')) {
    const b = BASE_FOLDERS.find(b => b.name === name)
    if (b) return { Icon: b.Icon, color: b.color }
  }
  return { Icon: Folder, color: '#6B7280' }
}

// Action au clic + icône/couleur, dérivées du TYPE de l'item (pas du dossier).
function actionFor(item: LibItem): 'modal' | 'lightbox' | 'navigate' {
  if (item.category === 'image' || item.category === 'svg') return 'lightbox'
  if (item.category === 'pdf' || item.category === 'markdown') return 'modal'
  return 'navigate'
}
function iconFor(item: LibItem): { Icon: LucideIcon; color: string } {
  if (item.category === 'image' || item.category === 'svg') return { Icon: ImageIcon, color: '#F59E0B' }
  if (item.category === 'pdf')      return { Icon: FileText, color: '#EF4444' }
  if (item.category === 'markdown') return { Icon: Code,     color: '#8B5CF6' }
  return { Icon: Link2, color: '#3462EE' }   // tous les liens : icône lien uniforme
}

// Libellé lisible du service d'un lien (affiché à droite de la card).
function serviceLabel(url: string): string {
  let h = '', path = ''
  try { const u = new URL(url); h = u.hostname.replace(/^www\./, ''); path = u.pathname } catch { return 'lien' }
  if (h.includes('vercel.')) return 'Vercel'
  if (h.includes('notion.')) return 'Notion'
  if (h.includes('lucid.app') || h.includes('lucidchart')) return 'Lucidchart'
  if (h.includes('docs.google.com')) return path.includes('/spreadsheets') ? 'Google Sheets' : path.includes('/presentation') ? 'Google Slides' : 'Google Docs'
  if (h.includes('sheets.google.com')) return 'Google Sheets'
  if (h.includes('drive.google.com')) return 'Google Drive'
  if (h.includes('github.com')) return 'GitHub'
  if (h.includes('figma.com')) return 'Figma'
  if (h.includes('airtable.com')) return 'Airtable'
  if (h.includes('loom.com')) return 'Loom'
  return h
}

function fmtSize(n: number) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mo`
  if (n >= 1_000) return `${Math.round(n / 1_000)} Ko`
  return `${n} o`
}

type UserLite = { id: string; firstName?: string; lastName?: string; name?: string; email: string; avatarUrl?: string }

function AssigneePips({ assignedTo, users }: { assignedTo: string[]; users: UserLite[] }) {
  if (!assignedTo.length) return null
  const assigned = assignedTo.slice(0, 3).map(id => users.find(u => u.id === id)).filter(Boolean) as UserLite[]
  const extra = assignedTo.length - 3
  return (
    <div className="flex items-center flex-shrink-0">
      {assigned.map(u => (
        <div key={u.id}
          className="w-5 h-5 rounded-full ring-2 ring-soren-card overflow-hidden -ml-1.5 first:ml-0 flex-shrink-0"
          title={u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : (u.name ?? u.email)}>
          {u.avatarUrl
            ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-[#FF4D00]/20 flex items-center justify-center text-[7px] text-[#FF4D00] font-black">{(u.firstName?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}</div>
          }
        </div>
      ))}
      {extra > 0 && (
        <div className="w-5 h-5 rounded-full ring-2 ring-soren-card bg-soren-elevated -ml-1.5 flex items-center justify-center text-[8px] text-soren-muted font-semibold flex-shrink-0">
          +{extra}
        </div>
      )}
    </div>
  )
}

// ─── Markdown inline expand ───────────────────────────────────────────────────

function MarkdownCard({ item, onEdit, users }: { item: LibItem; onEdit: () => void; users: UserLite[] }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!open && text === null && item.url) {
      setLoading(true)
      try {
        setText(await fetch(item.url).then(r => r.text()))
      } catch { setText('Impossible de charger le fichier.') }
      finally { setLoading(false) }
    }
    setOpen(v => !v)
  }

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden transition-all hover:border-[#C8CBD0]">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#8B5CF615' }}>
          <Code size={14} style={{ color: '#8B5CF6' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-normal text-soren-text truncate">{item.name}</p>
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {item.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FF4D0015', color: '#FF4D00' }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <AssigneePips assignedTo={item.assignedTo ?? []} users={users} />
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            className="text-[10px] font-semibold text-soren-muted hover:text-soren-text px-2 py-1 rounded-lg hover:bg-soren-elevated transition-colors">
            ···
          </button>
          <ChevronDown size={14} className={`text-soren-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-soren-border">
          {loading ? (
            <div className="flex flex-col gap-2 p-5" style={{ background: '#1e1e1e' }}>
              {[1,2,3,4].map(i => <div key={i} className="h-3.5 rounded bg-white/10 animate-pulse" style={{ width: `${55 + (i * 13) % 40}%` }} />)}
            </div>
          ) : (
            <CodeView text={text ?? ''} language="markdown" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ item, onClose }: { item: LibItem; onClose: () => void }) {
  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  if (typeof document === 'undefined') return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
          <X size={14} />
        </button>
        <img src={item.url ?? ''} alt={item.name}
          className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
        <p className="text-center text-white/60 text-[11px] mt-3">{item.name}</p>
      </div>
    </div>
  )
}

// ─── Statut projet (cercles À faire / En cours / Finalisé) ─────────────────────

const STATUSES = [
  { id: 'todo',  label: 'À faire',  color: '#9CA3AF' },
  { id: 'doing', label: 'En cours', color: '#F59E0B' },
  { id: 'done',  label: 'Finalisé', color: '#16A34A' },
] as const

function StatusSelector({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  const cur = STATUSES.find(s => s.id === value)
  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors"
        style={cur ? { background: cur.color + '1A', color: cur.color, borderColor: cur.color + '55' } : { color: '#9CA3AF', borderColor: 'var(--border)' }}>
        <span className="w-2 h-2 rounded-full" style={cur ? { background: cur.color } : { border: '1.5px solid #9CA3AF' }} />
        {cur ? cur.label : 'Statut'}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-30 bg-soren-card border border-soren-border rounded-xl shadow-xl py-1 min-w-[135px]">
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => { onChange(s.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left hover:bg-soren-elevated transition-colors">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span style={{ color: s.color }}>{s.label}</span>
              {value === s.id && <Check size={11} className="ml-auto" style={{ color: s.color }} />}
            </button>
          ))}
          {value && (
            <button onClick={() => { onChange(''); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-soren-muted hover:bg-soren-elevated transition-colors border-t border-soren-border mt-0.5">
              <X size={11} /> Aucun
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Lien « projet » = déployé sur Vercel : *.vercel.app / vercel.com, ou un domaine
// custom de VividFlow (toute la zone vividflow.co est hébergée sur Vercel).
function isProjectLink(item: LibItem): boolean {
  if (item.kind !== 'link' || !item.url) return false
  if (item.category === 'vercel') return true
  try {
    const h = new URL(item.url).hostname.replace(/^www\./, '')
    return h.endsWith('.vercel.app') || h === 'vercel.com' || h.endsWith('vercel.com') || h === 'vividflow.co' || h.endsWith('.vividflow.co')
  } catch { return false }
}

// ─── Item card (generic for PDF + links) ──────────────────────────────────────

function ItemCard({ item, onClick, onEdit, onStatus, users }: {
  item: LibItem; onClick: () => void; onEdit: () => void; onStatus: (s: string) => void; users: UserLite[]
}) {
  const { Icon, color } = iconFor(item)
  const isLink = item.kind === 'link' && !!item.url
  const isProject = isProjectLink(item)
  return (
    <div className="group bg-soren-card border border-soren-border rounded-2xl p-3.5 hover:border-[#C8CBD0] hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
          <p className="text-[11px] font-normal text-soren-text truncate leading-snug">{item.name}</p>
          <p className="text-[10px] text-soren-subtle mt-0.5">
            {item.ext ? `.${item.ext}` : item.category}{item.size ? ` · ${fmtSize(item.size)}` : ''}
          </p>
        </div>
        {/* Projet (Vercel / domaine VividFlow) → sélecteur de statut ; autres liens → libellé du service */}
        {isProject ? (
          <div className="self-center"><StatusSelector value={item.status} onChange={onStatus} /></div>
        ) : isLink ? (
          <span className="self-center text-[10px] font-semibold text-soren-muted bg-soren-elevated rounded-full px-2 py-0.5 flex-shrink-0 max-w-[110px] truncate">
            {serviceLabel(item.url!)}
          </span>
        ) : null}
        <button onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[13px] font-bold text-soren-muted hover:text-soren-text px-1.5 py-0.5 rounded-lg hover:bg-soren-elevated flex-shrink-0">
          ···
        </button>
      </div>
      {(item.tags.length > 0 || (item.assignedTo ?? []).length > 0) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {item.tags.slice(0, 4).map(t => (
              <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF4D0015', color: '#FF4D00' }}>#{t}</span>
            ))}
          </div>
          <AssigneePips assignedTo={item.assignedTo ?? []} users={users} />
        </div>
      )}
    </div>
  )
}

// ─── Image card with thumbnail ────────────────────────────────────────────────

function ImageCard({ item, onClick, onEdit, users }: {
  item: LibItem; onClick: () => void; onEdit: () => void; users: UserLite[]
}) {
  return (
    <div className="group bg-soren-card border border-soren-border rounded-2xl overflow-hidden hover:border-[#C8CBD0] hover:shadow-sm transition-all cursor-pointer" onClick={onClick}>
      {/* Thumbnail with assignee pips overlay */}
      <div className="relative">
        {item.url
          ? <div className="h-32 overflow-hidden bg-soren-elevated">
              <img src={item.url} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          : <div className="h-32 bg-soren-elevated flex items-center justify-center">
              <ImageIcon size={24} className="text-soren-muted" />
            </div>}
        {(item.assignedTo ?? []).length > 0 && (
          <div className="absolute bottom-2 right-2">
            <AssigneePips assignedTo={item.assignedTo ?? []} users={users} />
          </div>
        )}
      </div>
      <div className="px-3.5 py-2.5 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-normal text-soren-text truncate">{item.name}</p>
          {item.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {item.tags.slice(0, 2).map(t => (
                <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FF4D0015', color: '#FF4D00' }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[13px] font-bold text-soren-muted hover:text-soren-text px-1.5 py-0.5 rounded-lg hover:bg-soren-elevated flex-shrink-0">
          ···
        </button>
      </div>
    </div>
  )
}

// ─── Search/filter result row (flat, montre le dossier d'origine) ─────────────

function SearchResultRow({ item, onOpen, onOpenFolder, users }: {
  item: LibItem; onOpen: () => void; onOpenFolder: (p: string) => void; users: UserLite[]
}) {
  const { Icon, color } = iconFor(item)
  const folder = item.folder ?? ''
  return (
    <div onClick={onOpen}
      className="group flex items-center gap-3 bg-soren-card border border-soren-border rounded-2xl px-3.5 py-2.5 cursor-pointer hover:border-[#C8CBD0] hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-normal text-soren-text truncate">{item.name}</p>
        <button onClick={e => { e.stopPropagation(); if (folder) onOpenFolder(folder) }}
          className="inline-flex items-center gap-1 text-[10px] text-soren-subtle hover:text-soren-text transition-colors mt-0.5 max-w-full truncate">
          {folder ? <><Folder size={9} className="flex-shrink-0" /> {folder.replace(/\//g, ' / ')}</> : <><HardDrive size={9} className="flex-shrink-0" /> Racine</>}
        </button>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.tags.slice(0, 3).map(t => (
          <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF4D0015', color: '#FF4D00' }}>#{t}</span>
        ))}
      </div>
      <AssigneePips assignedTo={item.assignedTo ?? []} users={users} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataView() {
  const itemsRaw  = useQuery(api.library.list) as LibItem[] | undefined
  const allUsers  = useQuery(api.users.listAll) ?? []
  const items = useMemo(() => (itemsRaw ?? []).map(i => ({
    ...i,
    tags:       i.tags       ?? [],
    description: i.description ?? '',
    assignedTo: i.assignedTo  ?? [],
    status:     i.status      ?? '',
  })), [itemsRaw])

  const foldersRaw = useQuery(api.library.listFolders) as Array<{ id: string; name: string; path: string; parentPath: string }> | undefined
  const hiddenBase = useQuery(api.library.listHiddenBase) as string[] | undefined
  const genUpload    = useMutation(api.files.generateUploadUrl)
  const addFile      = useMutation(api.library.addFile)
  const addLink      = useMutation(api.library.addLink)
  const updateItem   = useMutation(api.library.updateItem)
  const createFolder = useMutation(api.library.createFolder)
  const renameFolder = useMutation(api.library.renameFolder)
  const deleteFolder = useMutation(api.library.deleteFolder)
  const hideBaseFolder = useMutation(api.library.hideBaseFolder)

  const [currentPath,    setCurrentPath]    = useState('')   // '' = racine
  const [search,         setSearch]         = useState('')
  const [previewItem,    setPreviewItem]    = useState<LibItem | null>(null)
  const [lightbox,       setLightbox]       = useState<LibItem | null>(null)
  const [uploading,      setUploading]      = useState(false)
  const [showLink,       setShowLink]       = useState(false)
  const [linkName,       setLinkName]       = useState('')
  const [linkUrl,        setLinkUrl]        = useState('')
  const [filterAssignee, setFilterAssignee] = useState<string[]>([])
  const [showAssigneeDD, setShowAssigneeDD] = useState(false)
  const [filterTags,     setFilterTags]     = useState<string[]>([])
  const [filterType,     setFilterType]     = useState<string[]>([])
  const [sortBy,         setSortBy]         = useState<'recent' | 'name' | 'size'>('recent')
  const [showSortDD,     setShowSortDD]     = useState(false)
  const [draggingId,     setDraggingId]     = useState<string | null>(null)
  const [dropPath,       setDropPath]       = useState<string | null>(null)
  const [creating,       setCreating]       = useState(false)
  const [folderName,     setFolderName]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const syncedPreview = useMemo(() => previewItem ? (items.find(i => i.id === previewItem.id) ?? previewItem) : null, [previewItem, items])
  const allTags = useMemo(() => { const s = new Set<string>(); for (const it of items) for (const t of it.tags) s.add(t); return Array.from(s).sort() }, [items])

  // Arborescence : dossiers de base + dossiers créés (Convex) + chemins dérivés des fichiers.
  const folderMap = useMemo(() => {
    const m = new Map<string, { name: string; parentPath: string }>()
    // Dossiers de base, sauf ceux que l'utilisateur a supprimés (masqués).
    for (const b of BASE_FOLDERS) if (!(hiddenBase ?? []).includes(b.name)) m.set(b.name, { name: b.name, parentPath: '' })
    for (const f of (foldersRaw ?? [])) m.set(f.path, { name: f.name, parentPath: f.parentPath })
    for (const it of items) {
      const p = (it.folder ?? '').trim(); if (!p) continue
      const segs = p.split('/')
      for (let i = 0; i < segs.length; i++) {
        const path = segs.slice(0, i + 1).join('/')
        if (!m.has(path)) m.set(path, { name: segs[i], parentPath: segs.slice(0, i).join('/') })
      }
    }
    return m
  }, [foldersRaw, items, hiddenBase])

  const childFolders = useCallback((parent: string) =>
    Array.from(folderMap.entries())
      .filter(([, v]) => v.parentPath === parent)
      .map(([path, v]) => ({ path, name: v.name }))
      .sort((a, b) => {
        // Dossiers de base d'abord, dans leur ordre (Projets en premier), puis alphabétique.
        const ai = BASE_FOLDERS.findIndex(x => x.name === a.name)
        const bi = BASE_FOLDERS.findIndex(x => x.name === b.name)
        const aw = ai === -1 ? 999 : ai
        const bw = bi === -1 ? 999 : bi
        return aw !== bw ? aw - bw : a.name.localeCompare(b.name, 'fr')
      }), [folderMap])

  const filesAt = useCallback((path: string) => {
    let r = items.filter(i => (i.folder ?? '') === path)
    if (filterAssignee.length) r = r.filter(i => filterAssignee.every(uid => (i.assignedTo ?? []).includes(uid)))
    if (search.trim()) { const q = search.trim().toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q))) }
    return r
  }, [items, filterAssignee, search])

  const sortItems = useCallback((list: LibItem[]) => {
    const arr = [...list]
    if (sortBy === 'name')      arr.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    else if (sortBy === 'size') arr.sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    else                        arr.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    return arr
  }, [sortBy])

  // Mode recherche/filtre : dès qu'une recherche, un tag ou un type est actif,
  // on cherche dans TOUS les dossiers (liste plate) au lieu de naviguer.
  const findMode = search.trim() !== '' || filterTags.length > 0 || filterType.length > 0
  const matched = useMemo(() => {
    let r = items
    if (filterAssignee.length) r = r.filter(i => filterAssignee.every(uid => (i.assignedTo ?? []).includes(uid)))
    if (filterTags.length)     r = r.filter(i => filterTags.some(t => i.tags.includes(t)))
    if (filterType.length)     r = r.filter(i => filterType.some(ft => TYPE_FILTERS.find(x => x.id === ft)?.match(i)))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)) || (i.folder ?? '').toLowerCase().includes(q))
    }
    return sortItems(r)
  }, [items, filterAssignee, filterTags, filterType, search, sortItems])

  const subFolders  = childFolders(currentPath)
  const folderItems = sortItems(filesAt(currentPath))
  const crumbs = currentPath ? currentPath.split('/') : []
  const descendantFileCount = (path: string) => items.filter(i => { const f = i.folder ?? ''; return f === path || f.startsWith(path + '/') }).length
  const toggleTag  = (t: string) => setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleType = (t: string) => setFilterType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const url = await genUpload()
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
        const { storageId } = await res.json() as { storageId: string }
        const ext = file.name.includes('.') ? file.name.split('.').pop()! : ''
        await addFile({ name: file.name, ext, storageId, mime: file.type || undefined, size: file.size, folder: currentPath || undefined })
      }
    } catch { /* ignore */ } finally { setUploading(false) }
  }
  async function submitLink() {
    const u = linkUrl.trim(); if (!u) return
    const name = linkName.trim() || u.replace(/^https?:\/\//, '').replace(/\/$/, '')
    await addLink({ name, url: u, folder: currentPath || undefined })
    setLinkName(''); setLinkUrl(''); setShowLink(false)
  }
  function moveItem(id: string, folder: string) { void updateItem({ id: id as never, folder }) }
  async function submitFolder() {
    const n = folderName.trim(); if (!n) { setCreating(false); return }
    await createFolder({ name: n, parentPath: currentPath })
    setFolderName(''); setCreating(false)
  }
  function handleRenameFolder(path: string, name: string) {
    const next = window.prompt('Renommer le dossier', name)?.trim()
    if (next && next !== name) void renameFolder({ path, name: next })
  }
  function handleDeleteFolder(path: string, name: string) {
    if (!window.confirm(`Supprimer le dossier « ${name} » ? Son contenu remonte au dossier parent.`)) return
    void deleteFolder({ path })
    // Dossier de base (racine, codé en UI) : il faut aussi le masquer, sinon il réapparaît.
    if (path === name && BASE_FOLDERS.some(b => b.name === name)) void hideBaseFolder({ name })
    if (currentPath === path || currentPath.startsWith(path + '/')) setCurrentPath(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')
  }
  function handleItemClick(item: LibItem) {
    const a = actionFor(item)
    if (a === 'modal')    { setPreviewItem(item); return }
    if (a === 'lightbox') { setLightbox(item);    return }
    if (a === 'navigate' && item.url) { window.open(item.url, '_blank', 'noreferrer'); return }
  }
  const dragWrap = (item: LibItem, node: ReactNode) => (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(item.id) }}
      onDragEnd={() => { setDraggingId(null); setDropPath(null) }}
      style={{ opacity: draggingId === item.id ? 0.45 : 1, cursor: 'grab' }}>{node}</div>
  )
  const loading = itemsRaw === undefined || foldersRaw === undefined

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header : fil d'Ariane + actions ── */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[12px] font-semibold text-soren-muted min-w-0">
          <button onClick={() => { setCurrentPath(''); setSearch('') }}
            onDragOver={e => { if (draggingId) { e.preventDefault(); setDropPath('') } }}
            onDragLeave={() => setDropPath(c => c === '' ? null : c)}
            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || draggingId; if (id) moveItem(id, ''); setDraggingId(null); setDropPath(null) }}
            className={`flex items-center gap-1 hover:text-soren-text transition-colors ${dropPath === '' ? 'text-[#FF4D00]' : ''}`}>
            <HardDrive size={13} /> Data
          </button>
          {crumbs.map((seg, i) => {
            const path = crumbs.slice(0, i + 1).join('/')
            const isLast = i === crumbs.length - 1
            return (
              <span key={path} className="flex items-center gap-1 min-w-0">
                <ChevronRight size={12} className="text-soren-subtle flex-shrink-0" />
                <button disabled={isLast} onClick={() => setCurrentPath(path)}
                  onDragOver={e => { if (draggingId) { e.preventDefault(); setDropPath(path) } }}
                  onDragLeave={() => setDropPath(c => c === path ? null : c)}
                  onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || draggingId; if (id) moveItem(id, path); setDraggingId(null); setDropPath(null) }}
                  className={`truncate ${isLast ? 'text-soren-text font-black' : 'hover:text-soren-text'} ${dropPath === path ? 'text-[#FF4D00]' : ''}`}>
                  {seg}
                </button>
              </span>
            )
          })}
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher partout…"
            className="w-48 bg-soren-elevated border border-soren-border rounded-full pl-8 pr-7 py-2 text-[12px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-soren-subtle hover:text-soren-text"><X size={12} /></button>}
        </div>

        <div className="relative">
          <button onClick={() => setShowSortDD(v => !v)}
            className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-3 py-2 rounded-full hover:text-soren-text transition-colors flex-shrink-0">
            <ArrowDownUp size={12} /> {sortBy === 'name' ? 'Nom' : sortBy === 'size' ? 'Taille' : 'Récents'}
          </button>
          {showSortDD && (
            <div className="absolute top-full right-0 mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-20 py-1.5 min-w-[140px]">
              {([['recent', 'Récents'], ['name', 'Nom (A→Z)'], ['size', 'Taille']] as const).map(([id, label]) => (
                <button key={id} onClick={() => { setSortBy(id); setShowSortDD(false) }}
                  className={`w-full flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-left transition-colors ${sortBy === id ? 'text-[#FF4D00]' : 'text-soren-text hover:bg-soren-elevated'}`}>
                  {label}{sortBy === id && <span className="ml-auto text-[#FF4D00] font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { setCreating(true); setFolderName('') }}
          className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-[11px] font-semibold px-3 py-2 rounded-full hover:text-soren-text transition-colors flex-shrink-0">
          <FolderPlus size={12} /> {currentPath ? 'Sous-dossier' : 'Dossier'}
        </button>
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

      {/* ── Création de dossier (inline) ── */}
      {creating && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <input autoFocus value={folderName} onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submitFolder(); if (e.key === 'Escape') setCreating(false) }}
            placeholder={currentPath ? 'Nom du sous-dossier…' : 'Nom du nouveau dossier…'}
            className="flex-1 max-w-xs bg-soren-elevated border border-soren-border rounded-full px-4 py-2 text-[12px] text-soren-text outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
          <button onClick={submitFolder} className="text-[11px] font-semibold bg-[#FF4D00] text-white px-3 py-1.5 rounded-full">Créer</button>
          <button onClick={() => setCreating(false)} className="text-[11px] text-soren-muted hover:text-soren-text">Annuler</button>
        </div>
      )}

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-3xl bg-soren-elevated animate-pulse" />)}</div>
        ) : (
          <div className="pt-2 flex flex-col gap-5">

            {/* Barre de filtres : type · tags · assigné à */}
            <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_FILTERS.map(t => {
              const on = filterType.includes(t.id)
              return (
                <button key={t.id} onClick={() => toggleType(t.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                  style={on ? { background: '#3462EE1A', color: '#3462EE', borderColor: '#3462EE66' } : { color: '#9CA3AF', borderColor: 'var(--border)' }}>
                  {t.label}
                </button>
              )
            })}
            {allTags.length > 0 && <span className="w-px h-4 bg-soren-border mx-0.5" />}
            {allTags.map(t => {
              const on = filterTags.includes(t)
              return (
                <button key={t} onClick={() => toggleTag(t)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                  style={on ? { background: '#FF4D001A', color: '#FF4D00', borderColor: '#FF4D0066' } : { color: '#9CA3AF', borderColor: 'var(--border)' }}>
                  <Tag size={10} />{t}
                </button>
              )
            })}
            {(filterType.length > 0 || filterTags.length > 0) && (
              <button onClick={() => { setFilterType([]); setFilterTags([]) }} className="text-[11px] font-semibold text-soren-muted hover:text-soren-text px-2 py-1">Effacer</button>
            )}
            {(allUsers as UserLite[]).length > 0 && (
              <div className="relative">
                <button onClick={() => setShowAssigneeDD(v => !v)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-semibold transition-colors ${filterAssignee.length > 0 ? 'bg-[#FF4D00]/10 border-[#FF4D00]/30 text-[#FF4D00]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
                  <Users size={12} /> Assigné à
                  {filterAssignee.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF4D00] text-white">{filterAssignee.length}</span>}
                  <ChevronDown size={11} className={`transition-transform ${showAssigneeDD ? 'rotate-180' : ''}`} />
                </button>
                {filterAssignee.length > 0 && <button onClick={() => setFilterAssignee([])} className="ml-2 text-[10px] text-soren-muted hover:text-soren-text transition-colors">Effacer</button>}
                {showAssigneeDD && (
                  <div className="absolute top-full left-0 mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-20 py-1.5 min-w-[180px]">
                    {(allUsers as UserLite[]).map(u => {
                      const selected = filterAssignee.includes(u.id)
                      return (
                        <button key={u.id} onClick={() => setFilterAssignee(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-medium transition-colors text-left ${selected ? 'text-[#FF4D00]' : 'text-soren-text hover:bg-soren-elevated'}`}>
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0" /> : <span className="w-5 h-5 rounded-full bg-[#FF4D00]/20 flex items-center justify-center text-[9px] text-[#FF4D00] font-bold flex-shrink-0">{(u.firstName?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}</span>}
                          <span className="truncate">{u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : (u.name ?? u.email)}</span>
                          {selected && <span className="ml-auto text-[#FF4D00] font-bold">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            </div>

            {findMode ? (
              matched.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                  <Search size={26} className="text-soren-subtle" />
                  <p className="text-[12px] text-soren-subtle">Aucun résultat.</p>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-soren-muted mb-2.5">{matched.length} résultat{matched.length > 1 ? 's' : ''} · tous dossiers</p>
                  <MotionStagger className="flex flex-col gap-2">
                    {matched.map(item => (
                      <MotionItem key={item.id}>
                        <SearchResultRow item={item} onOpen={() => handleItemClick(item)}
                          onOpenFolder={p => { setCurrentPath(p); setSearch(''); setFilterTags([]); setFilterType([]) }}
                          users={allUsers as UserLite[]} />
                      </MotionItem>
                    ))}
                  </MotionStagger>
                </div>
              )
            ) : (
            <>
            {/* Sous-dossiers (cibles de drop pour ranger un fichier) */}
            {subFolders.length > 0 && (
              <MotionStagger className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {subFolders.map(f => {
                  const { Icon, color } = folderVisual(f.path, f.name)
                  const isDrop = dropPath === f.path
                  const count = descendantFileCount(f.path)
                  return (
                    <MotionItem key={f.path}>
                      <div onClick={() => { setCurrentPath(f.path); setSearch('') }}
                        onDragOver={e => { if (draggingId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropPath !== f.path) setDropPath(f.path) } }}
                        onDragLeave={() => setDropPath(c => c === f.path ? null : c)}
                        onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || draggingId; if (id) moveItem(id, f.path); setDraggingId(null); setDropPath(null) }}
                        className="group relative flex flex-col items-start gap-3 p-5 bg-soren-card border border-soren-border rounded-3xl hover:border-[#C8CBD0] hover:shadow-md transition-all cursor-pointer"
                        style={isDrop ? { borderColor: color, boxShadow: `0 0 0 2px ${color}55`, background: color + '0d' } : undefined}>
                        <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); handleRenameFolder(f.path, f.name) }} className="w-6 h-6 rounded-lg flex items-center justify-center text-soren-muted hover:text-soren-text hover:bg-soren-elevated"><Pencil size={11} /></button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteFolder(f.path, f.name) }} className="w-6 h-6 rounded-lg flex items-center justify-center text-soren-muted hover:text-red-500 hover:bg-soren-elevated"><Trash2 size={11} /></button>
                        </div>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: color + '18' }}><Icon size={20} style={{ color }} /></div>
                        <div>
                          <p className="text-[12px] font-normal text-soren-text">{f.name}</p>
                          <p className="text-[11px] text-soren-subtle mt-0.5">{count} fichier{count > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </MotionItem>
                  )
                })}
              </MotionStagger>
            )}

            {/* Fichiers du dossier courant */}
            {(() => {
              const imgs = folderItems.filter(i => i.category === 'image' || i.category === 'svg')
              const rest = folderItems.filter(i => i.category !== 'image' && i.category !== 'svg')
              if (subFolders.length === 0 && folderItems.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                    <Folder size={26} className="text-soren-subtle" />
                    <p className="text-[12px] text-soren-subtle">{currentPath ? 'Dossier vide. Crée un sous-dossier, importe un fichier, ou glisse-en un ici depuis un autre dossier.' : 'Aucun dossier. Crée-en un avec « + Dossier ».'}</p>
                  </div>
                )
              }
              return (
                <>
                  {imgs.length > 0 && (
                    <MotionStagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {imgs.map(item => <MotionItem key={item.id}>{dragWrap(item, <ImageCard item={item} onClick={() => setLightbox(item)} onEdit={() => setPreviewItem(item)} users={allUsers as UserLite[]} />)}</MotionItem>)}
                    </MotionStagger>
                  )}
                  {rest.length > 0 && (
                    <MotionStagger className="flex flex-col gap-2">
                      {rest.map(item => <MotionItem key={item.id}>{dragWrap(item, item.category === 'markdown'
                        ? <MarkdownCard item={item} onEdit={() => setPreviewItem(item)} users={allUsers as UserLite[]} />
                        : <ItemCard item={item} onClick={() => handleItemClick(item)} onEdit={() => setPreviewItem(item)} onStatus={s => void updateItem({ id: item.id as never, status: s })} users={allUsers as UserLite[]} />)}</MotionItem>)}
                    </MotionStagger>
                  )}
                </>
              )
            })()}
            </>
            )}
          </div>
        )}
      </div>

      {/* ── Add link modal ── */}
      {showLink && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLink(false)} />
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-soren-text">Ajouter un lien</h2>
              <button onClick={() => setShowLink(false)} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-soren-elevated/80 transition-colors">
                <X size={14} className="text-soren-muted" />
              </button>
            </div>
            <p className="text-[11px] text-soren-subtle -mt-2">Notion, GitHub, Vercel ou tout autre lien.</p>
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
      ), document.body)}

      {/* ── Image lightbox ── */}
      {lightbox && <ImageLightbox item={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Preview / edit panel ── */}
      {syncedPreview && (
        <DataPreviewPanel
          item={syncedPreview}
          allTags={allTags}
          onClose={() => setPreviewItem(null)}
          onDelete={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}
