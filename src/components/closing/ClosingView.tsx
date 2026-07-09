'use client'

import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Save, Phone, FileText, ShieldAlert, MessageSquareQuote, List, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Check, XCircle, CalendarClock } from 'lucide-react'
import { NONVENTE_REASONS, NONVENTE_OBJECTIONS } from '@/lib/lostReasons'
import { IClosedBookingModal, ICLOSED_R2_BOOKING_URL } from '@/components/shared/IClosedBookingModal'

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
  callId?: string | null          // id du RDV iClosed accroché (null si fiche pilotée par le lead, RDV pas encore booké)
  pipelineStage?: string | null   // étape courante du lead (r1 | r2 | nouveau-client | …)
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

// Textarea qui grandit toujours pour afficher tout son texte (pas de scroll interne, pas de hauteur figée).
function AutoTextarea({ value, onChange, onBlur, placeholder, className }: {
  value: string; onChange: (v: string) => void; onBlur: () => void; placeholder?: string; className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const resize = () => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  useEffect(() => { resize() }, [value])
  return (
    <textarea
      ref={ref} value={value} rows={1} placeholder={placeholder}
      onChange={e => { onChange(e.target.value); resize() }}
      onBlur={onBlur}
      className={className} />
  )
}

function EditableBrief({ callId, contactId, md, name }: { callId: string | null; contactId: string | null; md: string; name: string }) {
  const saveBio = useMutation(api.closing.saveBio)
  const saveBioForContact = useMutation(api.closing.saveBioForContact)
  const firstName = ((name || '').trim().split(/\s+/)[0] || name || 'ce lead').replace(/\[.*\]/, '').trim()
  const [vals, setVals] = useState<Record<string, string>>(() => parseBrief(md))
  useEffect(() => { setVals(parseBrief(md)) }, [callId, contactId]) // eslint-disable-line react-hooks/exhaustive-deps
  const persist = (next: Record<string, string>) => {
    const newMd = BRIEF_KEYS.map(k => `## ${briefTitle(k.key, firstName)}\n${(next[k.key] || '').trim()}`).join('\n\n')
    // RDV booké → sur l'appel ; sinon → sur le contact (repli affiché tant qu'aucun appel n'a de bio).
    if (callId) saveBio({ id: callId as never, bioMarkdown: newMd, by: 'manual' })
    else if (contactId) saveBioForContact({ contactId: contactId as never, bioMarkdown: newMd, by: 'manual' })
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 items-stretch">
      {BRIEF_KEYS.map(k => (
        <div key={k.key} className="rounded-lg border border-soren-border bg-soren-card px-2.5 py-1.5 focus-within:border-[#C8CBD0] transition-colors">
          <div className="text-[10.5px] font-bold text-soren-text mb-0.5">{briefTitle(k.key, firstName)}</div>
          <AutoTextarea
            value={vals[k.key] ?? ''}
            onChange={val => setVals(v => ({ ...v, [k.key]: val }))}
            onBlur={() => persist(vals)}
            placeholder="- À compléter…"
            className="w-full bg-transparent text-[11px] leading-[1.45] text-soren-text resize-none overflow-hidden outline-none min-h-[34px] placeholder:text-soren-subtle placeholder:text-[9px] sm:placeholder:text-[11px]" />
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
    <div className="p-3 md:p-6">
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

// Issue de l'appel : flux Valider / Pas validé selon l'étape, + No-show / Reprogrammer en secondaire.
//  • Valider R1 → la carte avance en R2 (outcome 'valide'). Valider R2 → gagné (montant requis, outcome 'gagne').
//  • Pas validé → carte en Perdu + raison. La question « objection surmontée » est posée au moment de valider.
// Réutilise la mutation Convex closing.recordOutcome.
const STAGE_LABEL: Record<string, string> = { 'nouveau-lead': 'Nouveau lead', conversation: 'Conversation', r1: 'R1', r2: 'R2', 'nouveau-client': 'Client' }
function OutcomePanel({ call }: { call: Call }) {
  const recordOutcome = useMutation(api.closing.recordOutcome)
  const isR2 = call.kind === 'R2'
  const [mode, setMode] = useState<null | 'valide' | 'pasvalide' | 'reprogrammer' | 'noshow'>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Gagné
  const [dealValue, setDealValue] = useState('')
  const [amountTbd, setAmountTbd] = useState(false)
  // Objections surmontées : sélection par chips (codes), pas de saisie libre.
  const [objCodes, setObjCodes] = useState<string[]>([])
  // Reprogrammer
  const [newDate, setNewDate] = useState('')
  // Après confirmation du passage R1 → R2 : ouvrir la réservation iClosed du R2.
  const [showBooking, setShowBooking] = useState(false)

  const reset = () => { setMode(null); setErr(''); setDealValue(''); setAmountTbd(false); setObjCodes([]); setNewDate('') }

  const hasCall = !!call.callId   // RDV iClosed réellement booké (sinon fiche pilotée par le lead)
  // Cible de l'issue : le RDV s'il existe, sinon le lead/contact (callId null) + son étape.
  const base = { callId: (call.callId ?? undefined) as never, contactId: call.contactId ?? undefined, stage: call.kind }
  const toggleObj = (code: string) => setObjCodes(cs => cs.includes(code) ? cs.filter(c => c !== code) : [...cs, code])
  const wonObjection = objCodes.map(c => NONVENTE_OBJECTIONS.find(o => o.code === c)?.label ?? c).join(', ')

  async function submit(args: Parameters<typeof recordOutcome>[0]) {
    setBusy(true); setErr('')
    try { await recordOutcome(args); reset() }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur : issue non enregistrée.") }
    finally { setBusy(false) }
  }

  // Valider : R1 → avance la carte en R2 (pas de montant) ; R2 → gagné (montant requis, garde anti "0 CHF").
  async function confirmValide() {
    // Objection obligatoire : on doit sélectionner au moins une objection levée avant de confirmer.
    if (objCodes.length === 0) { setErr('Sélectionne au moins une objection levée.'); return }
    if (!isR2) {
      // R1 → R2 : on enregistre l'issue, PUIS on ouvre la réservation iClosed du R2.
      setBusy(true); setErr('')
      try { await recordOutcome({ ...base, outcome: 'valide', wonObjection: wonObjection || undefined }); setShowBooking(true) }
      catch (e) { setErr(e instanceof Error ? e.message : "Erreur : issue non enregistrée.") }
      finally { setBusy(false) }
      return
    }
    const raw = dealValue.replace(',', '.').trim()
    const parsed = parseFloat(raw)
    const hasValue = raw !== '' && Number.isFinite(parsed) && parsed > 0
    if (!hasValue && !amountTbd) { setErr('Indiquez un montant supérieur à 0 CHF, ou cochez « Montant à définir ».'); return }
    submit({ ...base, outcome: 'gagne', dealValue: hasValue ? parsed : undefined, amountTbd, wonObjection: wonObjection || undefined })
  }

  // Boutons sobres : fond neutre, l'icône porte la couleur. Actif = léger fond élevé + bord marqué.
  const btn = (active: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium border transition-colors ${active ? 'bg-soren-elevated border-soren-text/40 text-soren-text' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-text/25'}`

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-soren-muted">Issue de l&apos;appel</span>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-soren-elevated border border-soren-border text-soren-muted whitespace-nowrap">Pipeline : <span className="text-soren-text font-semibold">{call.pipelineStage ? (STAGE_LABEL[call.pipelineStage] ?? call.pipelineStage) : (call.kind || '—')}</span></span>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'valide' ? null : 'valide') }} className={btn(mode === 'valide')}><Check size={14} className="text-emerald-600" />{isR2 ? 'Signé' : 'Passer au R2'}</button>
        <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'pasvalide' ? null : 'pasvalide') }} className={btn(mode === 'pasvalide')}><XCircle size={14} className="text-red-500" />Perdu</button>
      </div>
      {/* No-show récupérable : toujours dispo (la carte reste en pipeline). Reprogrammer : seulement si RDV booké. */}
      {/* Reprogrammer : seulement si un vrai RDV iClosed est booké. Le No-show est une raison sous « Perdu ». */}
      {hasCall && (
        <div className="flex gap-2 mt-2">
          <button disabled={busy} onClick={() => { setErr(''); setMode(m => m === 'reprogrammer' ? null : 'reprogrammer') }} className={btn(mode === 'reprogrammer')}><CalendarClock size={14} className="text-soren-subtle" />Reprogrammer</button>
        </div>
      )}

      {err && <div className="mt-3 text-[12px] font-medium text-[#DC2626] bg-[#FEE2E2]/50 border border-[#FECACA] rounded-lg px-3 py-2">{err}</div>}

      {mode === 'noshow' && (
        <div className="mt-3 rounded-xl border border-soren-border bg-soren-elevated/40 p-4 flex flex-col gap-3">
          <p className="text-[12.5px] font-medium text-soren-text">Vas-tu organiser un 2e rendez-vous ?</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => submit({ ...base, outcome: 'no_show' })} className="flex-1 py-2 rounded-lg border border-soren-text/30 bg-soren-card text-soren-text text-[12px] font-medium hover:bg-soren-elevated transition-colors">Oui : reste en pipeline</button>
            <button disabled={busy} onClick={() => submit({ ...base, outcome: 'perdu', lostReason: 'non_presentation' })} className="flex-1 py-2 rounded-lg border border-red-300 bg-soren-card text-[#DC2626] text-[12px] font-medium hover:bg-[#FEE2E2]/40 transition-colors">Non : perdu</button>
          </div>
        </div>
      )}

      {mode === 'valide' && (
        <div className={`mt-3 rounded-2xl border p-4 flex flex-col gap-4 ${isR2 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-soren-border bg-soren-elevated/40'}`}>
          {isR2 && (
            <div className="flex flex-col gap-2">
              <label className="text-[11.5px] font-semibold text-soren-text">Montant du deal</label>
              <div className={`relative ${amountTbd ? 'opacity-40 pointer-events-none' : ''}`}>
                <input type="number" autoFocus={!amountTbd} placeholder="3 500" value={dealValue} disabled={amountTbd}
                  onChange={e => setDealValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmValide()}
                  className="w-full bg-soren-card border border-soren-border rounded-xl pl-4 pr-14 py-3 text-[18px] font-bold text-soren-text outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 transition-shadow" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-soren-subtle pointer-events-none">CHF</span>
              </div>
              <button type="button" onClick={() => { const n = !amountTbd; setAmountTbd(n); if (n) setDealValue('') }}
                className={`self-start inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${amountTbd ? 'bg-soren-text/10 border-soren-text/30 text-soren-text' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
                {amountTbd && <Check size={12} />} Montant à définir plus tard
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-[11.5px] font-semibold text-soren-text">{isR2 ? 'Quelles objections as-tu levées ?' : 'Objections levées au R1'} <span className="text-soren-subtle font-normal">· au moins une</span></label>
            <div className="flex flex-wrap gap-1.5">
              {NONVENTE_OBJECTIONS.map(o => {
                const Icon = o.icon
                const on = objCodes.includes(o.code)
                return (
                  <button key={o.code} type="button" onClick={() => toggleObj(o.code)} title={o.desc}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${on ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text hover:border-soren-text/25'}`}>
                    <Icon size={13} className={on ? 'text-emerald-600' : 'text-soren-subtle'} />{o.label}
                  </button>
                )
              })}
            </div>
          </div>
          <button disabled={busy} onClick={confirmValide}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600/90 text-white text-[12px] font-medium tracking-tight shadow-sm hover:bg-emerald-600 transition-colors disabled:opacity-50">
            <Check size={13} className="opacity-90" /> {isR2 ? 'Marquer comme signé' : 'Confirmer le passage au R2'}
          </button>
        </div>
      )}

      {mode === 'pasvalide' && (
        <div className="mt-3 rounded-xl border border-soren-border bg-soren-elevated/40 p-4 flex flex-col gap-2">
          <div className="text-[11px] font-medium text-soren-muted mb-1.5">Raison de la perte <span className="text-soren-subtle">: choisis une raison</span></div>
          {/* Chips rouges (même rendu que les objections, en rouge). No-show (non_presentation) : ne clôt
              pas direct → ouvre la question « 2e RDV ? » (Oui reste / Non perdu). */}
          <div className="flex flex-wrap gap-1.5">
            {NONVENTE_REASONS.map(r => {
              const Icon = r.icon
              const onPick = () => r.code === 'non_presentation'
                ? (setErr(''), setMode('noshow'))
                : submit({ ...base, outcome: 'perdu', lostReason: r.code })
              return (
                <button key={r.code} disabled={busy} onClick={onPick} title={r.desc}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border bg-red-500/8 border-red-500/30 text-red-700 hover:bg-red-500/15 hover:border-red-500/50 transition-colors disabled:opacity-50">
                  <Icon size={13} className="text-red-500" />{r.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'reprogrammer' && (
        <div className="mt-3 rounded-xl border border-soren-border bg-soren-elevated/40 p-4 flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-medium text-soren-muted mb-1.5">Nouvelle date</label>
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full bg-soren-card border border-soren-border rounded-lg px-3 py-2.5 text-[13px] font-medium text-soren-text outline-none focus:border-soren-text/40" />
          </div>
          <button disabled={busy || !newDate} onClick={() => submit({ ...base, outcome: 'reprogrammer', newDate })}
            className="w-full py-2.5 rounded-lg bg-soren-text text-soren-card text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">Reprogrammer l&apos;appel</button>
        </div>
      )}

      {/* Passage R1 → R2 confirmé : réservation du R2 sur iClosed (nom/email/téléphone pré-remplis). */}
      {showBooking && (
        <IClosedBookingModal
          label="R2"
          bookingUrl={ICLOSED_R2_BOOKING_URL}
          fullName={call.contact?.fullName ?? call.name}
          email={call.contact?.email}
          phone={call.contact?.phone}
          onConfirm={() => { setShowBooking(false); reset() }}
          onCancel={() => { setShowBooking(false); reset() }}
        />
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
  const [kindFilter, setKindFilter] = useState<'all' | 'R1' | 'R2'>('all')
  const filteredCalls = (calls ?? []).filter(c => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false
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
      {view === 'agenda' ? (
        <>
        {/* Onglets Liste / Calendrier — en tête de la vue agenda. */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
          {viewToggle}
          <span className="text-[12px] text-soren-muted">{loading ? 'Chargement…' : (() => {
            const all = calls ?? []
            const nR2 = all.filter(c => c.kind === 'R2').length
            return `${all.length} call${all.length > 1 ? 's' : ''}${all.length ? ` · ${all.length - nR2} R1 · ${nR2} R2` : ''}`
          })()}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CalendarAgenda calls={calls ?? []} onPick={(id) => { setOpenId(id); setView('liste') }} />
        </div>
        </>
      ) : (
      <div className="flex-1 flex md:grid md:grid-cols-[248px_1fr] overflow-hidden">
        {/* liste des appels — mobile : cachée quand une fiche est ouverte (master-détail) */}
        <div className={`border-r border-soren-border flex-col overflow-hidden bg-soren-elevated/40 w-full md:w-auto ${openId ? 'hidden md:flex' : 'flex'}`}>
          {/* En-tête colonne : onglets Liste / Calendrier, alignés avec la fiche de droite */}
          <div className="flex items-center px-3.5 pt-4 pb-3 flex-shrink-0">{viewToggle}</div>
          <div className="overflow-y-auto px-3.5 pb-3.5 flex-1">
          {/* Filtre R1 / R2 : segmenté sobre, au-dessus de la recherche */}
          <div className="flex bg-soren-elevated border border-soren-border rounded-lg p-[2px] text-[10px] font-medium mb-2">
            {([['all', 'Tous'], ['R1', 'R1'], ['R2', 'R2']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setKindFilter(k)}
                className={`flex-1 px-1.5 py-1 rounded-md transition-colors ${kindFilter === k ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'}`}>{label}</button>
            ))}
          </div>
          {/* Recherche contact */}
          <div className="flex items-center gap-2 bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 mb-2">
            <Search size={12} className="text-soren-subtle flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contact…"
              className="flex-1 bg-transparent text-[11px] text-soren-text placeholder-[#9CA3AF] outline-none" />
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
                className={`cursor-pointer text-left px-2.5 py-1.5 rounded-lg mb-1 transition-colors ${sel ? 'bg-[#FF4D00] text-white' : 'hover:bg-soren-elevated text-soren-text'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8.5px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${sel ? 'bg-white/25 text-white' : c.kind === 'R2' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{c.kind}</span>
                  <span className="font-semibold text-[11px] truncate flex-1 min-w-0">{c.name}</span>
                </div>
                <div className={`text-[9px] mt-0.5 truncate ${sel ? 'text-white/70' : 'text-soren-subtle'}`}>{sub || 'Sans date'}</div>
              </div>
            )
          })}
          </div>
        </div>

        {/* fiche de prep — mobile : affichée seulement quand une fiche est ouverte */}
        <div className={`overflow-y-auto px-4 md:px-6 pt-4 pb-6 w-full md:w-auto flex-1 ${openId ? 'block' : 'hidden md:block'}`}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-soren-muted gap-3">
              <Phone size={30} className="opacity-40" />
              <p className="text-[13px]">Sélectionne un appel.</p>
            </div>
          ) : (
            <>
              {/* Retour à la liste — mobile uniquement */}
              <button onClick={() => setOpenId(null)} className="md:hidden inline-flex items-center gap-1 text-[12px] font-semibold text-soren-muted mb-3 -ml-1">
                <ChevronLeft size={16} /> Retour aux appels
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[11px] bg-soren-elevated border border-soren-border flex items-center justify-center font-bold text-[14px] text-soren-accent">{selected.initials}</div>
                <div>
                  <h2 className="text-[16px] font-bold tracking-tight">{selected.name}</h2>
                  <div className="flex items-center flex-wrap gap-1.5 mt-0.5 text-[12px] text-soren-muted">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selected.kind === 'R2' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{selected.kind}</span>
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
              {(selected.callId || selected.contactId)
                ? <EditableBrief callId={selected.callId ?? null} contactId={selected.contactId ?? null} md={selected.bioMarkdown ?? ''} name={selected.name} />
                : <p className="text-[12px] text-soren-subtle italic">Aucun contact lié : le brief ne peut pas être préparé.</p>}

              {/* Objections déjà surmontées au R1 (rappel sur la fiche R2) */}
              {(selected.kind === 'R2' && (selected.wonObjection || (selected.objections?.length ?? 0) > 0)) && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center gap-1.5 mb-1"><ShieldAlert size={14} className="text-emerald-600" /><span className="text-[12.5px] font-bold text-emerald-800">Objections surmontées au R1</span></div>
                  <p className="text-[10.5px] text-emerald-700/80 mb-2.5">Déjà levées au premier appel : pas besoin d&apos;y revenir.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.wonObjection && <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800"><Check size={11} /> {selected.wonObjection}</span>}
                    {(selected.objections ?? []).map((o, i) => <span key={i} className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full bg-emerald-100/70 text-emerald-700"><Check size={11} /> {o}</span>)}
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

              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-soren-muted mt-5 mb-2">Notes du closer · retour après appel<span className="flex-1 h-px bg-soren-border" /></div>
              <textarea value={note} onChange={e => setNote(e.target.value)} disabled={!selected.callId}
                onBlur={() => selected?.callId && saveNote({ id: selected.callId as never, notes: note })}
                placeholder={selected.callId ? "Retour après l'appel : ce qui a été dit, objections rencontrées, prochaine étape…" : "Notes disponibles une fois le RDV iClosed booké."}
                className="w-full bg-soren-card border border-soren-border rounded-lg p-2.5 text-[11.5px] leading-[1.45] min-h-[64px] outline-none focus:border-soren-accent resize-y disabled:opacity-50" />
              {/* Issue de l'appel : clôture R1/R2 (gagné / perdu / no-show / reprogrammer). Placée au-dessus de la ligne Fiche contact / Enregistrer. */}
              <OutcomePanel key={selected.id} call={selected} />

              <div className="flex justify-end gap-2 mt-6">
                {selected.contact && (
                  <a href={`/contacts?c=${encodeURIComponent(selected.contact.id)}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border border-soren-border bg-soren-card text-soren-muted hover:text-soren-text"><FileText size={12} />Fiche contact</a>
                )}
                <button disabled={!selected.callId} onClick={() => selected?.callId && saveNote({ id: selected.callId as never, notes: note })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-[#FF4D00] text-white hover:brightness-110 disabled:opacity-50"><Save size={12} />Enregistrer</button>
              </div>
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
