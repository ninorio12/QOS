import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { generatePdfFromHtml, buildDevisHtml, type LigneDevis, type CompanyInfo } from '@/lib/apitemplate'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { channel, conversationId, contactId } = await req.json()
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

  const ghlChannel: 'WhatsApp' | 'SMS' | 'Email' =
    channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'

  const lignes: LigneDevis[] = Array.isArray(devis.lignes) ? devis.lignes : []
  const totalHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const totalTVA = lignes.reduce((s, l) => s + (l.quantite * l.prixUnitaire * l.tvaRate / 100), 0)
  const totalTTC = totalHT + totalTVA

  let pdfUrl: string | null = devis.pdf_url ?? null
  try {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
    pdfUrl = await generatePdfFromHtml(html)
  } catch (err) {
    console.error('[devis/send] PDF échoué:', err)
  }

  const fmtEUR = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const message = [
    `📋 *${devis.titre}*`,
    lignes.length > 0 ? lignes.slice(0, 3).map((l: LigneDevis) => `• ${l.description}`).join('\n') : '',
    '',
    `💰 Total HT : ${fmtEUR(totalHT)}`,
    `💰 Total TTC : ${fmtEUR(totalTTC)}`,
    pdfUrl ? `\n📄 Devis PDF : ${pdfUrl}` : '',
    '\n_Devis valable 30 jours_',
  ].filter(Boolean).join('\n')

  await sendGHLMessage(conversationId, message, ghlChannel, devis.titre, contactId)

  await supabase.from('devis').update({
    statut:     'envoyé',
    envoye_le:  new Date().toISOString(),
    updated_at: new Date().toISOString(),
    montant_ht: totalHT || devis.montant_ht,
    pdf_url:    pdfUrl,
  }).eq('id', params.id)

  return Response.json({ ok: true, pdf_url: pdfUrl })
}
