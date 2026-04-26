'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Check, Search, ChevronDown, AlertTriangle } from 'lucide-react'
import { type Appointment } from './types'
import { type GHLCalendar, type GHLContact } from '@/lib/ghl'

interface Props {
  calendars: GHLCalendar[]
  onClose:   () => void
  onCreated: (appt: Appointment) => void
}

const COLORS = ['#3462EE', '#4A91A8', '#8B5CF6', '#EC4899', '#C8A2C8', '#4ADE80']

function pad(n: number) { return String(n).padStart(2, '0') }

function toLocal(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStart() {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
  return toLocal(d.toISOString())
}
function defaultEnd() {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 2)
  return toLocal(d.toISOString())
}

function cleanName(name: string, idx: number): string {
  const cleaned = name.replace(/\{\{[^}]*\}\}/g, '').replace(/[-–—]+/g, '').trim()
  return cleaned || `Calendrier ${idx + 1}`
}

function contactLabel(c: GHLContact): string {
  const name  = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
  const extra = c.phone || c.email || ''
  return extra ? `${name} · ${extra}` : name
}

export default function NewAppointmentModal({ calendars, onClose, onCreated }: Props) {
  const [calendarId,    setCalendarId]   = useState(calendars[0]?.id ?? '')
  const [showCalDrop,   setShowCalDrop]  = useState(false)
  const calDropRef = useRef<HTMLDivElement>(null)
  const [title,        setTitle]        = useState('')
  const [startTime,    setStartTime]    = useState(defaultStart)
  const [endTime,      setEndTime]      = useState(defaultEnd)
  const [notes,        setNotes]        = useState('')
  const [withMeet,     setWithMeet]     = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [warning,      setWarning]      = useState<string | null>(null) // kept for future use
  const [success,      setSuccess]      = useState(false)

  // Contact selection
  const [contacts,     setContacts]     = useState<GHLContact[]>([])
  const [contactId,    setContactId]    = useState('')
  const [contactQuery, setContactQuery] = useState('')
  const [showDrop,     setShowDrop]     = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Fetch contacts once on mount
  useEffect(() => {
    fetch('/api/contact')
      .then(r => r.json())
      .then((d: { contacts?: GHLContact[] }) => setContacts(d.contacts ?? []))
      .catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current    && !dropRef.current.contains(e.target as Node))    setShowDrop(false)
      if (calDropRef.current && !calDropRef.current.contains(e.target as Node)) setShowCalDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-close toast
  useEffect(() => {
    if (!success) return
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [success, onClose])

  const filteredContacts = contactQuery.length > 0
    ? contacts.filter(c => {
        const q = contactQuery.toLowerCase()
        return (
          (c.contactName ?? '').toLowerCase().includes(q) ||
          (c.firstName   ?? '').toLowerCase().includes(q) ||
          (c.lastName    ?? '').toLowerCase().includes(q) ||
          (c.email       ?? '').toLowerCase().includes(q) ||
          (c.phone       ?? '').toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : contacts.slice(0, 8)

  function selectContact(c: GHLContact) {
    setContactId(c.id)
    setContactQuery(contactLabel(c))
    setShowDrop(false)

    // Auto-fill notes with contact info
    const name  = c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || ''
    const lines = [name, c.phone, c.email].filter(Boolean)
    setNotes(lines.join('\n'))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true); setError(null)
    try {
      const startISO = new Date(startTime).toISOString()
      const endISO   = new Date(endTime).toISOString()
      const titleStr = title.trim()
      const notesStr = notes.trim() || undefined

      // 1. Try GHL
      let ghlOk = false
      let ghlId: string | undefined
      if (calendarId) {
        const res  = await fetch('/api/calendar-event', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarId, title: titleStr, startTime: startISO, endTime: endISO, contactId: contactId || undefined, notes: notesStr }),
        })
        const data = await res.json() as { event?: { id?: string }; error?: string }
        if (res.ok) { ghlOk = true; ghlId = data.event?.id }
        else        { console.warn('[GHL] create failed:', data.error ?? res.status) }
      }

      // 2. Create in Google Calendar (with Meet link)
      const gRes  = await fetch('/api/google-events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleStr, startTime: startISO, endTime: endISO, notes: notesStr, withMeet }),
      })
      const gData = await gRes.json() as { event?: { id?: string }; meetLink?: string | null }

      // Store GHL↔Google mapping for deletion sync
      const googleEventId = gData.event?.id
      if (ghlId && googleEventId) {
        fetch('/api/calendar-event/link', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ghlId, googleEventId }),
        }).catch(console.error)
      }

      const cal      = calendars.find(c => c.id === calendarId)
      const colorIdx = calendars.findIndex(c => c.id === calendarId)
      onCreated({
        id:           ghlId ?? (gData.event?.id ? `google-${gData.event.id}` : `new-${Date.now()}`),
        calendarId:   calendarId || 'google',
        title:        titleStr,
        contactName:  contactQuery || '—',
        startTime:    startISO,
        endTime:      endISO,
        status:       'confirmed',
        calendarName: ghlOk && cal ? cleanName(cal.name, colorIdx) : 'Google Calendar',
        notes:        notesStr ?? null,
        color:        ghlOk ? COLORS[colorIdx % COLORS.length] : '#34A853',
        source:       ghlOk ? 'ghl' : 'google',
        meetLink:     gData.meetLink ?? null,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-2xl bg-soren-elevated border-0 text-sm text-soren-text placeholder:text-[#BCBCB8] focus:outline-none focus:ring-2 focus:ring-[#111111]/15 transition-all'
  const canSave  = title.trim().length > 0 && calendarId.length > 0 && !saving

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-soren-sidebar text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl">
          <Check size={14} className="text-[#C8F135]" />
          {warning ? 'RDV créé dans Google Calendar' : 'RDV créé avec succès'}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-soren-card rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <h2 className="text-[15px] font-bold text-soren-text">Nouveau rendez-vous</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="h-px bg-[#F0F0EE] mx-6" />

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* CALENDRIER */}
          <Field label="Calendrier">
            {calendars.length > 0 ? (
              <div className="relative" ref={calDropRef}>
                <button
                  type="button"
                  onClick={() => setShowCalDrop(v => !v)}
                  className={inputCls + ' flex items-center justify-between cursor-pointer text-left'}
                >
                  <span className="truncate">
                    {calendars.find(c => c.id === calendarId)
                      ? cleanName(calendars.find(c => c.id === calendarId)!.name, calendars.findIndex(c => c.id === calendarId))
                      : 'Sélectionner…'}
                  </span>
                  <ChevronDown size={13} className={`text-soren-subtle flex-shrink-0 transition-transform ${showCalDrop ? 'rotate-180' : ''}`} />
                </button>

                {showCalDrop && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    {calendars.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => { setCalendarId(c.id); setShowCalDrop(false) }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors border-b border-[#F5F5F0] last:border-0 ${
                          c.id === calendarId
                            ? 'font-semibold text-soren-text bg-soren-elevated'
                            : 'font-normal text-soren-muted hover:bg-[#F9F9F7] hover:text-soren-text'
                        }`}
                      >
                        {cleanName(c.name, i)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={inputCls + ' text-soren-subtle'}>Calendrier principal</div>
            )}
          </Field>

          {/* CONTACT */}
          <Field label="Contact">
            <div className="relative" ref={dropRef}>
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCBCB8] pointer-events-none" />
                <input
                  type="text"
                  value={contactQuery}
                  onChange={e => { setContactQuery(e.target.value); setContactId(''); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Rechercher un contact…"
                  className={inputCls + ' pl-9'}
                />
              </div>

              {showDrop && filteredContacts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => selectContact(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-soren-elevated transition-colors border-b border-[#F5F5F0] last:border-0"
                    >
                      <p className="text-[13px] font-semibold text-soren-text leading-snug">
                        {c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                      </p>
                      {(c.phone || c.email) && (
                        <p className="text-[11px] text-soren-subtle">{c.phone || c.email}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* TITRE */}
          <Field label="Titre">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Appel découverte — Jean Dupont"
              className={inputCls}
            />
          </Field>

          {/* DÉBUT / FIN */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Fin">
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* NOTES */}
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Nom, téléphone, email…"
              className={inputCls + ' h-24 resize-none'}
            />
          </Field>

          {/* GOOGLE MEET TOGGLE */}
          <button
            type="button"
            onClick={() => setWithMeet(v => !v)}
            className="flex items-center gap-2.5 group"
          >
            <div className={`w-8 h-4.5 rounded-full relative transition-colors ${withMeet ? 'bg-[#1A73E8]' : 'bg-[#D1D5DB]'}`} style={{ height: 18, width: 32 }}>
              <div
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-soren-card shadow transition-transform"
                style={{ transform: withMeet ? 'translateX(15px)' : 'translateX(2px)' }}
              />
            </div>
            <span className="text-[12px] font-medium text-soren-muted group-hover:text-soren-text transition-colors select-none">
              Créer un lien Google Meet
            </span>
          </button>

          {warning && (
            <div className="bg-[#FFFBEB] rounded-xl px-4 py-2.5 flex items-start gap-2">
              <AlertTriangle size={13} className="text-[#F59E0B] mt-0.5 shrink-0" />
              <p className="text-xs text-[#92400E]">{warning}</p>
            </div>
          )}

          {error && (
            <div className="bg-[#FEF2F2] rounded-xl px-4 py-2.5">
              <p className="text-xs text-[#EF4444]">{error}</p>
            </div>
          )}
        </div>

        <div className="h-px bg-[#F0F0EE] mx-6" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-soren-muted hover:text-soren-text transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 bg-soren-sidebar text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Créer le RDV
          </button>
        </div>

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-soren-subtle uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}
