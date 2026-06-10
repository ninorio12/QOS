'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  CheckSquare, Bot, ShieldCheck, Brain, AlertTriangle, Scale, Play,
  Radio, User, Cpu, ScrollText, X, ArrowUpRight, type LucideIcon,
} from 'lucide-react'
import { activityMeta, sourceMeta, type ActivityKind } from '@/components/agentic/doctrine'
import { AGENT_PROFILES } from '@/components/agentic/agentProfiles'
import { Pill, DetailPanel, KV } from '@/components/agentic/ui'

type Activity = {
  id: string; actorType: string; actorId: string; eventType: string
  entityType?: string; entityId?: string; summary: string; source?: string
  createdAt: string
}

// Icône selon le type d'événement (kind doctrine).
const kindIcon: Record<ActivityKind, LucideIcon> = {
  run: Play,
  task: CheckSquare,
  decision: Scale,
  memory: Brain,
  validation: ShieldCheck,
  error: AlertTriangle,
}

// Icône selon l'acteur.
const actorIcon = (t: string): LucideIcon => (t === 'agent' ? Bot : t === 'system' ? Cpu : User)

const STATUS_COLOR: Record<string, string> = {
  success: '#16A34A',
  attention: '#D97706',
  error: '#DC2626',
}
const STATUS_LABEL: Record<string, string> = {
  success: 'Succès',
  attention: 'Attention',
  error: 'Erreur',
}

const dateFR = (s: string) =>
  new Date(s).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Filtres = Tous · un par agent (par nom) · Erreurs.
const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Tous' },
  ...AGENT_PROFILES.map(a => ({ id: a.name, label: a.name })),
  { id: 'errors', label: 'Erreurs' },
]

// Petit bouton lien sobre (router.push) — affiché seulement quand la cible est connue.
function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-soren-sidebar hover:underline"
    >
      {label} <ArrowUpRight size={11} />
    </button>
  )
}

export default function LogsView() {
  const router = useRouter()
  const activities = (useQuery(api.osActivities.list, { limit: 300 }) ?? []) as Activity[]
  const [filter, setFilter] = useState('all')

  // Deep-link entrant (lu sans useSearchParams, en useEffect au montage).
  const [actorParam, setActorParam] = useState<string | null>(null)
  const [taskParam, setTaskParam] = useState<string | null>(null)
  const [qParam, setQParam] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setActorParam(params.get('actor'))
    setTaskParam(params.get('task'))
    setQParam(params.get('q'))
  }, [])

  // Activité ouverte dans le panneau détail.
  const [selected, setSelected] = useState<Activity | null>(null)

  const shown = useMemo(() => {
    let list = activities
    if (filter === 'errors') list = list.filter(a => a.eventType === 'error' || a.eventType === 'blocker')
    else if (filter !== 'all') { const v = filter.toLowerCase(); list = list.filter(a => a.actorId.toLowerCase().includes(v)) }

    if (actorParam) {
      const v = actorParam.toLowerCase()
      list = list.filter(a => a.actorId.toLowerCase().includes(v))
    }
    if (taskParam) {
      list = list.filter(a =>
        a.eventType.startsWith('task') || a.entityId === taskParam || a.summary.includes(taskParam),
      )
    }
    if (qParam) {
      const v = qParam.toLowerCase()
      list = list.filter(a => a.summary.toLowerCase().includes(v))
    }
    return list
  }, [activities, filter, actorParam, taskParam, qParam])

  const deepChips: { key: string; label: string; clear: () => void }[] = [
    ...(actorParam ? [{ key: 'actor', label: `acteur : ${actorParam}`, clear: () => setActorParam(null) }] : []),
    ...(taskParam ? [{ key: 'task', label: `tâche : ${taskParam}`, clear: () => setTaskParam(null) }] : []),
    ...(qParam ? [{ key: 'q', label: `recherche : ${qParam}`, clear: () => setQParam(null) }] : []),
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filtres */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
              filter === f.id
                ? 'bg-soren-sidebar text-white border-soren-sidebar'
                : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-soren-subtle flex items-center gap-1.5">
          <Radio size={11} className="text-[#16A34A]" /> {shown.length} événements
        </span>
      </div>

      {/* Chips de filtre actif (deep-link) — cliquer pour retirer, en mémoire. */}
      {deepChips.length > 0 && (
        <div className="px-6 pb-2 flex-shrink-0 flex items-center gap-1.5 flex-wrap">
          {deepChips.map(c => (
            <button
              key={c.key}
              onClick={c.clear}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-soren-border bg-soren-elevated text-soren-muted hover:text-soren-text transition-colors"
            >
              filtre actif : {c.label}
              <X size={11} />
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-soren-elevated flex items-center justify-center">
              <ScrollText size={20} className="text-soren-muted" />
            </div>
            <p className="text-[12px] text-soren-subtle max-w-xs">
              Aucune activité. Le journal se remplit dès qu&apos;une tâche, un agent ou une mémoire est mis à jour.
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col" data-stagger>
            {shown.map((a, i) => {
              const m = activityMeta(a.eventType)
              const KIcon = kindIcon[m.kind]
              const AIcon = actorIcon(a.actorType)
              const statusColor = STATUS_COLOR[m.status]
              const isError = m.status === 'error' || a.eventType === 'error' || a.eventType === 'blocker'
              return (
                <div key={a.id} className="flex gap-3 w-full">
                  {/* Noeud + ligne */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: m.color + '1A' }}
                    >
                      <KIcon size={13} style={{ color: m.color }} />
                    </div>
                    {i < shown.length - 1 && <div className="w-px flex-1 bg-soren-border my-1" />}
                  </div>

                  {/* Contenu — ligne cliquable ouvrant le panneau détail. */}
                  <button
                    onClick={() => setSelected(a)}
                    className="flex-1 pb-4 min-w-0 text-left rounded-lg -mx-2 px-2 py-1 hover:bg-soren-elevated transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill color={m.color}>{m.label}</Pill>
                      {isError && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#DC2626]">
                          <span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} /> Erreur
                        </span>
                      )}
                      <span className="text-[12px] font-semibold text-soren-text">{a.summary}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-soren-subtle flex-wrap">
                      <span>{dateFR(a.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">· <AIcon size={10} /> {a.actorId}</span>
                      <span>· {sourceMeta(a.source).label}</span>
                      <span className="inline-flex items-center gap-1">
                        · <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panneau détail */}
      {selected && (() => {
        const m = activityMeta(selected.eventType)
        const PanelIcon = kindIcon[m.kind]
        const isAgent = selected.actorType === 'agent'
        const linkedTask = selected.eventType.startsWith('task') && selected.entityId
        return (
          <DetailPanel
            open={!!selected}
            onClose={() => setSelected(null)}
            accent={m.color}
            title={m.label}
            subtitle={dateFR(selected.createdAt)}
            icon={PanelIcon}
          >
            <KV label="Acteur">
              <span className="flex items-center gap-1.5">
                {selected.actorType} — {selected.actorId}
              </span>
              {isAgent && (
                <div className="mt-1">
                  <LinkButton
                    label="Voir l'agent"
                    onClick={() => router.push(`/equipe?agent=${encodeURIComponent(selected.actorId)}`)}
                  />
                </div>
              )}
            </KV>

            <KV label="Source">{sourceMeta(selected.source).label}</KV>

            <KV label="Action">{selected.summary}</KV>

            <KV label="Résultat">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[m.status] }} />
                {STATUS_LABEL[m.status]}
              </span>
            </KV>

            <KV label="Tâche liée">
              {linkedTask ? (
                <LinkButton
                  label={`Voir la tâche ${selected.entityId}`}
                  onClick={() => router.push(`/taches?task=${encodeURIComponent(selected.entityId!)}`)}
                />
              ) : (
                <span className="text-soren-subtle">non lié</span>
              )}
            </KV>

            <KV label="Agent lié">
              {isAgent ? (
                <LinkButton
                  label={selected.actorId}
                  onClick={() => router.push(`/equipe?agent=${encodeURIComponent(selected.actorId)}`)}
                />
              ) : (
                <span className="text-soren-subtle">—</span>
              )}
            </KV>

            <KV label="Preuve">
              <span className="text-soren-subtle">non branché</span>
            </KV>

            <KV label="Mémoire impactée">
              {m.memoryUpdated ? (
                <LinkButton label="Voir Mémoire" onClick={() => router.push('/knowledge?tab=memory')} />
              ) : (
                <span className="text-soren-subtle">—</span>
              )}
            </KV>

            <p className="text-[11px] leading-relaxed text-soren-subtle border-t border-soren-border pt-3">
              Les liens non branchés sont affichés honnêtement « non lié » / « non branché ».
            </p>
          </DetailPanel>
        )
      })()}
    </div>
  )
}
