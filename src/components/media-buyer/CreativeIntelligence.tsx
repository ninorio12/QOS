'use client'

/**
 * Synthèse — la note de travail du Media Buyer, sous le board.
 *
 * L'en-tête s'ouvre sur une zone de texte éditable (autosave). La note reste
 * éditable 24 h ; ensuite, si elle est remplie, elle bascule dans l'historique
 * et une zone vierge la remplace. Écrit par les humains comme par l'agent.
 */

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { NotebookPen, History, ChevronDown } from 'lucide-react'

const fmtWhen = (t: number) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CreativeIntelligence() {
  const current = useQuery(api.synthese.current)
  const past = useQuery(api.synthese.history)
  const save = useMutation(api.synthese.save)

  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)   // null = pas d'édition locale en cours
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const body = draft ?? current?.body ?? ''

  // Autosave : 800 ms après la dernière frappe.
  const onType = (v: string) => {
    setDraft(v)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void save({ body: v }) }, 800)
  }
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="bg-soren-elevated border border-soren-border rounded-2xl overflow-hidden mb-5">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <NotebookPen size={15} className="text-soren-accent flex-shrink-0" />
          <span className="text-[13px] font-bold text-soren-text">Synthèse</span>
          {current && current.body.trim() && (
            <span className="text-[10px] text-soren-subtle truncate">
              modifié le {fmtWhen(current.updatedAt)} par <span className="font-semibold text-soren-muted">{current.updatedBy}</span>
            </span>
          )}
        </div>
        <ChevronDown size={13} className={`flex-shrink-0 text-soren-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-4 flex flex-col gap-2.5">
          <textarea
            value={body}
            onChange={(e) => onType(e.target.value)}
            placeholder="Écrire la synthèse du jour…"
            rows={5}
            className="w-full text-[12px] leading-relaxed bg-soren-card border border-soren-border rounded-xl px-3.5 py-3 text-soren-text outline-none focus:border-soren-accent/50 resize-y"
          />
          {(past?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1.5 text-[10.5px] font-medium text-soren-subtle hover:text-soren-text transition-colors self-start"
            >
              <History size={11} />
              Historique ({past!.length})
              <ChevronDown size={11} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          )}
          {showHistory && (past ?? []).map((s) => (
            <div key={s._id} className="bg-soren-card border border-soren-border rounded-xl px-3.5 py-3">
              <div className="text-[9.5px] text-soren-subtle mb-1">
                {fmtWhen(s.createdAt)} · <span className="font-semibold text-soren-muted">{s.updatedBy}</span>
              </div>
              <p className="text-[11.5px] text-soren-muted leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
