'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { type Id } from '../../../convex/_generated/dataModel'
import PipelineMobileTabs from '@/components/pipeline/PipelineMobileTabs'
import { Modal } from '@/components/ui/Modal'
import { IClosedBookingModal, ICLOSED_R1_BOOKING_URL, ICLOSED_R2_BOOKING_URL } from '@/components/shared/IClosedBookingModal'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  pointerWithin,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, X, ArrowLeft, Search, ArrowUpRight } from 'lucide-react'
import { type GHLPipelineData, type GHLStage, type Opportunity, type Lead } from './types'
import { NONVENTE_REASONS, NONVENTE_OBJECTIONS } from '@/lib/lostReasons'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/useToast'
import { useKanbanSensors } from '@/hooks/useKanbanSensors'
import { Toaster } from '@/components/shared/Toaster'
import ContactSlideOver from './ContactSlideOver'

const NewLeadWidget = dynamic(() => import('@/components/shared/NewLeadWidget'), { ssr: false })
const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
}

const LOST_PREFIX = 'lost-'

// Pas de pastille d'initiales sur les cartes du board Leads (demande Thomas,
// 03/08) : le nom est déjà en tête de carte, la pastille ne disait rien de plus
// et mangeait la largeur utile des chips (source, no-show, clarté).

// Chips de source :reflètent fidèlement contact.source (inbound/outbound/recommandation/…).
const SOURCE_META: Record<string, { label: string; bg: string; color: string }> = {
  inbound:        { label: 'inbound',  bg: '#DCFCE7', color: '#16A34A' },
  outbound:       { label: 'outbound', bg: '#FCE7F3', color: '#EC4899' },
  recommandation: { label: 'recommandation', bg: '#EDE9FE', color: '#7C3AED' },
  referral:       { label: 'recommandation', bg: '#EDE9FE', color: '#7C3AED' },
}

// ─── Opportunity Card ─────────────────────────────────────────
function OppCard({ opp, isDragging = false, muted = false, hideValue = false }: { opp: Opportunity; isDragging?: boolean; muted?: boolean; hideValue?: boolean }) {
  const date = new Date(opp.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  // La source vient de la fiche contact (source unique de vérité). Toute valeur est rendue ;
  // une source non standard tombe sur une chip neutre avec son libellé réel.
  const src = opp.source ? (SOURCE_META[opp.source] ?? { label: opp.source, bg: '#F3F4F6', color: '#6B7280' }) : null

  return (
    <div className={`
      border rounded-lg px-3 py-2 flex flex-col gap-1 select-none transition-all
      ${muted
        ? 'bg-soren-card/50 border-soren-border/50 opacity-60 grayscale'
        : isDragging
          ? 'bg-soren-card border-[#FF4D00] shadow-[0_0_0_1px_#FF4D00,0_4px_16px_rgba(200,241,53,0.15)] rotate-1 opacity-95 cursor-grabbing'
          : 'bg-soren-card border-soren-border hover:border-[#C8CBD0] hover:shadow-sm cursor-grab'
      }
    `}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 min-w-0 text-[10.5px] font-normal text-soren-text leading-tight truncate">{opp.name}</p>
        <span className="text-[10px] text-soren-subtle shrink-0">{date}</span>
      </div>
      <div className="flex items-center gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-1">
          {!hideValue && (
            <span className="text-xs font-bold text-soren-text shrink-0">
              {opp.value > 0 ? `${opp.value.toLocaleString('fr-FR')} CHF` : '—'}
            </span>
          )}
          {src && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: src.bg, color: src.color }}>{src.label}</span>}
          {opp.noShow && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#FEE2E2', color: '#DC2626' }}>no-show</span>}
          {/* Appel de clarté : rouge tant qu'il reste à passer, vert une fois fait.
              Sans lui, une carte en R1 laisse croire que le lead est déjà cadré. */}
          {opp.clarity === 'pending' && (
            <span title="Appel de clarté à passer" className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#FEE2E2', color: '#DC2626' }}>clarté à faire</span>
          )}
          {opp.clarity === 'done' && (
            <span title="Appel de clarté effectué" className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#D1FAE5', color: '#047857' }}>clarté faite</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sortable Card ────────────────────────────────────────────
function SortableCard({ opp, onCardClick, wasDragged, onMove, canPrev = false, canNext = false }: { opp: Opportunity; onCardClick: () => void; wasDragged: React.MutableRefObject<boolean>; onMove?: (opp: Opportunity, dir: number) => void; canPrev?: boolean; canNext?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: opp.id,
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        opacity:    isDragging ? 0.3 : 1,
        transform:  CSS.Transform.toString(transform),
        transition,
      }}
    >
      {/* mobile : flèches latérales pour déplacer la carte de colonne en colonne (sans drag) ;
          desktop : seule la carte s'affiche (flèches md:hidden), drag classique. */}
      <div className="flex items-stretch gap-1">
        {onMove && (
          <button type="button" disabled={!canPrev} aria-label="Étape précédente"
            onPointerDown={stop} onClick={e => { stop(e); onMove(opp, -1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronLeft size={15} />
          </button>
        )}
        <div {...listeners} onClick={() => { if (!wasDragged.current) onCardClick() }} className="flex-1 min-w-0 cursor-grab active:cursor-grabbing">
          <OppCard opp={opp} hideValue />
        </div>
        {onMove && (
          <button type="button" disabled={!canNext} aria-label="Étape suivante"
            onPointerDown={stop} onClick={e => { stop(e); onMove(opp, 1) }}
            className="md:hidden flex-none w-6 flex items-center justify-center rounded-lg bg-soren-card border border-soren-border text-soren-muted disabled:opacity-25 active:bg-soren-elevated transition-colors">
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Lost Zone ────────────────────────────────────────────────
function LostZone({ stageId, isOver }: { stageId: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: `${LOST_PREFIX}${stageId}` })
  return (
    <div
      ref={setNodeRef}
      className={`
        mt-1.5 flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150 cursor-default select-none
        ${isOver
          ? 'bg-red-500/15 border-2 border-red-400 py-3 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]'
          : 'border border-dashed border-red-400/30 py-1.5 hover:border-red-400/50'
        }
      `}
    >
      <span className={`text-[10px] font-semibold transition-colors ${isOver ? 'text-red-500' : 'text-red-400/50'}`}>
        {isOver ? '↓ Marquer perdu' : 'Zone perdu'}
      </span>
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────
interface KanbanColumnProps {
  stage: GHLStage
  opps: Opportunity[]
  isOver: boolean
  onCardClick: (opp: Opportunity) => void
  wasDragged: React.MutableRefObject<boolean>
  showLost: boolean
  isLostOver: boolean
  isLastStage?: boolean
  onReopen?: (opp: Opportunity) => void
  mobileActive?: boolean
  stageIndex?: number
  stageCount?: number
  onMove?: (opp: Opportunity, dir: number) => void
}

function KanbanColumn({ stage, opps, isOver, onCardClick, wasDragged, showLost, isLostOver, isLastStage, onReopen, mobileActive = true, stageIndex = 0, stageCount = 1, onMove }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  const isFirstStage = stageIndex === 0   // Nouveau lead → pas de zone perdu

  return (
    <div className="flex flex-col w-[200px] md:w-48 flex-shrink-0 h-full">
      <div className={`flex items-center justify-between mb-2 px-0.5 transition-opacity ${showLost ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isLastStage ? '#22C55E' : stage.color }} />
          <span className={`text-[11px] font-semibold truncate max-w-[120px] ${isLastStage ? 'text-[#16A34A]' : 'text-[#374151]'}`}>{stage.name}</span>
          <span className="text-[9px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-sm">
            {opps.length}
          </span>
        </div>
        {/* Raccourci vers le module où se travaille cette étape : la file
            d'appels pour les nouveaux leads, la préparation d'appel pour les R1
            et R2. Calé À DROITE de l'en-tête, loin du nom et du compteur, pour
            qu'il se voie sans se mêler à la lecture de la colonne. */}
        {MODULE_DE_LETAPE[stage.id] && (
          <a
            href={MODULE_DE_LETAPE[stage.id].href}
            title={MODULE_DE_LETAPE[stage.id].titre}
            onClick={e => e.stopPropagation()}
            className="w-[18px] h-[18px] rounded-md border border-[#FF4D00]/60 bg-transparent grid place-items-center text-[#FF4D00] hover:border-[#FF4D00] hover:bg-[#FF4D00]/10 transition-colors flex-shrink-0"
          >
            <ArrowUpRight size={11} />
          </a>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col rounded-xl p-2 transition-colors overflow-hidden ${
          showLost
            ? 'bg-black/[0.02]'
            : isLastStage
              ? isOver ? 'bg-[#22C55E]/40 ring-2 ring-[#16A34A]' : 'bg-[#22C55E]/20 ring-1 ring-[#22C55E]/60'
              : isOver ? 'bg-[#FF4D00]/10 ring-1 ring-[#FF4D00]/40' : 'bg-black/[0.04]'
        }`}
      >
        {showLost ? (
          <div className="flex-1 min-h-0 overflow-y-auto kanban-col flex flex-col gap-1.5">
            {opps.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[11px] text-soren-subtle">Aucun perdu</p>
              </div>
            ) : (
              opps.map(opp => (
                <div key={opp.id} className="relative group/lost">
                  <OppCard opp={opp} muted />
                  <button
                    type="button"
                    onClick={() => onReopen?.(opp)}
                    className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center gap-1.5 rounded-lg bg-[#16A34A]/90 text-white text-[11px] font-bold opacity-0 group-hover/lost:opacity-100 transition-opacity"
                  >
                    ↩ Rouvrir en lead
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <SortableContext items={opps.map(o => o.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 min-h-0 overflow-y-auto kanban-col flex flex-col gap-1.5">
              {opps.map(opp => <SortableCard key={opp.id} opp={opp} onCardClick={() => onCardClick(opp)} wasDragged={wasDragged} onMove={onMove} canPrev={stageIndex > 0} canNext={stageIndex < stageCount - 1} />)}
              {opps.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[11px] text-soren-subtle">Déposer ici</p>
                </div>
              )}
            </div>
          </SortableContext>
        )}

        {/* 1ʳᵉ étape (Nouveau lead) et dernière étape : pas de zone perdu :un nouveau lead ne peut pas
            être perdu. Pas de réservateur d'espace → les cartes occupent toute la hauteur (les colonnes
            restent alignées via l'étirement flex du board row). */}
        {/* Après la signature, il n'y a plus de « perdu » : un client se termine
            ou se poursuit, il ne se perd pas dans le tunnel de vente. */}
        {!showLost && !isLastStage && !isFirstStage && !ID_ETAPES_CLIENT.has(stage.id) && <LostZone stageId={stage.id} isOver={isLostOver} />}
      </div>
    </div>
  )
}

// ─── Trash Zone ──────────────────────────────────────────────
const TRASH_ID = '__trash__'

// Zone de suppression inline (dans le header, à gauche de « Voir perdus ») :visible pendant un drag.
function TrashZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: TRASH_ID })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed text-[10.5px] font-semibold whitespace-nowrap transition-all cursor-default select-none
        ${isOver
          ? 'bg-red-500 border-red-400 text-white scale-105 shadow-[0_0_0_3px_rgba(239,68,68,0.2)]'
          : 'bg-soren-card border-red-300 text-red-400'
        }`}
    >
      <Trash2 size={12} className={isOver ? 'text-white' : 'text-red-400'} />
      Supprimer
    </div>
  )
}

// ─── Modale Non-vente (perte en R1/R2) :étape raison → étape objection ───
function NonVenteModal({
  contactName, step, onPickReason, onPickObjection, onBack, onCancel,
}: {
  contactName: string
  step: 'reason' | 'objection'
  onPickReason: (code: string) => void
  onPickObjection: (code: string) => void
  onBack: () => void
  onCancel: () => void
}) {
  const isReason = step === 'reason'
  return (
    <Modal onClose={onCancel}>
      <div className="relative w-full max-w-md bg-soren-card rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {!isReason && (
            <button onClick={onBack} className="w-7 h-7 -ml-1 rounded-lg flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors flex-shrink-0"><ArrowLeft size={15} /></button>
          )}
          <div className="flex-1 text-center">
            <p className="text-[15px] font-bold text-soren-text">
              {isReason ? 'Veuillez sélectionner la raison de la non-vente' : "Quelle objection n'avez-vous pas pu surmonter ?"}
            </p>
            <p className="text-[12px] text-soren-muted mt-1"><span className="font-semibold text-soren-text">{contactName}</span></p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 -mr-1 rounded-lg flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors flex-shrink-0"><X size={15} /></button>
        </div>

        <div className="flex flex-col gap-2">
          {(isReason ? NONVENTE_REASONS : NONVENTE_OBJECTIONS).map(o => {
            const Icon = o.icon
            return (
              <button key={o.code} onClick={() => (isReason ? onPickReason(o.code) : onPickObjection(o.code))}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-soren-border bg-soren-card text-left hover:border-[#DC2626] hover:bg-[#FEE2E2]/40 transition-colors">
                <Icon size={18} className="text-[#DC2626] flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-soren-text">{o.label}</span>
                  <span className="block text-[11px] text-soren-muted truncate">{o.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Board ───────────────────────────────────────────────
interface KanbanBoardProps {
  initialPipelines:     GHLPipelineData[]
  initialOpportunities: Opportunity[]
}

/**
 * Suite du parcours, après la signature.
 *
 * « Nouveau client » n'est pas dupliqué : c'est la dernière colonne des leads ET
 * la première des clients, c'est la même. Les cinq colonnes ci-dessous la
 * prolongent, dans la même ligne.
 */
const ETAPES_CLIENT: { id: string; name: string; color: string }[] = [
  { id: 'onboarding-envoye',  name: 'Onboarding envoyé',   color: '#F59E0B' },
  { id: 'onboarding-complet', name: 'Onboarding complété', color: '#3B82F6' },
  { id: 'kickoff-booke',      name: 'Kickoff booké',       color: '#8B5CF6' },
  { id: 'setup-cree',         name: 'Setup créé',          color: '#EC4899' },
  { id: 'consulting',         name: 'Consulting',          color: '#0EA5E9' },
]
const ID_ETAPES_CLIENT = new Set(['nouveau-client', ...ETAPES_CLIENT.map(e => e.id)])

/** Le module où se travaille concrètement chaque étape. */
const MODULE_DE_LETAPE: Record<string, { href: string; titre: string }> = {
  'nouveau-lead':       { href: '/prospection', titre: 'Ouvrir la Prospection' },
  r1:                   { href: '/closing',     titre: 'Ouvrir le Closing' },
  r2:                   { href: '/closing',     titre: 'Ouvrir le Closing' },
  'onboarding-envoye':  { href: '/onboarding',  titre: "Ouvrir l'Onboarding" },
  'onboarding-complet': { href: '/onboarding',  titre: "Ouvrir l'Onboarding" },
}

export default function KanbanBoard({ initialPipelines, initialOpportunities }: KanbanBoardProps) {
  const [opps,           setOpps]           = useState<Opportunity[]>(initialOpportunities.filter(o => o.status !== 'lost'))
  const [lostOpps,       setLostOpps]       = useState<Opportunity[]>(initialOpportunities.filter(o => o.status === 'lost'))
  const [showLost,       setShowLost]       = useState(false)
  const [selectedOpp,    setSelectedOpp]    = useState<Opportunity | null>(null)
  const [editContact,    setEditContact]    = useState<Record<string, unknown> | null>(null)
  // Flux "non-vente" (perte en R1/R2) : modale raison → (si non qualifié) objection.
  const [lostFlow,       setLostFlow]       = useState<{ opp: Opportunity; stageId: string; step: 'reason' | 'objection'; reason?: string } | null>(null)
  const draggingRef = useRef(false)

  // Reactive live leads + contacts :la card DÉRIVE de la fiche contact (source unique).
  const liveLeads = useQuery(api.crm_leads.list)
  const liveContacts = useQuery(api.crm_contacts.list)
  const liveCalls = useQuery(api.osSalesCalls.list, {})
  // Clients signés : ils vivent dans les colonnes qui prolongent le parcours.
  const liveClients = useQuery(api.pipeline_clients.list)
  const deplacerClient = useMutation(api.pipeline_clients.updateStage)
  useEffect(() => {
    if (!liveLeads || draggingRef.current) return
    // source de vérité = la fiche contact ; la chip inbound/outbound en dérive.
    const sourceByContact = new Map<string, string>()
    const statutByContact = new Map<string, string>()
    for (const c of (liveContacts ?? []) as { _id: string; source?: string; statut?: string }[]) {
      if (c.source) sourceByContact.set(c._id, c.source)
      if (c.statut) statutByContact.set(c._id, c.statut)
    }
    // Contacts avec un RDV marqué no-show (récupérable) → chip rouge sur la carte pipeline.
    const noShowContacts = new Set<string>()
    for (const k of (liveCalls ?? []) as { contactId?: string; status?: string }[]) {
      if (k.status === 'no_show' && k.contactId) noShowContacts.add(k.contactId)
    }
    const mapped: Opportunity[] = (liveLeads as {
      _id: string; name: string; email?: string; phone?: string; company?: string;
      pipelineId: string; stageId: string; value: number; source?: string;
      status: string; initials: string; createdAt: string; contactId?: string
    }[]).map(l => ({
      id: l._id, name: l.name, company: l.company ?? '', value: l.value,
      source: (l.contactId && sourceByContact.get(l.contactId)) || l.source || '',
      createdAt: l.createdAt.split('T')[0], initials: l.initials,
      stageId: l.stageId, pipelineId: l.pipelineId, email: l.email ?? '', phone: l.phone ?? '',
      contactId: l.contactId ?? '', tags: [], status: l.status as Opportunity['status'],
      noShow: !!(l.contactId && noShowContacts.has(l.contactId)),
      // État de l'appel de clarté, calculé côté serveur depuis la carte de prospection.
      clarity: (l as unknown as { clarity?: 'pending' | 'done' }).clarity,
    }))
    // Source de vérité = statut de la fiche : un lead dont le contact est devenu CLIENT
    // ne reste pas dans le board Leads (sinon carte fantôme en double avec le board Clients),
    // même pendant la fraction de seconde où enforce n'a pas encore supprimé le crm_lead.
    const visible = mapped.filter(o => !(o.contactId && statutByContact.get(o.contactId) === 'client'))
    setOpps(visible.filter(o => o.status !== 'lost'))
    setLostOpps(visible.filter(o => o.status === 'lost'))
  }, [liveLeads, liveContacts, liveCalls])

  async function reopenLead(opp: Opportunity) {
    // Restaure l'étape où le lead avait été perdu (source de vérité = contact.lostStage), sinon 1ʳᵉ colonne.
    let reopenStageId = stages.some(s => s.id === opp.stageId) ? opp.stageId : (stages[0]?.id ?? 'nouveau-lead')
    if (opp.contactId) {
      try {
        const r = await fetch(`/api/contact/${opp.contactId}`)
        const d = await r.json() as { contact?: { lostStage?: string } }
        const ls = d.contact?.lostStage
        if (ls && stages.some(s => s.id === ls)) reopenStageId = ls
      } catch { /* fallback sur reopenStageId courant */ }
    }
    const reopened = { ...opp, status: 'open' as const, stageId: reopenStageId }
    setLostOpps(prev => prev.filter(o => o.id !== opp.id))
    setOpps(prev => [reopened, ...prev])
    fetch(`/api/crm/leads/${opp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open', stageId: reopenStageId, stageName: stages.find(s => s.id === reopenStageId)?.name ?? 'Nouveau lead' }),
    }).catch(() => {})
    // Reset contact statut back to lead
    if (opp.contactId) {
      fetch(`/api/contact/${opp.contactId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'lead' }) }).catch(() => {})
    }
    toast('Lead rouvert', 'success')
  }

  async function openContactEdit(opp: Opportunity) {
    if (!opp.contactId) { setSelectedOpp(opp); return }
    try {
      const res = await fetch(`/api/contact/${opp.contactId}`)
      const data = await res.json() as { contact?: Record<string, unknown> }
      if (data.contact) setEditContact({ ...data.contact, id: opp.contactId, contactName: opp.name })
      else setSelectedOpp(opp)
    } catch { setSelectedOpp(opp) }
  }
  const searchParams = useSearchParams()
  const router = useRouter()
  const wasDragged = useRef(false)
  const { toasts, toast, dismiss } = useToast()


  const persistStageMove = useCallback(async (oppId: string, newStageId: string, prevStageId: string) => {
    const stageName = stages.find(s => s.id === newStageId)?.name ?? newStageId
    try {
      const res = await fetch(`/api/crm/leads/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStageId, stageName }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
    } catch {
      setOpps(prev => prev.map(o => o.id === oppId ? { ...o, stageId: prevStageId } : o))
      toast('Erreur : déplacement annulé', 'error')
    }
  }, [toast])

  // Marque un lead perdu (optimiste + persistance). lostReason/lostObjection : seulement pour R1/R2 (non-vente).
  const markLost = useCallback((opp: Opportunity, stageId: string, lostReason?: string, lostObjection?: string) => {
    const lostOpp = { ...opp, stageId, status: 'lost' as const }
    setOpps(prev => prev.filter(o => o.id !== opp.id))
    setLostOpps(prev => [...prev.filter(o => o.id !== opp.id), lostOpp])
    toast('Lead marqué comme perdu', 'success')
    // 1 SEUL appel atomique : updateStatus→markLost écrit statut + étape/raison/objection RÉELLES.
    // (Avant : PATCH puis PUT séparé → le record restait figé "autre". Corrigé.)
    fetch(`/api/crm/leads/${opp.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'lost', reason: lostReason ?? 'autre', lostStage: stageId, objection: lostObjection ?? '' }),
    }).then(res => { if (!res.ok) throw new Error() }).catch(() => {
      setLostOpps(prev => prev.filter(o => o.id !== opp.id))
      setOpps(prev => [opp, ...prev])
      toast('Erreur : statut non sauvegardé', 'error')
    })
  }, [toast])

  const [activeId,          setActiveId]          = useState<string | null>(null)
  const [overId,            setOverId]            = useState<string | null>(null)
  const [pendingDelete,     setPendingDelete]     = useState<Opportunity | null>(null)
  const [pendingConversion, setPendingConversion] = useState<Opportunity | null>(null)
  // Passage en R1/R2 : booking iClosed obligatoire (la carte ne bouge qu'après « Ouvrir iClosed »).
  const [pendingBooking,    setPendingBooking]    = useState<{ opp: Opportunity; stageId: string } | null>(null)
  // Retour en arrière d'une carte : autorisé mais demande confirmation (la régression reste délibérée → funnel juste).
  const [pendingBackMove,   setPendingBackMove]   = useState<{ opp: Opportunity; toStageId: string } | null>(null)
  const [dealValue,         setDealValue]         = useState('')
  // Conversion en client (2 étapes) : objection surmontée (vert) → montant + date.
  const [convStep,          setConvStep]          = useState<'objection' | 'deal'>('objection')
  const [wonObjection,      setWonObjection]      = useState('')
  const [dealDate,          setDealDate]          = useState('')
  // "Montant à définir" : convertit en client sans montant connu (value=0 assumée, pas le bug 0 CHF muet).
  const [amountTbd,         setAmountTbd]         = useState(false)
  const [pipelineIdx, setPipelineIdx] = useState(() => {
    const pid = searchParams?.get('pipelineId')
    if (!pid) return 0
    const idx = initialPipelines.findIndex(p => p.id === pid)
    return idx >= 0 ? idx : 0
  })
  const [scrolled, setScrolled] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const clampH = (v: number) => Math.max(0, Math.min(el.scrollWidth - el.clientWidth, v))
    let hTarget = el.scrollLeft
    let hRaf: number | null = null
    let vCol: HTMLElement | null = null
    let vTarget = 0
    let vRaf: number | null = null

    function hAnimate() {
      if (!el) return
      const diff = hTarget - el.scrollLeft
      if (Math.abs(diff) < 0.5) { el.scrollLeft = hTarget; hRaf = null; return }
      el.scrollLeft += diff * 0.16
      hRaf = requestAnimationFrame(hAnimate)
    }
    function vAnimate() {
      if (!vCol) { vRaf = null; return }
      const diff = vTarget - vCol.scrollTop
      if (Math.abs(diff) < 0.5) { vCol.scrollTop = vTarget; vRaf = null; return }
      vCol.scrollTop += diff * 0.2
      vRaf = requestAnimationFrame(vAnimate)
    }

    const onWheel = (e: WheelEvent) => {
      // Intentional horizontal: trackpad pan or Shift+wheel → scroll board left/right
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        hTarget = clampH(hTarget + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY))
        if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
        return
      }
      // Cursor over a column → scroll THAT column vertically (smooth). Never spill to horizontal.
      const col = document.elementsFromPoint(e.clientX, e.clientY)
        .find(c => c.classList.contains('kanban-col')) as HTMLElement | undefined
      if (col) {
        e.preventDefault()
        if (col.scrollHeight > col.clientHeight) {
          if (vCol !== col) { vCol = col; vTarget = col.scrollTop }
          vTarget = Math.max(0, Math.min(col.scrollHeight - col.clientHeight, vTarget + e.deltaY))
          if (!vRaf) vRaf = requestAnimationFrame(vAnimate)
        }
        return
      }
      // Not over any column (gaps / empty board area) → scroll board horizontally
      e.preventDefault()
      hTarget = clampH(hTarget + e.deltaY)
      if (!hRaf) hRaf = requestAnimationFrame(hAnimate)
    }

    const onScroll = () => setScrolled(el.scrollLeft > 10)

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      if (hRaf) cancelAnimationFrame(hRaf)
      if (vRaf) cancelAnimationFrame(vRaf)
    }
  }, [])

  const sensors = useKanbanSensors()

  // Cartes des clients signés, dans la forme des cartes de lead : le board n'a
  // ainsi qu'un seul modèle à rendre et à déplacer.
  const cartesClients: Opportunity[] = useMemo(() => (
    ((liveClients ?? []) as { _id: string; name: string; company?: string; value?: number; stageId: string; createdAt: string; email?: string; phone?: string; contactId?: string }[])
      .map(c => ({
        id: c._id, name: c.name, company: c.company ?? '', value: c.value ?? 0,
        source: 'client', createdAt: c.createdAt,
        initials: (c.name || '?').split(' ').map(m => m[0]).slice(0, 2).join('').toUpperCase(),
        stageId: c.stageId, pipelineId: 'clients',
        email: c.email ?? '', phone: c.phone ?? '', contactId: c.contactId ?? '',
        tags: [], status: 'won' as const,
      }))
  ), [liveClients])

  const pipeline     = initialPipelines[pipelineIdx] ?? initialPipelines[0]
  // Les colonnes clientes prolongent celles des leads : une seule ligne, de
  // « Nouveaux leads » à « Consulting », sans rupture ni doublon de colonne.
  const stages       = useMemo(() => {
    const base = pipeline?.stages ?? []
    const suite = ETAPES_CLIENT.map((e, i) => ({ ...e, position: base.length + i }))
    return [...base, ...suite]
  }, [pipeline])
  const [searchQuery, setSearchQuery] = useState('')
  // Étape affichée sur mobile (sélecteur d'étapes :une colonne à la fois)
  const [mobileStageId, setMobileStageId] = useState<string | null>(null)
  const activeMobileStage = mobileStageId && stages.some(s => s.id === mobileStageId) ? mobileStageId : stages[0]?.id
  // Garde de transition : on peut avancer (même sauter en avant), jamais régresser (décision Thomas).
  // La correction d'une erreur se fait via la fiche du lead, pas par un glissement.
  const isMoveAllowed = useCallback((fromStageId: string, toStageId: string) => {
    const from = stages.findIndex(s => s.id === fromStageId)
    const to   = stages.findIndex(s => s.id === toStageId)
    if (from === -1 || to === -1) return true
    return to >= from
  }, [stages])
  // Focus ciblé depuis le dashboard (cartes « En R1 / En R2 » → /pipeline?col=r1) :
  // scroll vers la colonne (desktop) + sélection de l'étape (mobile).
  useEffect(() => {
    const col = searchParams?.get('col')
    if (!col || !stages.length || !stages.some(s => s.id === col)) return
    setMobileStageId(col)
    const idx = stages.findIndex(s => s.id === col)
    const el = boardRef.current?.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length, searchParams])
  // Déplacer une carte d'une étape (sans drag) :mobile
  const moveOppStage = (opp: Opportunity, dir: number) => {
    const idx = stages.findIndex(s => s.id === opp.stageId)
    const target = stages[idx + dir]
    if (!target) return
    if (!isMoveAllowed(opp.stageId, target.id)) { setPendingBackMove({ opp, toStageId: target.id }); return }
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, stageId: target.id } : o))
    void persistStageMove(opp.id, target.id, opp.stageId)
    setMobileStageId(target.id)
  }
  const activeOpp    = [...opps, ...cartesClients].find(o => o.id === activeId) ?? null
  const pipelineOpps = opps.filter(o => o.pipelineId === pipeline?.id)
  const getColOpps = useCallback((stageId: string) => {
    const q = searchQuery.trim().toLowerCase()
    const match = (o: Opportunity) => !q || [o.name, o.company, o.email, o.phone].some(f => f?.toLowerCase().includes(q))
    // Colonnes d'après signature : ce sont les clients qu'on y lit, pas les leads.
    const base = showLost
      ? lostOpps.filter(o => o.stageId === stageId && o.pipelineId === pipeline?.id)
      : ID_ETAPES_CLIENT.has(stageId)
        ? cartesClients.filter(o => o.stageId === stageId)
        : pipelineOpps.filter(o => o.stageId === stageId)
    return base.filter(match)
  }, [showLost, lostOpps, pipelineOpps, cartesClients, pipeline?.id, searchQuery])

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    wasDragged.current = true
    draggingRef.current = true
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? (over.id as string) : null)
  }

  async function deleteOpp(oppId: string) {
    const snapshot = opps.find(o => o.id === oppId)
    setOpps(prev => prev.filter(o => o.id !== oppId))
    try {
      if (snapshot?.contactId) {
        // Supprime le CONTACT → cascade Convex : lead + historique + prospection + client.
        const res = await fetch(`/api/contact/${snapshot.contactId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      } else {
        // Lead sans contact lié → supprime juste le lead.
        const res = await fetch(`/api/crm/leads/${oppId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      }
      toast('Lead supprimé (retiré aussi des Contacts)', 'success')
    } catch {
      if (snapshot) setOpps(prev => [snapshot, ...prev.filter(o => o.id !== oppId)])
      toast('Erreur : suppression échouée', 'error')
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    setTimeout(() => { wasDragged.current = false }, 50)
    setTimeout(() => { draggingRef.current = false }, 800)
    if (!over) return

    const activeId  = active.id as string
    const overId    = over.id as string
    const activeOpp = opps.find(o => o.id === activeId)
    if (!activeOpp) return

    // Dropped on trash → confirmation requise (la suppression retire aussi le contact)
    if (overId === TRASH_ID) {
      setPendingDelete(activeOpp)
      return
    }

    // Dropped on lost zone
    if (overId.startsWith(LOST_PREFIX)) {
      const targetStageId = overId.slice(LOST_PREFIX.length)
      // R1/R2 → on demande d'abord la raison de non-vente (et l'objection si "Non qualifié").
      // La carte n'est marquée perdue qu'après confirmation ; sinon elle reste en place.
      if (targetStageId === 'r1' || targetStageId === 'r2') {
        setLostFlow({ opp: activeOpp, stageId: targetStageId, step: 'reason' })
        return
      }
      markLost(activeOpp, targetStageId)
      return
    }

    // Dropped on a column (stage)
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      // Carte CLIENTE : elle circule dans les colonnes d'après signature.
      if (ID_ETAPES_CLIENT.has(activeOpp.stageId)) {
        if (!ID_ETAPES_CLIENT.has(targetStage.id)) { toast('Un client signé ne repart pas dans les étapes de vente', 'error'); return }
        if (activeOpp.stageId !== targetStage.id) {
          void deplacerClient({ id: activeOpp.id as Id<'pipeline_clients'>, stageId: targetStage.id })
        }
        return
      }
      // Carte LEAD déposée après la signature : elle doit d'abord être convertie.
      // On passe par la conversion habituelle, qui demande le montant.
      const isLast = targetStage.id === 'nouveau-client' || ID_ETAPES_CLIENT.has(targetStage.id)
      if (isLast) {
        setOpps(prev => prev.filter(o => o.id !== activeId))
        setPendingConversion(activeOpp)
        setDealValue(''); setWonObjection(''); setConvStep('objection'); setAmountTbd(false)
        setDealDate(new Date().toISOString().slice(0, 10))
        return
      }
      if (activeOpp.stageId !== targetStage.id) {
        if (!isMoveAllowed(activeOpp.stageId, targetStage.id)) { setPendingBackMove({ opp: activeOpp, toStageId: targetStage.id }); return }
        // R1/R2 → booking iClosed obligatoire : la carte ne passe en R1/R2 qu'après « Ouvrir iClosed ».
        if (targetStage.id === 'r1' || targetStage.id === 'r2') { setPendingBooking({ opp: activeOpp, stageId: targetStage.id }); return }
        const prevStageId = activeOpp.stageId
        setOpps(prev => prev.map(o => o.id === activeId ? { ...o, stageId: targetStage.id } : o))
        persistStageMove(activeId, targetStage.id, prevStageId)
      }
      return
    }

    // Dropped on another card
    const overOpp = opps.find(o => o.id === overId)
    if (!overOpp) return

    // If target card is in last stage → conversion popup
    if (overOpp.stageId === 'nouveau-client' && activeOpp.stageId !== overOpp.stageId && !ID_ETAPES_CLIENT.has(activeOpp.stageId)) {
      setOpps(prev => prev.filter(o => o.id !== activeId))
      setPendingConversion(activeOpp)
      setDealValue('')
      return
    }

    if (activeOpp.stageId === overOpp.stageId) {
      setOpps(prev => {
        const col  = prev.filter(o => o.stageId === activeOpp.stageId)
        const rest = prev.filter(o => o.stageId !== activeOpp.stageId)
        const from = col.findIndex(o => o.id === activeId)
        const to   = col.findIndex(o => o.id === overId)
        return [...rest, ...arrayMove(col, from, to)]
      })
    } else {
      if (!isMoveAllowed(activeOpp.stageId, overOpp.stageId)) { setPendingBackMove({ opp: activeOpp, toStageId: overOpp.stageId }); return }
      // R1/R2 → booking iClosed obligatoire (même règle que le drop sur colonne).
      if (overOpp.stageId === 'r1' || overOpp.stageId === 'r2') { setPendingBooking({ opp: activeOpp, stageId: overOpp.stageId }); return }
      const prevStageId = activeOpp.stageId
      setOpps(prev => {
        const without = prev.filter(o => o.id !== activeId)
        const col     = without.filter(o => o.stageId === overOpp.stageId)
        const rest    = without.filter(o => o.stageId !== overOpp.stageId)
        const idx     = col.findIndex(o => o.id === overId)
        const moved   = { ...activeOpp, stageId: overOpp.stageId }
        col.splice(idx, 0, moved)
        return [...rest, ...col]
      })
      persistStageMove(activeId, overOpp.stageId, prevStageId)
    }
  }

  async function confirmConversion() {
    if (!pendingConversion) return
    const raw = dealValue.replace(',', '.').trim()
    const parsed = parseFloat(raw)
    const hasValue = raw !== '' && Number.isFinite(parsed) && parsed > 0
    // Anti "client à 0 CHF" : montant > 0 OBLIGATOIRE, sauf si "Montant à définir" coché. On n'envoie jamais 0 muet.
    if (!hasValue && !amountTbd) { toast('Indiquez un montant supérieur à 0 CHF, ou cochez « Montant à définir ».', 'error'); return }
    const value = hasValue ? parsed : undefined
    const contactId = pendingConversion.contactId
    const date = dealDate || new Date().toISOString().slice(0, 10)
    const objection = wonObjection
    const tbd = amountTbd
    const snapshot = pendingConversion
    setPendingConversion(null)
    setDealValue(''); setWonObjection(''); setConvStep('objection'); setAmountTbd(false)
    if (!contactId) { toast('Deal clôturé : bienvenue au client !', 'success'); return }
    // UN SEUL appel atomique → sync.convertToClient (statut + date/objection + value + historique + onboarding).
    // Toast de succès SEULEMENT après confirmation serveur ; rollback de la carte si échec.
    try {
      const res = await fetch('/api/crm/convert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, dealValue: value, dealDate: date, wonObjection: objection || '', amountTbd: tbd }),
      })
      if (!res.ok) throw new Error('convert')
      toast('Deal clôturé : bienvenue au client !', 'success')
    } catch {
      setOpps(prev => [snapshot, ...prev.filter(o => o.id !== snapshot.id)])
      toast('Erreur : conversion non enregistrée', 'error')
    }
  }

  function cancelConversion() {
    if (!pendingConversion) return
    setOpps(prev => [pendingConversion, ...prev])
    setPendingConversion(null)
    setDealValue(''); setWonObjection(''); setConvStep('objection'); setAmountTbd(false)
  }

  // Booking iClosed (R1/R2) : la carte passe en R1/R2 uniquement quand on clique « Ouvrir iClosed ».
  function commitBooking() {
    if (!pendingBooking) return
    const { opp, stageId } = pendingBooking
    setPendingBooking(null)
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, stageId } : o))
    void persistStageMove(opp.id, stageId, opp.stageId)
  }
  function cancelBooking() { setPendingBooking(null) }

  // Confirme un retour en arrière (régression d'étape) → applique le déplacement.
  function confirmBackMove() {
    if (!pendingBackMove) return
    const { opp, toStageId } = pendingBackMove
    const prevStageId = opp.stageId
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, stageId: toStageId } : o))
    void persistStageMove(opp.id, toStageId, prevStageId)
    setMobileStageId(toStageId)
    setPendingBackMove(null)
  }

  function handleAddOpp(lead: Opportunity | Lead) {
    const opp: Opportunity = 'stageId' in lead
      ? (lead as Opportunity)
      : {
          id: lead.id, name: lead.name, company: lead.company, value: lead.value,
          source: lead.source, createdAt: lead.createdAt,
          initials: Array.isArray(lead.initials) ? (lead.initials[0] ?? '?') : lead.initials,
          stageId: stages[0]?.id ?? '', pipelineId: pipeline?.id ?? '',
          email: lead.email ?? '', phone: lead.phone ?? '', contactId: '', tags: [], status: 'open',
        }
    setOpps(prev => [opp, ...prev])
  }

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const within = pointerWithin(args)
    // Trash / Lost : UNIQUEMENT si le pointeur est franchement dessus (jamais en repli).
    const overTrash = within.find(c => c.id === TRASH_ID)
    if (overTrash) return [overTrash]
    const overLost = within.find(c => String(c.id).startsWith(LOST_PREFIX))
    if (overLost) return [overLost]
    // Précision : on suit le POINTEUR (colonne/carte réellement sous le curseur), pas le
    // centre de la carte. On préfère une carte (insertion exacte) à la colonne si les deux sont dessous.
    const precise = within.filter(c => c.id !== TRASH_ID && !String(c.id).startsWith(LOST_PREFIX))
    if (precise.length) {
      const cards = precise.filter(c => !stages.some(s => s.id === c.id))
      return cards.length ? cards : precise
    }
    // Repli (pointeur dans un vide entre colonnes) : colonne la plus proche, hors trash & lost.
    return closestCenter(args).filter(c => c.id !== TRASH_ID && !String(c.id).startsWith(LOST_PREFIX))
  }, [stages])

  const totalCount = showLost
    ? lostOpps.filter(o => o.pipelineId === pipeline?.id).length
    : pipelineOpps.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Toaster toasts={toasts} dismiss={dismiss} />
      <ContactSlideOver
        opp={selectedOpp}
        stage={selectedOpp ? stages.find(s => s.id === selectedOpp.stageId)?.name : null}
        onClose={() => setSelectedOpp(null)}
      />

      {editContact && (
        <NewContactModal
          contact={editContact as never}
          onClose={() => setEditContact(null)}
          onSave={() => { setEditContact(null) }}
        />
      )}

      {pendingDelete && (
        <Modal onClose={() => setPendingDelete(null)}>
          <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0"><Trash2 size={17} className="text-red-500" /></span>
              <p className="text-[15px] font-bold text-soren-text">Supprimer ce lead ?</p>
            </div>
            <p className="text-[12.5px] text-soren-muted leading-relaxed mb-5">
              <span className="font-semibold text-soren-text">{pendingDelete.name}</span> sera <span className="font-semibold text-red-600">définitivement supprimé</span> de la pipeline <span className="font-semibold text-red-600">et du module Contacts</span>. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="text-[13px] font-semibold text-soren-muted border border-soren-border rounded-xl px-4 py-2 hover:bg-soren-elevated">Annuler</button>
              <button onClick={() => { void deleteOpp(pendingDelete.id); setPendingDelete(null) }} className="text-[13px] font-semibold text-white bg-red-500 rounded-xl px-4 py-2 shadow-sm hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </Modal>
      )}

      {pendingBackMove && (
        <Modal onClose={() => setPendingBackMove(null)}>
          <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
            <p className="text-[15px] font-bold text-soren-text mb-2">Revenir en arrière ?</p>
            <p className="text-[12.5px] text-soren-muted leading-relaxed mb-5">
              Tu déplaces <span className="font-semibold text-soren-text">{pendingBackMove.opp.name}</span> de
              {' '}« {stages.find(s => s.id === pendingBackMove.opp.stageId)?.name ?? '—'} » vers
              {' '}« {stages.find(s => s.id === pendingBackMove.toStageId)?.name ?? '—'} » :c&apos;est un retour <span className="font-semibold">en arrière</span> dans le funnel. Confirmer ?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingBackMove(null)} className="text-[13px] font-semibold text-soren-muted border border-soren-border rounded-xl px-4 py-2 hover:bg-soren-elevated">Annuler</button>
              <button onClick={confirmBackMove} className="text-[13px] font-semibold text-white bg-[#FF4D00] rounded-xl px-4 py-2 shadow-sm hover:bg-[#e84400]">Confirmer le retour</button>
            </div>
          </div>
        </Modal>
      )}

      <PipelineMobileTabs />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Header */}
        {/* En-tête : desktop = 1 ligne (compteur | voir perdus | recherche | nouveau).
            Mobile = ligne 1 (compteur + voir perdus + nouveau), ligne 2 (recherche pleine largeur via basis-full). */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 md:px-6 pt-3 md:pt-5 pb-2 md:pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-5 mr-auto order-1">
            <div>
              <p className="text-[11px] md:text-xs text-soren-muted">
                {totalCount} {showLost ? 'perdus' : 'opportunités'}
              </p>
            </div>
            {initialPipelines.length > 1 && (
              <div className="flex gap-1 bg-black/5 rounded-xl p-1">
                {initialPipelines.map((p, i) => (
                  <button key={p.id} onClick={() => setPipelineIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      pipelineIdx === i ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted hover:text-soren-text'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!showLost && activeId && <span className="order-2 flex-shrink-0"><TrashZone isOver={overId === TRASH_ID} /></span>}
          <button
            onClick={() => setShowLost(s => !s)}
            className={`order-3 flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border flex-shrink-0 ${
              showLost
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
            }`}
          >
            {showLost ? <Eye size={12} /> : <EyeOff size={12} />}
            {showLost ? 'Voir actifs' : 'Voir perdus'}
          </button>
          {!showLost && (
            <span className="order-4 md:order-5 flex-shrink-0">
              <NewLeadWidget compact mode="leads" onAddOpp={handleAddOpp} />
            </span>
          )}
          {/* Recherche : pleine largeur sur sa propre ligne en mobile (basis-full), inline avant « Nouveau » en desktop. */}
          <div className="relative order-5 md:order-4 basis-full md:basis-auto md:w-36 md:focus-within:w-52 transition-all duration-300">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-soren-card border border-soren-border rounded-full pl-8 pr-3 py-1.5 text-[11px] text-soren-text placeholder-soren-subtle outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]/40"
            />
          </div>
        </div>

        {/* Board */}
        <div className="relative flex-1 min-h-0 flex flex-col pb-3">
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-4 w-8 z-10 transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'linear-gradient(to right, var(--bg-app) 40%, transparent)' }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-4 w-8 z-10"
            style={{ background: 'linear-gradient(to left, var(--bg-app) 40%, transparent)' }}
          />
          <div ref={boardRef} className="flex flex-1 min-h-0 gap-3 overflow-x-auto px-3 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] kanban-scroll kanban-board-row">
            {stages.map((stage, i) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opps={getColOpps(stage.id)}
                isOver={!showLost && (overId === stage.id || (stage.id === 'nouveau-client' && opps.some(o => o.id === overId && o.stageId === stage.id)))}
                onCardClick={opp => openContactEdit(opp)}
                wasDragged={wasDragged}
                showLost={showLost}
                isLostOver={overId === `${LOST_PREFIX}${stage.id}`}
                isLastStage={stage.id === 'nouveau-client'}
                onReopen={reopenLead}
                mobileActive={stage.id === activeMobileStage}
                stageIndex={i}
                stageCount={stages.length}
                onMove={moveOppStage}
              />
            ))}
          </div>
        </div>


        {lostFlow && (
          <NonVenteModal
            contactName={lostFlow.opp.name}
            step={lostFlow.step}
            onPickReason={code => {
              if (code === 'non_qualifie') { setLostFlow(prev => prev && { ...prev, step: 'objection', reason: code }); return }
              markLost(lostFlow.opp, lostFlow.stageId, code)
              setLostFlow(null)
            }}
            onPickObjection={code => { markLost(lostFlow.opp, lostFlow.stageId, 'non_qualifie', code); setLostFlow(null) }}
            onBack={() => setLostFlow(prev => prev && { ...prev, step: 'reason', reason: undefined })}
            onCancel={() => setLostFlow(null)}
          />
        )}

        <DragOverlay dropAnimation={dropAnimation}>
          {activeOpp && <OppCard opp={activeOpp} isDragging hideValue />}
        </DragOverlay>
      </DndContext>

      {pendingBooking && (
        <IClosedBookingModal
          fullName={pendingBooking.opp.name}
          email={pendingBooking.opp.email}
          phone={pendingBooking.opp.phone}
          label={pendingBooking.stageId === 'r2' ? 'R2' : 'R1'}
          bookingUrl={pendingBooking.stageId === 'r2' ? ICLOSED_R2_BOOKING_URL : ICLOSED_R1_BOOKING_URL}
          onConfirm={commitBooking}
          onCancel={cancelBooking}
        />
      )}

      {pendingConversion && (
        <Modal onClose={cancelConversion}>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">🎉</div>
            <div>
              <h2 className="text-lg font-black text-[#111]">Félicitations !</h2>
              <p className="text-sm text-[#6B7280] mt-1">
                {convStep === 'objection'
                  ? 'Quelle objection avez-vous surmontée ?'
                  : <><span className="font-semibold text-[#111]">{pendingConversion.name}</span> devient client !</>}
              </p>
            </div>

            {convStep === 'objection' ? (
              <div className="w-full flex flex-col gap-2">
                {NONVENTE_OBJECTIONS.map(o => {
                  const Icon = o.icon
                  return (
                    <button key={o.code} type="button"
                      onClick={() => { setWonObjection(o.code); setConvStep('deal') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-left hover:border-[#10B981] hover:bg-[#10B981]/10 transition-colors">
                      <Icon size={18} className="text-[#10B981] flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[#111]">{o.label}</span>
                        <span className="block text-[11px] text-[#6B7280] truncate">{o.desc}</span>
                      </span>
                    </button>
                  )
                })}
                <button type="button" onClick={cancelConversion} className="mt-1 text-[11px] font-semibold text-[#9CA3AF] hover:text-[#6B7280]">Annuler</button>
              </div>
            ) : (
              <>
                <div className="w-full">
                  <label className="block text-xs font-semibold text-[#374151] mb-2 text-left">Montant du deal (CHF)</label>
                  <input
                    autoFocus
                    type="number"
                    placeholder="ex: 3500"
                    value={dealValue}
                    disabled={amountTbd}
                    onChange={e => setDealValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmConversion()}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-lg font-bold text-[#111] placeholder-[#D1D5DB] outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#10B981] transition-all text-center disabled:opacity-40"
                  />
                  {/* "Montant à définir" : convertit sans montant connu (évite le client à 0 CHF fantôme). */}
                  <label className="mt-2 flex items-center gap-2 text-[12px] font-medium text-[#374151] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={amountTbd}
                      onChange={e => { setAmountTbd(e.target.checked); if (e.target.checked) setDealValue('') }}
                      className="w-4 h-4 rounded accent-[#10B981]"
                    />
                    Montant à définir
                  </label>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-semibold text-[#374151] mb-2 text-left">Date de la transaction</label>
                  <input
                    type="date"
                    value={dealDate}
                    onChange={e => setDealDate(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-semibold text-[#111] outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#10B981] transition-all text-center"
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setConvStep('objection')}
                    className="flex-1 py-2.5 rounded-full border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={confirmConversion}
                    className="flex-1 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    Confirmer le deal
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
