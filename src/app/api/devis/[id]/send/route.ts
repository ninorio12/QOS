import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { generatePdfFromHtml, buildDevisHtml } from '@/lib/apitemplate'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { channel, conversationId, contactId } = await req.json()
  const supabase = await createClient()

  const { data: devis } = await supabase.from('devis').select('*').eq('id', params.id).single()
  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const ghlChannel: 'WhatsApp' | 'SMS' | 'Email' =
    channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'

  // Générer le PDF via APITemplate.io
  let pdfUrl: string | null = null
  try {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const html = buildDevisHtml({
      titre:        devis.titre,
      contactName:  devis.contact_name ?? 'Client',
      contactEmail: devis.contact_email,
      contactPhone: devis.contact_phone,
      contenu:      devis.contenu,
      montantHt:    devis.montant_ht,
      date,
    })
    pdfUrl = await generatePdfFromHtml(html)
  } catch (err) {
    console.error('[devis/send] Génération PDF échouée:', err)
    // Continue sans PDF — on envoie le texte seul
  }

  // Construire le message GHL
  const montantFormatted = devis.montant_ht
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.montant_ht)
    : null

  const message = [
    `📋 *${devis.titre}*`,
    '',
    devis.contenu.length > 300 ? devis.contenu.slice(0, 300) + '…' : devis.contenu,
    montantFormatted ? `\n💰 *Total HT estimé : ${montantFormatted}*` : '',
    pdfUrl ? `\n📄 Télécharger le devis PDF : ${pdfUrl}` : '',
    '\n_Devis valable 30 jours — TVA 20% en sus_',
  ].filter(Boolean).join('\n')

  await sendGHLMessage(conversationId, message, ghlChannel, devis.titre, contactId)

  // Mettre à jour le statut + sauvegarder l'URL du PDF
  await supabase.from('devis').update({
    statut:     'envoyé',
    envoye_le:  new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  return Response.json({ ok: true, pdf_url: pdfUrl })
}
