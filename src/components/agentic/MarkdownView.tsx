'use client'

import { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

/** Lecture Markdown rendue (titres, listes, code) — réutilise le plugin typography (prose).
 *  `plain` = afficher en texte brut préformaté (fichiers .txt). */
export default function MarkdownView({ markdown, url, plain }: { markdown?: string; url?: string; plain?: boolean }) {
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
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-[12.5px] leading-relaxed
        prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-1.5
        prose-h1:text-[17px] prose-h2:text-[15px] prose-h3:text-[13px]
        prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5
        prose-pre:text-[11.5px] prose-code:text-[11.5px] prose-hr:my-4"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(raw) as string) }}
    />
  )
}
