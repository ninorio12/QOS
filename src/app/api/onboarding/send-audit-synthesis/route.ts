import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { buildAuditSynthesisHtml, auditSynthesisFileName } from '@/lib/audit-synthesis-html'
import { extractProfitMapData } from '@/lib/audit-synthesis/sheet-extract'
import { generatePdfBuffer } from '@/lib/pdf'
import { sendAuditSynthesisEmail } from '@/lib/resend'
import { isBoldShift } from '@/lib/audit-synthesis/slug'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// POST { to, firstName?, company?, clientName?, sheetUrl?, storageId?, fileName? }
// storageId présent → envoie le PDF finalisé déposé (Convex storage).
// sinon → génère (depuis le sheet si fourni, sinon Bold Shift).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const to: string | undefined = body?.to
    if (!to) return NextResponse.json({ error: 'Email destinataire manquant' }, { status: 400 })

    let pdf: Buffer
    let fileName: string = body?.fileName || auditSynthesisFileName(body?.clientName)

    if (body?.storageId) {
      // ── PDF finalisé peaufiné (déposé par l'équipe) ──
      const url = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
      const fileUrl = await new ConvexHttpClient(url).query(api.files.getUrl, { storageId: body.storageId })
      if (!fileUrl) return NextResponse.json({ error: 'Fichier finalisé introuvable' }, { status: 400 })
      const r = await fetch(fileUrl)
      pdf = Buffer.from(await r.arrayBuffer())
    } else {
      // ── Génération (fallback) ──
      if (!isBoldShift(body?.clientName || body?.company || '') && !body?.sheetUrl) {
        return NextResponse.json({ error: "Dépose le PDF finalisé ou ajoute le lien du Google Sheet avant d'envoyer." }, { status: 400 })
      }
      const data = body?.sheetUrl ? await extractProfitMapData(body.sheetUrl) : null
      const html = buildAuditSynthesisHtml({ data: data ?? undefined })
      pdf = await generatePdfBuffer(html, { cssPageSize: true })
      fileName = auditSynthesisFileName(data?.client?.name || body?.clientName)
    }

    await sendAuditSynthesisEmail({
      to,
      firstName: body?.firstName ?? null,
      company: body?.company ?? null,
      pdfBuffer: pdf,
      fileName,
    })
    return NextResponse.json({ ok: true, email: to, source: body?.storageId ? 'final' : 'generated' })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
