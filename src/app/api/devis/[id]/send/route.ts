import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { channel, conversationId, contactId } = await req.json()
  const supabase = await createClient()

  const { data: devis } = await supabase.from('devis').select('*').eq('id', params.id).single()
  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const message = `📋 *${devis.titre}*\n\n${devis.contenu}${devis.montant_ht ? `\n\n💰 *Total HT estimé : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.montant_ht)}*` : ''}\n\n_Devis valable 30 jours — TVA 20% en sus_`

  const ghlChannel: 'WhatsApp' | 'SMS' | 'Email' =
    channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'

  await sendGHLMessage(conversationId, message, ghlChannel, devis.titre, contactId)

  await supabase.from('devis').update({
    statut:     'envoyé',
    envoye_le:  new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  return Response.json({ ok: true })
}
