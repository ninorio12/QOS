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
import { NotebookPen, History, Inbox } from 'lucide-react'

const fmtWhen = (t: number) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CreativeIntelligence() {
  const current = useQuery(api.synthese.current)
  const past = useQuery(api.synthese.history)
  const save = useMutation(api.synthese.save)

  // Boîte de réception des rapports quotidiens du Data OS (pastille = non lus).
  const inbox = useQuery(api.dailyReport.inbox)
  const markRead = useMutation(api.dailyReport.markRead)
  const [showInbox, setShowInbox] = useState(false)
  const [openReport, setOpenReport] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const downloadPdf = async (title: string, body: string) => {
    setPdfBusy(true)
    try {
      const res = await fetch('/api/rapport/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${title.replace(/[^\w-]+/g, '-')}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setPdfBusy(false) }
  }

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
        {/* Boîte de réception : le rapport du jour, avec pastille tant qu'il n'est pas lu */}
        <button
          onClick={() => setShowInbox((v) => !v)}
          className={`ml-auto relative flex items-center gap-1.5 text-[10px] font-medium rounded-full border px-2.5 py-1 transition-colors ${
            showInbox ? 'bg-soren-accent/10 border-soren-accent/30 text-soren-accent' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'
          }`}
        >
          <Inbox size={10} />
          Rapports
          {(inbox?.unread ?? 0) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF4D00] text-white text-[9px] font-bold flex items-center justify-center">
              {inbox!.unread}
            </span>
          )}
        </button>
        {(past?.length ?? 0) > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-medium rounded-full border px-2.5 py-1 transition-colors ${
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

      {showInbox && (
        <div className="border-b border-soren-border/60 max-h-[280px] overflow-y-auto flex-shrink-0">
          {(inbox?.reports.length ?? 0) === 0 && (
            <p className="text-[11.5px] text-soren-subtle px-5 py-4">Aucun rapport pour l&apos;instant. Le premier arrive demain matin.</p>
          )}
          {inbox?.reports.map((r) => (
            <div key={r.id} className="px-5 py-3 border-b border-soren-border/40 last:border-0">
              <div className="flex items-center gap-2">
                {!r.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] flex-shrink-0" />}
                <button
                  onClick={() => { setOpenReport(openReport === r.id ? null : r.id); if (!r.read) void markRead({ id: r.id as never }) }}
                  className={`text-[12.5px] text-left flex-1 ${r.read ? 'text-soren-muted' : 'font-semibold text-soren-text'}`}
                >
                  {r.title}
                </button>
                <button
                  onClick={() => void downloadPdf(r.title, r.body)}
                  disabled={pdfBusy}
                  className="text-[10px] font-semibold text-soren-accent border border-soren-border rounded-full px-2 py-0.5 hover:bg-soren-elevated disabled:opacity-50"
                >
                  {pdfBusy ? '…' : 'PDF'}
                </button>
              </div>
              {openReport === r.id && (
                <pre className="mt-2 text-[11.5px] leading-relaxed text-soren-muted whitespace-pre-wrap font-sans">{r.body}</pre>
              )}
            </div>
          ))}
        </div>
      )}

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
