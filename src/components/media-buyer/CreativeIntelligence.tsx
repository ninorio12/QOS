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
import { NotebookPen, History } from 'lucide-react'

const fmtWhen = (t: number) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CreativeIntelligence() {
  const current = useQuery(api.synthese.current)
  const past = useQuery(api.synthese.history)
  const save = useMutation(api.synthese.save)

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
    <div className="bg-soren-card border border-soren-border rounded-2xl h-full flex flex-col overflow-hidden">
      {/* En-tête : le titre, l'auteur de la dernière retouche, l'accès à l'historique */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 flex-shrink-0 border-b border-soren-border/60">
        <NotebookPen size={15} className="text-soren-accent flex-shrink-0" />
        <span className="text-[13px] font-bold text-soren-text">Synthèse</span>
        {(past?.length ?? 0) > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`ml-auto flex items-center gap-1.5 text-[10px] font-medium rounded-full border px-2.5 py-1 transition-colors ${
              showHistory
                ? 'bg-soren-accent/10 border-soren-accent/30 text-soren-accent'
                : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
            }`}
          >
            <History size={10} />
            Historique ({past!.length})
          </button>
        )}
      </div>

      {showHistory ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 flex flex-col gap-2">
          {(past ?? []).map((s) => (
            <div key={s._id} className="bg-soren-elevated border border-soren-border rounded-xl px-3.5 py-3">
              <div className="text-[9.5px] text-soren-subtle mb-1">
                {fmtWhen(s.createdAt)} · <span className="font-semibold text-soren-muted">{s.updatedBy}</span>
              </div>
              <p className="text-[11.5px] text-soren-muted leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => onType(e.target.value)}
          placeholder="Écrire la synthèse du jour…"
          className="flex-1 min-h-[140px] w-full text-[12px] leading-relaxed bg-transparent px-5 py-4 text-soren-text outline-none resize-none"
        />
      )}

      {/* Pied : qui a écrit en dernier, et le rappel de la règle des 24 h */}
      <div className="px-5 py-2.5 flex-shrink-0 border-t border-soren-border/60 flex items-center gap-2">
        <span className="text-[9.5px] text-soren-subtle truncate">
          {current && current.body.trim()
            ? <>modifié le {fmtWhen(current.updatedAt)} par <span className="font-semibold text-soren-muted">{current.updatedBy}</span></>
            : 'Rangée dans l\'historique après 24 h'}
        </span>
      </div>
    </div>
  )
}
