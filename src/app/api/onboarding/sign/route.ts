import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { generatePdfBuffer } from '@/lib/pdf'
import { buildContractHtml, prepareContractData } from '@/lib/contract-html'
import { sendContractEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Finalise la signature électronique : appose la signature dans le PDF, le stocke,
// marque la demande « signe » et envoie une copie signée au client.
export async function POST(req: NextRequest) {
  try {
    const { id, signerName, signatureDataUrl } = (await req.json().catch(() => ({}))) as {
      id?: string; signerName?: string; signatureDataUrl?: string
    }
    if (!id || !signerName?.trim() || !signatureDataUrl?.startsWith('data:image')) {
      return NextResponse.json({ ok: false, error: 'Signature ou nom manquant.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ ok: false, error: 'Convex non configuré' }, { status: 500 })
    const convex = new ConvexHttpClient(url)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await convex.query(api.contractSignatures.getPublic, { id: id as any })
    if (!sig) return NextResponse.json({ ok: false, error: 'Demande introuvable.' }, { status: 404 })
    if (sig.status === 'signe') return NextResponse.json({ ok: false, error: 'Ce contrat est déjà signé.' }, { status: 409 })

    const signedDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const data = prepareContractData({
      ...sig.contract,
      representant: signerName.trim() || sig.contract.representant,
      clientSignature: signatureDataUrl,
      signedDate,
    })
    const pdf = await generatePdfBuffer(buildContractHtml(data))

    // Upload du PDF signé dans Convex File Storage.
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {})
    const up = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: new Uint8Array(pdf) })
    if (!up.ok) throw new Error('Upload du PDF signé échoué')
    const { storageId } = await up.json() as { storageId: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await convex.mutation(api.contractSignatures.complete, {
      id: id as any, signerName: signerName.trim(), signatureDataUrl, signedStorageId: storageId,
    })

    // Copie signée au client (best-effort : ne bloque pas la confirmation).
    if (sig.contract.email) {
      try {
        await sendContractEmail({
          to: sig.contract.email,
          firstName: signerName.trim().split(/\s+/)[0] || null,
          company: sig.contract.company || sig.contract.clientName,
          pdfBuffer: Buffer.from(pdf),
          fileName: `contrat-signe-${(sig.contract.company || sig.contract.clientName).replace(/[^a-z0-9]/gi, '-')}.pdf`,
          signed: true,
        })
      } catch (e) { console.error('[onboarding/sign] copie email échouée:', e) }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[onboarding/sign] failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
