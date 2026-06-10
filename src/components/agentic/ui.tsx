'use client'

/**
 * Primitives UI partagées des modules agentiques — alignées sur le design system
 * VividFlow (tokens soren-*, accent #FF4D00, cartes rounded-2xl, badges sobres).
 * Aucune nouvelle dépendance ; createPortal pour le panneau détail.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, Circle, type LucideIcon } from 'lucide-react'
import {
  HEALTH, AUTONOMY, CONTEXT_STATUS, sourceMeta, scopeById,
  type AgentHealth, type AutonomyLevel, type ContextStatus, type MemoryScopeId,
} from './doctrine'

/** Badge "pilule" générique coloré (fond teinté + texte couleur). */
export function Pill({ color, children, dot, className = '' }: { color: string; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`} style={{ background: color + '1A', color }}>
      {dot && <Circle size={6} fill={color} className="text-transparent" />}
      {children}
    </span>
  )
}

/** Badge neutre (fond elevated). */
export function Chip({ children, className = '', icon: Icon }: { children: React.ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-muted ${className}`}>
      {Icon && <Icon size={10} />}{children}
    </span>
  )
}

export function HealthBadge({ health }: { health: AgentHealth }) {
  const h = HEALTH[health]
  return <Pill color={h.color} dot>{h.label}</Pill>
}

export function AutonomyBadge({ level }: { level: AutonomyLevel }) {
  const a = AUTONOMY[level]
  return <Pill color={a.color}>{a.label}</Pill>
}

export function ContextBadge({ status }: { status: ContextStatus }) {
  const c = CONTEXT_STATUS[status]
  return <Pill color={c.color}>{c.label}</Pill>
}

export function SourceBadge({ source }: { source?: string }) {
  const s = sourceMeta(source)
  return <Pill color={s.color}>{s.label}</Pill>
}

export function ScopeChip({ id }: { id: MemoryScopeId }) {
  const s = scopeById(id)
  if (!s) return null
  return <Pill color={s.color}>{s.label}</Pill>
}

/** Ligne clé/valeur pour les panneaux détail. */
export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">{label}</span>
      <div className="text-[12px] text-soren-text">{children}</div>
    </div>
  )
}

/** Bloc liste avec puce de couleur (actions autorisées / interdites, etc.). */
export function MarkedList({ items, color, empty = '—' }: { items: string[]; color: string; empty?: string }) {
  if (!items.length) return <p className="text-[12px] text-soren-subtle">{empty}</p>
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] text-soren-text">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

/** En-tête de section (titre + sous-titre + compteur + action optionnelle). */
export function SectionHeader({ icon: Icon, color = '#6B7280', title, subtitle, count, action }: {
  icon: LucideIcon; color?: string; title: string; subtitle?: string; count?: number; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-soren-text">{title}</span>
          {count !== undefined && <span className="text-[10px] font-bold bg-soren-card border border-soren-border text-soren-muted px-1.5 py-0.5 rounded-full">{count}</span>}
        </div>
        {subtitle && <p className="text-[11px] text-soren-subtle leading-tight">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

/** Note doctrine (encadré sobre informatif). */
export function DoctrineNote({ color = '#8B5CF6', children }: { color?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-[11px] leading-relaxed" style={{ background: color + '12', color }}>
      {children}
    </div>
  )
}

/**
 * Panneau détail latéral droit (drawer) — rendu via portal, cohérent avec le reste de l'app.
 * Largeur fixe 460px, scroll interne, bordure d'accent en tête.
 */
export function DetailPanel({ open, onClose, accent = '#FF4D00', title, subtitle, icon: Icon, children, footer }: {
  open: boolean; onClose: () => void; accent?: string; title: string; subtitle?: string
  icon?: LucideIcon; children: React.ReactNode; footer?: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative h-full w-full max-w-[min(100vw,460px)] bg-soren-card shadow-2xl flex flex-col overflow-hidden border-l border-soren-border"
        style={{ animation: 'slideInRight 200ms cubic-bezier(0.22,1,0.36,1) both' }}
      >
        <div className="h-1 flex-shrink-0" style={{ background: accent }} />
        <div className="px-5 py-4 border-b border-soren-border flex items-start gap-3 flex-shrink-0">
          {Icon && <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}><Icon size={18} style={{ color: accent }} /></div>}
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-black text-soren-text truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-soren-muted truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors flex-shrink-0"><X size={14} className="text-soren-muted" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-soren-border flex-shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Carte détail interne (sous-bloc d'un panneau). */
export function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-soren-elevated rounded-xl p-3 flex flex-col gap-2 ${className}`}>{children}</div>
}
