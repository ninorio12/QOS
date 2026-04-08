import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function generateNumero(supabase: Awaited<ReturnType<typeof createClient>>, year: number): Promise<string> {
  // Récupère le MAX existant pour l'année pour éviter les doublons
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devis')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ devis: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
  const year = new Date().getFullYear()

  // Retry jusqu'à 5 fois en cas de conflit sur le numéro unique
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
        pdf_url:          body.pdf_url ?? null,
        source:           body.source ?? 'manuel',
      })
      .select()
      .single()

    // Succès
    if (!error) return Response.json({ devis: data }, { status: 201 })

    // Conflit sur numéro unique → retry (code Postgres 23505)
    if (error.code === '23505' && !body.numero) continue

    // Autre erreur → retourner immédiatement
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ error: 'Impossible de générer un numéro de devis unique' }, { status: 500 })
}
