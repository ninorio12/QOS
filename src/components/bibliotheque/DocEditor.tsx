'use client'

import { useEffect, useRef } from 'react'
import { Bold, List, Heading, Table as TableIcon, Workflow as WorkflowIcon } from 'lucide-react'

/**
 * Word-like document editor: a blank white page where you write freely,
 * with a toolbar to insert tables and simple workflows (boxes joined by
 * dashes). The whole document is serialised to HTML and persisted by the
 * parent — tables and workflow boxes survive as inline-styled HTML.
 */
export default function DocEditor({ html, onChange, readOnly = false }: { html: string; onChange: (html: string) => void; readOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set the initial content once; never on prop change (would reset the caret).
  useEffect(() => { if (ref.current) ref.current.innerHTML = html || '' }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (ref.current) onChange(ref.current.innerHTML) }, 600)
  }

  function focusEditor() {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  function exec(cmd: string, val?: string) {
    focusEditor()
    document.execCommand(cmd, false, val)
    save()
  }

  function insertHtml(snippet: string) {
    focusEditor()
    document.execCommand('insertHTML', false, snippet)
    save()
  }

  const CELL = 'border:1px solid #d4d4d8;padding:8px 10px;min-width:90px;vertical-align:top;'
  function insertTable() {
    const row = `<tr><td style="${CELL}"><br></td><td style="${CELL}"><br></td><td style="${CELL}"><br></td></tr>`
    insertHtml(
      `<table style="border-collapse:collapse;width:100%;margin:14px 0;font-size:13px;"><tbody>${row}${row}</tbody></table><p><br></p>`
    )
  }

  const BOX = 'display:inline-block;border:1.5px solid #111827;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:600;min-width:64px;text-align:center;'
  const DASH = '<span style="color:#9ca3af;font-weight:700;" contenteditable="false"> — </span>'
  function insertWorkflow() {
    const box = (t: string) => `<span style="${BOX}">${t}</span>`
    insertHtml(
      `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:14px 0;">${box('Étape 1')}${DASH}${box('Étape 2')}${DASH}${box('Étape 3')}</div><p><br></p>`
    )
  }

  const btn = 'flex items-center gap-1.5 text-[11px] font-semibold text-[#374151] hover:text-[#111] bg-[#f3f4f6] hover:bg-[#e5e7eb] rounded-lg px-2.5 py-1.5 transition-colors'

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar — masquée en lecture seule */}
      {!readOnly && (
      <div className="flex items-center gap-1.5 flex-wrap sticky top-0 z-10 bg-white/90 backdrop-blur py-1.5">
        <button type="button" onClick={() => exec('bold')} className={btn} title="Gras"><Bold size={13} /></button>
        <button type="button" onClick={() => exec('formatBlock', 'h2')} className={btn} title="Titre"><Heading size={13} /> Titre</button>
        <button type="button" onClick={() => exec('insertUnorderedList')} className={btn} title="Liste"><List size={13} /> Liste</button>
        <span className="w-px h-4 bg-[#e5e7eb] mx-0.5" />
        <button type="button" onClick={insertTable} className={btn}><TableIcon size={13} /> Tableau</button>
        <button type="button" onClick={insertWorkflow} className={btn}><WorkflowIcon size={13} /> Workflow</button>
      </div>
      )}

      {/* The page */}
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={readOnly ? undefined : save}
        onBlur={readOnly ? undefined : save}
        data-placeholder={readOnly ? 'Aucun contenu.' : 'Écris ton process ici…'}
        className="doc-page bg-white text-[#1f2937] rounded-xl border border-[#e5e7eb] shadow-sm px-8 py-7 min-h-[420px] outline-none text-[14px] leading-relaxed"
      />

      <style jsx global>{`
        .doc-page:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
        .doc-page h2 { font-size: 1.35rem; font-weight: 800; margin: 0.6em 0 0.3em; color: #111827; }
        .doc-page p { margin: 0.25em 0; min-height: 1.2em; }
        .doc-page ul { list-style: disc; padding-left: 1.4em; margin: 0.3em 0; }
        .doc-page li { margin: 0.1em 0; }
        .doc-page table td:focus { outline: 2px solid #FF4D0055; outline-offset: -2px; }
        .doc-page:focus { outline: none; }
      `}</style>
    </div>
  )
}
