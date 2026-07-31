import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'
import { buildContractHtml, prepareContractData } from '@/lib/contract-html'

export const dynamic = 'force-dynamic'

// Rendu HTML du contrat (instantané, sans génération PDF) pour l'aperçu propre sur /signer/<id>.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ error: 'Convex non configuré' }, { status: 500 })
    const convex = new ConvexHttpClient(url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await convex.query(api.contractSignatures.getPublic, { id: params.id as any })
    if (!sig) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const base = buildContractHtml(prepareContractData({ ...sig.contract }))
    // Style d'aperçu écran : feuilles A4 blanches centrées sur fond gris (look visualiseur).
    const previewStyle = `<meta name="color-scheme" content="light"><style>
      :root { color-scheme: light; }
      html, body { background:#e9e9e6 !important; }
      .page { margin:18px auto !important; background:#fff !important; box-shadow:0 2px 14px rgba(0,0,0,.14) !important; page-break-after:auto !important; }
    </style>`
    const html = base.replace('</head>', `${previewStyle}</head>`)
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
