import { NextRequest, NextResponse } from 'next/server'
import { generatePdfBuffer } from '@/lib/pdf'

/**
 * Rend un rapport quotidien en PDF, à partir de son texte.
 * Le texte vient du Data OS (Synthèse du module Meta Ads) : on ne le
 * reconstruit pas ici, on le met en page.
 */
export async function POST(req: NextRequest) {
  const { body, title } = (await req.json()) as { body?: string; title?: string }
  if (!body) return NextResponse.json({ error: 'body requis' }, { status: 400 })

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Les lignes en MAJUSCULES sont les intitulés de section, les autres du texte.
  const lines = body.split('\n')
  const heading = esc(lines[0] ?? 'Rapport')
  const rest = lines.slice(1).map((l) => {
    const t = l.trim()
    if (!t) return '<div class="sp"></div>'
    if (/^[A-ZÀ-Ÿ ()É]+—/.test(t) || /^[A-ZÀ-Ÿ ]{4,}$/.test(t)) return `<p class="sec">${esc(t)}</p>`
    if (l.startsWith('  ')) return `<p class="sub">${esc(t)}</p>`
    return `<p class="ln">${esc(t)}</p>`
  }).join('')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 22mm 20mm; }
    body { font-family: Inter, -apple-system, "Segoe UI", sans-serif; color: #1b1b1a; }
    .brand { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #8a8a85; }
    h1 { font-size: 22px; margin: 6px 0 18px; letter-spacing: -.01em; }
    .sec { font-size: 13px; font-weight: 700; margin: 16px 0 2px; }
    .ln { font-size: 13px; margin: 2px 0; }
    .sub { font-size: 12px; margin: 2px 0 2px 14px; color: #55554f; }
    .sp { height: 6px; }
    .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e6e6e0; font-size: 10px; color: #8a8a85; }
  </style></head><body>
    <div class="brand">VividFlow · Data OS</div>
    <h1>${heading}</h1>
    ${rest}
    <div class="foot">Rapport généré automatiquement par le Data OS · données Meta et pipeline VividFlow</div>
  </body></html>`

  const pdf = await generatePdfBuffer(html)
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(title ?? 'rapport').replace(/[^\w-]+/g, '-')}.pdf"`,
    },
  })
}
