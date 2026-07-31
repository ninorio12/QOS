import { NextRequest } from 'next/server'
import { buildAuditSynthesisHtml, auditSynthesisFileName } from '@/lib/audit-synthesis-html'
import { extractProfitMapData } from '@/lib/audit-synthesis/sheet-extract'
import { generatePdfBuffer } from '@/lib/pdf'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// GET ...?client=...&sheet=<url google sheet>&mapping=...&record=...
// Si un lien Google Sheet est fourni → extrait les données de l'audit (multi-clients).
// Sinon → livrable de référence (Bold Shift). Rend le PDF pixel-perfect (orientation mixte) inline.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sheet = searchParams.get('sheet') || ''
  const clientOverride = searchParams.get('client') || undefined
  try {
    const data = sheet ? await extractProfitMapData(sheet) : null
    const html = buildAuditSynthesisHtml({ data: data ?? undefined })
    const pdf = await generatePdfBuffer(html, { cssPageSize: true })
    const name = data?.client?.name || clientOverride
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(auditSynthesisFileName(name))}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return new Response(`Erreur de génération: ${(e as Error).message}`, { status: 500 })
  }
}
