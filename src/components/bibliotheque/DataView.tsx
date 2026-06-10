'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Upload, Plus, X, RefreshCw, ArrowLeft, ExternalLink,
  FileText, ImageIcon, Code, GitFork, Triangle, Link2, HardDrive, ChevronDown, Users,
  type LucideIcon,
} from 'lucide-react'
import DataPreviewPanel, { type LibItem } from './DataPreviewPanel'
import CodeView from './CodeView'

// ─── Folder groups ───────────────────────────────────────────────────────────

type FolderDef = {
  id: string
  label: string
  Icon: LucideIcon
  color: string
  categories: string[]
  action: 'modal' | 'expand' | 'lightbox' | 'navigate'
}

const FOLDERS: FolderDef[] = [
  { id: 'pdf',      label: 'PDF',       Icon: FileText,  color: '#EF4444', categories: ['pdf'],                              action: 'modal'    },
  { id: 'markdown', label: 'Markdown',  Icon: Code,      color: '#8B5CF6', categories: ['markdown'],                         action: 'expand'   },
  { id: 'images',   label: 'Images',    Icon: ImageIcon, color: '#F59E0B', categories: ['image', 'svg'],                     action: 'lightbox' },
  { id: 'liens',    label: 'Liens',     Icon: Link2,     color: '#10B981', categories: ['notion', 'github', 'vercel', 'link', 'doc'], action: 'navigate' },
]

function folderOf(item: LibItem): FolderDef {
  return FOLDERS.find(f => f.categories.includes(item.category)) ?? FOLDERS[3]
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

// ─── Item card (generic for PDF + links) ──────────────────────────────────────

function ItemCard({ item, folder, onClick, onEdit, users }: {
  item: LibItem; folder: FolderDef; onClick: () => void; onEdit: () => void; users: UserLite[]
}) {
  return (
    <div className="group bg-soren-card border border-soren-border rounded-2xl p-3.5 hover:border-[#C8CBD0] hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: folder.color + '18' }}>
          <folder.Icon size={14} style={{ color: folder.color }} />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
          <p className="text-[11px] font-normal text-soren-text truncate leading-snug">{item.name}</p>
          <p className="text-[10px] text-soren-subtle mt-0.5">
            {item.ext ? `.${item.ext}` : item.category}{item.size ? ` · ${fmtSize(item.size)}` : ''}
            {item.url && folder.action === 'navigate' && (
              <span className="ml-1 truncate">{item.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
            )}
          </p>
        </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataView() {
  const itemsRaw  = useQuery(api.library.list) as LibItem[] | undefined
  const allUsers  = useQuery(api.users.listAll) ?? []
  const items = useMemo(() => (itemsRaw ?? []).map(i => ({
    ...i,
    tags:       i.tags       ?? [],
    description: i.description ?? '',
    assignedTo: i.assignedTo  ?? [],
  })), [itemsRaw])

  const genUpload = useMutation(api.files.generateUploadUrl)
  const addFile   = useMutation(api.library.addFile)
  const addLink   = useMutation(api.library.addLink)

  const [openFolder,     setOpenFolder]     = useState<string | null>(null)
  const [search,         setSearch]         = useState('')
  const [previewItem,    setPreviewItem]    = useState<LibItem | null>(null)
  const [lightbox,       setLightbox]       = useState<LibItem | null>(null)
  const [dragOver,       setDragOver]       = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [showLink,       setShowLink]       = useState(false)
  const [linkName,       setLinkName]       = useState('')
  const [linkUrl,        setLinkUrl]        = useState('')
  const [filterAssignee, setFilterAssignee] = useState<string[]>([])
  const [showAssigneeDD, setShowAssigneeDD] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const syncedPreview = useMemo(() => {
    if (!previewItem) return null
    return items.find(i => i.id === previewItem.id) ?? previewItem
  }, [previewItem, items])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) for (const t of it.tags) s.add(t)
    return Array.from(s).sort()
  }, [items])

  // Items in current folder, optionally filtered by search + assignee
  const folderItems = useMemo(() => {
    if (!openFolder) return []
    const def = FOLDERS.find(f => f.id === openFolder)!
    let result = items.filter(i => def.categories.includes(i.category))
    if (filterAssignee.length > 0)
      result = result.filter(i => filterAssignee.every(uid => (i.assignedTo ?? []).includes(uid)))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)))
    }
    return result
  }, [items, openFolder, search, filterAssignee])

  // Total counts per folder (unfiltered)
  const folderCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const f of FOLDERS) m[f.id] = items.filter(i => f.categories.includes(i.category)).length
    return m
  }, [items])

  // Filtered counts per folder (for badge on folder boxes when filter active)
  const filteredFolderCounts = useMemo(() => {
    if (filterAssignee.length === 0) return folderCounts
    const m: Record<string, number> = {}
    for (const f of FOLDERS)
      m[f.id] = items.filter(i => f.categories.includes(i.category) && filterAssignee.every(uid => (i.assignedTo ?? []).includes(uid))).length
    return m
  }, [items, filterAssignee, folderCounts])

  const activeFolderDef = useMemo(() => FOLDERS.find(f => f.id === openFolder) ?? null, [openFolder])

  const toggleTag = useCallback((t: string) => {
    // no-op here; tags visible in detail panel
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

  function handleItemClick(item: LibItem) {
    const def = folderOf(item)
    if (def.action === 'modal')    { setPreviewItem(item); return }
    if (def.action === 'lightbox') { setLightbox(item);    return }
    if (def.action === 'navigate' && item.url) { window.open(item.url, '_blank', 'noreferrer'); return }
    // expand handled by MarkdownCard itself
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files) }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0 flex items-center gap-2">
        {openFolder && (
          <button onClick={() => { setOpenFolder(null); setSearch(''); setShowAssigneeDD(false) }}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text transition-colors flex-shrink-0">
            <ArrowLeft size={14} />
          </button>
        )}

        {openFolder ? (
          <div className="flex-1 relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Rechercher dans ${activeFolderDef?.label ?? ''}…`}
              className="w-full bg-soren-elevated border border-soren-border rounded-full px-4 py-2 text-[12px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-soren-muted hover:text-soren-text">
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

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

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">

        {/* Folder grid */}
        {!openFolder && (
          itemsRaw === undefined ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-3xl bg-soren-elevated animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
              <HardDrive size={28} className="text-soren-subtle" />
              <p className="text-[12px] text-soren-subtle">Aucun fichier. Glisse-en un ici ou utilise « Importer ».</p>
            </div>
          ) : (
            <>
              {/* Assigné à filter */}
              <div className="relative mb-4 pt-2">
                <button
                  onClick={() => setShowAssigneeDD(v => !v)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-semibold transition-colors ${
                    filterAssignee.length > 0
                      ? 'bg-[#FF4D00]/10 border-[#FF4D00]/30 text-[#FF4D00]'
                      : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
                  }`}
                >
                  <Users size={12} />
                  Assigné à
                  {filterAssignee.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF4D00] text-white">
                      {filterAssignee.length}
                    </span>
                  )}
                  <ChevronDown size={11} className={`transition-transform ${showAssigneeDD ? 'rotate-180' : ''}`} />
                </button>

                {filterAssignee.length > 0 && (
                  <button onClick={() => setFilterAssignee([])}
                    className="ml-2 text-[10px] text-soren-muted hover:text-soren-text transition-colors">
                    Effacer
                  </button>
                )}

                {showAssigneeDD && (
                  <div className="absolute top-full left-0 mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-20 py-1.5 min-w-[180px]">
                    {(allUsers as Array<{ id: string; firstName?: string; lastName?: string; name?: string; email: string; avatarUrl?: string }>).map(u => {
                      const selected = filterAssignee.includes(u.id)
                      return (
                        <button key={u.id}
                          onClick={() => {
                            setFilterAssignee(prev =>
                              selected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            )
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-medium transition-colors text-left ${
                            selected ? 'text-[#FF4D00] bg-[#FF4D00]/05' : 'text-soren-text hover:bg-soren-elevated'
                          }`}
                        >
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                            : <span className="w-5 h-5 rounded-full bg-[#FF4D00]/20 flex items-center justify-center text-[9px] text-[#FF4D00] font-bold flex-shrink-0">{(u.firstName?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}</span>
                          }
                          <span className="truncate">{u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : (u.name ?? u.email)}</span>
                          {selected && <span className="ml-auto text-[#FF4D00] font-bold">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-stagger>
                {FOLDERS.filter(f => folderCounts[f.id] > 0).map(f => {
                  const filtered = filteredFolderCounts[f.id] ?? 0
                  const showBadge = filterAssignee.length > 0
                  return (
                    <button key={f.id} onClick={() => setOpenFolder(f.id)}
                      className="group flex flex-col items-start gap-3 p-5 bg-soren-card border border-soren-border rounded-3xl hover:border-[#C8CBD0] hover:shadow-md transition-all text-left relative">
                      {showBadge && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: filtered > 0 ? '#FF4D0015' : '#9CA3AF15', color: filtered > 0 ? '#FF4D00' : '#9CA3AF' }}>
                          {filtered}
                        </span>
                      )}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: f.color + '18' }}>
                        <f.Icon size={20} style={{ color: f.color }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-normal text-soren-text">{f.label}</p>
                        <p className="text-[11px] text-soren-subtle mt-0.5">{folderCounts[f.id]} fichier{folderCounts[f.id] > 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )
        )}

        {/* Folder content */}
        {openFolder && activeFolderDef && (
          <div className="pt-2">
            {/* Folder title */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: activeFolderDef.color + '18' }}>
                <activeFolderDef.Icon size={15} style={{ color: activeFolderDef.color }} />
              </div>
              <span className="text-[14px] font-black text-soren-text">{activeFolderDef.label}</span>
              <span className="text-[11px] text-soren-subtle">{folderItems.length} fichier{folderItems.length > 1 ? 's' : ''}</span>
            </div>

            {folderItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <activeFolderDef.Icon size={24} className="text-soren-subtle" />
                <p className="text-[12px] text-soren-subtle">Aucun résultat.</p>
              </div>
            ) : activeFolderDef.action === 'expand' ? (
              // Markdown: stacked expandable cards
              <div className="flex flex-col gap-2" data-stagger>
                {folderItems.map(item => (
                  <MarkdownCard key={item.id} item={item} onEdit={() => setPreviewItem(item)} users={allUsers as UserLite[]} />
                ))}
              </div>
            ) : activeFolderDef.action === 'lightbox' ? (
              // Images: thumbnail grid
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-stagger>
                {folderItems.map(item => (
                  <ImageCard key={item.id} item={item} onClick={() => setLightbox(item)} onEdit={() => setPreviewItem(item)} users={allUsers as UserLite[]} />
                ))}
              </div>
            ) : (
              // PDF + Links: card list
              <div className="flex flex-col gap-2" data-stagger>
                {folderItems.map(item => (
                  <ItemCard key={item.id} item={item} folder={activeFolderDef}
                    onClick={() => handleItemClick(item)}
                    onEdit={() => setPreviewItem(item)}
                    users={allUsers as UserLite[]} />
                ))}
              </div>
            )}
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
      )}

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
