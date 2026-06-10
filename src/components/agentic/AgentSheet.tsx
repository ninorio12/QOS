'use client'

/**
 * Fiche agent "SOUL OS" — cockpit compact à onglets-icônes (une section à la fois).
 * Modale centrée, fond SaaS flouté. Édition par onglet (Modifier → Enregistrer/Annuler).
 * Sauvegarde locale (localStorage via saveOverride) tant que le backend d'écriture n'est pas branché.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X, Pencil, Save, Bot, Flame, UserCircle, Brain, Sparkles, ShieldCheck, Lock,
  ListChecks, Activity, HeartPulse, ExternalLink, MessageSquare, Send, Calendar, Clock, type LucideIcon,
} from 'lucide-react'
import { saveOverride, CHANNEL_LABEL, SEED_HEARTBEATS, loadHeartbeats, addHeartbeat, type AgentProfile, type Heartbeat } from '@/components/agentic/agentProfiles'

const ACCENT = '#FF4D00'
const CH_ICON: Record<string, LucideIcon> = { slack: MessageSquare, telegram: Send }
const fr = (iso?: string) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

type TabId = 'soul' | 'personality' | 'memory' | 'skills' | 'rules' | 'permissions' | 'tasks' | 'logs' | 'heartbeats'
const TABS: { id: TabId; label: string; Icon: LucideIcon; editable: boolean }[] = [
  { id: 'soul',        label: 'Soul',          Icon: Flame,       editable: true },
  { id: 'personality', label: 'Personnalité',  Icon: UserCircle,  editable: true },
  { id: 'memory',      label: 'Mémoire',       Icon: Brain,       editable: true },
  { id: 'skills',      label: 'Skills',        Icon: Sparkles,    editable: false },
  { id: 'rules',       label: 'Règles d’action', Icon: ShieldCheck, editable: true },
  { id: 'permissions', label: 'Permissions',   Icon: Lock,        editable: true },
  { id: 'tasks',       label: 'Tâches',        Icon: ListChecks,  editable: false },
  { id: 'logs',        label: 'Logs',          Icon: Activity,    editable: false },
  { id: 'heartbeats',  label: 'Heartbeats',    Icon: HeartPulse,  editable: false },
]

// ─── primitives compactes ────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">{label}</span>
      <div className="text-[12px] text-soren-text leading-relaxed">{children}</div>
    </div>
  )
}
function Bullets({ items, color = '#6B7280', empty = 'À compléter' }: { items: string[]; color?: string; empty?: string }) {
  if (!items?.length) return <span className="text-[11px] text-soren-subtle">{empty}</span>
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} /><span>{it}</span></li>
      ))}
    </ul>
  )
}
function Tags({ items, empty = 'À compléter' }: { items: string[]; empty?: string }) {
  if (!items?.length) return <span className="text-[11px] text-soren-subtle">{empty}</span>
  return <div className="flex items-center gap-1.5 flex-wrap">{items.map((t, i) => <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-soren-elevated text-soren-muted">{t}</span>)}</div>
}
function EmptyEdit({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 py-2">
      <span className="text-[12px] text-soren-subtle">{label}</span>
      <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-full px-2.5 py-1"><Pencil size={11} /> Modifier</button>
    </div>
  )
}
// éditeurs
function EText({ value, onChange, rows = 2 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text outline-none resize-none focus:ring-2 focus:ring-[#FF4D00]/30" />
}
function EList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <textarea
      defaultValue={(value ?? []).join('\n')}
      onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
      rows={Math.min(8, Math.max(2, (value?.length ?? 1) + 1))}
      placeholder="Un élément par ligne…"
      className="w-full bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text outline-none resize-none font-mono focus:ring-2 focus:ring-[#FF4D00]/30"
    />
  )
}

const RISK: Record<string, { label: string; color: string }> = {
  low: { label: 'Faible', color: '#16A34A' }, medium: { label: 'Moyen', color: '#D97706' }, high: { label: 'Élevé', color: '#DC2626' },
}

export default function AgentSheet({ profile, onClose }: { profile: AgentProfile; onClose: () => void }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<TabId>('soul')
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<AgentProfile>(profile)
  const [savedFlash, setSavedFlash] = React.useState(false)
  const [hbList, setHbList] = React.useState<Heartbeat[]>([])
  const [hbDate, setHbDate] = React.useState(''); const [hbTime, setHbTime] = React.useState(''); const [hbReq, setHbReq] = React.useState('')

  React.useEffect(() => { setDraft(profile) }, [profile])
  React.useEffect(() => { setHbList([...(SEED_HEARTBEATS[profile.id] ?? []), ...(loadHeartbeats()[profile.id] ?? [])]) }, [profile.id])

  function requestHeartbeat() {
    if (!hbReq.trim()) return
    const when = [hbDate, hbTime].filter(Boolean).join(' · ') || 'Date à définir'
    const hb: Heartbeat = { id: 'hb-' + Math.random().toString(36).slice(2, 8), when, request: hbReq.trim(), status: 'proposé' }
    addHeartbeat(profile.id, hb); setHbList(l => [...l, hb]); setHbDate(''); setHbTime(''); setHbReq('')
  }
  React.useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const active = editing ? draft : profile
  const tabDef = TABS.find(t => t.id === tab)!
  const unsaved = JSON.stringify(draft) !== JSON.stringify(profile)

  function startEdit() { setDraft(profile); setEditing(true) }
  function cancel() { setDraft(profile); setEditing(false) }
  function save() {
    saveOverride(profile.id, {
      mission: draft.mission, soul: draft.soul, personality: draft.personality,
      memoryAccess: draft.memoryAccess, internalRules: draft.internalRules, toolsPermissions: draft.toolsPermissions,
    })
    setEditing(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500)
  }
  const set = (fn: (d: AgentProfile) => void) => setDraft(d => { const c = structuredClone(d); fn(c); return c })

  const statusMeta = active.status === 'active' ? { label: 'Actif', color: '#16A34A' } : active.status === 'error' ? { label: 'Erreur', color: '#DC2626' } : { label: 'Inactif', color: '#9CA3AF' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-soren-card rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-soren-border" style={{ height: 'min(88vh, 660px)', animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="h-1 flex-shrink-0" style={{ background: ACCENT }} />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-soren-border flex items-center gap-3 flex-shrink-0">
          {active.avatar ? <img src={active.avatar} alt={active.name} className="w-11 h-11 rounded-2xl object-cover flex-shrink-0" />
            : <div className="w-11 h-11 rounded-2xl bg-[#FF4D00]/10 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-[#FF4D00]" /></div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-black text-soren-text truncate">{active.name}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusMeta.color + '1A', color: statusMeta.color }}>● {statusMeta.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-soren-muted truncate">{active.role}</p>
              <span className="flex items-center gap-1">{active.channels.filter(c => CH_ICON[c]).map(c => { const CI = CH_ICON[c]; return <CI key={c} size={11} className="text-soren-subtle" /> })}</span>
            </div>
          </div>
          {!editing && tabDef.editable && (
            <button onClick={startEdit} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-soren-text bg-soren-elevated rounded-full px-3 py-1.5 flex-shrink-0"><Pencil size={12} /> Modifier</button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] flex-shrink-0"><X size={14} className="text-soren-muted" /></button>
        </div>

        {/* Tabs icônes — tous visibles (wrap), pas de scroll */}
        <div className="px-3 py-2 border-b border-soren-border flex flex-wrap items-center gap-1 flex-shrink-0">
          {TABS.map(t => {
            const on = tab === t.id
            return (
              <button key={t.id} onClick={() => { setTab(t.id); if (editing) cancel() }}
                title={t.label}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors ${on ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text hover:bg-soren-elevated'}`}>
                <t.Icon size={13} /> <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {savedFlash && <p className="text-[11px] font-semibold text-[#16A34A] mb-3">Enregistré localement ✓</p>}
          {tab === 'soul' && (editing ? (
            <div className="flex flex-col gap-3">
              <Field label="Raison d’être"><EText value={draft.soul.purpose} onChange={v => set(d => { d.soul.purpose = v })} /></Field>
              <Field label="Ce qu’il protège"><EText value={draft.soul.protects} onChange={v => set(d => { d.soul.protects = v })} /></Field>
              <Field label="Priorités"><EList value={draft.soul.priorities} onChange={v => set(d => { d.soul.priorities = v })} /></Field>
              <Field label="Ne doit jamais faire"><EList value={draft.soul.neverDo} onChange={v => set(d => { d.soul.neverDo = v })} /></Field>
              <Field label="Ton / posture"><EText value={draft.soul.tone} onChange={v => set(d => { d.soul.tone = v })} rows={1} /></Field>
              <Field label="Autonomie"><EText value={draft.soul.autonomyLevel} onChange={v => set(d => { d.soul.autonomyLevel = v })} rows={1} /></Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Raison d’être">{active.soul.purpose}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Ce qu’il protège">{active.soul.protects}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Priorités"><Bullets items={active.soul.priorities} color="#16A34A" /></Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Ne doit jamais faire"><Bullets items={active.soul.neverDo} color="#DC2626" /></Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Ton">{active.soul.tone}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Autonomie">{active.soul.autonomyLevel}</Field></div>
            </div>
          ))}

          {tab === 'personality' && (editing ? (
            <div className="flex flex-col gap-3">
              <Field label="Style de réponse"><EText value={draft.personality.responseStyle} onChange={v => set(d => { d.personality.responseStyle = v })} rows={1} /></Field>
              <Field label="Niveau de détail"><EText value={draft.personality.detailLevel} onChange={v => set(d => { d.personality.detailLevel = v })} rows={1} /></Field>
              <Field label="Niveau de challenge"><EText value={draft.personality.challengeLevel} onChange={v => set(d => { d.personality.challengeLevel = v })} rows={1} /></Field>
              <Field label="Ton / voix"><EText value={draft.personality.voice} onChange={v => set(d => { d.personality.voice = v })} rows={1} /></Field>
              <Field label="Ce qu’il évite"><EList value={draft.personality.avoids} onChange={v => set(d => { d.personality.avoids = v })} /></Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Style de réponse">{active.personality.responseStyle}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Niveau de détail">{active.personality.detailLevel}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Niveau de challenge">{active.personality.challengeLevel}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3"><Field label="Ton / voix">{active.personality.voice}</Field></div>
              <div className="bg-soren-elevated rounded-xl p-3 sm:col-span-2"><Field label="Ce qu’il évite"><Tags items={active.personality.avoids} /></Field></div>
            </div>
          ))}

          {tab === 'memory' && (editing ? (
            <div className="flex flex-col gap-3">
              <Field label="Supermemory containers"><EList value={draft.memoryAccess.supermemoryContainers} onChange={v => set(d => { d.memoryAccess.supermemoryContainers = v })} /></Field>
              <Field label="GBrain scopes"><EList value={draft.memoryAccess.gbrainScopes} onChange={v => set(d => { d.memoryAccess.gbrainScopes = v })} /></Field>
              <Field label="Second Brain paths"><EList value={draft.memoryAccess.secondBrainPaths} onChange={v => set(d => { d.memoryAccess.secondBrainPaths = v })} /></Field>
              <Field label="Modules Data OS"><EList value={draft.memoryAccess.dataOsModules} onChange={v => set(d => { d.memoryAccess.dataOsModules = v })} /></Field>
              <Field label="Règles de lecture"><EList value={draft.memoryAccess.readRules} onChange={v => set(d => { d.memoryAccess.readRules = v })} /></Field>
              <Field label="Règles d’écriture"><EList value={draft.memoryAccess.writeRules} onChange={v => set(d => { d.memoryAccess.writeRules = v })} /></Field>
              <Field label="Scopes interdits"><EList value={draft.memoryAccess.forbiddenScopes} onChange={v => set(d => { d.memoryAccess.forbiddenScopes = v })} /></Field>
            </div>
          ) : (active.memoryAccess.supermemoryContainers.length || active.memoryAccess.dataOsModules.length) ? (
            <div className="flex flex-col gap-3">
              <Field label="Supermemory"><Tags items={active.memoryAccess.supermemoryContainers} /></Field>
              <Field label="GBrain"><Tags items={active.memoryAccess.gbrainScopes} /></Field>
              <Field label="Second Brain"><Tags items={active.memoryAccess.secondBrainPaths} /></Field>
              <Field label="Modules Data OS"><Tags items={active.memoryAccess.dataOsModules} /></Field>
              <Field label="Lecture"><Bullets items={active.memoryAccess.readRules} color="#16A34A" /></Field>
              <Field label="Écriture"><Bullets items={active.memoryAccess.writeRules} color="#3462EE" /></Field>
              <Field label="Scopes interdits"><Bullets items={active.memoryAccess.forbiddenScopes} color="#DC2626" /></Field>
            </div>
          ) : <EmptyEdit label="Aucun scope mémoire configuré." onEdit={startEdit} />)}

          {tab === 'skills' && (
            active.activeSkills.length ? (
              <div className="flex flex-col gap-2">
                {active.activeSkills.map(s => (
                  <div key={s.name} className="bg-soren-elevated rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <Sparkles size={13} className="text-[#3462EE] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-normal text-soren-text truncate">{s.name}</p>
                      <p className="text-[10px] text-soren-subtle truncate">{s.family} · {s.status}{s.path && s.path !== '—' ? ` · ${s.path}` : ''}</p>
                    </div>
                    <button onClick={() => router.push(`/knowledge?tab=skills&q=${encodeURIComponent(s.name)}`)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-full px-2 py-1 flex-shrink-0">Voir <ExternalLink size={10} /></button>
                  </div>
                ))}
                <p className="text-[10px] text-soren-subtle mt-1">Ajout/retrait de skills : édition non persistée (à brancher à la source agent).</p>
              </div>
            ) : <span className="text-[11px] text-soren-subtle">Aucun skill actif.</span>
          )}

          {tab === 'rules' && (editing ? (
            <div className="flex flex-col gap-3">
              <Field label="Règles obligatoires"><EList value={draft.internalRules.mandatoryRules} onChange={v => set(d => { d.internalRules.mandatoryRules = v })} /></Field>
              <Field label="Interdictions"><EList value={draft.internalRules.forbiddenActions} onChange={v => set(d => { d.internalRules.forbiddenActions = v })} /></Field>
              <Field label="Quand escalader à un humain"><EList value={draft.internalRules.escalationRules} onChange={v => set(d => { d.internalRules.escalationRules = v })} /></Field>
              <Field label="Quand demander validation"><EList value={draft.internalRules.validationRules} onChange={v => set(d => { d.internalRules.validationRules = v })} /></Field>
              <Field label="Sources de vérité"><EList value={draft.internalRules.sourcesOfTruth} onChange={v => set(d => { d.internalRules.sourcesOfTruth = v })} /></Field>
              <Field label="Limites de confidentialité"><EList value={draft.internalRules.confidentialityLimits} onChange={v => set(d => { d.internalRules.confidentialityLimits = v })} /></Field>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Règles obligatoires"><Bullets items={active.internalRules.mandatoryRules} color="#16A34A" /></Field>
              <Field label="Interdictions"><Bullets items={active.internalRules.forbiddenActions} color="#DC2626" /></Field>
              <Field label="Escalade humaine"><Bullets items={active.internalRules.escalationRules} color="#D97706" /></Field>
              <Field label="Validation requise"><Bullets items={active.internalRules.validationRules} color="#D97706" /></Field>
              <Field label="Sources de vérité"><Tags items={active.internalRules.sourcesOfTruth} /></Field>
              <Field label="Limites de confidentialité"><Bullets items={active.internalRules.confidentialityLimits} color="#8B5CF6" /></Field>
            </div>
          ))}

          {tab === 'permissions' && (editing ? (
            <div className="flex flex-col gap-3">
              <Field label="Outils autorisés"><EList value={draft.toolsPermissions.allowedTools} onChange={v => set(d => { d.toolsPermissions.allowedTools = v })} /></Field>
              <Field label="Outils interdits"><EList value={draft.toolsPermissions.forbiddenTools} onChange={v => set(d => { d.toolsPermissions.forbiddenTools = v })} /></Field>
              <Field label="Actions sans validation"><EList value={draft.toolsPermissions.allowedWithoutValidation} onChange={v => set(d => { d.toolsPermissions.allowedWithoutValidation = v })} /></Field>
              <Field label="Actions avec validation"><EList value={draft.toolsPermissions.requiresValidation} onChange={v => set(d => { d.toolsPermissions.requiresValidation = v })} /></Field>
              <Field label="Canaux d’exécution"><EList value={draft.toolsPermissions.executionChannels} onChange={v => set(d => { d.toolsPermissions.executionChannels = v })} /></Field>
              <Field label="Niveau de risque"><EText value={draft.toolsPermissions.riskLevel} onChange={v => set(d => { d.toolsPermissions.riskLevel = (['low', 'medium', 'high'].includes(v) ? v : d.toolsPermissions.riskLevel) as AgentProfile['toolsPermissions']['riskLevel'] })} rows={1} /></Field>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Outils autorisés"><Tags items={active.toolsPermissions.allowedTools} /></Field>
              <Field label="Outils interdits"><Bullets items={active.toolsPermissions.forbiddenTools} color="#DC2626" /></Field>
              <Field label="Sans validation"><Bullets items={active.toolsPermissions.allowedWithoutValidation} color="#16A34A" /></Field>
              <Field label="Avec validation"><Bullets items={active.toolsPermissions.requiresValidation} color="#D97706" /></Field>
              <Field label="Canaux d’exécution"><Tags items={active.toolsPermissions.executionChannels} /></Field>
              <Field label="Niveau de risque"><span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: (RISK[active.toolsPermissions.riskLevel]?.color ?? '#6B7280') + '1A', color: RISK[active.toolsPermissions.riskLevel]?.color }}>{RISK[active.toolsPermissions.riskLevel]?.label ?? active.toolsPermissions.riskLevel}</span></Field>
            </div>
          ))}

          {tab === 'tasks' && (
            <div className="flex flex-col gap-3">
              {active.linkedTaskIds.length === 0
                ? <span className="text-[11px] text-soren-subtle">Aucune tâche liée listée ici — voir le module Tâches.</span>
                : <Tags items={active.linkedTaskIds} />}
              <div className="flex items-center gap-2">
                <button onClick={() => router.push(`/taches?assignee=${encodeURIComponent(active.name)}`)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#FF4D00] rounded-full px-3 py-1.5"><ListChecks size={12} /> Voir toutes ses tâches</button>
                <button title="Bientôt branché" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted bg-soren-elevated rounded-full px-3 py-1.5 cursor-not-allowed">Créer une tâche</button>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="flex flex-col gap-3">
              {active.linkedActivityIds.length === 0
                ? <span className="text-[11px] text-soren-subtle">Aucun log listé ici — voir le module Activités.</span>
                : <Tags items={active.linkedActivityIds} />}
              <button onClick={() => router.push(`/logs?actor=${encodeURIComponent(active.name)}`)} className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#FF4D00] rounded-full px-3 py-1.5"><Activity size={12} /> Voir tous ses logs</button>
            </div>
          )}

          {tab === 'heartbeats' && (
            <div className="flex flex-col gap-3">
              {/* Crons en cours */}
              <div className="flex flex-col gap-2">
                {hbList.length === 0 && <span className="text-[11px] text-soren-subtle">Aucun cron en cours.</span>}
                {hbList.map(hb => {
                  const c = hb.status === 'actif' ? '#16A34A' : '#D97706'
                  return (
                    <div key={hb.id} className="bg-soren-elevated rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                      <HeartPulse size={14} className="text-[#FF4D00] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-normal text-soren-text leading-snug">{hb.request}</p>
                        <p className="text-[10px] text-soren-subtle">{hb.when}</p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: c + '1A', color: c }}>{hb.status}</span>
                    </div>
                  )
                })}
              </div>

              {/* Demander un nouveau heartbeat */}
              <div className="bg-soren-card border border-soren-border rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Demander un nouveau heartbeat</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
                    <input type="date" value={hbDate} onChange={e => setHbDate(e.target.value)}
                      className="w-full bg-soren-elevated rounded-xl border border-soren-border pl-8 pr-2.5 py-2 text-[12px] text-soren-text outline-none accent-[#FF4D00] [color-scheme:light] focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 transition-all" />
                  </div>
                  <div className="relative w-32">
                    <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-soren-subtle pointer-events-none" />
                    <input type="time" value={hbTime} onChange={e => setHbTime(e.target.value)}
                      className="w-full bg-soren-elevated rounded-xl border border-soren-border pl-8 pr-2.5 py-2 text-[12px] text-soren-text outline-none accent-[#FF4D00] [color-scheme:light] focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 transition-all" />
                  </div>
                </div>
                <textarea value={hbReq} onChange={e => setHbReq(e.target.value)} rows={2} placeholder="Demande (ex : relancer les clients silencieux)…" className="w-full bg-soren-elevated rounded-lg px-2.5 py-2 text-[12px] text-soren-text outline-none resize-none" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#D97706]" style={{ background: '#D9770618' }}>Proposé localement — non branché au scheduler</span>
                  <button onClick={requestHeartbeat} disabled={!hbReq.trim()} className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#FF4D00] rounded-full px-4 py-1.5 disabled:opacity-50"><HeartPulse size={13} /> Demander</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'édition (zone contenu) */}
        {editing && (
          <div className="px-5 py-3 border-t border-soren-border flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#D97706]" style={{ background: '#D9770618' }}>Édition locale — sauvegarde non branchée</span>
            {unsaved && <span className="text-[10px] text-soren-subtle">• modifications non enregistrées</span>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={cancel} className="text-[12px] font-semibold text-soren-muted hover:text-soren-text px-3 py-1.5">Annuler</button>
              <button onClick={save} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#FF4D00] rounded-full px-4 py-1.5"><Save size={13} /> Enregistrer</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
