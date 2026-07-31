import { NextRequest } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { buildAuditSynthesisHtml, auditSynthesisFileName } from '@/lib/audit-synthesis-html'
import { extractProfitMapData } from '@/lib/audit-synthesis/sheet-extract'
import { generatePdfBuffer } from '@/lib/pdf'
import { slugify, isBoldShift } from '@/lib/audit-synthesis/slug'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// Lien propre : /audit-synthese/<entreprise>
// Bold Shift → livrable de référence baké (peaufiné à la main).
// Autre client → extraction du Google Sheet stocké sur son onboarding ; sinon message d'invite.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug || ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = undefined
    let company = 'Bold Shift Collective'

    if (!isBoldShift(slug)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = (await convex().query(api.crm_contacts.list)) as any[]
      const ct = (contacts || []).find(c => slugify(c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`) === slug)
      company = ct?.companyName || slug.replace(/-/g, ' ')
      const ob = ct ? await convex().query(api.onboarding.getByContact, { contactId: ct._id }) : null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sheetUrl = (ob as any)?.auditSynthesis?.sheetUrl as string | undefined
      if (!sheetUrl) {
        return new Response(
          "Ajoute d'abord le lien du Google Sheet d'audit dans la carte « Synthèse Audit » (module Onboarding), puis régénère.",
          { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        )
      }
      data = (await extractProfitMapData(sheetUrl)) ?? undefined
      if (data?.client?.name) company = data.client.name
    }

    const html = buildAuditSynthesisHtml({ data })
    const pdf = await generatePdfBuffer(html, { cssPageSize: true })
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(auditSynthesisFileName(company))}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return new Response(`Erreur de génération: ${(e as Error).message}`, { status: 500 })
  }
}
