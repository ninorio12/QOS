import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { generatePdfBuffer } from '@/lib/pdf'
import { buildContractHtml, prepareContractData, type ContractInput } from '@/lib/contract-html'
import { sendContractEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Génère le contrat (PDF) et l'envoie au contact par email (Resend), en pièce jointe.
export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => ({}))) as ContractInput & { contactId?: string; email?: string }

    // Email cible : prioriser celui du contact (source de vérité) si contactId fourni.
    let to = b.email
    let firstName: string | null = null
    if (b.contactId) {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!url) return NextResponse.json({ ok: false, error: 'Convex non configuré' }, { status: 500 })
      const convex = new ConvexHttpClient(url)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contact = await convex.query(api.crm_contacts.get, { id: b.contactId as any }) as { email?: string; firstName?: string } | null
      if (contact?.email) to = contact.email
      firstName = contact?.firstName ?? null
    }
    if (!to) return NextResponse.json({ ok: false, error: "Ce contact n'a pas d'adresse email." }, { status: 400 })

    const data = prepareContractData(b)
    const pdf = await generatePdfBuffer(buildContractHtml(data))
    const fileName = `contrat-${(data.company || data.clientName).replace(/[^a-z0-9]/gi, '-')}.pdf`

    await sendContractEmail({ to, firstName, company: data.company || data.clientName, pdfBuffer: Buffer.from(pdf), fileName })
    return NextResponse.json({ ok: true, email: to })
  } catch (err) {
    console.error('[onboarding/send-contract] failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
