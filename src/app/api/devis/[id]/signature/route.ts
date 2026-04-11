import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const token = generateToken()
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

  if (devis.conversation_id && devis.contact_id) {
    const message = `Bonjour${devis.contact_name ? ` ${devis.contact_name}` : ''},\n\nVotre devis ${devis.numero ?? ''} est prêt à être signé électroniquement :\n${signatureUrl}\n\nCordialement,\nL'équipe`
    await sendGHLMessage(
      devis.conversation_id,
      message,
      'WhatsApp',
      undefined,
      devis.contact_id,
    ).catch(() => null)
  }

  return Response.json({ signature_url: signatureUrl, token })
}
