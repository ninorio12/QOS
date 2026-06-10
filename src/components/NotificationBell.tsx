'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { activityMeta } from '@/components/agentic/doctrine'

type Activity = {
  id: string; actorType: string; actorId: string; eventType: string
  entityType?: string; entityId?: string; summary: string; source?: string
  createdAt: string
}

const SEEN_KEY = 'dataos:notif:lastSeen'

// Événements à faible signal — exclus de l'historique « important » de la cloche.
const NOISE = new Set([
  'memory.update', 'heartbeat', 'task.comment',
  'performance.task_updated', 'performance.task_created',
])
const isImportant = (ev: string) => !NOISE.has(ev)

// Libellés/couleurs lisibles pour les événements métier (sinon fallback doctrine).
const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'lead.created':            { label: 'Nouveau lead', color: '#3462EE' },
  'lead.lost':               { label: 'Lead perdu',   color: '#DC2626' },
  'perdu':                   { label: 'Lead perdu',   color: '#DC2626' },
  'r1_booke':                { label: 'R1 booké',     color: '#16A34A' },
  'prospection.temperature': { label: 'Température',   color: '#D97706' },
  'created':                 { label: 'Créé',         color: '#3462EE' },
  'note':                    { label: 'Note',         color: '#6B7280' },
  'knowledge':               { label: 'Connaissance', color: '#8B5CF6' },
}
function eventMeta(ev: string): { label: string; color: string } {
  if (EVENT_LABELS[ev]) return EVENT_LABELS[ev]
  const m = activityMeta(ev)
  return { label: m.label, color: m.color }
}

function fmtTime(s: string) {
  const d = new Date(s)
  const now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function NotificationBell() {
  const [open, setOpen]         = useState(false)
  const [lastSeen, setLastSeen] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const raw   = (useQuery(api.osActivities.list, { limit: 80 }) ?? []) as Activity[]
  const items = useMemo(() => raw.filter(a => isImportant(a.eventType)).slice(0, 20), [raw])

  // Dernier « vu » persisté (par navigateur).
  useEffect(() => {
    try { setLastSeen(localStorage.getItem(SEEN_KEY) ?? '') } catch { /* noop */ }
  }, [])

  const unread = useMemo(() => items.filter(a => a.createdAt > lastSeen).length, [items, lastSeen])

  function markSeen() {
    const newest = items[0]?.createdAt ?? new Date().toISOString()
    setLastSeen(newest)
    try { localStorage.setItem(SEEN_KEY, newest) } catch { /* noop */ }
  }

  // Fermer au clic dehors.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { if (!open) markSeen(); setOpen(o => !o) }}
        className="w-8 h-8 rounded-full bg-[#E4E6E1] flex items-center justify-center hover:bg-[#D8DAD5] transition-colors relative"
      >
        <Bell size={14} className="text-soren-muted" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#FF4D00] flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[360px] bg-soren-card border border-soren-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-soren-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-soren-text">Activité importante</p>
              {items.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF4D00] text-white">
                  {items.length}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              LIVE
            </span>
          </div>

          {/* List */}
          <div className="divide-y divide-[#F5F5F0] max-h-[380px] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-soren-subtle">
                Aucune activité importante pour le moment.
              </div>
            )}
            {items.map(a => {
              const meta  = eventMeta(a.eventType)
              const isNew = a.createdAt > lastSeen
              return (
                <a
                  key={a.id}
                  href="/logs"
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F9F9F7] transition-colors ${isNew ? '' : 'opacity-55'}`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-[10px] text-soren-subtle truncate">{a.actorId}</span>
                      <span className="text-[10px] text-soren-subtle ml-auto flex-shrink-0">{fmtTime(a.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[#374151] leading-4">{a.summary}</p>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-soren-border">
            <a href="/logs" className="text-xs text-[#FF4D00] hover:text-[#d94300] font-medium transition-colors">
              Voir tout l&apos;historique →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
