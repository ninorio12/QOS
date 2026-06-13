'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { CheckCircle2, XCircle, Clock, ShieldAlert, Bot, ChevronDown } from 'lucide-react'

// ───────────────────────────────────────────────────────────────────────────
// Écran d'approbations — file d'attente humaine.
// Toute action sensible proposée par un agent (deny/approval) atterrit ici en
// `pending`. L'humain approuve/refuse → l'agent exécute (ou non). Append-only
// côté audit (os_agent_events). Le SECRET break-glass n'apparaît jamais ici.
// ───────────────────────────────────────────────────────────────────────────

const RISK_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Élevé',  color: '#DC2626', bg: '#FEE2E2' },
  medium: { label: 'Moyen',  color: '#B45309', bg: '#FEF3C7' },
  low:    { label: 'Faible', color: '#475569', bg: '#F1F5F9' },
}
const riskMeta = (r: string) => RISK_META[r] ?? RISK_META.low
const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

type Approval = {
  id: string; agentName: string; requestedAction: string; riskLevel: string
  reason?: string; context?: unknown; payload?: unknown; requestedAt: string
}

export default function ApprovalsQueue() {
  const approvals = useQuery(api.agents.pendingApprovals, {}) as Approval[] | undefined
  const review = useMutation(api.agents.reviewApproval)
  const { me } = useCurrentUser()
  const reviewer = me?.email ? `human:${me.email}` : 'human'

  const [busy, setBusy] = useState<string | null>(null)
  const [openCtx, setOpenCtx] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const act = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(id)
    try { await review({ id: id as never, decision, reviewedBy: reviewer, note: notes[id] || undefined }) }
    finally { setBusy(null) }
  }

  if (approvals === undefined) return <p className="text-[12px] text-soren-subtle px-1">Chargement…</p>

  if (approvals.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center"><CheckCircle2 size={22} /></div>
      <p className="text-[13px] font-medium text-soren-text">Aucune approbation en attente</p>
      <p className="text-[11.5px] text-soren-subtle max-w-xs">Les actions sensibles proposées par les agents apparaîtront ici pour validation humaine.</p>
    </div>
  )

  // Tri : risque élevé d'abord, puis plus ancien d'abord (FIFO).
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sorted = [...approvals].sort((a, b) =>
    (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3) || a.requestedAt.localeCompare(b.requestedAt))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">
          <Clock size={13} /> {approvals.length} en attente
        </span>
      </div>

      {sorted.map(a => {
        const rm = riskMeta(a.riskLevel)
        const hasCtx = a.context != null || a.payload != null
        const ctxOpen = openCtx === a.id
        return (
          <div key={a.id} className="bg-soren-card border border-soren-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center flex-shrink-0"><Bot size={15} /></div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-soren-text">{a.requestedAction}</p>
                  <p className="text-[11px] text-soren-subtle">{a.agentName} · demandé {fmt(a.requestedAt)}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: rm.bg, color: rm.color }}>
                <ShieldAlert size={10} /> {rm.label}
              </span>
            </div>

            {a.reason && <p className="text-[11.5px] text-soren-muted bg-soren-elevated rounded-lg px-2.5 py-2">{a.reason}</p>}

            {hasCtx && (
              <div>
                <button onClick={() => setOpenCtx(ctxOpen ? null : a.id)} className="inline-flex items-center gap-1 text-[11px] text-soren-subtle hover:text-soren-text">
                  <ChevronDown size={12} className={`transition-transform ${ctxOpen ? 'rotate-180' : ''}`} /> Contexte
                </button>
                {ctxOpen && (
                  <pre className="mt-1.5 text-[10px] font-mono bg-soren-elevated rounded-lg p-2.5 overflow-x-auto text-soren-muted whitespace-pre-wrap break-all">
                    {JSON.stringify(a.payload ?? a.context, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <input
              value={notes[a.id] ?? ''}
              onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
              placeholder="Note de revue (optionnel)"
              className="text-[11.5px] bg-soren-app border border-soren-border rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C8CBD0] text-soren-text placeholder:text-soren-muted"
            />

            <div className="flex gap-2">
              <button disabled={busy === a.id} onClick={() => act(a.id, 'approve')}
                className="flex-1 text-[12px] font-semibold px-3 py-2 rounded-xl bg-[#DCFCE7] text-[#16A34A] inline-flex items-center justify-center gap-1.5 hover:bg-[#BBF7D0] disabled:opacity-50 transition-colors">
                <CheckCircle2 size={14} /> Approuver
              </button>
              <button disabled={busy === a.id} onClick={() => act(a.id, 'reject')}
                className="flex-1 text-[12px] font-semibold px-3 py-2 rounded-xl bg-[#FEE2E2] text-[#DC2626] inline-flex items-center justify-center gap-1.5 hover:bg-[#FECACA] disabled:opacity-50 transition-colors">
                <XCircle size={14} /> Refuser
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
