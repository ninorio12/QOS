import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePdfFromHtml, buildDevisHtml, type LigneDevis, type CompanyInfo } from '@/lib/apitemplate'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const company: CompanyInfo = settings ? {
    name:        settings.name,
    tagline:     settings.tagline,
    address:     settings.address,
    phone:       settings.phone,
    email:       settings.email,
    siret:       settings.siret,
    capital:     settings.capital,
    tvaIntra:    settings.tva_intra,
    assurance:   settings.assurance,
    brandColor:  settings.brand_color,
    accentColor: '#ffffff',
    logoSvg:     settings.logo_svg || null,
  } : {
    name: 'Soren', brandColor: '#d28e46', accentColor: '#ffffff',
  }

  const date   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const lignes: LigneDevis[] = Array.isArray(devis.lignes) ? devis.lignes : []

  const html = buildDevisHtml({
    titre:           devis.titre,
    numero:          devis.numero,
    contactName:     devis.contact_name ?? 'Client',
    contactEmail:    devis.contact_email,
    contactPhone:    devis.contact_phone,
    contactAddress:  null,
    lignes,
    notes:           devis.notes,
    date,
    ville:           devis.ville,
    dateValidite:    devis.date_validite
      ? new Date(devis.date_validite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null,
    adresseChantier: devis.adresse_chantier,
    company,
  })

  try {
    const pdfUrl = await generatePdfFromHtml(html)
    await supabase.from('devis').update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() }).eq('id', params.id)
    return Response.json({ pdf_url: pdfUrl })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
