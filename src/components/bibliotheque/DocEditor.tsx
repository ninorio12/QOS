'use client'

import { useEffect, useRef } from 'react'
import { Bold, List, Heading, Table as TableIcon, Workflow as WorkflowIcon } from 'lucide-react'

/**
 * Word-like document editor: a blank white page where you write freely,
 * with a toolbar to insert tables and simple workflows (boxes joined by
 * dashes). The whole document is serialised to HTML and persisted by the
 * parent — tables and workflow boxes survive as inline-styled HTML.
 */
export default function DocEditor({ html, onChange, readOnly = false, paper = false }: { html: string; onChange: (html: string) => void; readOnly?: boolean; paper?: boolean }) {
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
      <div className={`flex items-center gap-1.5 flex-wrap sticky top-0 z-10 py-1.5 ${paper ? 'bg-[#FCFBF9]' : 'bg-white'}`}>
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
        className={paper
          ? 'doc-page doc-paper bg-[#FCFBF9] text-[#37352F] rounded-xl border border-[#E8E5DC] px-6 py-5 min-h-[420px] outline-none text-[13px] leading-normal'
          : 'doc-page bg-white text-[#1f2937] rounded-xl border border-[#e5e7eb] shadow-sm px-8 py-7 min-h-[420px] outline-none text-[14px] leading-relaxed'}
      />

      <style jsx global>{`
        .doc-page:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
        .doc-page h2 { font-size: 1.35rem; font-weight: 800; margin: 0.6em 0 0.3em; color: #111827; }
        .doc-page p { margin: 0.25em 0; min-height: 1.2em; }
        .doc-page ul { list-style: disc; padding-left: 1.4em; margin: 0.3em 0; }
        .doc-page li { margin: 0.1em 0; }
        .doc-page table td:focus { outline: 2px solid #FF4D0055; outline-offset: -2px; }
        .doc-page:focus { outline: none; }
        /* Variante papier clair (SOPs/Playbooks) — police MONOSPACE façon document Notion (mode Mono) */
        .doc-paper { color: #37352F; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace; }
        .doc-paper h1 { font-size: 1.2rem; font-weight: 700; margin: 0.6em 0 0.25em; color: #37352F; }
        .doc-paper h2 { font-size: 1.05rem; font-weight: 700; margin: 0.6em 0 0.2em; color: #37352F; }
        .doc-paper h3 { font-size: 0.95rem; font-weight: 700; margin: 0.5em 0 0.2em; color: #37352F; }
        .doc-paper p { margin: 0.2em 0; min-height: 1.1em; }
        .doc-paper ul { list-style: disc; padding-left: 1.3em; margin: 0.25em 0; }
        .doc-paper ol { list-style: decimal; padding-left: 1.3em; margin: 0.25em 0; }
        .doc-paper li { margin: 0.08em 0; }
        .doc-paper a { color: #2563EB; text-decoration: underline; }
        .doc-paper strong, .doc-paper b { color: #37352F; font-weight: 700; }
        .doc-paper code { background: #F5F3EC; color: #37352F; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
        .doc-paper pre { background: #F5F3EC; border: 1px solid #E8E5DC; border-radius: 8px; padding: 10px 14px; overflow-x: auto; font-size: 11px; }
        .doc-paper pre code { background: transparent; padding: 0; }
        .doc-paper hr { border: 0; border-top: 1px solid #EAE8E3; margin: 0.8em 0; }
        .doc-paper blockquote { border-left: 3px solid #EAE8E3; padding-left: 0.8em; color: #5C594F; margin: 0.4em 0; }
      `}</style>
    </div>
  )
}
