import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'

async function generateNumero(supabase: Awaited<ReturnType<typeof createClient>>, year: number): Promise<string> {
  const { data } = await supabase
    .from('devis')
    .select('numero')
    .like('numero', `${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle()

  const last = data?.numero ? parseInt(data.numero.split('-')[1] ?? '0', 10) : 0
  return `${year}-${String(last + 1).padStart(3, '0')}`
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devis')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ devis: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const supabase = await createClient()
  const year = new Date().getFullYear()

  for (let attempt = 0; attempt < 5; attempt++) {
    const numero = body.numero ?? await generateNumero(supabase, year)

    const { data, error } = await supabase
      .from('devis')
      .insert({
        contact_id:       body.contact_id,
        conversation_id:  body.conversation_id,
        contact_name:     body.contact_name,
        contact_email:    body.contact_email,
        contact_phone:    body.contact_phone,
        titre:            body.titre ?? 'Devis',
        contenu:          body.contenu ?? '',
        lignes:           body.lignes ?? [],
        notes:            body.notes ?? '',
        montant_ht:       body.montant_ht,
        numero,
        ville:            body.ville ?? null,
        date_validite:    body.date_validite ?? null,
        adresse_chantier: body.adresse_chantier ?? null,
        adresse_client:   body.adresse_client   ?? null,
        pdf_url:          body.pdf_url ?? null,
        source:           body.source ?? 'manuel',
        organization_id:  ctx.orgId,
      })
      .select()
      .single()

    if (!error) return Response.json({ devis: data }, { status: 201 })
    if (error.code === '23505' && !body.numero) continue
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ error: 'Impossible de générer un numéro de devis unique' }, { status: 500 })
}
