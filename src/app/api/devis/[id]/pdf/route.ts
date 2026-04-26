import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePdfBuffer } from '@/lib/pdf'
import { buildDevisHtml } from '@/lib/devisHtmlBuilder'
import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const svgRaw: string | null = settings?.logo_svg ?? null
  const logoBase64 = svgRaw ? Buffer.from(svgRaw).toString('base64') : null

  const company: CompanyForTemplate = settings ? {
    name:       settings.name        ?? 'Mon Entreprise',
    tagline:    settings.tagline      ?? '',
    address:    settings.address      ?? '',
    phone:      settings.phone        ?? '',
    email:      settings.email        ?? '',
    logoBase64,
    capital:    settings.capital      ?? '',
    siret:      settings.siret        ?? '',
    tvaIntra:   settings.tva_intra    ?? '',
    assurance:  settings.assurance    ?? '',
    brandColor: settings.brand_color  ?? '#111111',
  } : {
    name: 'Soren', tagline: '', address: '', phone: '', email: '',
    logoBase64: null, capital: '', siret: '', tvaIntra: '', assurance: '',
    brandColor: '#d28e46',
  }

  const html = buildDevisHtml({
    numero:          devis.numero ?? null,
    titre:           devis.titre ?? '',
    lignes:          Array.isArray(devis.lignes) ? devis.lignes : [],
    notes:           devis.notes ?? '',
    ville:           devis.ville ?? '',
    dateValidite:    devis.date_validite ?? '',
    adresseChantier: devis.adresse_chantier ?? '',
    contactName:     devis.contact_name ?? null,
    adresseClient:   devis.adresse_client ?? '',
    createdAt:       devis.created_at ?? '',
  }, company)

  try {
    const pdfBuffer = await generatePdfBuffer(html)
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Devis${devis.numero ? `-${devis.numero}` : ''}.pdf"`,
      },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
