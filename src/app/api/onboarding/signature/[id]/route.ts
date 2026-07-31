import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Infos publiques d'une demande de signature (page /signer/<id>) + marque « vu ».
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ error: 'Convex non configuré' }, { status: 500 })
    const convex = new ConvexHttpClient(url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await convex.query(api.contractSignatures.getPublic, { id: params.id as any })
    if (!sig) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    if (sig.status !== 'signe') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await convex.mutation(api.contractSignatures.markViewed, { id: params.id as any }).catch(() => {})
    }

    return NextResponse.json({
      status: sig.status,
      signedAt: sig.signedAt,
      signerName: sig.signerName,
      clientName: sig.contract.clientName,
      company: sig.contract.company ?? null,
      representant: sig.contract.representant ?? null,
      ref: sig.contract.ref,
      amount: sig.contract.amount,
      currency: sig.contract.currency,
      installments: sig.contract.installments,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
