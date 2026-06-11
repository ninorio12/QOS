'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import dynamic from 'next/dynamic'
import { api } from '../../../convex/_generated/api'
import { Search, Plus, X, Phone, User, CalendarPlus, Ban, ChevronDown, Filter, Check } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'

const NewAppointmentModal = dynamic(() => import('../calendrier/NewAppointmentModal'), { ssr: false })
const NewContactModal = dynamic(() => import('../contacts/NewContactModal'), { ssr: false })

type Contact = { contactId: string; fullName: string; companyName?: string; phone?: string; email?: string; linkedinUrl?: string; source?: string; niche?: string; canton?: string; statut?: string; temperature?: string }
type ProspRecord = { id: string; contactId: string; column: string; phase1Status?: string; phase2Status?: string; phase3Status?: string; temperature?: string; channel?: string; nextFollowUpAt?: string; shortNote?: string; lostReason?: string; status: string; updatedAt: string; contact: Contact }

// Statuts conservés : Répondu / Pas répondu / À rappeler
const PHASE_META: { [k: string]: { label: string; c: string; bg: string } } = {
  repondu:     { label: 'Répondu',     c: '#16A34A', bg: '#16A34A14' },
  pas_repondu: { label: 'Pas répondu', c: '#D97706', bg: '#D9770614' },
  a_rappeler:  { label: 'À rappeler',  c: '#8B5CF6', bg: '#8B5CF614' },
}
const PHASE_OPTS = [{ v: '', label: '—', c: '#9CA3AF' }, { v: 'repondu', label: 'Répondu', c: '#16A34A' }, { v: 'pas_repondu', label: 'Pas répondu', c: '#D97706' }, { v: 'a_rappeler', label: 'À rappeler', c: '#8B5CF6' }]
const PHASE_FILTER_OPTS = [{ v: '', label: 'Tous' }, { v: '__empty', label: '(vide)' }, { v: 'repondu', label: 'Répondu' }, { v: 'pas_repondu', label: 'Pas répondu' }, { v: 'a_rappeler', label: 'À rappeler' }]

const LOST_REASONS = ['negatif', 'mauvais_numero', 'non_qualifie', 'pas_de_reponse_phase3', 'hors_cible', 'autre']
const LOST_REASON_LABEL: { [k: string]: string } = { negatif: 'Négatif', mauvais_numero: 'Mauvais numéro', non_qualifie: 'Non qualifié', pas_de_reponse_phase3: 'Pas de réponse (phase 3)', hors_cible: 'Hors cible', autre: 'Autre' }

const GRID = 'grid items-center gap-2 grid-cols-[minmax(186px,1.5fr)_minmax(140px,1fr)_minmax(150px,1.3fr)_repeat(3,minmax(116px,1fr))_72px_78px]'

function ContactIcon() {
  return <span className="rounded-full flex items-center justify-center flex-shrink-0 bg-soren-elevated text-soren-subtle" style={{ width: 30, height: 30 }}><User size={15} /></span>
}

// Roulette de statut — dropdown premium arrondi
function PhasePill({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const cur = value ? PHASE_META[value] : undefined
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1 rounded-full pl-3 pr-2 py-1.5 text-[11px] font-semibold transition-all hover:brightness-[0.97]"
        style={cur ? { background: cur.bg, color: cur.c } : { background: 'var(--bg-elevated)', color: 'var(--subtle)' }}>
        <span className="truncate">{cur ? cur.label : '—'}</span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-1 left-0 right-0 min-w-[130px] bg-soren-card border border-soren-border rounded-2xl shadow-xl p-1">
            {PHASE_OPTS.map(o => (
              <button key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
                className={`w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded-xl flex items-center gap-2 transition-colors hover:bg-soren-elevated ${value === o.v || (!value && !o.v) ? 'bg-soren-elevated' : ''}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.c }} />
                <span className="text-soren-text">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Filtre par options (colonnes Phase)
function HeaderFilter({ label, value, options, onChange, color, align = 'center' }: { label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void; color?: string; align?: 'center' | 'left' }) {
  const [open, setOpen] = useState(false)
  const active = value !== ''
  return (
    <div className="relative inline-flex items-center gap-1 justify-center">
      <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: color ?? '#9CA3AF' }}>{label}</span>
      <button onClick={() => setOpen(o => !o)} className={`p-0.5 rounded transition-colors ${active ? 'text-[#FF4D00]' : 'text-[#C4C4C0] hover:text-soren-muted'}`}><Filter size={10} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute z-40 top-full mt-1 min-w-[150px] bg-soren-card border border-soren-border rounded-2xl shadow-xl p-1 ${align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}>
            {options.map(o => (
              <button key={o.v} onClick={() => { onChange(o.v); setOpen(false) }}
                className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors hover:bg-soren-elevated ${value === o.v ? 'font-bold text-soren-text' : 'text-soren-muted'}`}>
                {o.label}{value === o.v && <Check size={11} className="text-[#FF4D00]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Filtre texte (colonnes Lead + Commentaire), ouvre vers la droite
function HeaderTextFilter({ label, value, onChange, color }: { label: string; value: string; onChange: (v: string) => void; color?: string }) {
  const [open, setOpen] = useState(false)
  const active = value !== ''
  return (
    <div className="relative inline-flex items-center gap-1">
      <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: color ?? '#9CA3AF' }}>{label}</span>
      <button onClick={() => setOpen(o => !o)} className={`p-0.5 rounded transition-colors ${active ? 'text-[#FF4D00]' : 'text-[#C4C4C0] hover:text-soren-muted'}`}><Filter size={10} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full mt-1 left-0 w-48 bg-soren-card border border-soren-border rounded-2xl shadow-xl p-2">
            <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="Filtrer…" className="w-full text-[11px] bg-soren-elevated rounded-lg px-2.5 py-1.5 text-soren-text placeholder-[#9CA3AF] outline-none" />
            {active && <button onClick={() => { onChange(''); setOpen(false) }} className="mt-1.5 text-[10px] text-soren-subtle hover:text-soren-text">Effacer le filtre</button>}
          </div>
        </>
      )}
    </div>
  )
}

function CommentCell({ value, onSave }: { value?: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? '')
  return (
    <input
      value={v}
      onClick={e => e.stopPropagation()}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (v.trim() !== (value ?? '').trim()) onSave(v.trim()) }}
      placeholder="Commentaire"
      className="w-full text-[11px] text-center bg-soren-elevated/40 hover:bg-soren-elevated/70 focus:bg-soren-elevated rounded-full px-3 py-1.5 text-soren-text placeholder-[#B7B7B2] outline-none focus:ring-1 focus:ring-[#FF4D00]/30 transition-colors"
    />
  )
}

function TrackerRow({ r, onOpen, onComment, onPhase, onR1, onPerdu }: {
  r: ProspRecord; onOpen: () => void; onComment: (v: string) => void
  onPhase: (phase: string, v: string) => void; onR1: () => void; onPerdu: () => void
}) {
  return (
    <div className={`group ${GRID} px-4 py-2 border-b border-soren-border last:border-0 hover:bg-soren-elevated transition-colors`}>
      {/* Identité — clic = ouvre la fiche contact. Colonne figée : fond OPAQUE pour
          masquer les colonnes qui défilent dessous en scroll horizontal (petit écran). */}
      <div className="flex items-center gap-2.5 min-w-0 sticky left-0 z-10 bg-soren-card group-hover:bg-soren-elevated transition-colors">
        <ContactIcon />
        <button onClick={onOpen} className="min-w-0 text-left flex-1 leading-tight">
          <p className="text-[11px] font-normal text-soren-text truncate">{r.contact.fullName}</p>
          <div className="flex items-center gap-2 min-w-0">
            {r.contact.companyName && <span className="text-[10px] text-soren-subtle truncate">{r.contact.companyName}</span>}
          </div>
        </button>
      </div>
      {/* Téléphone — clic = appel via le téléphone (lien tel:) */}
      <div className="min-w-0">
        {r.contact.phone ? (
          <a href={`tel:${r.contact.phone.replace(/[^+0-9]/g, '')}`} onClick={e => e.stopPropagation()} title={`Appeler ${r.contact.phone}`}
            className="inline-flex items-center gap-1.5 max-w-full text-[11px] font-medium text-soren-text hover:text-[#FF4D00] transition-colors">
            <Phone size={12} className="text-[#FF4D00] flex-shrink-0" />
            <span className="truncate">{r.contact.phone}</span>
          </a>
        ) : <span className="text-[11px] text-soren-subtle">—</span>}
      </div>
      <CommentCell value={r.shortNote} onSave={onComment} />
      <PhasePill value={r.phase1Status} onChange={v => onPhase('phase1', v)} />
      <PhasePill value={r.phase2Status} onChange={v => onPhase('phase2', v)} />
      <PhasePill value={r.phase3Status} onChange={v => onPhase('phase3', v)} />
      <button onClick={onR1} className="flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-[#16A34A] border border-[#16A34A] rounded-full py-1.5 hover:bg-[#15803D] transition-colors">
        <CalendarPlus size={11} /> R1
      </button>
      <button onClick={onPerdu} className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#DC2626] border border-[#FECACA] rounded-full py-1.5 hover:bg-[#FEF2F2] transition-colors dark:bg-[#DC2626] dark:text-white dark:border-[#DC2626] dark:hover:bg-[#B91C1C]">
        <Ban size={11} /> Perdu
      </button>
    </div>
  )
}

export default function ProspectionView() {
  const [search, setSearch] = useState('')
  const [leadF, setLeadF] = useState('')
  const [commentF, setCommentF] = useState('')
  const [p1F, setP1F] = useState('')
  const [p2F, setP2F] = useState('')
  const [p3F, setP3F] = useState('')
  const [creating, setCreating] = useState(false)
  const [contactId, setContactId] = useState<string | null>(null)
  const [r1For, setR1For] = useState<ProspRecord | null>(null)
  const [perduFor, setPerduFor] = useState<ProspRecord | null>(null)

  const records = (useQuery(api.osProspection.list, { search: search || undefined }) ?? []) as ProspRecord[]
  const setPhase = useMutation(api.osProspection.setPhaseCell)
  const addNote = useMutation(api.osProspection.addNote)
  const quick = useMutation(api.osProspection.quickAction)
  const linkContact = useMutation(api.osProspection.linkContact)

  // Fiche contact unique (exactement celle du module Contacts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullContact = useQuery(api.crm_contacts.get, contactId ? { id: contactId as never } : 'skip') as any
  const editGhl: GHLContact | undefined = fullContact ? {
    id: fullContact._id, contactName: `${fullContact.firstName ?? ''} ${fullContact.lastName ?? ''}`.trim(),
    firstName: fullContact.firstName ?? null, lastName: fullContact.lastName ?? null,
    email: fullContact.email ?? null, phone: fullContact.phone ?? null,
    companyName: fullContact.companyName ?? null, address1: fullContact.address1 ?? null,
    city: fullContact.city ?? null, postalCode: fullContact.postalCode ?? null,
    website: fullContact.website ?? null, source: fullContact.source ?? null,
    tags: fullContact.tags ?? [], dateAdded: fullContact.createdAt ?? '', dateUpdated: fullContact.updatedAt ?? null,
    metier: fullContact.metier ?? null, niche: fullContact.niche ?? null,
  } : undefined

  const matchPhase = (cell: string | undefined, f: string) => f === '' || (f === '__empty' ? !cell : cell === f)

  const active = useMemo(() => records.filter(r => r.column === 'lead_a_traiter').filter(r => {
    if (leadF) {
      const hay = `${r.contact.fullName} ${r.contact.companyName ?? ''} ${r.contact.phone ?? ''}`.toLowerCase()
      if (!hay.includes(leadF.toLowerCase())) return false
    }
    if (commentF && !(r.shortNote ?? '').toLowerCase().includes(commentF.toLowerCase())) return false
    if (!matchPhase(r.phase1Status, p1F)) return false
    if (!matchPhase(r.phase2Status, p2F)) return false
    if (!matchPhase(r.phase3Status, p3F)) return false
    return true
  }), [records, leadF, commentF, p1F, p2F, p3F])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-soren-app">
      {/* Barre supérieure compacte */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 w-full max-w-xs bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
            <Search size={12} className="text-soren-subtle flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un lead…" className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-soren-text bg-soren-elevated rounded-full px-3 py-1.5 flex-shrink-0">
            {active.length}<span className="text-soren-subtle font-medium">à traiter</span>
          </span>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#e64500] transition-colors"><Plus size={12} /> Nouveau lead</button>
      </div>

      {/* ── Fiches d'appel (mobile) ── */}
      <div className="md:hidden flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {active.length === 0 && <p className="text-[12px] text-soren-subtle text-center py-12">Aucun lead à traiter</p>}
        {active.map(r => {
          const tel = r.contact.phone?.replace(/[^+0-9]/g, '')
          const ini = (r.contact.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase()
          return (
            <div key={r.id} className="bg-soren-card border border-soren-border rounded-xl p-2.5 shadow-sm">
              <button onClick={() => setContactId(r.contactId)} className="flex items-center gap-2.5 w-full text-left">
                <span className="w-7 h-7 rounded-full bg-soren-elevated text-soren-subtle flex items-center justify-center text-[10px] font-bold flex-shrink-0">{ini}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-soren-text truncate leading-tight">{r.contact.fullName}</p>
                  {r.contact.companyName && <p className="text-[10.5px] text-soren-subtle truncate">{r.contact.companyName}</p>}
                </div>
              </button>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <div><p className="text-[8px] font-bold uppercase tracking-wider text-soren-subtle mb-0.5 text-center">NRP 1</p><PhasePill value={r.phase1Status} onChange={v => setPhase({ id: r.id as never, phase: 'phase1', value: v })} /></div>
                <div><p className="text-[8px] font-bold uppercase tracking-wider text-soren-subtle mb-0.5 text-center">NRP 2</p><PhasePill value={r.phase2Status} onChange={v => setPhase({ id: r.id as never, phase: 'phase2', value: v })} /></div>
                <div><p className="text-[8px] font-bold uppercase tracking-wider text-soren-subtle mb-0.5 text-center">NRP 3</p><PhasePill value={r.phase3Status} onChange={v => setPhase({ id: r.id as never, phase: 'phase3', value: v })} /></div>
              </div>
              <div className="flex gap-1.5 mt-2">
                {tel
                  ? <a href={`tel:${tel}`} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-[#FF4D00] hover:bg-[#E64500] rounded-lg py-2"><Phone size={12} /> Appeler</a>
                  : <span className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-soren-subtle bg-soren-elevated rounded-lg py-2 opacity-60"><Phone size={12} /> Appeler</span>}
                <button onClick={() => setR1For(r)} className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg py-2"><CalendarPlus size={12} /> R1</button>
                <button onClick={() => setPerduFor(r)} aria-label="Perdu" className="w-10 flex items-center justify-center text-[#DC2626] bg-[#DC2626]/10 rounded-lg"><Ban size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tableau central — desktop */}
      <div className="hidden md:flex flex-1 min-h-0 px-5 pb-5">
        <div className="h-full w-full flex flex-col bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="min-w-[1000px]">
              {/* Header + filtres Excel */}
              <div className={`${GRID} px-4 py-2.5 bg-soren-card border-b border-soren-border sticky top-0 z-20`}>
                <div className="sticky left-0 z-10 bg-soren-card flex items-center justify-center gap-1.5">
                  <HeaderTextFilter label="Leads à traiter" value={leadF} onChange={setLeadF} color="var(--text)" />
                </div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#111111]">Téléphone</span>
                <div className="text-center"><HeaderTextFilter label="Commentaire" value={commentF} onChange={setCommentF} color="var(--text)" /></div>
                <div className="text-center"><HeaderFilter label="NRP 1" value={p1F} options={PHASE_FILTER_OPTS} onChange={setP1F} color="var(--text)" /></div>
                <div className="text-center"><HeaderFilter label="NRP 2" value={p2F} options={PHASE_FILTER_OPTS} onChange={setP2F} color="var(--text)" /></div>
                <div className="text-center"><HeaderFilter label="NRP 3" value={p3F} options={PHASE_FILTER_OPTS} onChange={setP3F} color="var(--text)" /></div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-center text-[#16A34A]">R1</span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-center text-[#DC2626]">Perdu</span>
              </div>
              {active.map(r => (
                <TrackerRow key={r.id} r={r}
                  onOpen={() => setContactId(r.contactId)}
                  onComment={v => addNote({ id: r.id as never, note: v })}
                  onPhase={(phase, v) => setPhase({ id: r.id as never, phase, value: v })}
                  onR1={() => setR1For(r)} onPerdu={() => setPerduFor(r)} />
              ))}
              {active.length === 0 && <p className="text-[11px] text-soren-subtle text-center py-12">Aucun lead à traiter</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Fiche contact unique (module Contacts) */}
      {contactId && editGhl && (
        <NewContactModal contact={editGhl} initialStatut={(fullContact?.statut as 'lead' | 'client' | 'perdu') ?? 'lead'} initialCanton={fullContact?.canton ?? ''} onClose={() => setContactId(null)} onSave={() => setContactId(null)} />
      )}

      {/* R1 → modale Calendrier */}
      {r1For && (
        <NewAppointmentModal calendars={[]} initialType="r1" teamOnly
          initialTitle={`R1 - ${r1For.contact.fullName}${r1For.contact.companyName ? ` / ${r1For.contact.companyName}` : ''}`}
          initialContactName={r1For.contact.fullName} initialContactId={r1For.contactId}
          onClose={() => setR1For(null)}
          onCreated={appt => { quick({ id: r1For.id as never, action: 'r1_booke', r1At: appt.startTime || undefined }); setR1For(null) }} />
      )}

      {/* Perdu → raison */}
      {perduFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPerduFor(null)} />
          <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-black text-soren-text flex items-center gap-1.5"><Ban size={14} className="text-[#DC2626]" /> Lead perdu</h3>
              <button onClick={() => setPerduFor(null)} className="w-7 h-7 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={13} className="text-soren-muted" /></button>
            </div>
            <p className="text-[11px] text-soren-subtle -mt-1">{perduFor.contact.fullName} · raison</p>
            <div className="grid grid-cols-2 gap-1.5">
              {LOST_REASONS.map(rs => (
                <button key={rs} onClick={() => { const map: { [k: string]: string } = { negatif: 'reponse_negative' }; quick({ id: perduFor.id as never, action: 'perdu', lostReason: map[rs] ?? rs }); setPerduFor(null) }}
                  className="text-[11px] font-semibold px-2 py-2 rounded-lg border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">{LOST_REASON_LABEL[rs]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {creating && (
        <NewContactModal mode="leads" initialSource="outbound" onClose={() => setCreating(false)}
          onAdd={c => { linkContact({ contactId: c.id as never, temperature: 'froid' }); setCreating(false) }} />
      )}
    </div>
  )
}
