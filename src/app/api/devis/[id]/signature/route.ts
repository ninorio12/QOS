import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { sendDevisEmail } from '@/lib/resend'
import { generatePdfFromHtml } from '@/lib/apitemplate'
import { buildDevisHtml } from '@/lib/devisHtmlBuilder'
import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as { channel?: string }
  const channel = body.channel === 'email' ? 'email' : 'whatsapp'

  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  // Réutiliser le token existant ou en générer un nouveau
  const token = (devis.signature_token as string | null) ?? generateToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const signatureUrl = `${appUrl}/api/devis/signature/${token}`

  await supabase
    .from('devis')
    .update({
      signature_token:  token,
      signature_statut: 'envoye',
      updated_at:       new Date().toISOString(),
    })
    .eq('id', params.id)

  if (channel === 'email') {
    if (!devis.contact_email) {
      return Response.json({ error: 'Aucun email contact renseigné sur ce devis' }, { status: 422 })
    }

    // Générer le PDF si pas encore disponible
    let pdfUrl: string | null = (devis.pdf_url as string | null) ?? null
    if (!pdfUrl) {
      try {
        const svgRaw: string | null = settings?.logo_svg ?? null
        const logoBase64 = svgRaw ? Buffer.from(svgRaw).toString('base64') : null
        const company: CompanyForTemplate = settings ? {
          name:       settings.name       ?? 'Mon Entreprise',
          tagline:    settings.tagline    ?? '',
          address:    settings.address    ?? '',
          phone:      settings.phone      ?? '',
          email:      settings.email      ?? '',
          logoBase64,
          capital:    settings.capital    ?? '',
          siret:      settings.siret      ?? '',
          tvaIntra:   settings.tva_intra  ?? '',
          assurance:  settings.assurance  ?? '',
          brandColor: settings.brand_color ?? '#111111',
        } : {
          name: 'Mon Entreprise', tagline: '', address: '', phone: '', email: '',
          logoBase64: null, capital: '', siret: '', tvaIntra: '', assurance: '',
          brandColor: '#111111',
        }

        const lignes = Array.isArray(devis.lignes) ? devis.lignes : []
        const html = buildDevisHtml({
          numero:          devis.numero           ?? null,
          titre:           devis.titre            ?? '',
          lignes,
          notes:           devis.notes            ?? '',
          ville:           devis.ville            ?? '',
          dateValidite:    devis.date_validite     ?? '',
          adresseChantier: devis.adresse_chantier ?? '',
          contactName:     devis.contact_name      ?? null,
          adresseClient:   devis.adresse_client    ?? '',
          createdAt:       devis.created_at        ?? '',
        }, company)

        pdfUrl = await generatePdfFromHtml(html)
        await supabase.from('devis').update({ pdf_url: pdfUrl }).eq('id', params.id)
      } catch {
        // PDF non généré — on continue sans pièce jointe
      }
    }

    type Ligne = { quantite: number; prixUnitaire: number; tvaRate: number }
    const lignes = (Array.isArray(devis.lignes) ? devis.lignes : []) as Ligne[]
    const montantHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
    const montantTTC = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)

    await sendDevisEmail({
      to:           devis.contact_email as string,
      contactName:  (devis.contact_name  as string | null) ?? null,
      devisNumero:  (devis.numero        as string | null) ?? null,
      devisTitre:   (devis.titre         as string)        ?? '',
      montantHT:    montantHT  > 0 ? montantHT  : ((devis.montant_ht as number | null) ?? 0),
      montantTTC:   montantTTC > 0 ? montantTTC : ((devis.montant_ht as number | null) ?? 0) * 1.2,
      signatureUrl,
      pdfUrl,
      companyName:  settings?.name        ?? 'Mon Entreprise',
      companyEmail: settings?.email       ?? '',
      brandColor:   settings?.brand_color ?? '#111111',
    })

    return Response.json({ signature_url: signatureUrl, token, channel: 'email' })
  }

  // Canal WhatsApp (comportement original)
  if (devis.conversation_id && devis.contact_id) {
    const message = `Bonjour${devis.contact_name ? ` ${devis.contact_name}` : ''},\n\nVotre devis ${devis.numero ?? ''} est prêt à être signé électroniquement :\n${signatureUrl}\n\nCordialement,\nL'équipe`
    await sendGHLMessage(
      devis.conversation_id as string,
      message,
      'WhatsApp',
      undefined,
      devis.contact_id as string,
    ).catch(() => null)
  }

  return Response.json({ signature_url: signatureUrl, token, channel: 'whatsapp' })
}
