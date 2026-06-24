'use client'

import { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

/** Lecture Markdown rendue (titres, listes, code) — réutilise le plugin typography (prose).
 *  `plain` = afficher en texte brut préformaté (fichiers .txt). */
export default function MarkdownView({ markdown, url, plain, dense, paper }: { markdown?: string; url?: string; plain?: boolean; dense?: boolean; paper?: boolean }) {
  const [raw, setRaw] = useState<string>(markdown ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    async function run() {
      let txt = markdown ?? ''
      if (url) {
        setLoading(true)
        try { txt = await fetch(url).then(r => r.text()) } catch { txt = '*Impossible de charger le contenu.*' }
      }
      if (alive) { setRaw(txt); setLoading(false) }
    }
    void run()
    return () => { alive = false }
  }, [markdown, url])

  if (loading) return (
    <div className="flex flex-col gap-2 py-4">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 rounded bg-soren-elevated animate-pulse" style={{ width: `${55 + (i * 11) % 40}%` }} />)}
    </div>
  )
  if (plain) return <pre className="text-[11.5px] text-soren-text whitespace-pre-wrap font-mono leading-relaxed">{raw}</pre>
  // Lecture compacte : titres atténués, interlignage calme, pas d'effet "article énorme".
  // `dense` (fiches SOPs/Playbooks) = écriture plus petite + interligne plus standard (proche de la fiche de réf).
  // `paper` (fiches SOPs/Playbooks) = document clair façon Notion, indépendant du thème sombre :
  // texte gris foncé #37352F, petit, interligne standard — calé sur la fiche de référence.
  const cls = paper
    ? `prose prose-sm max-w-none text-[12px] leading-normal text-[#37352F]
        prose-headings:text-[#37352F] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-h1:text-[15px] prose-h2:text-[13.5px] prose-h3:text-[12.5px]
        prose-p:my-1 prose-p:text-[#37352F] prose-li:my-0.5 prose-li:text-[#37352F] prose-li:leading-normal
        prose-ul:my-1 prose-ol:my-1 prose-strong:text-[#37352F] prose-strong:font-semibold
        prose-a:text-[#2563EB] prose-code:text-[#37352F] prose-code:text-[11px]
        prose-hr:my-3 prose-hr:border-[#EAE8E3] prose-blockquote:text-[#5C594F] prose-blockquote:border-[#EAE8E3]`
    : dense
    ? `prose prose-sm dark:prose-invert max-w-none text-[12px] leading-normal
        prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1
        prose-h1:text-[14.5px] prose-h2:text-[13px] prose-h3:text-[12px]
        prose-p:my-1 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-li:leading-normal
        prose-pre:text-[11px] prose-code:text-[11px] prose-hr:my-3`
    : `prose prose-sm dark:prose-invert max-w-none text-[12.5px] leading-relaxed
        prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-1.5
        prose-h1:text-[17px] prose-h2:text-[15px] prose-h3:text-[13px]
        prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5
        prose-pre:text-[11.5px] prose-code:text-[11.5px] prose-hr:my-4`
  return (
    <div
      className={cls}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(raw) as string) }}
    />
  )
}
