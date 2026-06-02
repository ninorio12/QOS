'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Play, Clock, FileText, User, RefreshCw, AlertCircle } from 'lucide-react'

type VideoSegment = { id: string; title: string; timestamp: string; duration?: string }

type TldvRecord = {
  id: string
  title: string
  description?: string
  synthesis?: string
  imageUrl?: string
  videoUrl?: string
  duration?: string
  date: string
  segments: VideoSegment[]
  client: string
}

// Normalize tldv API response to our internal shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeeting(m: any): TldvRecord {
  const highlights = m.highlights ?? m.moments ?? []
  return {
    id:          m.id ?? m._id ?? String(Math.random()),
    title:       m.name ?? m.title ?? 'Réunion',
    description: m.description ?? undefined,
    synthesis:   m.summary ?? m.synthesis ?? undefined,
    imageUrl:    m.thumbnail ?? m.imageUrl ?? '',
    videoUrl:    m.videoUrl ?? m.recording_url ?? '',
    duration:    m.duration ? `${Math.round(m.duration / 60)} min` : undefined,
    date:        m.started_at ? new Date(m.started_at).toISOString().split('T')[0]
               : m.date ?? new Date().toISOString().split('T')[0],
    client:      m.attendees?.[0]?.name ?? m.client ?? m.organizer?.name ?? 'Inconnu',
    segments:    highlights.slice(0, 5).map((h: any, i: number) => ({
      id:        `${m.id}-h${i}`,
      title:     h.title ?? h.text?.slice(0, 50) ?? `Moment ${i + 1}`,
      timestamp: h.timestamp ?? h.start_time ?? '0:00',
    })),
  }
}

function RecordCard({ record }: { record: TldvRecord }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
      <div className="relative h-36 bg-soren-elevated flex items-center justify-center">
        {record.imageUrl ? (
          <img src={record.imageUrl} alt={record.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-soren-subtle">
            <div className="w-10 h-10 rounded-full bg-soren-card border border-soren-border flex items-center justify-center">
              <Play size={16} className="text-soren-muted ml-0.5" />
            </div>
            <span className="text-[11px]">Aperçu vidéo</span>
          </div>
        )}
        {record.duration && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            <Clock size={9} />
            {record.duration}
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
          {record.date}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm font-bold text-soren-text leading-tight">{record.title}</p>
        {record.description && (
          <p className="text-[11px] text-soren-subtle leading-relaxed">{record.description}</p>
        )}

        {record.synthesis && (
          <div className="bg-soren-elevated rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText size={11} className="text-[#FF4D00]" />
              <span className="text-[10px] font-semibold text-[#FF4D00] uppercase tracking-wide">Synthèse</span>
            </div>
            <p className="text-[11px] text-soren-text leading-relaxed">{record.synthesis}</p>
          </div>
        )}

        {record.segments.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-subtle hover:text-soren-text transition-colors"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {record.segments.length} moments
            </button>
            {expanded && (
              <div className="mt-2 flex flex-col gap-1">
                {record.segments.map(seg => (
                  <div key={seg.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-soren-elevated transition-colors cursor-pointer group">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-soren-elevated group-hover:bg-[#FF4D00]/10">
                      <Play size={9} className="text-soren-muted group-hover:text-[#FF4D00] ml-px" />
                    </div>
                    <p className="text-[11px] font-medium text-soren-text flex-1 truncate">{seg.title}</p>
                    <span className="text-[10px] text-soren-subtle font-mono flex-shrink-0">{seg.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ClientGroup({ client, records }: { client: string; records: TldvRecord[] }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setCollapsed(v => !v)} className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-soren-elevated flex items-center justify-center flex-shrink-0">
          <User size={13} className="text-soren-muted" />
        </div>
        <span className="text-sm font-bold text-soren-text">{client}</span>
        <span className="text-[11px] text-soren-subtle">({records.length})</span>
        {collapsed
          ? <ChevronRight size={13} className="text-soren-muted ml-auto" />
          : <ChevronDown size={13} className="text-soren-muted ml-auto" />
        }
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
          {records.map(r => <RecordCard key={r.id} record={r} />)}
        </div>
      )}
    </div>
  )
}

export default function RecordsView() {
  const [records,    setRecords]    = useState<TldvRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/tldv/meetings')
      const data = await res.json()
      if (data.error && data.meetings.length === 0) {
        setError(data.error)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecords((data.meetings ?? []).map((m: any) => normalizeMeeting(m)))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const byClient = records.reduce<Record<string, TldvRecord[]>>((acc, r) => {
    if (!acc[r.client]) acc[r.client] = []
    acc[r.client].push(r)
    return acc
  }, {})
  const clients = Object.keys(byClient).sort()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-soren-subtle mb-0.5">Bibliothèque · tl;dv</div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 bg-soren-card border border-soren-border text-soren-muted text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-soren-elevated disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-soren-elevated animate-pulse" />
            ))}
          </div>
        ) : error?.includes('TLDV_API_KEY not set') ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-soren-text">Clé API tl;dv manquante</p>
              <p className="text-[11px] text-soren-subtle mt-1">Ajoute <code className="bg-soren-elevated px-1 rounded text-[10px]">TLDV_API_KEY</code> dans les variables d'environnement Vercel</p>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-soren-elevated flex items-center justify-center">
              <Play size={20} className="text-soren-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-soren-text">Aucun enregistrement</p>
              <p className="text-[11px] text-soren-subtle mt-0.5">Les réunions tl;dv apparaîtront ici automatiquement</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {clients.map(client => (
              <ClientGroup key={client} client={client} records={byClient[client]} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
