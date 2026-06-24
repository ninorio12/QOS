'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Check, Search, ChevronDown, AlertTriangle, User, Bot, Mail } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { type Appointment, type EventType, TYPE_META } from './types'
import { type GHLCalendar, type GHLContact } from '@/lib/ghl'

type PickKind = 'client' | 'team'
type PickItem = { id: string; name: string; sub: string; kind: PickKind; phone?: string; email?: string }
type Attendee = { id: string; name: string; email: string; kind: PickKind }
const isEmail = (e: string) => /.+@.+\..+/.test(e)

interface Props {
  calendars: GHLCalendar[]
  onClose:   () => void
  onCreated: (appt: Appointment) => void
  initialType?:        EventType
  initialTitle?:       string
  initialContactName?: string
  initialContactId?:   string
  teamOnly?:           boolean   // R1 prospection : seuls les membres d'équipe peuvent être ajoutés
}

const TYPE_ORDER: EventType[] = ['r1', 'r2', 'follow_up', 'interne', 'client', 'autre']

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

export default function NewAppointmentModal({ calendars, onClose, onCreated, initialType, initialTitle, initialContactName, initialContactId, teamOnly = false }: Props) {
  const [calendarId,    setCalendarId]   = useState(calendars[0]?.id ?? '')
  const [showCalDrop,   setShowCalDrop]  = useState(false)
  const calDropRef = useRef<HTMLDivElement>(null)
  const [eventType,    setEventType]    = useState<EventType>(initialType ?? 'autre')
  const [title,        setTitle]        = useState(initialTitle ?? '')
  const [startTime,    setStartTime]    = useState(defaultStart)
  const [endTime,      setEndTime]      = useState(defaultEnd)
  const [notes,        setNotes]        = useState('')
  const [withMeet,     setWithMeet]     = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [warning,      setWarning]      = useState<string | null>(null) // kept for future use
  const [success,      setSuccess]      = useState(false)

  // Participants : 1 contact (max) + N membres d'équipe
  const [contacts,     setContacts]     = useState<GHLContact[]>([])
  const [attendees,    setAttendees]    = useState<Attendee[]>(
    (initialContactId || initialContactName)
      ? [{ id: initialContactId ?? '', name: initialContactName ?? '', email: '', kind: 'client' }]
      : []
  )
  const [query,        setQuery]        = useState('')
  const [showDrop,     setShowDrop]     = useState(false)
  const [pickFilter,   setPickFilter]   = useState<'all' | PickKind>(teamOnly ? 'team' : 'all')
  const dropRef = useRef<HTMLDivElement>(null)

  // Membres de l'équipe = profils VividFlow (table users), pas les agents IA
  const teamProfiles = (useQuery(api.users.list, {}) ?? []) as { id: string; name: string; role: string; email?: string }[]

  // ── Disponibilité des invités (FreeBusy Google) ──
  const [busyMap,      setBusyMap]      = useState<Record<string, { busy: boolean; error?: string }>>({})
  const [checkingBusy, setCheckingBusy] = useState(false)
  const [overrideBusy, setOverrideBusy] = useState(false)
  useEffect(() => {
    const emails = attendees.map(a => a.email.trim().toLowerCase()).filter(isEmail)
    setOverrideBusy(false)
    const s = new Date(startTime), e = new Date(endTime)
    if (!emails.length || isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) { setBusyMap({}); return }
    let cancelled = false
    setCheckingBusy(true)
    const t = setTimeout(() => {
      fetch('/api/calendar/freebusy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, start: s.toISOString(), end: e.toISOString() }),
      })
        .then(r => r.json())
        .then((d: { results?: Record<string, { busy: boolean; error?: string }> }) => { if (!cancelled) setBusyMap(d.results ?? {}) })
        .catch(() => { if (!cancelled) setBusyMap({}) })
        .finally(() => { if (!cancelled) setCheckingBusy(false) })
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [startTime, endTime, attendees])
  const conflicts = attendees.filter(a => isEmail(a.email) && busyMap[a.email.trim().toLowerCase()]?.busy)

  // Fetch contacts once on mount + complète l'email du contact pré-rempli (R1)
  useEffect(() => {
    fetch('/api/contact')
      .then(r => r.json())
      .then((d: { contacts?: GHLContact[] }) => {
        const list = d.contacts ?? []
        setContacts(list)
        setAttendees(prev => prev.map(a => {
          if (a.kind !== 'client' || a.email) return a
          const m = list.find(c => c.id === a.id)
            || list.find(c => (c.contactName || `${c.firstName ?? ''} ${c.lastName ?? ''}`).trim().toLowerCase() === a.name.toLowerCase())
          return m?.email ? { ...a, email: m.email, id: a.id || m.id } : a
        }))
      })
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

  // Fermeture clavier (Échap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const clientItems: PickItem[] = contacts.map(c => ({
    id:    c.id,
    kind:  'client',
    name:  c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—',
    sub:   c.email || c.phone || '',
    phone: c.phone || undefined,
    email: c.email || undefined,
  }))
  const teamItems: PickItem[] = teamProfiles.map(u => ({ id: u.id, kind: 'team', name: u.name, sub: u.email || u.role, email: u.email || undefined }))
  const pool: PickItem[] = teamOnly ? teamItems : pickFilter === 'client' ? clientItems : pickFilter === 'team' ? teamItems : [...teamItems, ...clientItems]
  const filteredItems = (query.length > 0
    ? pool.filter(it => `${it.name} ${it.sub} ${it.phone ?? ''} ${it.email ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : pool
  ).filter(it => !attendees.some(a => a.kind === it.kind && a.id === it.id)).slice(0, 8)

  function selectItem(it: PickItem) {
    setAttendees(prev => it.kind === 'client'
      ? [{ id: it.id, name: it.name, email: it.email ?? '', kind: 'client' }, ...prev.filter(a => a.kind !== 'client')]
      : (prev.some(a => a.kind === 'team' && a.id === it.id) ? prev : [...prev, { id: it.id, name: it.name, email: it.email ?? '', kind: 'team' }]))
    setQuery(''); setShowDrop(false)
  }
  function removeAttendee(a: Attendee) {
    setAttendees(prev => prev.filter(x => !(x.kind === a.kind && x.id === a.id)))
  }
  function updateAttendeeEmail(a: Attendee, email: string) {
    setAttendees(prev => prev.map(x => (x.kind === a.kind && x.id === a.id) ? { ...x, email } : x))
  }
  void contactLabel

  async function handleSave() {
    if (!title.trim()) return
    // Vérif dispo : on bloque si un invité est déjà occupé (override au 2e clic).
    if (conflicts.length && !overrideBusy) {
      setError(`${conflicts.map(c => c.name || c.email).join(', ')} ${conflicts.length > 1 ? 'sont déjà occupé·es' : 'est déjà occupé·e'} sur ce créneau. Choisis un autre horaire — ou reclique sur Créer pour forcer.`)
      setOverrideBusy(true)
      return
    }
    setSaving(true); setError(null)
    try {
      const startISO = new Date(startTime).toISOString()
      const endISO   = new Date(endTime).toISOString()
      const titleStr = title.trim()
      const notesStr = notes.trim() || undefined

      const clientAtt   = attendees.find(a => a.kind === 'client')
      const guestEmails = attendees.map(a => a.email.trim()).filter(isEmail)
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

      // 1. Try GHL
      let ghlOk = false
      let ghlId: string | undefined
      if (calendarId) {
        const res  = await fetch('/api/calendar-event', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarId, title: titleStr, startTime: startISO, endTime: endISO, contactId: clientAtt?.id || undefined, notes: notesStr, tz }),
        })
        const data = await res.json() as { event?: { id?: string }; error?: string }
        if (res.ok) { ghlOk = true; ghlId = data.event?.id }
        else        { console.warn('[GHL] create failed:', data.error ?? res.status) }
      }

      // 2. Create in Google Calendar (Meet + invitations envoyées aux participants)
      const gRes  = await fetch('/api/google-events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleStr, startTime: startISO, endTime: endISO, notes: notesStr, withMeet, attendees: guestEmails, tz, type: eventType }),
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

      // Only consider the RDV created if GHL or Google actually persisted an event
      if (!ghlOk && !googleEventId) {
        setError('Le rendez-vous n\'a pas pu être créé (GHL et Google indisponibles).')
        return
      }

      const cal      = calendars.find(c => c.id === calendarId)
      const colorIdx = calendars.findIndex(c => c.id === calendarId)
      onCreated({
        id:           ghlId ?? (googleEventId ? `google-${googleEventId}` : `new-${Date.now()}`),
        calendarId:   calendarId || 'google',
        title:        titleStr,
        contactName:  clientAtt?.name ?? attendees[0]?.name ?? '—',
        startTime:    startISO,
        endTime:      endISO,
        status:       'confirmed',
        type:         eventType,
        calendarName: ghlOk && cal ? cleanName(cal.name, colorIdx) : 'Google Calendar',
        notes:        notesStr ?? null,
        color:        TYPE_META[eventType].color,
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

  const inputCls = 'w-full px-3.5 py-2 rounded-xl bg-soren-elevated border-0 text-[13px] text-soren-text placeholder:text-[#BCBCB8] focus:outline-none focus:ring-2 focus:ring-[#111111]/15 transition-all'
  const canSave  = title.trim().length > 0 && !saving

  if (success) {
    if (typeof document === 'undefined') return null
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-soren-sidebar text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl">
          <Check size={14} className="text-[#FF4D00]" />
          {warning ? 'RDV créé dans Google Calendar' : 'RDV créé avec succès'}
        </div>
      </div>,
      document.body,
    )
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-soren-card rounded-2xl shadow-2xl w-full max-w-[400px] max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-[14px] font-bold text-soren-text">Nouveau rendez-vous</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="h-px bg-[#F0F0EE] mx-5" />

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">

          {/* TYPE */}
          <Field label="Type">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_ORDER.map(t => {
                const active = eventType === t
                const meta   = TYPE_META[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEventType(t)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border ${
                      active
                        ? ''
                        : 'bg-transparent border-[#E8E8E4] text-[#6B6B66] hover:bg-soren-elevated dark:bg-soren-elevated dark:border-soren-border dark:text-soren-muted dark:hover:brightness-125'
                    }`}
                    style={active ? { backgroundColor: meta.color, borderColor: meta.color, color: '#fff' } : undefined}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </Field>

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

          {/* PARTICIPANTS — 1 contact + N membres d'équipe, invités par email */}
          <Field label={teamOnly ? 'Membres de l’équipe' : 'Participants'}>
            <div className={`flex items-center gap-1 mb-1.5 ${teamOnly ? 'hidden' : ''}`}>
              {([['all', 'Tous'], ['client', 'Clients'], ['team', 'Équipe']] as ['all' | PickKind, string][]).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPickFilter(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    pickFilter === k ? 'bg-soren-sidebar text-white' : 'bg-soren-elevated text-soren-muted hover:text-soren-text'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Participants sélectionnés */}
            {attendees.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {attendees.map(a => (
                  <div key={a.kind + a.id} className="flex items-center gap-2 bg-soren-elevated rounded-xl px-2.5 py-1.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: a.kind === 'team' ? '#8B5CF618' : '#11111110' }}>
                      {a.kind === 'team' ? <Bot size={12} className="text-[#8B5CF6]" /> : <User size={12} className="text-soren-muted" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-soren-text leading-tight truncate">{a.name || 'Sans nom'}</p>
                      {a.email ? (
                        <p className="text-[10px] text-soren-subtle truncate flex items-center gap-1"><Mail size={9} className="flex-shrink-0" /> {a.email}</p>
                      ) : (
                        <input
                          type="email"
                          value={a.email}
                          onChange={e => updateAttendeeEmail(a, e.target.value)}
                          placeholder="email pour l'invitation…"
                          className="mt-0.5 w-full bg-soren-card rounded-md px-2 py-1 text-[11px] text-soren-text placeholder:text-[#BCBCB8] outline-none border border-soren-border"
                        />
                      )}
                    </div>
                    {(() => {
                      const st = isEmail(a.email) ? busyMap[a.email.trim().toLowerCase()] : undefined
                      if (!isEmail(a.email)) return null
                      if (checkingBusy && !st) return <span className="text-[9.5px] text-soren-subtle flex-shrink-0">…</span>
                      if (!st) return null
                      if (st.error) return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF] flex-shrink-0" title={st.error}>dispo inconnue</span>
                      return st.busy
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] flex-shrink-0">Occupé</span>
                        : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] flex-shrink-0">Libre</span>
                    })()}
                    <button type="button" onClick={() => removeAttendee(a)} className="text-soren-subtle hover:text-[#EF4444] flex-shrink-0 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative" ref={dropRef}>
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCBCB8] pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  placeholder={pickFilter === 'team' ? 'Ajouter un membre…' : pickFilter === 'client' ? 'Ajouter le contact…' : 'Ajouter un participant…'}
                  className={inputCls + ' pl-9'}
                />
              </div>

              {showDrop && filteredItems.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-soren-card border border-soren-border rounded-2xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredItems.map(it => (
                    <button
                      key={it.kind + it.id}
                      onMouseDown={() => selectItem(it)}
                      className="w-full text-left px-3.5 py-2 hover:bg-soren-elevated transition-colors border-b border-[#F5F5F0] last:border-0 flex items-center gap-2.5"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: it.kind === 'team' ? '#8B5CF618' : '#11111110' }}
                      >
                        {it.kind === 'team'
                          ? <Bot size={12} className="text-[#8B5CF6]" />
                          : <User size={12} className="text-soren-muted" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-soren-text leading-snug truncate">{it.name}</p>
                        {it.sub && <p className="text-[11px] text-soren-subtle truncate">{it.sub}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-soren-subtle mt-1">
              1 contact + autant de membres d'équipe que voulu. L'invitation Google est envoyée à chaque email renseigné.
            </p>
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
              className={inputCls + ' h-16 resize-none'}
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

        <div className="h-px bg-[#F0F0EE] mx-5" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3">
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
    </div>,
    document.body,
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
