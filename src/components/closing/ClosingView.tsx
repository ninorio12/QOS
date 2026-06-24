'use client'

import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Save, Phone, FileText, ShieldAlert, MessageSquareQuote, List, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Check, Trophy, XCircle, UserMinus, CalendarClock } from 'lucide-react'
import { NONVENTE_REASONS } from '@/lib/lostReasons'

// Date du RDV : « 25 juin » ou « 25 juin 14:30 » si l'heure est présente.
function fmtRdv(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  const date = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const hasTime = /[T ]\d{2}:\d{2}/.test(d)
  return hasTime ? `${date} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : date
}

type Intake = {
  companyType?: string; headcount?: string; monthlyRevenue?: string; costliestFunction?: string
  repetitiveCost?: string; whyNow?: string; timing?: string; budget?: string; createdAt?: string
}
type Call = {
  id: string; title?: string; date?: string | null; kind: string; name: string
  company?: string | null; initials: string; prepReady: boolean
  contactId?: string | null
  contact?: { id: string; fullName: string; company?: string; email?: string; phone?: string; role?: string; niche?: string; canton?: string } | null
  intake?: Intake | null; notes?: string | null
  objections?: string[]; wonObjection?: string | null; r1Synthesis?: string | null
  bioMarkdown?: string | null; bioGeneratedAt?: string | null; bioBy?: string | null
  bookingAnswers?: { q: string; a: string }[]
  quizAnswers?: { q: string; a: string }[]
  calendarLabel?: string | null; calendarSlug?: string | null; calendarColor?: string | null
}

// Grille de Q/R (questionnaire) : question en gris, réponse(s) en puces/texte léger, codes humanisés.
// Jeux de questions canoniques de chaque quiz (affichés en entier, même sans réponse).
const QUIZ_DIAGNOSTIC = [
  "Dans quel secteur évolue ton entreprise ?",
  "Quel est ton chiffre d'affaires mensuel ?",
  "Quel est ton rôle dans l'entreprise ?",
  "À quelle échéance souhaitez-vous engager ce type de transformation dans votre entreprise ?",
]
const QUIZ_CONFIRMATION = [
  "Quel type d'entreprise dirigez-vous ?",
  "Combien de personnes travaillent aujourd'hui dans l'entreprise ?",
  "Quel est votre chiffre d'affaires mensuel approximatif ?",
  "Quelle fonction vous coûte le plus de temps, d'argent ou d'énergie aujourd'hui ?",
  "À combien estimez-vous le coût mensuel ou le temps humain mobilisé sur ces tâches répétitives ?",
  "Pourquoi voulez-vous installer des agents IA maintenant ?",
  "Si l'audit révèle une opportunité claire, quand aimeriez-vous lancer une première installation ?",
  "Avez-vous déjà prévu un budget pour intégrer l'IA dans vos opérations ?",
  "Votre nom complet",
  "Votre société",
]
const QUIZ_BOOKING = [
  "Quel est votre activité ?",
  "Aujourd'hui, comment trouvez-vous vos nouveaux clients ?",
  "Combien de mandats exclusifs votre agence signe-t-elle en moyenne par mois ?",
  "Combien d'agents commerciaux ou de collaborateurs travaillent actuellement dans votre agence ?",
]
// Normalise une question pour matcher réponse captée <-> question canonique.
const normQ = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// Une réponse en chips (multi) ou texte (simple), codes humanisés. Vide si pas de réponse.
function AnswerValue({ a }: { a?: string }) {
  if (!a) return <span className="text-soren-subtle">&nbsp;</span>
  const parts = a.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean)
  return parts.length > 1
    ? <div className="flex flex-wrap gap-1">{parts.map((p, j) => <span key={j} className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full bg-soren-elevated text-soren-text">{pretty(p)}</span>)}</div>
    : <span className="text-[12px] font-medium text-soren-text">{pretty(parts[0] ?? '')}</span>
}

// Accordéon d'un quiz : toutes ses questions, réponse si captée, vide sinon. Déroulant.
function QuizAccordion({ title, color, questions, answerMap, defaultOpen = false }: {
  title: string; color: string; questions: string[]; answerMap: Map<string, string>; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const answered = questions.filter(q => answerMap.get(normQ(q))).length
  return (
    <div className="border border-soren-border rounded-2xl mt-3 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-soren-elevated/50 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-[12.5px] text-soren-text"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />{title}</span>
        <span className="flex items-center gap-2 text-[11px] text-soren-subtle">{answered}/{questions.length} répondu{answered > 1 ? 's' : ''}{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {questions.map((q, i) => (
            <div key={i} className="bg-soren-elevated/40 border border-soren-border rounded-xl p-3 flex flex-col h-full">
              <div className="text-[10.5px] text-soren-subtle leading-snug mb-1.5">{q}</div>
              <div className="leading-snug min-h-[18px] mt-auto pt-1.5 border-t border-soren-border/60"><AnswerValue a={answerMap.get(normQ(q))} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Humanise les codes bruts iClosed (issue d'appel, etc.) en libellés lisibles.
const ENUM_FR: Record<string, string> = {
  NO_SHOW: 'No-show', NO_SALE: 'Pas de vente', SALE: 'Vente', WON: 'Gagné', LOST: 'Perdu',
  FOLLOW_UP: 'À relancer', FOLLOWUP: 'À relancer', RESCHEDULED: 'Reprogrammé', CANCELLED: 'Annulé',
  CANCELED: 'Annulé', DISQUALIFIED: 'Non qualifié', SHOW: 'Présent', BOOKED: 'Booké', PENDING: 'En attente',
}
const pretty = (s: string) => ENUM_FR[(s || '').trim().toUpperCase()] ?? s

// Rendu inline du gras markdown (**x**).
// Brief closer : 4 cards persona ÉDITABLES (Qui est X, Son caractère, Ses attentes, Ses peurs).
const BRIEF_KEYS: { key: string; match: RegExp }[] = [
  { key: 'qui',       match: /qui es/i },
  { key: 'caractere', match: /caract/i },
  { key: 'attentes',  match: /attente|motiv/i },
  { key: 'peurs',     match: /peur|frein/i },
]
const briefTitle = (key: string, firstName: string) =>
  key === 'qui' ? `Qui est ${firstName} ?` : key === 'caractere' ? 'Son caractère' : key === 'attentes' ? 'Ses attentes' : 'Ses peurs'

function parseBrief(md: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!md) return out
  md.split(/^##\s+/m).map(s => s.trim()).filter(Boolean).forEach(chunk => {
    const nl = chunk.indexOf('\n')
    const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim()
    const body = (nl === -1 ? '' : chunk.slice(nl + 1)).trim()
    const hit = BRIEF_KEYS.find(k => k.match.test(title))
    if (hit) out[hit.key] = body
  })
  return out
}

function EditableBrief({ callId, md, name }: { callId: string; md: string; name: string }) {
  const saveBio = useMutation(api.closing.saveBio)
  const firstName = ((name || '').trim().split(/\s+/)[0] || name || 'ce lead').replace(/\[.*\]/, '').trim()
  const [vals, setVals] = useState<Record<string, string>>(() => parseBrief(md))
  useEffect(() => { setVals(parseBrief(md)) }, [callId]) // eslint-disable-line react-hooks/exhaustive-deps
  const persist = (next: Record<string, string>) => {
    const newMd = BRIEF_KEYS.map(k => `## ${briefTitle(k.key, firstName)}\n${(next[k.key] || '').trim()}`).join('\n\n')
    saveBio({ id: callId as never, bioMarkdown: newMd, by: 'manual' })
  }
  return (
    <div className="flex flex-col gap-3.5">
      {BRIEF_KEYS.map(k => (
        <div key={k.key} className="rounded-2xl border border-soren-border bg-soren-card p-4 focus-within:border-[#C8CBD0] transition-colors">
          <div className="text-[13px] font-bold text-soren-text mb-2">{briefTitle(k.key, firstName)}</div>
          <textarea
            value={vals[k.key] ?? ''}
            onChange={e => setVals(v => ({ ...v, [k.key]: e.target.value }))}
            onBlur={() => persist(vals)}
            placeholder="- À compléter…"
            className="w-full bg-transparent text-[12.5px] leading-[1.8] text-soren-text resize-y outline-none min-h-[110px] placeholder:text-soren-subtle" />
        </div>
      ))}
    </div>
  )
}

function fmtTime(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt.getTime()) || !/[T ]\d{2}:\d{2}/.test(d) ? '' : dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Vue Agenda : les R1/R2 bookés sur un calendrier mensuel, cliquables vers la prep.
function CalendarAgenda({ calls, onPick }: { calls: Call[]; onPick: (id: string) => void }) {
  const now = new Date()
  const [cur, setCur] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })
  const first = new Date(cur.y, cur.m, 1)
  const startDow = (first.getDay() + 6) % 7 // lundi = 0
  const nDays = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const byDay = new Map<number, Call[]>()
  for (const c of calls) {
    if (!c.date) continue
    const d = new Date(c.date)
    if (d.getFullYear() === cur.y && d.getMonth() === cur.m) {
      const k = d.getDate(); const arr = byDay.get(k) ?? []; arr.push(c); byDay.set(k, arr)
    }
  }
  const isToday = (day: number) => now.getFullYear() === cur.y && now.getMonth() === cur.m && now.getDate() === day
  const monthLabel = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const btn = "w-8 h-8 rounded-lg border border-soren-border bg-soren-card flex items-center justify-center text-soren-muted hover:border-[#C8CBD0]"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-bold capitalize">{monthLabel}</div>
        </div>
        <div className="flex gap-1.5">
          <button className={btn} onClick={() => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })}><ChevronLeft size={16} /></button>
          <button className="px-3 h-8 rounded-lg border border-soren-border bg-soren-card text-[12px] font-medium text-soren-muted hover:border-[#C8CBD0]" onClick={() => setCur({ y: now.getFullYear(), m: now.getMonth() })}>Aujourd&apos;hui</button>
          <button className={btn} onClick={() => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-soren-border border border-soren-border rounded-xl overflow-hidden">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="bg-soren-elevated text-[10px] font-semibold uppercase tracking-wide text-soren-subtle text-center py-2">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="bg-soren-card min-h-[96px] p-1.5">
            {day && (
              <>
                <div className={`text-[11px] font-semibold mb-1 ${isToday(day) ? 'text-[#FF4D00]' : 'text-soren-muted'}`}>{day}</div>
                <div className="flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map(c => (
                    <button key={c.id} onClick={() => onPick(c.id)} title={`${c.calendarLabel ?? c.kind} · ${c.name}`}
                      className={`text-left text-[10px] font-semibold px-1.5 py-1 rounded-md truncate hover:brightness-95 border-l-2 ${c.calendarColor ? '' : c.kind === 'R2' ? 'bg-emerald-100 text-emerald-700 border-emerald-400' : 'bg-blue-100 text-blue-700 border-blue-400'}`}
                      style={c.calendarColor ? { background: c.calendarColor + '1A', borderColor: c.calendarColor, color: '#1A1A1E' } : undefined}>
                      {fmtTime(c.date) && <span className="opacity-60">{fmtTime(c.date)} </span>}{c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Issue de l'appel (clôture R1/R2) : 4 boutons. Gagné ouvre le mini-form montant (même garde que le pipeline),
// Perdu un select de raison (mêmes raisons de non-vente que le reste du repo), No-show une confirmation simple,
// Reprogrammer un champ date. Réutilise la mutation Convex closing.recordOutcome.
function OutcomePanel({ call }: { call: Call }) {
  const recordOutcome = useMutation(api.closing.recordOutcome)
  const [mode, setMode] = useState<null | 'gagne' | 'perdu' | 'reprogrammer'>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Gagné
  const [dealValue, setDealValue] = useState('')
  const [amountTbd, setAmountTbd] = useState(false)
  const [wonObjection, setWonObjection] = useState('')
  // Reprogrammer
  const [newDate, setNewDate] = useState('')

  const reset = () => { setMode(null); setErr(''); setDealValue(''); setAmountTbd(false); setWonObjection(''); setNewDate('') }

  async function submit(args: Parameters<typeof recordOutcome>[0]) {
    setBusy(true); setErr('')
    try { await recordOutcome(args); reset() }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur : issue non enregistrée.") }
    finally { setBusy(false) }
  }

  function confirmGagne() {
    const raw = dealValue.replace(',', '.').trim()
    const parsed = parseFloat(raw)
    const hasValue = raw !== '' && Number.isFinite(parsed) && parsed > 0
    // Anti "client à 0 CHF" : montant > 0 OBLIGATOIRE sauf si « Montant à définir » coché. On n'envoie jamais 0 muet.
    if (!hasValue && !amountTbd) { setErr('Indiquez un montant supérieur à 0 CHF, ou cochez « Montant à définir ».'); return }
    submit({ callId: call.id as never, outcome: 'gagne', dealValue: hasValue ? parsed : undefined, amountTbd, wonObjection: wonObjection || undefined })
  }

  const btn = (active: boolean, color: string) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${active ? `${color} text-white border-transparent` : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-[#C8CBD0]'}`

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-soren-muted mb-3">Issue de l&apos;appel<span className="flex-1 h-px bg-soren-border" /></div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'gagne' ? null : 'gagne') }} className={btn(mode === 'gagne', 'bg-[#16A34A]')}><Trophy size={14} />Gagné</button>
        <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'perdu' ? null : 'perdu') }} className={btn(mode === 'perdu', 'bg-[#DC2626]')}><XCircle size={14} />Perdu</button>
        <button disabled={busy} onClick={() => submit({ callId: call.id as never, outcome: 'no_show' })} className={btn(false, '')}><UserMinus size={14} />No-show</button>
        <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'reprogrammer' ? null : 'reprogrammer') }} className={btn(mode === 'reprogrammer', 'bg-[#2563EB]')}><CalendarClock size={14} />Reprogrammer</button>
      </div>

      {err && <div className="mt-3 text-[12px] font-medium text-[#DC2626] bg-[#FEE2E2]/50 border border-[#FECACA] rounded-lg px-3 py-2">{err}</div>}

      {mode === 'gagne' && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-soren-muted mb-1.5">Montant du deal (CHF)</label>
            <input type="number" autoFocus placeholder="ex: 3500" value={dealValue} disabled={amountTbd}
              onChange={e => setDealValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmGagne()}
              className="w-full bg-soren-card border border-soren-border rounded-xl px-3 py-2.5 text-[15px] font-bold text-soren-text outline-none focus:border-[#16A34A] disabled:opacity-40" />
            <label className="mt-2 flex items-center gap-2 text-[12px] font-medium text-soren-text cursor-pointer select-none">
              <input type="checkbox" checked={amountTbd} onChange={e => { setAmountTbd(e.target.checked); if (e.target.checked) setDealValue('') }} className="w-4 h-4 rounded accent-[#16A34A]" />
              Montant à définir
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-soren-muted mb-1.5">Objection surmontée (optionnel)</label>
            <input type="text" placeholder="ex: argent, partenaire…" value={wonObjection} onChange={e => setWonObjection(e.target.value)}
              className="w-full bg-soren-card border border-soren-border rounded-xl px-3 py-2.5 text-[13px] text-soren-text outline-none focus:border-[#16A34A]" />
          </div>
          <button disabled={busy} onClick={confirmGagne} className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:brightness-110 text-white text-[13px] font-bold transition-colors">Clôturer : gagné</button>
        </div>
      )}

      {mode === 'perdu' && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/40 p-4 flex flex-col gap-2">
          <div className="text-[11px] font-semibold text-soren-muted mb-0.5">Raison de la non-vente</div>
          {NONVENTE_REASONS.map(r => {
            const Icon = r.icon
            return (
              <button key={r.code} disabled={busy} onClick={() => submit({ callId: call.id as never, outcome: 'perdu', lostReason: r.code })}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-soren-border bg-soren-card text-left hover:border-[#DC2626] hover:bg-[#FEE2E2]/40 transition-colors">
                <Icon size={16} className="text-[#DC2626] flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-soren-text">{r.label}</span>
                  <span className="block text-[10.5px] text-soren-muted truncate">{r.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {mode === 'reprogrammer' && (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-soren-muted mb-1.5">Nouvelle date</label>
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full bg-soren-card border border-soren-border rounded-xl px-3 py-2.5 text-[13px] font-semibold text-soren-text outline-none focus:border-[#2563EB]" />
          </div>
          <button disabled={busy || !newDate} onClick={() => submit({ callId: call.id as never, outcome: 'reprogrammer', newDate })}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:brightness-110 text-white text-[13px] font-bold transition-colors disabled:opacity-40">Reprogrammer l&apos;appel</button>
        </div>
      )}
    </div>
  )
}

export default function ClosingView() {
  const calls = (useQuery(api.closing.upcomingCalls, {}) ?? null) as Call[] | null
  const [openId, setOpenId] = useState<string | null>(null)
  const saveNote = useMutation(api.closing.saveCallNote)
  const [note, setNote] = useState('')
  const params = useSearchParams()
  const focusContact = params.get('contact')

  // Deep-link ?contact= → sélectionne l'appel de ce contact (bouton "Closing" de la fiche).
  useEffect(() => {
    if (focusContact && calls) {
      const c = calls.find(x => x.contactId === focusContact)
      if (c) setOpenId(c.id)
    }
  }, [focusContact, calls])

  const selected = useMemo(() => calls?.find(c => c.id === openId) ?? calls?.[0] ?? null, [calls, openId])
  useEffect(() => { setNote(selected?.notes ?? '') }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = calls === null
  const [view, setView] = useState<'liste' | 'agenda'>('liste')
  const [search, setSearch] = useState('')
  const filteredCalls = (calls ?? []).filter(c => {
    const t = search.trim().toLowerCase()
    return !t || `${c.name} ${c.company ?? ''}`.toLowerCase().includes(t)
  })

  const viewToggle = (
    <div className="flex bg-soren-elevated border border-soren-border rounded-[10px] p-[3px] text-[12px] font-medium flex-shrink-0">
      <button onClick={() => setView('liste')} className={`px-3 py-1.5 rounded-[7px] inline-flex items-center gap-1.5 ${view === 'liste' ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted'}`}><List size={13} />Liste</button>
      <button onClick={() => setView('agenda')} className={`px-3 py-1.5 rounded-[7px] inline-flex items-center gap-1.5 ${view === 'agenda' ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted'}`}><CalendarDays size={13} />Calendrier</button>
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Onglets Liste / Calendrier — toujours visibles en tête du module Closing. */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
        {viewToggle}
        <span className="text-[12px] text-soren-muted">{loading ? 'Chargement…' : (() => {
          const all = calls ?? []
          const nR2 = all.filter(c => c.kind === 'R2').length
          return `${all.length} call${all.length > 1 ? 's' : ''}${all.length ? ` · ${all.length - nR2} R1 · ${nR2} R2` : ''}`
        })()}</span>
      </div>

      {view === 'agenda' ? (
        <div className="flex-1 overflow-y-auto">
          <CalendarAgenda calls={calls ?? []} onPick={(id) => { setOpenId(id); setView('liste') }} />
        </div>
      ) : (
      <div className="flex-1 grid grid-cols-[300px_1fr] overflow-hidden">
        {/* liste des appels */}
        <div className="border-r border-soren-border overflow-y-auto p-3.5 bg-soren-elevated/40">
          {/* Recherche contact */}
          <div className="flex items-center gap-2 bg-soren-elevated border border-soren-border rounded-xl px-3 py-2 mb-2.5">
            <Search size={13} className="text-soren-subtle flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact…"
              className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-soren-subtle px-2 pb-2.5">
            {loading ? 'Chargement…' : `${filteredCalls.length} appel${filteredCalls.length > 1 ? 's' : ''}`}
          </div>
          {!loading && filteredCalls.length === 0 && (
            <div className="text-[12.5px] text-soren-muted px-2 py-6 leading-relaxed">
              {search ? 'Aucun contact trouvé.' : "Aucun appel. Les R1/R2 arrivent ici dès qu'ils sont bookés sur iClosed."}
            </div>
          )}
          {filteredCalls.map(c => {
            const sel = selected?.id === c.id
            const sub = [c.company, c.date ? `Rendez-vous ${fmtRdv(c.date)}` : null].filter(Boolean).join(' · ')
            return (
              <div key={c.id} role="button" tabIndex={0} onClick={() => setOpenId(c.id)}
                className={`cursor-pointer text-left px-3 py-2 rounded-xl mb-1.5 transition-colors ${sel ? 'bg-[#FF4D00] text-white' : 'hover:bg-soren-elevated text-soren-text'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${sel ? 'bg-white/25 text-white' : c.kind === 'R2' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{c.kind}</span>
                  <span className="font-semibold text-[12px] truncate flex-1 min-w-0">{c.name}</span>
                </div>
                <div className={`text-[10px] mt-0.5 truncate ${sel ? 'text-white/70' : 'text-soren-subtle'}`}>{sub || 'Sans date'}</div>
              </div>
            )
          })}
        </div>

        {/* fiche de prep */}
        <div className="overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-soren-muted gap-3">
              <Phone size={30} className="opacity-40" />
              <p className="text-[13px]">Sélectionne un appel.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[13px] bg-soren-elevated border border-soren-border flex items-center justify-center font-bold text-[17px] text-soren-accent">{selected.initials}</div>
                <div>
                  <h2 className="text-[19px] font-bold tracking-tight">{selected.name}</h2>
                  <div className="flex items-center flex-wrap gap-2 mt-1 text-[13px] text-soren-muted">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selected.kind === 'R2' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{selected.kind}</span>
                    {selected.calendarSlug && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={/out/i.test(selected.calendarSlug)
                          ? { background: '#FCE7F3', color: '#EC4899' }
                          : { background: '#E0F2FE', color: '#0284C7' }}>
                        {/out/i.test(selected.calendarSlug) ? 'OUTBOUND' : 'INBOUND'}
                      </span>
                    )}
                    {selected.calendarLabel && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: (selected.calendarColor ?? '#888888') + '1A', color: selected.calendarColor ?? '#6B7280' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: selected.calendarColor ?? '#888888' }} />
                        {selected.calendarLabel}{selected.calendarSlug ? ` · ${selected.calendarSlug}` : ''}
                      </span>
                    )}
                    {selected.company && <span>{selected.company}</span>}
                    {selected.date && <span>· Rendez-vous {fmtRdv(selected.date)}</span>}
                  </div>
                </div>
              </div>

              {/* Brief closer : 4 cards persona éditables + marque de passage de l'agent */}
              <div className="flex items-center gap-2 mt-5 mb-3">
                <span className="text-[12px] font-bold uppercase tracking-wide text-soren-muted">Brief closer</span>
                {selected.bioBy === 'agent-operations' && (
                  <span title={`Brief rédigé par Agent Operations${selected.bioGeneratedAt ? ' le ' + new Date(selected.bioGeneratedAt).toLocaleDateString('fr-FR') : ''}`}
                    className="flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-soren-elevated flex-shrink-0">
                    <span className="relative flex-shrink-0">
                      <img src="/agents/operations.png" alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#16A34A] border border-soren-elevated flex items-center justify-center"><Check size={6} className="text-white" strokeWidth={3.5} /></span>
                    </span>
                    <span className="text-[10px] font-semibold text-soren-text whitespace-nowrap">Agent Operations</span>
                  </span>
                )}
                {selected.bioBy === 'manual' && selected.bioGeneratedAt && (
                  <span className="text-[10px] text-soren-subtle whitespace-nowrap">édité le {new Date(selected.bioGeneratedAt).toLocaleDateString('fr-FR')}</span>
                )}
                <span className="flex-1 h-px bg-soren-border" />
              </div>
              <EditableBrief callId={selected.id} md={selected.bioMarkdown ?? ''} name={selected.name} />

              {/* Objections déjà surmontées (R2) */}
              {(selected.kind === 'R2' && (selected.wonObjection || (selected.objections?.length ?? 0) > 0)) && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-2"><ShieldAlert size={13} /> Au R1 : déjà traité (ne pas rouvrir)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.wonObjection && <span className="text-[11.5px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">surmonté : {selected.wonObjection}</span>}
                    {(selected.objections ?? []).map((o, i) => <span key={i} className="text-[11.5px] font-medium px-2 py-1 rounded-full bg-emerald-100/70 text-emerald-700">{o}</span>)}
                  </div>
                </div>
              )}

              {/* Synthèse du R1 (R2) */}
              {selected.kind === 'R2' && selected.r1Synthesis && (
                <div className="mt-4 rounded-xl border border-soren-border bg-soren-card p-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-soren-muted mb-2"><MessageSquareQuote size={13} /> Synthèse du R1</div>
                  <p className="text-[12.5px] text-soren-text leading-relaxed whitespace-pre-line">{selected.r1Synthesis}</p>
                </div>
              )}

              {/* Tous les questionnaires en accordéons : toutes les questions, réponse si captée, vide sinon */}
              {(() => {
                const answerMap = new Map<string, string>()
                for (const qa of [...(selected.bookingAnswers ?? []), ...(selected.quizAnswers ?? [])]) {
                  if (qa.q && qa.a) answerMap.set(normQ(qa.q), qa.a)
                }
                return (
                  <>
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-soren-muted mt-6 mb-1">Questionnaires<span className="flex-1 h-px bg-soren-border" /></div>
                    <QuizAccordion title="Quiz Meta Ads (diagnostic)" color="#1877F2" questions={QUIZ_DIAGNOSTIC} answerMap={answerMap} />
                    <QuizAccordion title="Quiz confirmation" color="#FF4D00" questions={QUIZ_CONFIRMATION} answerMap={answerMap} />
                    <QuizAccordion title="Réservation iClosed (Audit IA offert)" color="#10B981" questions={QUIZ_BOOKING} answerMap={answerMap} defaultOpen />
                  </>
                )
              })()}

              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-soren-muted mt-6 mb-3">Notes du closer · retour après appel<span className="flex-1 h-px bg-soren-border" /></div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                onBlur={() => selected && saveNote({ id: selected.id as never, notes: note })}
                placeholder="Retour après l'appel : ce qui a été dit, objections rencontrées, prochaine étape…"
                className="w-full bg-soren-card border border-soren-border rounded-[13px] p-3.5 text-[13px] min-h-[100px] outline-none focus:border-soren-accent resize-y" />
              <div className="flex justify-end gap-2 mt-3">
                {selected.contact && (
                  <a href={`/contacts?c=${encodeURIComponent(selected.contact.id)}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border border-soren-border bg-soren-card text-soren-muted hover:text-soren-text"><FileText size={12} />Fiche contact</a>
                )}
                <button onClick={() => selected && saveNote({ id: selected.id as never, notes: note })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-[#FF4D00] text-white hover:brightness-110"><Save size={12} />Enregistrer</button>
              </div>

              {/* Issue de l'appel : clôture R1/R2 (gagné / perdu / no-show / reprogrammer). */}
              <OutcomePanel key={selected.id} call={selected} />
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
