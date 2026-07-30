'use client'

/**
 * La zone dépliable sous chaque card KPI du Media Buyer.
 *
 * Repliée : « modifié le … par X » avec l'avatar du dernier intervenant.
 * Dépliée : le fil (messages écrits uniquement, 🎯 quand une cible est posée),
 * le bouton Historique de conversation, puis le levier propre à la card.
 * Aucun bouton « appliquer » : bouger le levier écrit directement.
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ChevronDown, History, Target, Send, Trash2 } from 'lucide-react'

type Msg = { _id: string; author: string; authorKind: string; avatarUrl?: string; body: string; icon?: string; createdAt: number }
type Overview = {
  cards: Record<string, { last: { author: string; authorKind: string; avatarUrl?: string; createdAt: number } | null; active: Msg[]; archivedCount: number }>
  levers: Record<string, { value: number; updatedBy: string; updatedAt: number }>
}

const LEVER_BY_CARD: Record<string, { key: string; label: string; kind: 'slider' | 'number'; suffix: string; target?: boolean; max?: number }> = {
  spend: { key: 'budgetPerDay', label: 'Budget / jour', kind: 'number', suffix: 'CHF/j' },
  cpl:   { key: 'cplTarget',    label: 'CPL cible',     kind: 'number', suffix: 'CHF', target: true },
  leads: { key: 'leadsWeekly',  label: 'Objectif / semaine', kind: 'number', suffix: 'leads', target: true },
  ctr:   { key: 'ctrFloor',     label: 'Plancher CTR',  kind: 'number', suffix: '%', target: true },
}

const fmtWhen = (t: number) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Avatar({ url, name, size = 22 }: { url?: string; name: string; size?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="rounded-full bg-soren-text text-white flex items-center justify-center font-bold flex-shrink-0"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function Message({ m, onDelete }: { m: Msg; onDelete?: () => void }) {
  return (
    <div className="flex gap-2 group/msg">
      <Avatar url={m.avatarUrl} name={m.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-soren-text">{m.author}</span>
          {m.authorKind === 'agent' && (
            <span className="text-[8px] font-bold uppercase tracking-wide rounded px-1 py-0.5 bg-soren-accent/10 text-soren-accent">Agent</span>
          )}
          <span className="text-[9.5px] text-soren-subtle">{fmtWhen(m.createdAt)}</span>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Supprimer le message"
              className="ml-auto opacity-0 group-hover/msg:opacity-100 transition-opacity text-soren-subtle hover:text-red-600"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <p className="text-[11.5px] text-soren-muted leading-relaxed mt-0.5 flex items-start gap-1">
          {m.icon === 'target' && <Target size={11} className="text-soren-accent flex-shrink-0 mt-0.5" />}
          <span>{m.body}</span>
        </p>
      </div>
    </div>
  )
}

// kpi = dans une card KPI (p-3/p-4) ; panel = conteneur p-5 (graphiques) ;
// flush = conteneur sans padding (sections tableau), la zone gère son propre px-5.
const VARIANT_ROOT: Record<string, { root: string; pad: string }> = {
  kpi:   { root: '-mx-3 md:-mx-4 -mb-3 md:-mb-4 mt-1.5', pad: 'px-3 md:px-4' },
  panel: { root: '-mx-5 -mb-5 mt-3', pad: 'px-5' },
  flush: { root: '', pad: 'px-5' },
}

export default function CardDrop({ cardId, variant = 'kpi' }: { cardId: string; variant?: 'kpi' | 'panel' | 'flush' }) {
  const ov = useQuery(api.cardThreads.overview) as Overview | undefined
  const me = useQuery(api.users.me)
  const post = useMutation(api.cardThreads.post)
  const setLever = useMutation(api.cardThreads.setLever)
  const removeMsg = useMutation(api.cardThreads.remove)
  const canDelete = (m: Msg) => Boolean(me && (me.isAdmin || me.name === m.author))

  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [draft, setDraft] = useState('')
  const [leverDraft, setLeverDraft] = useState<number | null>(null)

  const hist = useQuery(api.cardThreads.history, showHistory ? { cardId } : 'skip') as Msg[] | undefined

  const card = ov?.cards?.[cardId]
  const lever = LEVER_BY_CARD[cardId]
  const leverState = lever ? ov?.levers?.[lever.key] : undefined
  const leverValue = leverDraft ?? leverState?.value ?? (lever?.kind === 'slider' ? 0 : 0)

  const send = () => {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    void post({ cardId, body })
  }
  const commitLever = (val: number) => {
    setLeverDraft(null)
    if (lever && val !== leverState?.value) void setLever({ key: lever.key, value: val })
  }

  const vr = VARIANT_ROOT[variant]
  return (
    <div className={`${vr.root} border-t border-soren-border/60`} onClick={(e) => e.stopPropagation()}>
      {/* Aperçu : la dernière modification, qui et quand */}
      <button
        onClick={() => setOpen((s) => !s)}
        className={`w-full flex items-center gap-1.5 ${vr.pad} py-2 text-left cursor-pointer`}
      >
        {card?.last ? (
          <>
            <Avatar url={card.last.avatarUrl} name={card.last.author} size={16} />
            <span className="text-[9.5px] text-soren-subtle truncate">
              modifié le {fmtWhen(card.last.createdAt)} par{' '}
              <span className="font-semibold text-soren-muted">{card.last.author}</span>
            </span>
          </>
        ) : (
          <span className="text-[9.5px] text-soren-subtle">Discussion et consigne</span>
        )}
        <ChevronDown size={12} className={`ml-auto flex-shrink-0 text-soren-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`${vr.pad} pb-3 flex flex-col gap-2.5`}>
          {/* Le fil actif (moins de 3 jours) */}
          {(card?.active ?? []).map((m) => (
            <Message key={m._id} m={m} onDelete={canDelete(m) ? () => void removeMsg({ id: m._id as never }) : undefined} />
          ))}

          {/* Composer */}
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Répondre…"
              className="flex-1 min-w-0 text-[11px] bg-soren-elevated border border-soren-border rounded-full px-3 py-1.5 text-soren-text outline-none focus:border-soren-accent/50"
            />
            <button onClick={send} className="w-7 h-7 rounded-full bg-soren-text text-white flex items-center justify-center flex-shrink-0" title="Envoyer">
              <Send size={11} />
            </button>
          </div>

          {/* Historique : les fils rangés après 3 jours */}
          {(card?.archivedCount ?? 0) > 0 && (
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-soren-subtle hover:text-soren-text transition-colors self-start"
            >
              <History size={10} />
              Historique de conversation ({card!.archivedCount})
            </button>
          )}
          {showHistory && (hist ?? []).map((m) => (
            <div key={m._id} className="opacity-60">
              <Message m={m} onDelete={canDelete(m) ? () => void removeMsg({ id: m._id as never }) : undefined} />
            </div>
          ))}

          {/* Le levier propre à la card */}
          {lever && (
            <div className="border-t border-soren-border/60 pt-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide text-soren-muted">
                  {lever.target && <Target size={10} className="text-soren-accent" />}
                  {lever.label}
                </span>
                <span className="text-[11px] font-bold text-soren-text tabular-nums">
                  {lever.kind === 'slider' ? `${Math.round(leverValue)} ${lever.suffix}` : ''}
                </span>
              </div>
              {lever.kind === 'slider' ? (
                <input
                  type="range" min={0} max={lever.max ?? 100} step={1}
                  value={leverValue}
                  onChange={(e) => setLeverDraft(Number(e.target.value))}
                  onPointerUp={(e) => commitLever(Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-soren-accent"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number" step="0.1" min={0}
                    value={leverDraft ?? leverState?.value ?? ''}
                    placeholder="—"
                    onChange={(e) => setLeverDraft(e.target.value === '' ? null : Number(e.target.value))}
                    onBlur={() => { if (leverDraft != null) commitLever(leverDraft) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && leverDraft != null) commitLever(leverDraft) }}
                    className="w-20 text-[12px] font-bold bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-text outline-none focus:border-soren-accent/50 tabular-nums"
                  />
                  <span className="text-[10px] text-soren-subtle">{lever.suffix}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
