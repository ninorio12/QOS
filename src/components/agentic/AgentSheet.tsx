'use client'

/**
 * Fiche agent — LECTURE SEULE.
 * 4 onglets : Soul · Personnalité · Outils viennent du SOUL.md + config.yaml du profil VPS
 * (synchronisés dans Convex agent_brains). Rôle & Responsabilité vient de la fiche R&R du
 * module Process (template SOP rempli), retrouvée par le Slug de l'agent.
 * La configuration se modifie côté VPS / dans les SOPs, jamais ici.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, Bot, Lock, Flame, UserCircle, Target, Wrench, FileText, type LucideIcon } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import MarkdownView from '@/components/agentic/MarkdownView'
import { CHANNEL_LOGO } from '@/components/agentic/BrandLogos'
import { type AgentProfile } from '@/components/agentic/agentProfiles'

const ACCENT = '#FF4D00'
const fmtFr = (iso?: string) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

type TabId = 'soul' | 'personnalite' | 'role' | 'outils'
const TABS: { id: TabId; label: string; Icon: LucideIcon; field?: 'mdSoul' | 'mdPersonnalite' | 'mdOutils' }[] = [
  { id: 'soul',         label: 'Soul',                   Icon: Flame,      field: 'mdSoul' },
  { id: 'personnalite', label: 'Personnalité',           Icon: UserCircle, field: 'mdPersonnalite' },
  { id: 'role',         label: 'Rôle & Responsabilité',  Icon: Target },   // ← fiche R&R (module Process)
  { id: 'outils',       label: 'Outils',                 Icon: Wrench,     field: 'mdOutils' },
]

export default function AgentSheet({ profile, onClose }: { profile: AgentProfile; onClose: () => void }) {
  const [tab, setTab] = React.useState<TabId>('soul')
  const brain = useQuery(api.agentBrains.get, { slug: profile.id })   // SOUL.md + config synchronisés du VPS
  const procs = useQuery(api.processes.list, {}) as any[] | undefined  // fiches du module Process (dont les R&R)

  // Fiche R&R de cet agent : doc Process « R&R — … » dont le Slug == profile.id.
  const rrHtml = React.useMemo<string | undefined>(() => {
    if (!procs) return undefined
    for (const p of procs) {
      if (!(p.title || '').startsWith('R&R —')) continue
      const txt = (p.blocks?.[0]?.type === 'doc' ? p.blocks[0].text : '') as string
      const m = txt.match(/Slug\s*:?\s*<\/b>\s*([a-z0-9-]+)/) || txt.match(/Slug\s*:\s*([a-z0-9-]+)/)
      if (m && m[1] === profile.id) return txt
    }
    return ''
  }, [procs, profile.id])

  React.useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const statusMeta = profile.status === 'active' ? { label: 'Actif', color: '#16A34A' } : profile.status === 'error' ? { label: 'Erreur', color: '#DC2626' } : { label: 'Inactif', color: '#9CA3AF' }
  const field = TABS.find(t => t.id === tab)!.field
  const md = brain && field ? brain[field] : undefined

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-soren-card rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-soren-border" style={{ height: 'min(88vh, 660px)', animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="h-1 flex-shrink-0" style={{ background: ACCENT }} />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-soren-border flex items-center gap-3 flex-shrink-0">
          {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-11 h-11 rounded-2xl object-cover flex-shrink-0" />
            : <div className="w-11 h-11 rounded-2xl bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-[#FF4D00]" /></div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-black text-soren-text truncate">{profile.name}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusMeta.color + '1A', color: statusMeta.color }}>● {statusMeta.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-soren-muted truncate">{profile.role}</p>
              <span className="flex items-center gap-1">{profile.channels.filter(c => CHANNEL_LOGO[c]).map(c => { const Logo = CHANNEL_LOGO[c]; return <Logo key={c} size={12} /> })}</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-soren-subtle bg-soren-elevated rounded-full px-2.5 py-1 flex-shrink-0" title="Vue en lecture seule — la configuration se modifie côté runtime agent (VPS) / dans les SOPs."><Lock size={11} /> Lecture seule</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] flex-shrink-0"><X size={14} className="text-soren-muted" /></button>
        </div>

        {/* Onglets */}
        <div className="px-3 py-2 border-b border-soren-border flex flex-wrap items-center gap-1 flex-shrink-0">
          {TABS.map(t => {
            const on = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors ${on ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text hover:bg-soren-elevated'}`}>
                <t.Icon size={13} /> <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'role' ? (
            rrHtml === undefined ? (
              <div className="flex flex-col gap-2 py-4">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 rounded bg-soren-elevated animate-pulse" style={{ width: `${55 + (i * 11) % 40}%` }} />)}
              </div>
            ) : rrHtml ? (
              <div className="bg-soren-elevated rounded-xl p-4"><MarkdownView markdown={rrHtml} dense /></div>
            ) : (
              <span className="text-[11px] text-soren-subtle">Aucune fiche R&R pour cet agent dans le module Process.</span>
            )
          ) : brain === undefined ? (
            <div className="flex flex-col gap-2 py-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 rounded bg-soren-elevated animate-pulse" style={{ width: `${55 + (i * 11) % 40}%` }} />)}
            </div>
          ) : brain === null ? (
            <div className="flex flex-col items-start gap-1 py-3">
              <span className="text-[12px] text-soren-subtle">Aucun cerveau VPS rattaché à cet agent.</span>
            </div>
          ) : md && md.trim() ? (
            <div className="bg-soren-elevated rounded-xl p-4"><MarkdownView markdown={md} dense /></div>
          ) : (
            <span className="text-[11px] text-soren-subtle">Rien dans cette section du SOUL.md.</span>
          )}
        </div>

        {/* Pied : provenance */}
        <div className="px-5 py-2.5 border-t border-soren-border flex items-center gap-2 flex-wrap text-[10px] text-soren-subtle flex-shrink-0">
          {tab === 'role' ? (
            <span className="inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-muted"><FileText size={10} /> Fiche R&R · module Process (SOPs)</span>
          ) : brain ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-muted"><Lock size={10} /> Source VPS</span>
              {brain.vpsProfile && <span>profil <span className="text-soren-muted font-mono">{brain.vpsProfile}</span></span>}
              <span>· SOUL modifié {fmtFr(brain.soulUpdatedAt)}</span>
              <span>· synchro {fmtFr(brain.syncedAt)}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
