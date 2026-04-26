import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { generatePdfFromHtml } from '@/lib/apitemplate'
import { buildDevisHtml } from '@/lib/devisHtmlBuilder'
import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

type Ligne = { description: string; quantite: number; unite: string; prixUnitaire: number; tvaRate: number }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { channel, conversationId, contactId } = await req.json()
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

  const ghlChannel: 'WhatsApp' | 'SMS' | 'Email' =
    channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'

  const lignes: Ligne[] = Array.isArray(devis.lignes) ? devis.lignes : []
  const totalHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const totalTVA = lignes.reduce((s, l) => s + (l.quantite * l.prixUnitaire * l.tvaRate / 100), 0)
  const totalTTC = totalHT + totalTVA

  let pdfUrl: string | null = devis.pdf_url ?? null
  try {
    const html = buildDevisHtml({
      numero:          devis.numero ?? null,
      titre:           devis.titre ?? '',
      lignes,
      notes:           devis.notes ?? '',
      ville:           devis.ville ?? '',
      dateValidite:    devis.date_validite ?? '',
      adresseChantier: devis.adresse_chantier ?? '',
      contactName:     devis.contact_name ?? null,
      adresseClient:   devis.adresse_client ?? '',
      createdAt:       devis.created_at ?? '',
    }, company)
    pdfUrl = await generatePdfFromHtml(html)
  } catch (err) {
    console.error('[devis/send] PDF échoué:', err)
  }

  const fmtEUR = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const message = [
    `📋 *${devis.titre}*`,
    lignes.length > 0 ? lignes.slice(0, 3).map(l => `• ${l.description}`).join('\n') : '',
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
