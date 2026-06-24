import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Webhook Revolut Business : event TransactionCreated / TransactionStateChanged.
// On ne garde que les VIREMENTS REÇUS (transfer entrant complété) → external_payments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()

    // Vérification de signature Revolut (si le secret est configuré).
    const secret = process.env.REVOLUT_WEBHOOK_SECRET
    if (secret) {
      const ts = req.headers.get('revolut-request-timestamp') ?? ''
      const sig = req.headers.get('revolut-signature') ?? ''
      const expected = 'v1=' + crypto.createHmac('sha256', secret).update(`v1.${ts}.${raw}`).digest('hex')
      if (!sig.split(',').map(s => s.trim()).includes(expected)) {
        return NextResponse.json({ error: 'bad signature' }, { status: 401 })
      }
    }

    const body = JSON.parse(raw || '{}') as Any
    if (body.event !== 'TransactionCreated' && body.event !== 'TransactionStateChanged') {
      return NextResponse.json({ ok: true })
    }
    const tx = body.data ?? {}
    if (tx.type !== 'transfer') return NextResponse.json({ ok: true })           // que les virements
    if (tx.state && tx.state !== 'completed') return NextResponse.json({ ok: true }) // que les complétés

    const legs: Any[] = Array.isArray(tx.legs) ? tx.legs : []
    const credit = legs.find(l => (l.amount ?? 0) > 0)                            // leg crédité = argent REÇU
    if (!credit) return NextResponse.json({ ok: true })                           // sortant → ignoré

    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ ok: false }, { status: 200 })
    const cx = new ConvexHttpClient(url)
    await cx.mutation(api.externalPayments.recordRevolut, {
      externalId:   String(tx.id),
      amount:       Math.abs(credit.amount),
      currency:     (credit.currency ?? 'CHF').toUpperCase(),
      counterparty: credit.counterparty?.name ?? credit.description ?? tx.reference ?? undefined,
      reference:    tx.reference ?? credit.description ?? undefined,
      date:         tx.completed_at ?? tx.created_at ?? new Date().toISOString(),
      state:        tx.state ?? 'completed',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[revolut webhook]', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
