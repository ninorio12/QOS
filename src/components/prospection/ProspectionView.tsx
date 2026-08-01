'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import dynamic from 'next/dynamic'
import { api } from '../../../convex/_generated/api'
import {
  DndContext, DragOverlay, closestCenter, pointerWithin, defaultDropAnimationSideEffects,
  useDroppable, MeasuringStrategy, type DragStartEvent, type DragEndEvent, type DropAnimation, type CollisionDetection,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Search, Plus, X, Phone, Mail, Building2, ExternalLink, CalendarCheck, UserMinus, ChevronLeft, ChevronRight, Tag, Bookmark, ClipboardCheck, Headphones } from 'lucide-react'
import { useKanbanSensors } from '@/hooks/useKanbanSensors'
import { type GHLContact } from '@/lib/ghl'
import { LOST_REASONS, lostReasonLabel, lostReasonIcon } from '@/lib/lostReasons'
import { nicheKeyword } from '@/lib/nicheKeyword'

// Event iClosed de booking R1 (le widget gère date/heure/closer ; email pré-rempli).
// iClosed interdit l'iframe (x-frame-options: DENY) → on ouvre dans un nouvel onglet.
const ICLOSED_R1_BOOKING_URL = 'https://app.iclosed.io/e/vividflow/audit-ia-offert'

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

const NewContactModal = dynamic(() => import('../contacts/NewContactModal'), { ssr: false })

type Contact = { contactId: string; fullName: string; companyName?: string; phone?: string; email?: string; source?: string; niche?: string }
type ProspRecord = { id: string; contactId: string; column: string; shortNote?: string; status: string; updatedAt: string; lostReason?: string; followUpReason?: string; followUpAt?: string; internalLead?: boolean; cadrage?: boolean; origin?: string; journeyStep?: string; contact: Contact }
const fmtFollowUp = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }

// Règles métier de déplacement :
//  Mouvement libre pour pouvoir CORRIGER une erreur de drop (remettre une carte depuis n'importe quelle
//  colonne, NRP/Perdu/RDV inclus). Seuls 2 garde-fous d'intégrité de type subsistent :
//  • « Leads interne » = réservé aux leads internes (envoyés depuis une fiche) — mais accessible depuis n'importe où.
//  • « Leads à traiter » = réservé aux leads bruts (non internes) — accessible depuis n'importe où.
const isMoveAllowed = (r: ProspRecord, target: string) => {
  if (target === 'leads_interne')  return !!r.internalLead
  if (target === 'leads_a_traiter') return !r.internalLead
  return true
}
// Texte d'explication du blocage (tooltip).
const blockReason = (r: ProspRecord, target: string) =>
  target === 'leads_interne'
    ? '« Leads interne » est réservé aux contacts envoyés depuis leur fiche'
    : '« Leads à traiter » est réservé aux leads (un lead interne y est exclu)'

// Colonnes du board — ordre = parcours commercial.
const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'leads_a_traiter', label: 'Leads à traiter',        color: '#3462EE' },
  { id: 'leads_interne',   label: 'Leads interne',          color: '#FF4D00' },
  { id: 'nrp1',            label: 'NRP 1',                   color: '#D97706' },
  { id: 'nrp2',            label: 'NRP 2',                   color: '#D97706' },
  { id: 'nrp3',            label: 'NRP 3',                   color: '#D97706' },
  { id: 'nrp4',            label: 'NRP 4',                   color: '#D97706' },
  { id: 'rdv_booke',       label: 'RDV Booké sur iClosed',   color: '#22C55E' },
  { id: 'perdu',           label: 'Perdu',                   color: '#EF4444' },
  { id: 'a_suivre',        label: 'À suivre',                color: '#8B5CF6' },
]
const COLUMN_IDS = COLUMNS.map(c => c.id)

// Logo officiel iClosed, tracé récupéré à la source.
function IClosedMark({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="flex-shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M6.671 8h25.761c-2.587 1.38-7.987 4.788-8.892 7.386 12.912-8.214 33.662-6.46 34.09-6.323.428.138 1.08.348.862 1.195-.218.849-24.232 43.114-25.26 45-.393.721-1.564 1.339-2.711-.28-1.148-1.619-5.941-10.426-7.01-12.605.295-5.07 8.253-13.263 17.3-19.55-7.916 3.249-16.156 9.784-19.499 16.126-1.562-2.682-3.1-5.314-3.409-5.863-1.041-1.855-8.081-13.122-12.15-22.112-.57-1.26-.6-2.974.918-2.974Z" />
    </svg>
  )
}

// Étapes du tunnel entrant, dans l'ordre. La dernière franchie s'affiche sur la
// carte, nommée par ce qu'il RESTE à faire : « quiz ouvert » ne disait rien au setter.
const JOURNEY_STEPS: Record<string, { label: string; bg: string; fg: string; hint: string; iclosed?: boolean }> = {
  formulaire:  { label: 'Quiz non commencé', bg: '#F3F4F6', fg: '#4B5563', hint: "A laissé ses coordonnées mais n'a jamais ouvert le quiz" },
  quiz_ouvert: { label: 'Quiz non terminé',  bg: '#FEF3C7', fg: '#92400E', hint: 'A commencé le quiz et l\'a abandonné en route' },
  quiz_termine:{ label: 'Quiz terminé',      bg: '#DBEAFE', fg: '#1D4ED8', hint: 'A terminé le quiz mais n\'a pas réservé d\'appel' },
  rdv_pris:    { label: 'RDV booké',         bg: '#1E293B', fg: '#FFFFFF', hint: 'A réservé son appel sur iClosed : rien à relancer', iclosed: true },
}
const telHref = (p?: string) => (p ? `tel:${p.replace(/[^+0-9]/g, '')}` : undefined)
const initialsOf = (n?: string) => (n?.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase()

// ─── Carte ────────────────────────────────────────────────────
function ProspCard({ r, dragging = false }: { r: ProspRecord; dragging?: boolean }) {
  const tel = telHref(r.contact.phone)
  const ReasonIcon = r.column === 'perdu' && r.lostReason ? lostReasonIcon(r.lostReason) : null
  const internal = r.internalLead
  return (
    <div className={`border rounded-lg px-2.5 py-1.5 flex flex-col justify-center gap-1 select-none transition-all min-h-[62px] ${
      dragging
        ? internal
          ? 'bg-[#FF4D00]/15 backdrop-blur-sm border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_4px_16px_rgba(0,0,0,0.12)] rotate-1 cursor-grabbing'
          : 'bg-soren-card border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_4px_16px_rgba(0,0,0,0.12)] rotate-1 cursor-grabbing'
        : internal
          ? 'bg-[#FF4D00]/15 border-[#FF4D00]/70 hover:bg-[#FF4D00]/[0.22] hover:border-[#FF4D00] hover:shadow-sm cursor-grab'
          : 'bg-soren-card border-soren-border hover:border-[#C8CBD0] hover:shadow-sm cursor-grab'
    }`}>
      {/* Ligne 1 : nom (gras) + puce niche alignée à droite */}
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="flex-1 min-w-0 text-[10.5px] md:text-[12px] font-semibold text-soren-text leading-tight truncate">{r.contact.fullName}</p>
        {/* Niche — en haut à droite du nom, sur tous les écrans */}
        {r.contact.niche && (
          <span title={`Niche : ${r.contact.niche}`}
            className="inline-flex flex-none items-center gap-1 max-w-[80px] md:max-w-[92px] text-[9px] font-semibold px-1.5 py-[1px] leading-tight rounded-full bg-[#EEF2FF] text-[#3462EE] dark:bg-blue-500/15 dark:text-blue-400">
            <Tag size={8} className="flex-shrink-0" /><span className="truncate">{nicheKeyword(r.contact.niche)}</span>
          </span>
        )}
      </div>
      {/* Ligne 2 : téléphone (orange, cliquable) · société (tronquée) */}
      <div className="flex items-center gap-1.5 min-w-0">
        {r.contact.phone
          ? <a href={tel} onClick={e => e.stopPropagation()} title={`Appeler ${r.contact.phone}`}
              className="flex-none inline-flex items-center gap-1 text-[10px] md:text-[11px] font-medium text-soren-text hover:text-[#FF4D00] transition-colors">
              <Phone size={9} className="text-[#FF4D00] flex-shrink-0" /><span>{r.contact.phone}</span>
            </a>
          : <span className="flex-none text-[9.5px] md:text-[10.5px] text-soren-subtle">Pas de n°</span>}
        {r.contact.companyName && (
          <>
            <span className="flex-none w-[3px] h-[3px] rounded-full bg-soren-border" />
            <span className="flex items-center gap-1 min-w-0 text-[9.5px] md:text-[10.5px] text-soren-subtle"><Building2 size={8} className="flex-shrink-0 md:w-[9px] md:h-[9px]" /><span className="truncate">{r.contact.companyName}</span></span>
          </>
        )}
      </div>
      {/* Raison de perte — uniquement en colonne « Perdu » */}
      {ReasonIcon && r.lostReason && (
        <span className="w-fit max-w-full inline-flex items-center gap-1 text-[9px] font-semibold px-[5px] py-[1px] rounded-full leading-tight whitespace-nowrap bg-[#FEE2E2] text-[#B91C1C] dark:bg-rose-500/15 dark:text-rose-400">
          <ReasonIcon size={9} className="flex-shrink-0" /><span className="truncate">{lostReasonLabel(r.lostReason)}</span>
        </span>
      )}
      {/* APPEL DE CLARTÉ — lead interne qui a franchi une porte (rendez-vous booké
          ou formulaire rempli). Il n'est plus à convertir mais à rappeler pour
          clarifier son besoin. La puce d'origine dit par où il est arrivé. */}
      {(r.cadrage || r.origin) && (
        <div className="flex flex-nowrap items-center gap-[3px] min-w-0">
          {r.cadrage && (
            <span title="À rappeler pour clarifier le besoin avant l'appel"
              className="flex-none inline-flex items-center gap-1 text-[9px] font-semibold px-[5px] py-[1px] rounded-full leading-tight whitespace-nowrap bg-[#D1FAE5] text-[#047857] dark:bg-emerald-500/15 dark:text-emerald-400">
              <ClipboardCheck size={9} className="flex-shrink-0" /><span>Appel de clarté</span>
            </span>
          )}
          {/* Étape atteinte : c'est ce qui dit au setter quoi raconter au téléphone.
              Le rendez-vous pris est en vert plein, le reste en gris progressif. */}
          {r.journeyStep && JOURNEY_STEPS[r.journeyStep] && (
            <span title={JOURNEY_STEPS[r.journeyStep].hint}
              className="min-w-0 flex-shrink inline-flex items-center gap-1 text-[9px] font-semibold px-[5px] py-[1px] rounded-full leading-tight whitespace-nowrap"
              style={{ background: JOURNEY_STEPS[r.journeyStep].bg, color: JOURNEY_STEPS[r.journeyStep].fg }}>
              {JOURNEY_STEPS[r.journeyStep].iclosed && <IClosedMark size={9} />}
              <span>{JOURNEY_STEPS[r.journeyStep].label}</span>
            </span>
          )}
          {r.origin === 'facebook' && (
            <span title="Lead issu d'une publicité Meta"
              className="flex-none inline-flex items-center gap-1 text-[9px] font-semibold px-[5px] py-[1px] rounded-full leading-tight whitespace-nowrap bg-[#E8F0FE] text-[#0467DF] dark:bg-blue-500/15 dark:text-blue-300">
              <svg width="9" height="9" viewBox="0 0 24 24" className="flex-shrink-0"><path fill="currentColor" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" /></svg>
              <span>Facebook</span>
            </span>
          )}
        </div>
      )}
      {/* « À suivre » — raison (texte libre) + date d'entrée dans la colonne */}
      {r.column === 'a_suivre' && (r.followUpReason || r.followUpAt) && (
        <div className="flex flex-wrap items-center gap-1">
          {r.followUpReason && (
            <span title={r.followUpReason}
              className="max-w-full inline-flex items-center gap-1 text-[9px] font-semibold px-[5px] py-[1px] rounded-full leading-tight whitespace-nowrap bg-[#EDE9FE] text-[#6D28D9] dark:bg-violet-500/15 dark:text-violet-400">
              <Bookmark size={9} className="flex-shrink-0" /><span className="truncate">{r.followUpReason}</span>
            </span>
          )}
          {r.followUpAt && (
            <span title={`En suivi depuis le ${new Date(r.followUpAt).toLocaleDateString('fr-FR')}`}
              className="inline-flex items-center gap-1 text-[8.5px] md:text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-soren-elevated text-soren-muted">
              <CalendarCheck size={9} className="flex-shrink-0" />depuis le {fmtFollowUp(r.followUpAt)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Carte triable (sortable = transitions fluides comme la pipeline) ─────────
// On NE surcharge PAS onPointerDown (ça écraserait le listener dnd-kit).
// Distinction clic/drag via le ref `wasDragged` géré au niveau du DndContext.
function SortableCard({ r, onOpen, wasDragged, onMove, canPrev = false, canNext = false }: { r: ProspRecord; onOpen: () => void; wasDragged: React.MutableRefObject<boolean>; onMove?: (r: ProspRecord, dir: number) => void; canPrev?: boolean; canNext?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: r.id, data: { column: r.column },
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div ref={setNodeRef} {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Transform.toString(transform), transition }}>
      {/* mobile : flèches latérales pour déplacer la carte de colonne en colonne (sans drag) */}
      <div className="flex items-stretch gap-1">
        {onMove && (
          <button type="button" disabled={!canPrev} aria-label="Colonne précédente"
            onPointerDown={stop} onClick={e => { stop(e); onMove(r, -1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronLeft size={15} />
          </button>
        )}
        <div {...listeners} onClick={() => { if (!wasDragged.current) onOpen() }} className="flex-1 min-w-0 cursor-grab active:cursor-grabbing">
          <ProspCard r={r} />
        </div>
        {onMove && (
          <button type="button" disabled={!canNext} aria-label="Colonne suivante"
            onPointerDown={stop} onClick={e => { stop(e); onMove(r, 1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Colonne (zone de dépôt) ──────────────────────────────────
function Column({ col, records, onOpen, wasDragged, onMove, colIndex = 0, colCount = 1, isOver = false, blocked = false }: { col: typeof COLUMNS[number]; records: ProspRecord[]; onOpen: (r: ProspRecord) => void; wasDragged: React.MutableRefObject<boolean>; onMove?: (r: ProspRecord, dir: number) => void; colIndex?: number; colCount?: number; isOver?: boolean; blocked?: boolean }) {
  // setNodeRef = zone de drop ; isOver vient du board (suivi de `over` via onDragOver) — fiable avec le DragOverlay,
  // comme le kanban Pipeline (le surlignage colle exactement à la colonne où la card va tomber).
  const { setNodeRef } = useDroppable({ id: col.id })
  // Colonnes « issue » teintées comme le Pipeline (succès = vert, perte = rouge) — bien
  // visibles sur mobile, au lieu du gris uniforme. Les autres restent neutres.
  const baseAccent =
    col.id === 'rdv_booke'
      ? { label: 'text-[#16A34A]', zone: isOver ? 'bg-[#22C55E]/30 ring-1 ring-[#22C55E]' : 'bg-[#22C55E]/15 ring-1 ring-[#22C55E]/40' }
      : col.id === 'perdu'
        ? { label: 'text-[#DC2626]', zone: isOver ? 'bg-[#EF4444]/25 ring-1 ring-[#EF4444]' : 'bg-[#EF4444]/12 ring-1 ring-[#EF4444]/35' }
        : col.id === 'a_suivre'
          ? { label: 'text-[#7C3AED]', zone: isOver ? 'bg-[#8B5CF6]/25 ring-1 ring-[#8B5CF6]' : 'bg-[#8B5CF6]/12 ring-1 ring-[#8B5CF6]/35' }
          : col.id === 'leads_interne'
            ? { label: 'text-[#FF4D00]', zone: isOver ? 'bg-[#FF4D00]/15 border border-solid border-[#FF4D00]' : 'bg-[#FF4D00]/[0.05] border border-dashed border-[#FF4D00]/45' }
            : { label: 'text-soren-text', zone: isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.04]' }
  // Colonne SURVOLÉE mais interdite pour la card en cours (ex. lead normal → Leads interne) :
  // AUCUNE surbrillance — elle reste dans son état normal (juste un curseur « interdit »).
  const accent = blocked ? { label: baseAccent.label, zone: `${baseAccent.zone} cursor-not-allowed` } : baseAccent
  return (
    <div className="flex flex-col w-[82vw] max-w-[300px] md:w-[260px] flex-shrink-0 h-full">
      <div className="flex items-center gap-2 px-1 pb-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
        <span className={`text-[11px] font-semibold truncate flex-1 ${accent.label}`}>{col.label}</span>
        <span className="text-[10px] font-bold text-soren-subtle bg-soren-elevated rounded-full px-2 py-0.5">{records.length}</span>
      </div>
      <div ref={setNodeRef}
        className={`kanban-col flex-1 min-h-0 overflow-y-auto rounded-xl p-2 flex flex-col gap-2 transition-colors ${accent.zone}`}>
        <SortableContext items={records.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {records.map(r => <SortableCard key={r.id} r={r} onOpen={() => onOpen(r)} wasDragged={wasDragged} onMove={onMove} canPrev={COLUMNS.slice(0, colIndex).some(c => isMoveAllowed(r, c.id))} canNext={COLUMNS.slice(colIndex + 1).some(c => isMoveAllowed(r, c.id))} />)}
        </SortableContext>
        {records.length === 0 && <p className="text-[10px] text-soren-subtle text-center py-6">—</p>}
      </div>
    </div>
  )
}

// Portail vers <body> : indispensable pour que le fond flouté passe AU-DESSUS du header
// (fixe, z-40) — sinon la modale reste piégée dans le contexte d'empilement du contenu.
function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  // Verrou du scroll + masque la chrome mobile (header/nav) tant que la modale est
  // ouverte : sinon le header `fixed z-40`, opaque, resterait visible en transparence
  // sous le fond flouté (bg-black/40) et donnerait l'impression d'être « devant ».
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('vf-modal-open')
    return () => { document.body.style.overflow = prev; document.documentElement.classList.remove('vf-modal-open') }
  }, [])
  // Fermeture clavier (Échap).
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

// ─── Fiche (clic sur carte) — sobre, coordonnées + déplacement ────────────────
function Fiche({ r, onClose, onEdit, onMove, onClarityDone }: { r: ProspRecord; onClose: () => void; onEdit: () => void; onMove: (col: string) => void; onClarityDone: () => void }) {
  const tel = telHref(r.contact.phone)
  const ini = initialsOf(r.contact.fullName)
  return (
    <Overlay onClose={onClose}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[380px] bg-soren-card rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header — avatar discret, nom, société, statut courant */}
        <div className="flex items-start gap-3 md:gap-3.5 px-4 md:px-5 pt-4 md:pt-5 pb-3 md:pb-4">
          <span className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-soren-elevated text-soren-muted flex items-center justify-center text-[12px] md:text-[13px] font-semibold flex-shrink-0 ring-1 ring-soren-border">{ini}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] md:text-[15px] font-semibold text-soren-text leading-tight truncate">{r.contact.fullName}</p>
            {r.contact.companyName && <p className="flex items-center gap-1 text-[11px] md:text-[12px] text-soren-muted mt-0.5 min-w-0"><Building2 size={10} className="flex-shrink-0 md:w-[11px] md:h-[11px]" /><span className="truncate">{r.contact.companyName}</span></p>}
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 w-7 h-7 rounded-lg flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors flex-shrink-0"><X size={15} /></button>
        </div>

        {/* Coordonnées — lignes sobres, téléphone = appel direct, email = mailto */}
        <div className="mx-4 md:mx-5 mb-3 md:mb-4 rounded-xl border border-soren-border divide-y divide-soren-border overflow-hidden">
          {r.contact.phone ? (
            <a href={tel} className="flex items-center gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 hover:bg-soren-elevated transition-colors">
              <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0"><Phone size={12} className="text-[#FF4D00]" /></span>
              <span className="flex-1 min-w-0 text-[12px] md:text-[13px] font-medium text-soren-text truncate">{r.contact.phone}</span>
              <span className="inline-flex items-center gap-1 text-[10.5px] md:text-[11px] font-bold text-white bg-[#FF4D00] rounded-full px-2.5 md:px-3 py-1 md:py-1.5 flex-shrink-0 shadow-sm"><Phone size={11} /> Appeler</span>
            </a>
          ) : (
            <div className="flex items-center gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 text-soren-subtle">
              <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-soren-elevated flex items-center justify-center flex-shrink-0"><Phone size={12} /></span>
              <span className="text-[12px] md:text-[13px]">Aucun numéro</span>
            </div>
          )}
          {r.contact.email && (
            <a href={`mailto:${r.contact.email}`} className="flex items-center gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 hover:bg-soren-elevated transition-colors">
              <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-soren-elevated flex items-center justify-center flex-shrink-0"><Mail size={12} className="text-soren-muted" /></span>
              <span className="flex-1 min-w-0 text-[11px] md:text-[12.5px] text-soren-muted truncate">{r.contact.email}</span>
            </a>
          )}
        </div>

        {/* Déplacer — pastilles sobres avec point couleur ; interdites barrées/grisées */}
        <div className="px-4 md:px-5 pb-3 md:pb-4">
          <p className="text-[9.5px] md:text-[10px] font-semibold uppercase tracking-[0.08em] text-soren-subtle mb-2">Déplacer vers</p>
          <div className="grid grid-cols-2 gap-1.5">
            {COLUMNS.map(c => {
              const blocked = !isMoveAllowed(r, c.id)
              const isCurrent = c.id === r.column
              return (
                <button key={c.id} onClick={() => onMove(c.id)} disabled={isCurrent || blocked}
                  title={blocked ? blockReason(r, c.id) : undefined}
                  className={`inline-flex items-center gap-1.5 min-w-0 text-[10.5px] px-2 py-1.5 rounded-lg border transition-colors ${
                    isCurrent ? 'border-transparent font-semibold text-soren-text'
                    : blocked ? 'border-dashed border-soren-border text-soren-subtle line-through opacity-50 cursor-not-allowed'
                    : 'border-soren-border font-medium text-soren-muted hover:border-[#C8CBD0] hover:text-soren-text hover:bg-soren-elevated'
                  }`}
                  style={isCurrent ? { background: c.color + '14' } : undefined}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: blocked ? '#D1D5DB' : c.color }} />
                  <span className="truncate">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Appel de clarté terminé : la carte sort du board, le lead passe en R1. */}
        {r.cadrage && (
          <div className="px-4 md:px-5 pb-3">
            <button onClick={onClarityDone}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10A066] text-white text-[12.5px] font-semibold hover:opacity-90 transition-opacity">
              <ClipboardCheck size={14} /> Appel de clarté fait
            </button>
            <p className="mt-1.5 text-[10px] text-soren-subtle text-center">La carte quitte la prospection, le lead poursuit en R1.</p>
          </div>
        )}

        {/* Footer — fiche complète et, pour un lead à rappeler, sa fiche de closing */}
        <div className="flex border-t border-soren-border divide-x divide-soren-border">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 md:py-3 text-[11px] md:text-[12px] font-medium text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors">
            Fiche complète <ChevronRight size={13} />
          </button>
          <a href={`/closing?contact=${r.contactId}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-3 text-[11px] md:text-[12px] font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/[0.06] transition-colors">
            <Headphones size={13} /> Fiche closing
          </a>
        </div>
      </div>
    </div>
    </Overlay>
  )
}

// ─── Booking R1 iClosed (drop dans "RDV Booké sur iClosed") ───
// iClosed n'autorise pas l'iframe → on ouvre la page dans un nouvel onglet (déclenché par le clic).
// Obligation de cliquer le lien : la carte n'est enregistrée en "RDV booké" que via "Ouvrir iClosed".
// Toute fermeture sans clic (fond, Annuler) renvoie la carte à sa colonne d'origine.
function IClosedBookingModal({ rec, onConfirm, onCancel }: { rec: ProspRecord; onConfirm: () => void; onCancel: () => void }) {
  const params = new URLSearchParams()
  // iClosed attend les paramètres `iclosedName` / `iclosedEmail` / `iclosedPhone` (pas `name` / `email`).
  if (rec.contact.fullName) params.set('iclosedName', rec.contact.fullName)
  if (rec.contact.email) params.set('iclosedEmail', rec.contact.email)
  if (rec.contact.phone) params.set('iclosedPhone', rec.contact.phone)
  const url = ICLOSED_R1_BOOKING_URL + (ICLOSED_R1_BOOKING_URL.includes('?') ? '&' : '?') + params.toString()
  return (
    <Overlay onClose={onCancel}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-soren-card rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 text-center">
        <span className="w-12 h-12 rounded-full bg-[#16A34A]/12 flex items-center justify-center"><CalendarCheck size={22} className="text-[#16A34A]" /></span>
        <div>
          <p className="text-[15px] font-bold text-soren-text">Booker le R1</p>
          <p className="text-[12px] text-soren-muted mt-1"><span className="font-semibold text-soren-text">{rec.contact.fullName}</span> : choisis la date, l'heure et le closer sur iClosed.</p>
          {(rec.contact.email || rec.contact.phone) && <p className="text-[11px] text-soren-subtle mt-1.5">Pré-rempli :{rec.contact.email ? ` ${rec.contact.email}` : ''}{rec.contact.email && rec.contact.phone ? ' ·' : ''}{rec.contact.phone ? ` ${rec.contact.phone}` : ''}</p>}
        </div>
        <a href={url} target="_blank" rel="noreferrer" onClick={onConfirm}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#FF4D00] text-white text-[13px] font-bold hover:bg-[#E64500] transition-colors">
          <ExternalLink size={15} /> Ouvrir iClosed
        </a>
        <button onClick={onCancel} className="text-[11px] font-semibold text-soren-subtle hover:text-soren-text">Annuler</button>
      </div>
    </div>
    </Overlay>
  )
}

// ─── Raison de perte (drop dans "Perdu") ─────────────────────
// Fond flouté ; on doit choisir une raison avant de confirmer le passage en Perdu.
function LostReasonModal({ rec, onConfirm, onCancel }: { rec: ProspRecord; onConfirm: (reason: string) => void; onCancel: () => void }) {
  return (
    <Overlay onClose={onCancel}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-soren-card rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-full bg-soren-elevated flex items-center justify-center"><UserMinus size={22} className="text-soren-subtle" /></span>
          <div>
            <p className="text-[15px] font-semibold text-soren-text">Raison de la perte</p>
            <p className="text-[12px] text-soren-muted mt-1">Pourquoi <span className="font-semibold text-soren-text">{rec.contact.fullName}</span> est-il perdu ?</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {LOST_REASONS.map(r => {
            const Icon = r.icon
            return (
              <button key={r.code} onClick={() => onConfirm(r.code)}
                className="w-full flex items-center gap-3 h-11 px-4 rounded-lg border border-soren-border bg-soren-card text-[13px] font-medium text-soren-text hover:border-soren-text/25 hover:bg-soren-elevated transition-colors">
                <Icon size={17} className="text-soren-subtle flex-shrink-0" />{r.label}
              </button>
            )
          })}
        </div>
        <button onClick={onCancel} className="text-[11px] font-semibold text-soren-subtle hover:text-soren-text">Annuler</button>
      </div>
    </div>
    </Overlay>
  )
}

// ─── Raison « À suivre » (drop dans "À suivre") ──────────────
// Fond flouté ; texte libre obligatoire. La description saisie devient le chip violet sur la carte.
function FollowUpReasonModal({ rec, onConfirm, onCancel }: { rec: ProspRecord; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState(rec.followUpReason ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const trimmed = reason.trim()
  const submit = () => { if (trimmed) onConfirm(trimmed) }
  return (
    <Overlay onClose={onCancel}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-soren-card rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center"><Bookmark size={22} className="text-[#7C3AED]" /></span>
          <div>
            <p className="text-[15px] font-bold text-soren-text">Pourquoi le suivre ?</p>
            <p className="text-[12px] text-soren-muted mt-1">Indique la raison pour <span className="font-semibold text-soren-text">{rec.contact.fullName}</span>. Elle apparaîtra sur sa carte pour le repérer facilement.</p>
          </div>
        </div>
        <input ref={inputRef} value={reason} onChange={e => setReason(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="ex : rappeler après les vacances"
          className="w-full h-11 px-4 rounded-xl border border-soren-border bg-soren-card text-[13px] text-soren-text placeholder-[#9CA3AF] outline-none focus:border-[#8B5CF6] transition-colors" />
        <button onClick={submit} disabled={!trimmed}
          className="w-full h-11 rounded-xl bg-[#8B5CF6] text-white text-[13px] font-bold hover:bg-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Mettre à suivre
        </button>
        <button onClick={onCancel} className="text-[11px] font-semibold text-soren-subtle hover:text-soren-text">Annuler</button>
      </div>
    </div>
    </Overlay>
  )
}

export default function ProspectionView() {
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)   // colonne/carte survolée pendant le drag (surlignage board, comme Pipeline)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editContactId, setEditContactId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [bookingFor, setBookingFor] = useState<{ rec: ProspRecord; from: string } | null>(null)
  const [lostFor, setLostFor] = useState<{ rec: ProspRecord; from: string } | null>(null)
  const [followFor, setFollowFor] = useState<{ rec: ProspRecord; from: string } | null>(null)
  const wasDragged = useRef(false)
  const isDraggingRef = useRef(false)   // true pendant un drag → coupe le scroll-wheel custom (laisse l'auto-scroll dnd-kit)

  const serverRecords = (useQuery(api.osProspection.list, { search: search || undefined }) ?? []) as ProspRecord[]
  const setColumn = useMutation(api.osProspection.setColumn)
  const clarityDone = useMutation(api.osProspection.clarityDone)
  const linkContact = useMutation(api.osProspection.linkContact)

  // État local optimiste : le drop déplace la carte instantanément (pas d'attente Convex),
  // ce qui rend l'animation de drop fluide. On resync au serveur hors fenêtre de drop.
  const [items, setItems] = useState<ProspRecord[]>([])
  const lastDropRef = useRef(0)
  useEffect(() => {
    if (Date.now() - lastDropRef.current < 700) return
    setItems(serverRecords)
  }, [serverRecords])

  // Règles de scroll identiques au kanban pipeline : horizontal animé (shift/trackpad/espaces),
  // vertical animé par colonne (molette au-dessus d'une .kanban-col), jamais de débordement croisé.
  const boardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const clampH = (v: number) => Math.max(0, Math.min(el.scrollWidth - el.clientWidth, v))
    let hTarget = el.scrollLeft, hRaf: number | null = null
    let vCol: HTMLElement | null = null, vTarget = 0, vRaf: number | null = null
    function hAnimate() {
      if (!el || isDraggingRef.current) { hRaf = null; return }   // pendant un drag, on laisse l'auto-scroll dnd-kit
      const diff = hTarget - el.scrollLeft
      if (Math.abs(diff) < 0.5) { el.scrollLeft = hTarget; hRaf = null; return }
      el.scrollLeft += diff * 0.16; hRaf = requestAnimationFrame(hAnimate)
    }
    function vAnimate() {
      if (!vCol) { vRaf = null; return }
      const diff = vTarget - vCol.scrollTop
      if (Math.abs(diff) < 0.5) { vCol.scrollTop = vTarget; vRaf = null; return }
      vCol.scrollTop += diff * 0.2; vRaf = requestAnimationFrame(vAnimate)
    }
    const onWheel = (e: WheelEvent) => {
      if (isDraggingRef.current) return   // drag en cours → ne pas concurrencer l'auto-scroll dnd-kit
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        if (!hRaf) hTarget = el.scrollLeft   // resync : dnd-kit / scroll natif a pu déplacer le board
        hTarget = clampH(hTarget + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY))
        if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
        return
      }
      const col = document.elementsFromPoint(e.clientX, e.clientY).find(c => c.classList.contains('kanban-col')) as HTMLElement | undefined
      if (col) {
        e.preventDefault()
        if (col.scrollHeight > col.clientHeight) {
          if (vCol !== col) { vCol = col; vTarget = col.scrollTop }
          vTarget = Math.max(0, Math.min(col.scrollHeight - col.clientHeight, vTarget + e.deltaY))
          if (!vRaf) vRaf = requestAnimationFrame(vAnimate)
        }
        return
      }
      e.preventDefault()
      if (!hRaf) hTarget = el.scrollLeft   // resync avant de relancer l'animation
      hTarget = clampH(hTarget + e.deltaY)
      if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel); if (hRaf) cancelAnimationFrame(hRaf); if (vRaf) cancelAnimationFrame(vRaf) }
  }, [])

  const byColumn = useMemo(() => {
    const m: Record<string, ProspRecord[]> = {}
    for (const c of COLUMNS) m[c.id] = []
    for (const r of items) (m[r.column] ?? m['leads_a_traiter']).push(r)
    return m
  }, [items])

  const openRec = items.find(r => r.id === openId) ?? null
  const activeRec = items.find(r => r.id === activeId) ?? null
  // Colonne réellement survolée (overId peut être une colonne OU une carte) → surlignage fiable, comme Pipeline.
  const overColumn = overId ? (COLUMN_IDS.includes(overId) ? overId : items.find(r => r.id === overId)?.column ?? null) : null

  const sensors = useKanbanSensors()
  // Drop précis au pointeur : on prend la colonne réellement SOUS la souris (pointerWithin),
  // et seulement si le pointeur est entre deux colonnes on retombe sur la plus proche (closestCenter).
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args)
    return pointerHits.length > 0 ? pointerHits : closestCenter(args)
  }, [])

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    isDraggingRef.current = false
    setTimeout(() => { wasDragged.current = false }, 50) // laisse passer le clic post-drag
    const overId = e.over ? String(e.over.id) : null
    if (!overId) return
    // La cible peut être une colonne (drop sur zone vide) ou une carte (drop sur une autre carte).
    const target = COLUMN_IDS.includes(overId) ? overId : items.find(r => r.id === overId)?.column
    if (!target) return
    const rec = items.find(r => r.id === e.active.id)
    if (!rec || rec.column === target) return
    if (!isMoveAllowed(rec, target)) return   // lead interne → retour en "Leads à traiter" interdit (la carte snap back)
    // Perdu / RDV booké → la carte NE bouge PAS tant que ce n'est pas confirmé (raison / lien iClosed).
    // Sinon elle "semble" déposée mais rien n'est enregistré → désync apparente avec la fiche contact.
    if (target === 'perdu') { setLostFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    if (target === 'rdv_booke') { setBookingFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    if (target === 'a_suivre') { setFollowFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    lastDropRef.current = Date.now()
    const fromCol = rec.column
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: target } : r)) // optimiste
    setColumn({ id: rec.id as never, column: target }).catch(() => {
      setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: fromCol } : r)) // revert si le serveur refuse
    })
  }

  // Déplacement par flèches (mobile) : carte → colonne adjacente. Même routage que le drag
  // (Perdu → modale raison, RDV booké → modale lien iClosed), sinon persistance directe.
  function moveProsp(rec: ProspRecord, dir: number) {
    const i = COLUMN_IDS.indexOf(rec.column)
    // avance jusqu'à la prochaine colonne AUTORISÉE dans la direction (saute les colonnes réservées,
    // ex : "Leads interne" pour un lead normal → un lead à traiter passe directement à NRP 1).
    let j = i + dir
    while (COLUMNS[j] && !isMoveAllowed(rec, COLUMNS[j].id)) j += dir
    const target = COLUMNS[j]?.id
    if (!target || target === rec.column) return
    if (target === 'perdu') { setLostFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    if (target === 'rdv_booke') { setBookingFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    if (target === 'a_suivre') { setFollowFor({ rec: { ...rec, column: target }, from: rec.column }); return }
    lastDropRef.current = Date.now()
    const fromCol = rec.column
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: target } : r))
    setColumn({ id: rec.id as never, column: target }).catch(() => {
      setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: fromCol } : r)) // revert si le serveur refuse
    })
  }

  // Confirme la perte avec la raison choisie (chip rouge + persistance Convex).
  function commitLost(reason: string) {
    if (!lostFor) return
    const { rec } = lostFor
    lastDropRef.current = Date.now()
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: 'perdu', lostReason: reason } : r))
    setColumn({ id: rec.id as never, column: 'perdu', lostReason: reason })
    setLostFor(null)
  }
  // Annule le passage en Perdu → la carte retourne à sa colonne d'origine (aucune persistance).
  function cancelLost() {
    if (!lostFor) return
    const { rec, from } = lostFor
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: from } : r))
    setLostFor(null)
  }

  // Confirme le RDV booké (déclenché par le clic sur le lien iClosed) → persiste la colonne.
  function commitBooking() {
    if (!bookingFor) return
    const { rec } = bookingFor
    lastDropRef.current = Date.now()
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: 'rdv_booke' } : r))
    setColumn({ id: rec.id as never, column: 'rdv_booke' })
    setBookingFor(null)
  }
  // Annule le RDV booké (lien non cliqué) → la carte retourne à sa colonne d'origine.
  function cancelBooking() {
    if (!bookingFor) return
    const { rec, from } = bookingFor
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: from } : r))
    setBookingFor(null)
  }

  // Confirme le passage en "À suivre" avec la raison saisie (chip violet + persistance Convex).
  function commitFollowUp(reason: string) {
    if (!followFor) return
    const { rec } = followFor
    lastDropRef.current = Date.now()
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: 'a_suivre', followUpReason: reason } : r))
    setColumn({ id: rec.id as never, column: 'a_suivre', followUpReason: reason })
    setFollowFor(null)
  }
  // Annule le passage en "À suivre" → la carte retourne à sa colonne d'origine (aucune persistance).
  function cancelFollowUp() {
    if (!followFor) return
    const { rec, from } = followFor
    setItems(prev => prev.map(r => r.id === rec.id ? { ...r, column: from } : r))
    setFollowFor(null)
  }

  // Pour la modale d'édition complète du contact (réutilise NewContactModal)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullContact = useQuery(api.crm_contacts.get, editContactId ? { id: editContactId as never } : 'skip') as any
  const editGhl: GHLContact | undefined = fullContact ? {
    id: fullContact._id, contactName: `${fullContact.firstName ?? ''} ${fullContact.lastName ?? ''}`.trim(),
    firstName: fullContact.firstName ?? null, lastName: fullContact.lastName ?? null,
    email: fullContact.email ?? null, phone: fullContact.phone ?? null,
    companyName: fullContact.companyName ?? null, address1: fullContact.address1 ?? null,
    city: fullContact.city ?? null, postalCode: fullContact.postalCode ?? null,
    website: fullContact.website ?? null, source: fullContact.source ?? null,
    tags: fullContact.tags ?? [], dateAdded: fullContact.createdAt ?? '', dateUpdated: fullContact.updatedAt ?? null,
    metier: fullContact.metier ?? null, niche: fullContact.niche ?? null,
    statut: fullContact.statut ?? null, lostStage: fullContact.lostStage ?? null, lostReason: fullContact.lostReason ?? null, lostObjection: fullContact.lostObjection ?? null,
    wonObjection: fullContact.wonObjection ?? null, dealDate: fullContact.dealDate ?? null,
  } : undefined

  return (
    <div className="h-full flex flex-col overflow-hidden bg-soren-app">
      {/* Barre supérieure */}
      <div className="px-5 pt-2.5 pb-2 flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xs bg-soren-card border border-soren-border rounded-full px-3 py-1.5">
            <Search size={12} className="text-soren-subtle flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un lead…" className="flex-1 min-w-0 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-soren-text bg-soren-elevated rounded-full px-3 py-1.5 flex-shrink-0">
            {items.length}<span className="text-soren-subtle font-medium">leads</span>
          </span>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-[#FF4D00] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#e64500] transition-colors flex-shrink-0"><Plus size={12} /> Nouveau lead</button>
      </div>

      {/* Board kanban */}
      <div className="flex-1 min-h-0 px-5 pb-4">
        <DndContext sensors={sensors} collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          autoScroll={{ canScroll: el => el === boardRef.current, threshold: { x: 0.2, y: 0 }, acceleration: 20 }}
          onDragStart={(e: DragStartEvent) => { wasDragged.current = true; isDraggingRef.current = true; setActiveId(String(e.active.id)) }}
          onDragOver={e => setOverId(e.over ? String(e.over.id) : null)}
          onDragEnd={onDragEnd}
          onDragCancel={() => { setActiveId(null); setOverId(null); isDraggingRef.current = false; setTimeout(() => { wasDragged.current = false }, 50) }}>
          <div ref={boardRef} className="h-full flex gap-3 overflow-x-auto pb-1">
            {/* Marge de tête : évite que l'anneau de surbrillance de la 1ʳᵉ colonne (Leads à traiter) soit rogné par le bord du conteneur scrollable. */}
            <div aria-hidden className="w-0.5 flex-shrink-0" />
            {COLUMNS.map((col, ci) => {
              const hovered = overColumn === col.id
              const allowed = !activeRec || isMoveAllowed(activeRec, col.id)   // la card en cours peut-elle aller ici ?
              return (
              <Column key={col.id} col={col} records={byColumn[col.id] ?? []} onOpen={r => setOpenId(r.id)} wasDragged={wasDragged}
                onMove={moveProsp} colIndex={ci} colCount={COLUMNS.length} isOver={hovered && allowed} blocked={hovered && !allowed} />
            )})}
            {/* Espace de fin : évite que l'anneau/teinte de la dernière colonne (Perdu) soit
                rogné par le bord du conteneur scrollable (le padding-right n'y est pas respecté). */}
            <div aria-hidden className="w-2 flex-shrink-0" />
          </div>
          <DragOverlay dropAnimation={dropAnimation}>{activeRec ? <div className="w-[230px]"><ProspCard r={activeRec} dragging /></div> : null}</DragOverlay>
        </DndContext>
      </div>

      {/* Fiche */}
      {openRec && (
        <Fiche r={openRec} onClose={() => setOpenId(null)}
          onEdit={() => { setEditContactId(openRec.contactId); setOpenId(null) }}
          onClarityDone={async () => { await clarityDone({ id: openRec.id as never }); setOpenId(null) }}
          onMove={col => {
            if (!isMoveAllowed(openRec, col)) return   // garde-fou : lead interne → "Leads à traiter" interdit
            // Perdu / RDV booké → on attend la confirmation avant de déplacer/enregistrer.
            if (col === 'perdu') { setLostFor({ rec: { ...openRec, column: col }, from: openRec.column }); setOpenId(null); return }
            if (col === 'rdv_booke') { setBookingFor({ rec: { ...openRec, column: col }, from: openRec.column }); setOpenId(null); return }
            if (col === 'a_suivre') { setFollowFor({ rec: { ...openRec, column: col }, from: openRec.column }); setOpenId(null); return }
            lastDropRef.current = Date.now()
            setItems(prev => prev.map(r => r.id === openRec.id ? { ...r, column: col } : r))
            setColumn({ id: openRec.id as never, column: col })
          }} />
      )}

      {/* Raison de perte — déclenché par un passage en "Perdu" */}
      {lostFor && <LostReasonModal rec={lostFor.rec} onConfirm={commitLost} onCancel={cancelLost} />}

      {/* Raison « À suivre » — déclenché par un passage en "À suivre" */}
      {followFor && <FollowUpReasonModal rec={followFor.rec} onConfirm={commitFollowUp} onCancel={cancelFollowUp} />}

      {/* Édition complète du contact */}
      {editContactId && editGhl && (
        <NewContactModal contact={editGhl} initialStatut={(fullContact?.statut as 'lead' | 'client' | 'perdu') ?? 'lead'} initialCanton={fullContact?.canton ?? ''} onClose={() => setEditContactId(null)} onSave={() => setEditContactId(null)} />
      )}

      {/* Nouveau lead */}
      {creating && (
        <NewContactModal mode="leads" initialSource="outbound" onClose={() => setCreating(false)}
          onAdd={c => { linkContact({ contactId: c.id as never, temperature: 'froid' }); setCreating(false) }} />
      )}

      {/* Booking R1 iClosed — déclenché par un passage en "RDV Booké sur iClosed" */}
      {bookingFor && <IClosedBookingModal rec={bookingFor.rec} onConfirm={commitBooking} onCancel={cancelBooking} />}
    </div>
  )
}
