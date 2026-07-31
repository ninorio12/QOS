import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'
import { generatePdfBuffer } from '@/lib/pdf'
import { buildContractHtml, prepareContractData } from '@/lib/contract-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// PDF public du contrat d'une demande de signature (aperçu sur la page /signer/<id>).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ error: 'Convex non configuré' }, { status: 500 })
    const convex = new ConvexHttpClient(url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await convex.query(api.contractSignatures.getPublic, { id: params.id as any })
    if (!sig) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const data = prepareContractData({ ...sig.contract })
    const pdf = await generatePdfBuffer(buildContractHtml(data))
    const download = req.nextUrl.searchParams.get('download') === '1'
    const fileName = `contrat-${(sig.contract.company || sig.contract.clientName).replace(/[^a-z0-9]/gi, '-')}.pdf`
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
