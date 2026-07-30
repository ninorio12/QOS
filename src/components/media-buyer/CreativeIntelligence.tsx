'use client'

/**
 * Creative Intelligence — le cockpit de décision du Media Buyer.
 *
 * Section AJOUTÉE sous le board existant, sans toucher à ce qui est déjà là.
 * L'agent (ou le moteur de règles) propose ; chaque proposition arrive avec un
 * verdict, une raison chiffrée et une action ; l'humain valide, refuse ou
 * modifie l'action avant de valider. Tout finit dans l'historique.
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Sparkles, Check, X, Pencil, History, ChevronDown } from 'lucide-react'

const VERDICT: Record<string, { label: string; color: string }> = {
  scale: { label: 'Scaler', color: '#10A066' },
  kill: { label: 'Couper', color: '#DC5A4B' },
  watch: { label: 'Fatigue', color: '#D9930D' },
  variant: { label: 'Variante', color: '#7C5CD6' },
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Validée', rejected: 'Refusée', modified: 'Modifiée puis validée',
}

function Chip({ verdict }: { verdict: string }) {
  const vd = VERDICT[verdict] ?? VERDICT.watch
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 flex-shrink-0"
      style={{ background: vd.color + '1a', color: vd.color }}
    >
      {vd.label}
    </span>
  )
}

export default function CreativeIntelligence() {
  const open = useQuery(api.adsIntel.listOpen)
  const past = useQuery(api.adsIntel.history)
  const analyze = useMutation(api.adsIntel.analyze)
  const decide = useMutation(api.adsIntel.decide)

  const [busy, setBusy] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  async function runAnalyze() {
    setBusy(true)
    try {
      const r = await analyze({})
      setLastRun(
        r.proposed > 0
          ? `${r.proposed} proposition${r.proposed > 1 ? 's' : ''} sur ${r.analyzed} créas analysées`
          : `${r.analyzed} créas analysées, rien de nouveau à proposer`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden mt-5">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-soren-border">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-soren-accent" />
          <span className="text-[13px] font-bold text-soren-text">Creative Intelligence</span>
          {open && open.length > 0 && (
            <span className="text-[10.5px] font-semibold text-soren-muted tabular-nums">
              {open.length} en attente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {lastRun && <span className="text-[10.5px] text-soren-subtle hidden md:inline">{lastRun}</span>}
          <button
            onClick={runAnalyze}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-soren-muted bg-soren-card border border-soren-border rounded-full px-2.5 py-1.5 hover:text-soren-text transition-colors disabled:opacity-60"
          >
            <Sparkles size={11} />
            {busy ? 'Analyse…' : 'Analyser les créas'}
          </button>
        </div>
      </div>

      {open === undefined ? (
        <div className="px-5 py-8 text-[12px] text-soren-subtle">Chargement…</div>
      ) : open.length === 0 ? (
        <div className="px-5 py-8 text-[12px] text-soren-subtle">
          Aucune proposition en attente. Lance une analyse, ou laisse l&apos;agent en déposer.
        </div>
      ) : (
        <div className="divide-y divide-soren-border">
          {open.map((d) => (
            <div key={d._id} className="px-5 py-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Chip verdict={d.verdict} />
                <span className="text-[12.5px] font-semibold text-soren-text truncate">{d.refName}</span>
                <span className="text-[10px] text-soren-subtle flex-shrink-0">
                  par {d.proposedBy === 'engine' ? 'le moteur' : d.proposedBy}
                </span>
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => decide({ id: d._id, decision: 'approved' })}
                    title="Valider"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#10A066] hover:bg-[#10A066]/10 transition-colors"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => { setEditing(d._id); setDraft(d.action) }}
                    title="Modifier l'action"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-soren-muted hover:bg-soren-elevated transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => decide({ id: d._id, decision: 'rejected' })}
                    title="Refuser"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#DC5A4B] hover:bg-[#DC5A4B]/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="text-[11.5px] text-soren-muted leading-relaxed">{d.reason}</div>
              {editing === d._id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditing(null)
                      if (e.key === 'Enter' && draft.trim()) {
                        void decide({ id: d._id, decision: 'modified', action: draft.trim() })
                        setEditing(null)
                      }
                    }}
                    className="flex-1 text-[11.5px] bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-text outline-none focus:border-soren-accent/50"
                  />
                  <button
                    onClick={() => {
                      if (draft.trim()) void decide({ id: d._id, decision: 'modified', action: draft.trim() })
                      setEditing(null)
                    }}
                    className="text-[11px] font-semibold text-soren-accent"
                  >
                    Valider ainsi
                  </button>
                </div>
              ) : (
                <div className="text-[11.5px] text-soren-text font-medium">→ {d.action}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Historique : chaque décision tranchée reste lisible, qui et quand. */}
      <button
        onClick={() => setShowHistory((s) => !s)}
        className="w-full flex items-center gap-2 px-5 py-3 border-t border-soren-border text-[11px] font-medium text-soren-muted hover:text-soren-text transition-colors"
      >
        <History size={12} />
        Historique des décisions
        {past && past.length > 0 && <span className="tabular-nums">({past.length})</span>}
        <ChevronDown size={12} className={`ml-auto transition-transform ${showHistory ? 'rotate-180' : ''}`} />
      </button>
      {showHistory && (
        <div className="divide-y divide-soren-border border-t border-soren-border">
          {(past ?? []).length === 0 ? (
            <div className="px-5 py-4 text-[11.5px] text-soren-subtle">Aucune décision tranchée pour l&apos;instant.</div>
          ) : (
            (past ?? []).map((d) => (
              <div key={d._id} className="px-5 py-2.5 flex items-center gap-2.5 min-w-0">
                <Chip verdict={d.verdict} />
                <span className="text-[11.5px] text-soren-text truncate">{d.refName}</span>
                <span className="text-[10.5px] text-soren-muted truncate hidden md:inline">→ {d.action}</span>
                <span className="ml-auto flex-shrink-0 text-[10px] text-soren-subtle">
                  {STATUS_LABEL[d.status] ?? d.status}
                  {d.decidedAt ? ` · ${new Date(d.decidedAt).toLocaleDateString('fr-CH')}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
