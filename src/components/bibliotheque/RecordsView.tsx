'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FileText, RefreshCw, AlertCircle, X, Save, Trash2, Pencil, ArrowUpRight, Check, Mic, Users } from 'lucide-react'

type TldvRecord = {
  id: string
  title: string
  videoUrl?: string
  duration?: string
  date: string
  participants: string
}

type Meta = { synthesis: string; tags: string[]; name: string }
type TranscriptSegment = { speaker: string; text: string; time: string }

const TAGS: { id: string; label: string; color: string }[] = [
  { id: 'r1',         label: 'R1',         color: '#3462EE' },
  { id: 'r2',         label: 'R2',         color: '#8B5CF6' },
  { id: 'interne',    label: 'Interne',    color: '#16A34A' },
  { id: 'externe',    label: 'Externe',    color: '#FF4D00' },
  { id: 'consulting', label: 'Consulting', color: '#D97706' },
]
const tagMeta = (id: string) => TAGS.find(t => t.id === id) ?? { id, label: id, color: '#9CA3AF' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeeting(m: any): TldvRecord {
  const when = m.happenedAt ?? m.started_at ?? m.date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = (m.invitees ?? m.attendees ?? []).map((x: any) => x?.name).filter(Boolean)
  const participants = Array.from(new Set([m.organizer?.name, ...inv].filter(Boolean))).join(', ')
  return {
    id:           m.id ?? m._id ?? String(Math.random()),
    title:        m.name ?? m.title ?? 'Réunion',
    videoUrl:     m.url ?? m.videoUrl ?? m.recording_url ?? '',
    duration:     m.duration ? `${Math.round(m.duration / 60)} min` : undefined,
    date:         when ? new Date(when).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    participants,
  }
}

// ─── Detail modal: editable name + tags + transcript + free-text synthèse (Convex) ──
function RecordDetail({ record, onClose }: { record: TldvRecord; onClose: () => void }) {
  const meta = useQuery(api.recordNotes.get, { recordId: record.id }) as Meta | undefined
  const patch = useMutation(api.recordNotes.patch)

  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [tLoading, setTLoading] = useState(true)
  const [tError, setTError]     = useState<string | null>(null)

  const [synthese, setSynthese] = useState('')
  const [name, setName]         = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [dirty, setDirty]       = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const tags = meta?.tags ?? []

  useEffect(() => {
    if (meta !== undefined && loadedFor !== record.id) {
      setSynthese(meta.synthesis ?? ''); setName(meta.name ?? ''); setLoadedFor(record.id); setDirty(false)
    }
  }, [meta, loadedFor, record.id])

  useEffect(() => {
    let alive = true
    setTLoading(true); setTError(null)
    fetch(`/api/tldv/transcript/${record.id}`)
      .then(r => r.json())
      .then((d: { segments?: TranscriptSegment[]; error?: string }) => {
        if (!alive) return
        if (d.error && (!d.segments || d.segments.length === 0)) setTError(d.error)
        setSegments(d.segments ?? [])
      })
      .catch(e => { if (alive) setTError(String(e)) })
      .finally(() => { if (alive) setTLoading(false) })
    return () => { alive = false }
  }, [record.id])

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  async function persistSynthese() {
    await patch({ recordId: record.id, synthesis: synthese.trim() })
    setDirty(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500)
  }
  async function clearSynthese() { setSynthese(''); await patch({ recordId: record.id, synthesis: '' }); setDirty(false) }
  async function saveName() { await patch({ recordId: record.id, name: name.trim() }) }
  async function toggleTag(id: string) {
    const next = tags.includes(id) ? tags.filter(t => t !== id) : [...tags, id]
    await patch({ recordId: record.id, tags: next })
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
           style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="px-6 py-4 border-b border-soren-border flex-shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <input
              value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder={record.title}
              className="min-w-0 flex-1 text-base font-black text-soren-text bg-transparent outline-none border-b border-transparent focus:border-soren-border placeholder-soren-muted"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {record.videoUrl && (
                <a href={record.videoUrl} target="_blank" rel="noreferrer"
                   className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF4D00] hover:underline">
                  Vidéo <ArrowUpRight size={12} />
                </a>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
                <X size={14} className="text-soren-muted" />
              </button>
            </div>
          </div>
          {record.participants && <p className="text-[11px] text-soren-subtle flex items-center gap-1.5"><Users size={11} /> {record.participants}</p>}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TAGS.map(t => {
              const on = tags.includes(t.id)
              return (
                <button key={t.id} onClick={() => toggleTag(t.id)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all"
                  style={on ? { background: t.color + '1A', color: t.color, borderColor: t.color + '55' } : { background: 'transparent', color: '#9CA3AF', borderColor: 'var(--border)' }}>
                  {on && <Check size={10} />}{t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-soren-border overflow-hidden">
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center gap-1.5 flex-shrink-0">
              <FileText size={12} className="text-soren-muted" />
              <span className="text-[10px] font-bold text-soren-muted uppercase tracking-wide">Transcript</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
              {tLoading ? (
                <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-4 rounded bg-soren-elevated animate-pulse" style={{ width: `${60 + (i * 7) % 35}%` }} />)}</div>
              ) : tError ? (
                <p className="text-[11px] text-soren-subtle">Transcript indisponible{tError.includes('not set') ? ' — clé TLDV manquante' : ''}.</p>
              ) : segments.length === 0 ? (
                <p className="text-[11px] text-soren-subtle">Aucun transcript pour cet enregistrement.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {segments.map((s, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      {(s.speaker || s.time) && (
                        <div className="flex items-center gap-2">
                          {s.speaker && <span className="text-[10px] font-bold text-soren-text">{s.speaker}</span>}
                          {s.time && <span className="text-[9px] font-mono text-soren-subtle">{s.time}</span>}
                        </div>
                      )}
                      <p className="text-[12px] text-soren-muted leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col min-h-0 overflow-hidden bg-soren-app/40">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Pencil size={12} className="text-[#FF4D00]" />
                <span className="text-[10px] font-bold text-[#FF4D00] uppercase tracking-wide">Synthèse</span>
              </div>
              {savedFlash && <span className="text-[10px] font-semibold text-[#16A34A]">Enregistré ✓</span>}
            </div>
            <div className="flex-1 min-h-0 px-5 pb-3 flex flex-col">
              <textarea
                value={synthese} onChange={e => { setSynthese(e.target.value); setDirty(true) }}
                placeholder="Écris ta synthèse ici… (libre, modifiable et supprimable à tout moment)"
                className="flex-1 w-full resize-none bg-soren-card border border-soren-border rounded-xl px-3.5 py-3 text-[12px] text-soren-text leading-relaxed placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all"
              />
            </div>
            <div className="px-5 pb-5 flex items-center gap-2 flex-shrink-0">
              <button onClick={persistSynthese} disabled={!dirty}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF4D00] text-white text-[12px] font-semibold hover:bg-[#e64500] disabled:opacity-40 transition-colors">
                <Save size={12} /> Enregistrer
              </button>
              {synthese.trim() && (
                <button onClick={clearSynthese}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-soren-border text-[12px] font-semibold text-soren-muted hover:text-[#DC2626] hover:border-[#FECACA] transition-colors">
                  <Trash2 size={12} /> Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function RecordCard({ record, meta, onOpen }: { record: TldvRecord; meta?: Meta; onOpen: () => void }) {
  const displayName = meta?.name?.trim() || record.title
  return (
    <div onClick={onOpen}
      className="group flex items-center gap-3.5 bg-soren-card border border-soren-border rounded-2xl px-4 py-3 cursor-pointer hover:border-[#C8CBD0] hover:shadow-sm transition-all">
      {/* Icône enregistrement vocal */}
      <div className="w-10 h-10 rounded-full bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0">
        <Mic size={17} className="text-[#FF4D00]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-normal text-soren-text truncate">{displayName}</p>
          {(meta?.tags ?? []).map(t => {
            const tm = tagMeta(t)
            return <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: tm.color + '1A', color: tm.color }}>{tm.label}</span>
          })}
        </div>
        <p className="text-[11px] text-soren-subtle truncate flex items-center gap-1 mt-0.5">
          {record.participants ? <><Users size={10} className="flex-shrink-0" /> {record.participants}</> : <span className="text-soren-subtle">{record.date}</span>}
        </p>
      </div>
      {record.videoUrl && (
        <a href={record.videoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
           title="Ouvrir la vidéo sur tl;dv"
           className="w-8 h-8 rounded-full flex items-center justify-center text-soren-muted hover:text-[#FF4D00] hover:bg-soren-elevated transition-colors flex-shrink-0">
          <ArrowUpRight size={16} />
        </a>
      )}
      <button onClick={e => { e.stopPropagation(); onOpen() }}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-soren-elevated text-[11px] font-semibold text-soren-text hover:bg-[#FF4D00] hover:text-white transition-colors flex-shrink-0">
        <FileText size={12} /> Synthèse
      </button>
    </div>
  )
}

export default function RecordsView() {
  const [records,    setRecords]    = useState<TldvRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,   setSelected]   = useState<TldvRecord | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])

  const metaMap = (useQuery(api.recordNotes.list) ?? {}) as Record<string, Meta>

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/tldv/meetings')
      const data = await res.json()
      if (data.error && (data.meetings ?? []).length === 0) setError(data.error)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else setRecords((data.meetings ?? []).map((m: any) => normalizeMeeting(m)) as TldvRecord[])
    } catch (e) { setError(String(e)) } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (activeTags.length === 0) return records
    return records.filter(r => (metaMap[r.id]?.tags ?? []).some(t => activeTags.includes(t)))
  }, [records, metaMap, activeTags])

  const toggleFilter = (id: string) => setActiveTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TAGS.map(t => {
            const on = activeTags.includes(t.id)
            return (
              <button key={t.id} onClick={() => toggleFilter(t.id)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                style={on ? { background: t.color + '1A', color: t.color, borderColor: t.color + '66' } : { color: '#9CA3AF', borderColor: 'var(--border)' }}>
                {on && <Check size={11} />}{t.label}
              </button>
            )
          })}
          {activeTags.length > 0 && (
            <button onClick={() => setActiveTags([])} className="text-[11px] font-semibold text-soren-muted hover:text-soren-text px-2 py-1">Tout</button>
          )}
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-soren-elevated disabled:opacity-50 transition-colors">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex flex-col gap-2.5">{[1,2,3,4,5,6].map(i => <div key={i} className="h-16 rounded-2xl bg-soren-elevated animate-pulse" />)}</div>
        ) : error?.includes('TLDV_API_KEY not set') ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center"><AlertCircle size={20} className="text-amber-500" /></div>
            <div>
              <p className="text-sm font-semibold text-soren-text">Clé API tl;dv manquante</p>
              <p className="text-[11px] text-soren-subtle mt-1">Ajoute <code className="bg-soren-elevated px-1 rounded text-[10px]">TLDV_API_KEY</code> dans Vercel</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-soren-elevated flex items-center justify-center"><Mic size={20} className="text-soren-muted" /></div>
            <p className="text-[12px] text-soren-subtle">{activeTags.length ? 'Aucun record pour ces balises.' : 'Aucun enregistrement.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5" data-stagger>
            {filtered.map(r => <RecordCard key={r.id} record={r} meta={metaMap[r.id]} onOpen={() => setSelected(r)} />)}
          </div>
        )}
      </div>

      {selected && <RecordDetail record={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
