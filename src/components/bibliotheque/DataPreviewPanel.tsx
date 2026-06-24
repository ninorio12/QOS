'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, Download, Plus, Trash2, Users } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import CodeView from './CodeView'

export type LibItem = {
  id: string
  kind: string
  category: string
  folder: string
  name: string
  ext: string
  url: string | null
  mime: string
  size: number
  addedAt: string
  tags: string[]
  description: string
  assignedTo: string[]
  status: string
}

interface Props {
  item: LibItem
  allTags: string[]
  onClose: () => void
  onDelete: (id: string) => void
}

function fmtSize(n: number) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mo`
  if (n >= 1_000) return `${Math.round(n / 1_000)} Ko`
  return `${n} o`
}

function FilePreview({ item }: { item: LibItem }) {
  const [mdText, setMdText] = useState<string | null>(null)
  const [mdLoading, setMdLoading] = useState(false)

  useEffect(() => {
    if (item.category !== 'markdown' || !item.url) return
    setMdLoading(true)
    fetch(item.url)
      .then(r => r.text())
      .then(text => setMdText(text))
      .catch(() => setMdText('Impossible de charger le fichier.'))
      .finally(() => setMdLoading(false))
  }, [item.url, item.category])

  if (item.category === 'image' || item.category === 'svg') {
    return (
      <div className="flex items-center justify-center w-full h-full p-4 bg-soren-app">
        <img src={item.url ?? ''} alt={item.name} className="max-w-full max-h-full object-contain rounded-xl" />
      </div>
    )
  }

  if (item.category === 'pdf') {
    return (
      <iframe
        src={item.url ?? ''}
        title={item.name}
        className="w-full h-full border-0 bg-soren-app"
      />
    )
  }

  if (item.category === 'markdown') {
    if (mdLoading) return (
      <div className="flex flex-col gap-2 p-6 h-full" style={{ background: '#1e1e1e' }}>
        {[1,2,3,4,5].map(i => <div key={i} className="h-4 rounded bg-white/10 animate-pulse" style={{ width: `${50 + (i * 11) % 45}%` }} />)}
      </div>
    )
    return (
      <div className="h-full overflow-auto" style={{ background: '#1e1e1e' }}>
        <CodeView text={mdText ?? ''} language="markdown" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full p-6 text-center bg-soren-app">
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

export default function DataPreviewPanel({ item, allTags, onClose, onDelete }: Props) {
  const updateItem = useMutation(api.library.updateItem)
  const removeItem = useMutation(api.library.remove)
  const allUsers   = useQuery(api.users.listAll) ?? []

  const [name, setName]               = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [tagInput, setTagInput]       = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const tagRef      = useRef<HTMLInputElement>(null)
  const assigneeRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setName(item.name); setDescription(item.description) }, [item.id, item.name, item.description])

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    if (!showAssigneePicker) return
    function outside(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node))
        setShowAssigneePicker(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [showAssigneePicker])

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

  async function handleDelete() {
    await removeItem({ id: item.id as never })
    onDelete(item.id)
  }

  async function toggleAssignee(userId: string) {
    const current = item.assignedTo ?? []
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId]
    await updateItem({ id: item.id as never, assignedTo: updated })
  }

  const suggestions = allTags.filter(t => !item.tags.includes(t) && t.includes(tagInput.toLowerCase()))

  // Seuls ces types ont un vrai rendu de contenu. Les autres (doc, xlsx, zip, liens…) n'affichent
  // PAS de grande zone de preview vide : panneau compact (métadonnées + bouton « Ouvrir »).
  const previewable = ['image', 'svg', 'pdf', 'markdown'].includes(item.category)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl bg-soren-card rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: previewable ? 'min(90vh, 800px)' : 'auto', maxHeight: '90vh', animation: 'scaleIn 180ms cubic-bezier(0.4,0,0.2,1) both' }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 border-b border-soren-border flex-shrink-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-1.5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              className="flex-1 min-w-0 text-[15px] font-black text-soren-text bg-transparent outline-none border-b border-transparent focus:border-soren-border transition-colors"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.url && item.kind === 'file' && (
                <a href={item.url} download={item.name} title="Télécharger"
                   className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-[#FF4D00] hover:bg-soren-elevated transition-colors">
                  <Download size={14} />
                </a>
              )}
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={handleDelete}
                    className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-semibold transition-colors">
                    Confirmer
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded-lg text-soren-muted hover:text-soren-text hover:bg-soren-elevated text-[11px] font-semibold transition-colors">
                    Annuler
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} title="Supprimer"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-red-400 hover:bg-soren-elevated transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <p className="text-[10px] text-soren-subtle">
            {item.category.toUpperCase()}{item.ext ? ` · .${item.ext}` : ''}{item.size ? ` · ${fmtSize(item.size)}` : ''} · {new Date(item.addedAt).toLocaleDateString('fr-FR')}
          </p>

          {/* Dossier — déplacer l'item */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] font-semibold text-soren-subtle mr-0.5">Dossier</span>
            {['Projets', 'Skills', 'Documentations', 'PDF', 'Images'].map(f => (
              <button key={f} onClick={() => { if (f !== item.folder) void updateItem({ id: item.id as never, folder: f }) }}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${item.folder === f ? 'bg-[#FF4D00] text-white border-[#FF4D00]' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
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

        {/* ── Preview ── grande zone uniquement pour les types prévisualisables.
            Sinon : pas de zone vide — juste un bouton « Ouvrir » (si fichier/lien). */}
        {previewable ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <FilePreview item={item} />
          </div>
        ) : item.url ? (
          <div className="px-5 py-4 border-t border-soren-border flex-shrink-0">
            <a href={item.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF4D00] hover:bg-[#e64500] text-white text-[12px] font-semibold rounded-full transition-colors">
              Ouvrir le fichier <ExternalLink size={12} />
            </a>
          </div>
        ) : null}

        {/* ── Assignees ── chips row, same pattern as tags */}
        <div className="px-5 py-2.5 border-t border-soren-border flex-shrink-0 bg-soren-card">
          <p className="text-[10px] font-semibold text-soren-subtle uppercase tracking-wide mb-1.5">Assigné à</p>
          <div className="flex items-center gap-1.5 flex-wrap" ref={assigneeRef}>
            {(item.assignedTo ?? []).map(uid => {
              const u = (allUsers as Array<{ id: string; firstName?: string; lastName?: string; name?: string; email: string; avatarUrl?: string }>).find(x => x.id === uid)
              if (!u) return null
              return (
                <span key={uid}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-soren-elevated text-soren-text border border-soren-border">
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
                    : <span className="w-3.5 h-3.5 rounded-full bg-[#FF4D00]/20 flex items-center justify-center text-[8px] text-[#FF4D00] font-bold">{(u.firstName?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}</span>
                  }
                  {u.firstName ?? u.name?.split(' ')[0] ?? u.email}
                  <button onClick={() => toggleAssignee(uid)} className="ml-0.5 hover:text-red-400"><X size={8} /></button>
                </span>
              )
            })}

            {/* + Assigner button + dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAssigneePicker(v => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors border border-dashed border-soren-border"
              >
                <Plus size={9} /> Assigner
              </button>

              {showAssigneePicker && (
                <div className="absolute bottom-full mb-1.5 left-0 bg-soren-card border border-soren-border rounded-2xl shadow-xl z-20 py-1.5 min-w-[180px] max-h-52 overflow-y-auto">
                  {(allUsers as Array<{ id: string; firstName?: string; lastName?: string; name?: string; email: string; avatarUrl?: string }>).map(u => {
                    const assigned = (item.assignedTo ?? []).includes(u.id)
                    return (
                      <button key={u.id}
                        onMouseDown={e => { e.preventDefault(); void toggleAssignee(u.id) }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-medium transition-colors text-left ${
                          assigned ? 'text-[#FF4D00] bg-[#FF4D00]/05' : 'text-soren-text hover:bg-soren-elevated'
                        }`}
                      >
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                          : <span className="w-5 h-5 rounded-full bg-[#FF4D00]/20 flex items-center justify-center text-[9px] text-[#FF4D00] font-bold flex-shrink-0">{(u.firstName?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}</span>
                        }
                        <span className="truncate flex-1">{u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : (u.name ?? u.email)}</span>
                        {assigned && <span className="text-[#FF4D00] font-bold">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Description ── always visible at bottom */}
        <div className="px-5 py-3 border-t border-soren-border flex-shrink-0 bg-soren-card">
          <p className="text-[10px] font-semibold text-soren-subtle uppercase tracking-wide mb-1.5">Description / note Hermès</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Décris à quoi sert ce fichier, pour toi ou pour Hermès…"
            rows={3}
            className="w-full resize-none bg-soren-elevated border border-soren-border rounded-xl px-3.5 py-2.5 text-[12px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all leading-relaxed"
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
