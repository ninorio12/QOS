import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase
      .from('devis')
      .select('id, titre, numero, contact_name, contact_email, lignes, montant_ht, signature_statut, signature_signe_le, pdf_url, ville, created_at')
      .eq('signature_token', params.token)
      .single(),
    supabase.from('company_settings').select('name, brand_color, email, phone').single(),
  ])

  if (!devis) return Response.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

  if (devis.signature_statut === 'envoye') {
    await supabase
      .from('devis')
      .update({ signature_statut: 'vu', signature_vu_le: new Date().toISOString() })
      .eq('id', devis.id)
  }

  type Ligne = { quantite: number; prixUnitaire: number; tvaRate: number }
  const lignes = (Array.isArray(devis.lignes) ? devis.lignes : []) as Ligne[]
  const montantHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const montantTTC = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)

  return Response.json({
    devis: {
      id:              devis.id,
      titre:           devis.titre,
      numero:          devis.numero,
      contact_name:    devis.contact_name,
      contact_email:   devis.contact_email,
      montant_ht:      montantHT  > 0 ? montantHT  : (devis.montant_ht ?? 0),
      montant_ttc:     montantTTC > 0 ? montantTTC : null,
      pdf_url:         devis.pdf_url,
      statut:          devis.signature_statut,
      signe_le:        devis.signature_signe_le,
      ville:           devis.ville,
      created_at:      devis.created_at,
    },
    company: {
      name:       settings?.name        ?? 'Mon Entreprise',
      brandColor: settings?.brand_color ?? '#111111',
      email:      settings?.email       ?? '',
      phone:      settings?.phone       ?? '',
    },
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
