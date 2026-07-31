import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { sendContractSignatureEmail } from '@/lib/resend'
import { type ContractInput } from '@/lib/contract-html'

export const dynamic = 'force-dynamic'

// Crée une demande de signature électronique et envoie au client le lien /signer/<id>.
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as ContractInput & { contactId?: string }

    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ ok: false, error: 'Convex non configuré' }, { status: 500 })
    const convex = new ConvexHttpClient(url)

    // Email + prénom : source de vérité = le contact si fourni.
    let to = b.email
    let firstName: string | null = null
    if (b.contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contact = await convex.query(api.crm_contacts.get, { id: b.contactId as any }) as { email?: string; firstName?: string } | null
      if (contact?.email) to = contact.email
      firstName = contact?.firstName ?? null
    }
    if (!to) return NextResponse.json({ ok: false, error: "Ce contact n'a pas d'adresse email." }, { status: 400 })

    // Réf figée dès maintenant pour que l'aperçu et le PDF signé soient identiques.
    const now = new Date()
    const ref = b.ref ?? `VF-${now.getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`

    const id = await convex.mutation(api.contractSignatures.create, {
      contactId: b.contactId,
      contract: {
        clientName: b.clientName,
        company: b.company ?? undefined,
        address: b.address ?? undefined,
        phone: b.phone ?? undefined,
        email: to,
        representant: b.representant ?? undefined,
        amount: b.amount,
        installments: b.installments || 1,
        amounts: b.amounts ?? [b.amount],
        ref,
        currency: b.currency ?? 'CHF',
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
    const signUrl = `${appUrl}/signer/${id}`
    await sendContractSignatureEmail({ to, firstName, company: b.company || b.clientName, signUrl })

    return NextResponse.json({ ok: true, email: to, id, signUrl })
  } catch (err) {
    console.error('[onboarding/request-signature] failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
