import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGHLMessage } from '@/lib/ghl'
import { sendDevisEmail } from '@/lib/resend'
import { generatePdfFromHtml } from '@/lib/apitemplate'
import { buildDevisHtml } from '@/lib/devisHtmlBuilder'
import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function buildCompany(settings: Record<string, unknown> | null, logoBase64: string | null): CompanyForTemplate {
  if (!settings) {
    return { name: 'Mon Entreprise', tagline: '', address: '', phone: '', email: '', logoBase64: null, capital: '', siret: '', tvaIntra: '', assurance: '', brandColor: '#111111' }
  }
  return {
    name:       (settings.name       as string) ?? 'Mon Entreprise',
    tagline:    (settings.tagline    as string) ?? '',
    address:    (settings.address    as string) ?? '',
    phone:      (settings.phone      as string) ?? '',
    email:      (settings.email      as string) ?? '',
    logoBase64,
    capital:    (settings.capital    as string) ?? '',
    siret:      (settings.siret      as string) ?? '',
    tvaIntra:   (settings.tva_intra  as string) ?? '',
    assurance:  (settings.assurance  as string) ?? '',
    brandColor: (settings.brand_color as string) ?? '#111111',
  }
}

const AGENT_SECRET = process.env.HERMES_SHARED_SECRET

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as { channel?: string }
  const channel = body.channel === 'email' ? 'email' : 'whatsapp'

  const auth = req.headers.get('authorization') ?? ''
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const isAgent = !!AGENT_SECRET &&
    presented.length === AGENT_SECRET.length &&
    timingSafeEqual(Buffer.from(presented), Buffer.from(AGENT_SECRET))
  const supabase = isAgent ? createAdminClient() : await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  // Réutiliser le token existant ou en générer un nouveau
  const token = (devis.signature_token as string | null) ?? generateToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const signatureUrl = `${appUrl}/signer/${token}`
  const envoyeLe = new Date().toISOString()

  await supabase
    .from('devis')
    .update({
      signature_token:  token,
      signature_statut: 'envoye',
      envoye_le:        envoyeLe,
      updated_at:       envoyeLe,
    })
    .eq('id', params.id)

  if (channel === 'email') {
    if (!devis.contact_email) {
      return Response.json({ error: 'Aucun email contact renseigné sur ce devis' }, { status: 422 })
    }

    // Générer le PDF en local via Puppeteer
    let pdfBuffer: Buffer | null = null
    try {
      const svgRaw: string | null = (settings as Record<string, unknown> | null)?.logo_svg as string | null ?? null
      const logoBase64 = svgRaw ? Buffer.from(svgRaw).toString('base64') : null
      const company = buildCompany(settings as Record<string, unknown> | null, logoBase64)

      const html = buildDevisHtml({
        numero:          (devis.numero           as string | null) ?? null,
        titre:           (devis.titre            as string)        ?? '',
        lignes:          Array.isArray(devis.lignes) ? devis.lignes : [],
        notes:           (devis.notes            as string)        ?? '',
        ville:           (devis.ville            as string)        ?? '',
        dateValidite:    (devis.date_validite     as string)        ?? '',
        adresseChantier: (devis.adresse_chantier as string)        ?? '',
        contactName:     (devis.contact_name      as string | null) ?? null,
        adresseClient:   (devis.adresse_client    as string)        ?? '',
        createdAt:       (devis.created_at        as string)        ?? '',
      }, company)

      const pdfUrl = await generatePdfFromHtml(html)
      const pdfResp = await fetch(pdfUrl)
      if (pdfResp.ok) pdfBuffer = Buffer.from(await pdfResp.arrayBuffer())
    } catch {
      // PDF non généré — on continue sans pièce jointe
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
      pdfBuffer,
      companyName:  (settings as Record<string, unknown> | null)?.name as string        ?? 'Mon Entreprise',
      companyEmail: (settings as Record<string, unknown> | null)?.email as string       ?? '',
      brandColor:   (settings as Record<string, unknown> | null)?.brand_color as string ?? '#111111',
    })

    return Response.json({ signature_url: signatureUrl, token, channel: 'email', envoye_le: envoyeLe })
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

  return Response.json({ signature_url: signatureUrl, token, channel: 'whatsapp', envoye_le: envoyeLe })
}
