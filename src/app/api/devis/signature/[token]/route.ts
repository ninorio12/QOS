import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('id, titre, numero, contact_name, montant_ht, signature_statut, pdf_url')
    .eq('signature_token', params.token)
    .single()

  if (!devis) return Response.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

  if (devis.signature_statut === 'envoye') {
    await supabase
      .from('devis')
      .update({ signature_statut: 'vu', signature_vu_le: new Date().toISOString() })
      .eq('id', devis.id)
  }

  return Response.json({
    devis: {
      id:           devis.id,
      titre:        devis.titre,
      numero:       devis.numero,
      contact_name: devis.contact_name,
      montant_ht:   devis.montant_ht,
      pdf_url:      devis.pdf_url,
      statut:       devis.signature_statut,
    }
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('id, signature_statut')
    .eq('signature_token', params.token)
    .single()

  if (!devis) return Response.json({ error: 'Lien invalide' }, { status: 404 })
  if (devis.signature_statut === 'signe') {
    return Response.json({ error: 'Déjà signé' }, { status: 409 })
  }

  await supabase
    .from('devis')
    .update({
      signature_statut:   'signe',
      signature_signe_le: new Date().toISOString(),
      statut:             'accepté',
      updated_at:         new Date().toISOString(),
    })
    .eq('id', devis.id)

  return Response.json({ ok: true })
}
