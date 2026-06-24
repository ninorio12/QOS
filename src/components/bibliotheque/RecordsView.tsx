'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FileText, RefreshCw, AlertCircle, X, Save, Trash2, Pencil, ArrowUpRight, Check, Mic, Users, CalendarDays, Search, ListChecks, Link2, Plus, Briefcase } from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { MotionStagger, MotionItem } from '@/components/ui/Motion'

type RecordSource = 'tldv' | 'fathom'

type TldvRecord = {
  id: string
  source: RecordSource
  title: string
  videoUrl?: string
  duration?: string
  date: string
  dateTime?: string   // ISO complet (date + heure) quand dispo
  participants: string
  segments?: TranscriptSegment[]   // transcript inline (Fathom)
  actionItems?: string[]           // action items natifs (Fathom)
}

type Meta = { synthesis: string; tags: string[]; name: string; linkedContactId: string; linkedLeadId: string; synthesisBy?: string; synthesisAt?: string }

// Preuve « synthèse faite par l'agent » : slug auteur (ex "agent:agent-kb") → avatar rond + libellé.
const AGENT_AVATARS: Record<string, string> = {
  'agent-kb': 'kb', 'agent-support-client': 'support', 'agent-operations': 'operations',
  'agent-analyse': 'analyse', 'agent-media-buyer': 'media-buyer', 'agent-debug': 'debug', 'coo': 'coo',
}
const AGENT_LABELS: Record<string, string> = {
  'agent-kb': 'Agent KB', 'agent-support-client': 'Agent CSM', 'agent-operations': 'Agent Operations',
  'agent-analyse': 'Agent Analyse', 'agent-media-buyer': 'Agent Media Buyer', 'agent-debug': 'Agent Debug', 'coo': 'COO',
}
const synthSlug = (by?: string) => (by ?? '').replace(/^agent:/, '')
const synthAvatar = (by?: string) => { const f = AGENT_AVATARS[synthSlug(by)]; return f ? `/agents/${f}.png` : null }
const agentLabel = (by?: string) => AGENT_LABELS[synthSlug(by)] ?? 'un agent'
type TranscriptSegment = { speaker: string; text: string; time: string }

// Identité visuelle par source : bleu = tl;dv, gris = Fathom.
const SOURCES: Record<RecordSource, { label: string; color: string }> = {
  tldv:   { label: 'tl;dv',  color: '#3462EE' },
  fathom: { label: 'fathom', color: '#6B7280' },
}

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
    source:       'tldv',
    title:        m.name ?? m.title ?? 'Réunion',
    videoUrl:     m.url ?? m.videoUrl ?? m.recording_url ?? '',
    duration:     m.duration ? `${Math.round(m.duration / 60)} min` : undefined,
    date:         when ? new Date(when).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dateTime:     when ? new Date(when).toISOString() : undefined,
    participants,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFathom(m: any): TldvRecord {
  const when = m.recording_start_time ?? m.scheduled_start_time ?? m.created_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = (m.calendar_invitees ?? []).map((x: any) => x?.name).filter(Boolean)
  const participants = Array.from(new Set([m.recorded_by?.name, ...inv].filter(Boolean))).join(', ')
  const start = m.recording_start_time ? new Date(m.recording_start_time).getTime() : null
  const end   = m.recording_end_time   ? new Date(m.recording_end_time).getTime()   : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments = (Array.isArray(m.transcript) ? m.transcript : []).map((seg: any) => ({
    speaker: seg.speaker?.display_name ?? seg.speaker ?? '',
    text:    seg.text ?? '',
    time:    seg.timestamp ?? '',
  })).filter((s: { text: string }) => s.text)
  return {
    id:           `fathom-${m.recording_id ?? m.id ?? m.url ?? when ?? Math.random()}`,
    source:       'fathom',
    title:        m.meeting_title ?? m.title ?? 'Réunion',
    videoUrl:     m.url ?? '',
    duration:     start && end ? `${Math.round((end - start) / 60000)} min` : undefined,
    date:         when ? new Date(when).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dateTime:     when ? new Date(when).toISOString() : undefined,
    participants,
    segments,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actionItems:  (Array.isArray(m.action_items) ? m.action_items : []).map((a: any) => (typeof a === 'string' ? a : a?.description)).filter(Boolean),
  }
}

// ─── Rattachement CRM : lie le record à un contact et/ou une opportunité ────────
function CrmLink({ recordId, meta }: { recordId: string; meta?: Meta }) {
  const patch = useMutation(api.recordNotes.patch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = (useQuery(api.crm_contacts.list) ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = (useQuery(api.crm_leads.list) ?? []) as any[]
  const [open, setOpen] = useState<null | 'contact' | 'lead'>(null)
  const [q, setQ] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cName = (c: any) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || c.company || 'Contact'
  const contact = contacts.find(c => c._id === meta?.linkedContactId)
  const lead    = leads.find(l => l._id === meta?.linkedLeadId)

  const ql = q.trim().toLowerCase()
  const list = open === 'contact'
    ? contacts.filter(c => !ql || cName(c).toLowerCase().includes(ql))
    : leads.filter(l => !ql || (l.name ?? '').toLowerCase().includes(ql))

  function choose(id: string) {
    if (open === 'contact') void patch({ recordId, linkedContactId: id })
    else void patch({ recordId, linkedLeadId: id })
    setOpen(null); setQ('')
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      {contact ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#3462EE1A', color: '#3462EE' }}>
          <Users size={10} />{cName(contact)}
          <button onClick={() => void patch({ recordId, linkedContactId: '' })} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
        </span>
      ) : (
        <button onClick={() => { setOpen(open === 'contact' ? null : 'contact'); setQ('') }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-soren-border text-soren-muted hover:text-soren-text transition-colors">
          <Link2 size={10} /> Lier un contact
        </button>
      )}
      {lead ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#16A34A1A', color: '#16A34A' }}>
          <Briefcase size={10} />{lead.name}
          <button onClick={() => void patch({ recordId, linkedLeadId: '' })} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
        </span>
      ) : (
        <button onClick={() => { setOpen(open === 'lead' ? null : 'lead'); setQ('') }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-soren-border text-soren-muted hover:text-soren-text transition-colors">
          <Briefcase size={10} /> Lier une opportunité
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-soren-card border border-soren-border rounded-2xl shadow-xl w-64 p-2">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"
            className="w-full bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-[11px] text-soren-text outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
          <div className="max-h-48 overflow-y-auto mt-1">
            {list.slice(0, 50).map(it => (
              <button key={it._id} onClick={() => choose(it._id)}
                className="w-full text-left px-2.5 py-1.5 text-[11px] text-soren-text rounded-lg hover:bg-soren-elevated truncate transition-colors">
                {open === 'contact' ? cName(it) : it.name}
              </button>
            ))}
            {list.length === 0 && <p className="px-2.5 py-2 text-[10px] text-soren-subtle">Aucun résultat.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail modal: editable name + tags + transcript + free-text synthèse (Convex) ──
function RecordDetail({ record, onClose }: { record: TldvRecord; onClose: () => void }) {
  const meta = useQuery(api.recordNotes.get, { recordId: record.id }) as Meta | undefined
  const patch = useMutation(api.recordNotes.patch)
  const createTask = useMutation(api.osTasks.create)

  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [tLoading, setTLoading] = useState(true)
  const [tError, setTError]     = useState<string | null>(null)

  const [synthese, setSynthese] = useState('')
  const [name, setName]         = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [dirty, setDirty]       = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pushed, setPushed]       = useState<Set<number>>(new Set())
  const tags = meta?.tags ?? []
  const actionItems = record.actionItems ?? []

  async function pushActionItem(i: number, text: string) {
    await createTask({ title: text, source: 'call', sourceRef: record.id, description: `Action issue de la réunion « ${name || record.title} »` })
    setPushed(prev => new Set(prev).add(i))
  }

  useEffect(() => {
    if (meta !== undefined && loadedFor !== record.id) {
      setSynthese(meta.synthesis ?? ''); setName(meta.name ?? ''); setLoadedFor(record.id); setDirty(false)
    }
  }, [meta, loadedFor, record.id])

  useEffect(() => {
    // Fathom : le transcript est déjà inline dans le record (pas d'appel séparé).
    if (record.source === 'fathom') {
      setSegments(record.segments ?? []); setTError(null); setTLoading(false)
      return
    }
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
          <CrmLink recordId={record.id} meta={meta} />
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
                <p className="text-[11px] text-soren-subtle">Transcript indisponible{tError.includes('not set') ? ' (clé TLDV manquante)' : ''}.</p>
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
            {actionItems.length > 0 && (
              <div className="px-5 pb-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ListChecks size={12} className="text-soren-muted" />
                  <span className="text-[10px] font-bold text-soren-muted uppercase tracking-wide">Action items</span>
                </div>
                <div className="flex flex-col gap-1">
                  {actionItems.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-soren-text bg-soren-card border border-soren-border rounded-lg px-2.5 py-1.5">
                      <span className="flex-1 min-w-0">{a}</span>
                      {pushed.has(i)
                        ? <span className="flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] flex-shrink-0"><Check size={11} /> Tâche</span>
                        : <button onClick={() => pushActionItem(i, a)} className="flex items-center gap-1 text-[10px] font-semibold text-[#FF4D00] hover:underline flex-shrink-0"><Plus size={11} /> Tâches</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  const avatarSrc = synthAvatar(meta?.synthesisBy)
  const src     = SOURCES[record.source]
  const when    = record.dateTime ? new Date(record.dateTime) : new Date(record.date)
  const dateStr = when.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = record.dateTime ? when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div onClick={onOpen}
      className="group flex items-center gap-3.5 bg-soren-card border border-soren-border rounded-2xl px-4 py-3 cursor-pointer hover:border-[#C8CBD0] hover:shadow-sm transition-all">
      {/* Icône enregistrement vocal — couleur par source */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: src.color + '1A' }}>
        <Mic size={17} style={{ color: src.color }} />
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
      {/* Source de l'enregistrement (tl;dv / fathom) */}
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
        style={{ background: src.color + '1A', color: src.color }}>
        {src.label}
      </span>
      {/* Date + heure du record */}
      <div className="flex flex-col items-end flex-shrink-0 text-right leading-tight">
        <span className="text-[11px] font-medium text-soren-text whitespace-nowrap">{dateStr}</span>
        {timeStr && <span className="text-[10px] text-soren-subtle tabular-nums">{timeStr}</span>}
      </div>
      {record.videoUrl && (
        <a href={record.videoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
           title={`Ouvrir la vidéo sur ${src.label}`}
           className="w-8 h-8 rounded-full flex items-center justify-center text-soren-muted hover:text-[#FF4D00] hover:bg-soren-elevated transition-colors flex-shrink-0">
          <ArrowUpRight size={16} />
        </a>
      )}
      {/* Preuve : QUI a rédigé la synthèse (avatar + nom + coche verte) */}
      {avatarSrc && (
        <span onClick={e => e.stopPropagation()} title={`Synthèse rédigée par ${agentLabel(meta?.synthesisBy)}${meta?.synthesisAt ? ' le ' + new Date(meta.synthesisAt).toLocaleDateString('fr-FR') : ''}`}
          className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-soren-elevated flex-shrink-0">
          <span className="relative flex-shrink-0">
            <img src={avatarSrc} alt="" className="w-5 h-5 rounded-full object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#16A34A] border border-soren-elevated flex items-center justify-center">
              <Check size={6} className="text-white" strokeWidth={3.5} />
            </span>
          </span>
          <span className="text-[10px] font-semibold text-soren-text whitespace-nowrap">{agentLabel(meta?.synthesisBy)}</span>
        </span>
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
  const [activeSources, setActiveSources] = useState<RecordSource[]>([])
  const [search,     setSearch]     = useState('')
  const [calOpen,    setCalOpen]    = useState(false)
  const [range,      setRange]      = useState<{ start: Date; end: Date; label: string } | null>(null)

  const metaMap = (useQuery(api.recordNotes.list) ?? {}) as Record<string, Meta>

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    try {
      // Les deux sources sont fusionnées sans distinction (seule la pastille couleur diffère).
      const [tldvRes, fathomRes] = await Promise.all([
        fetch('/api/tldv/meetings').then(r => r.json()).catch(e => ({ meetings: [], error: String(e) })),
        fetch('/api/fathom/meetings').then(r => r.json()).catch(e => ({ meetings: [], error: String(e) })),
      ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tldv   = (tldvRes.meetings   ?? []).map((m: any) => normalizeMeeting(m))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fathom = (fathomRes.meetings ?? []).map((m: any) => normalizeFathom(m))
      const all = [...tldv, ...fathom].sort((a, b) =>
        (b.dateTime ?? b.date).localeCompare(a.dateTime ?? a.date))
      setRecords(all)
      if (all.length === 0) setError(tldvRes.error ?? fathomRes.error ?? null)
    } catch (e) { setError(String(e)) } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    let list = records
    if (activeSources.length > 0) list = list.filter(r => activeSources.includes(r.source))
    if (activeTags.length > 0) list = list.filter(r => (metaMap[r.id]?.tags ?? []).some(t => activeTags.includes(t)))
    if (range) {
      const from = new Date(range.start); from.setHours(0, 0, 0, 0)
      const to   = new Date(range.end);   to.setHours(23, 59, 59, 999)
      list = list.filter(r => {
        const d = r.dateTime ? new Date(r.dateTime) : new Date(r.date)
        return d >= from && d <= to
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r =>
        (metaMap[r.id]?.name ?? r.title).toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.participants.toLowerCase().includes(q) ||
        (r.segments ?? []).some(s => s.text.toLowerCase().includes(q)))
    }
    return list
  }, [records, metaMap, activeTags, activeSources, range, search])

  // Regroupement par mois (récent → ancien), pour aérer la liste chronologique.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: TldvRecord[] }>()
    for (const r of filtered) {
      const d = r.dateTime ? new Date(r.dateTime) : new Date(r.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) {
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        map.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), items: [] })
      }
      map.get(key)!.items.push(r)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v)
  }, [filtered])

  const toggleFilter = (id: string) => setActiveTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  const toggleSource = (s: RecordSource) => setActiveSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

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

          {/* Filtre par date — même calendrier que le tableau de bord */}
          <div className="relative">
            <button onClick={() => setCalOpen(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                calOpen || range ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-text'
              }`}>
              <CalendarDays size={12} />
              <span>{range ? range.label : 'Période'}</span>
            </button>
            {calOpen && (
              <DateRangePicker
                onClose={() => setCalOpen(false)}
                onApply={(start, end, label) => { setRange({ start, end, label }); setCalOpen(false) }}
              />
            )}
          </div>
          {range && (
            <button onClick={() => setRange(null)} className="text-[11px] font-semibold text-soren-muted hover:text-soren-text px-2 py-1 inline-flex items-center gap-1"><X size={11} /> Date</button>
          )}

          {/* Séparateur + filtre par source (tl;dv / fathom) */}
          <span className="w-px h-4 bg-soren-border mx-0.5" />
          {(Object.keys(SOURCES) as RecordSource[]).map(s => {
            const sm = SOURCES[s]
            const on = activeSources.includes(s)
            return (
              <button key={s} onClick={() => toggleSource(s)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                style={on ? { background: sm.color + '1A', color: sm.color, borderColor: sm.color + '66' } : { color: '#9CA3AF', borderColor: 'var(--border)' }}>
                {on && <Check size={11} />}{sm.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="w-44 bg-soren-card border border-soren-border rounded-full pl-8 pr-3 py-1.5 text-[12px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-soren-subtle hover:text-soren-text"><X size={12} /></button>
            )}
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-soren-elevated disabled:opacity-50 transition-colors">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
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
            <p className="text-[12px] text-soren-subtle">{search.trim() ? 'Aucun record ne correspond.' : activeTags.length || activeSources.length ? 'Aucun record pour ces filtres.' : 'Aucun enregistrement.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(g => (
              <div key={g.label}>
                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                  <span className="text-[11px] font-medium text-soren-muted">{g.label}</span>
                  <span className="text-[10px] text-soren-subtle">· {g.items.length}</span>
                  <span className="flex-1 h-px bg-soren-border" />
                </div>
                <MotionStagger className="flex flex-col gap-2.5">
                  {g.items.map(r => <MotionItem key={r.id}><RecordCard record={r} meta={metaMap[r.id]} onOpen={() => setSelected(r)} /></MotionItem>)}
                </MotionStagger>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <RecordDetail record={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
