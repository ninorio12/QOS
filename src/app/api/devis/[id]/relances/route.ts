import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devis_relances')
    .select('*')
    .eq('devis_id', params.id)
    .order('delai_jours', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relances: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = await createClient()

  if (!body.delai_jours || !body.canal) {
    return Response.json({ error: 'delai_jours et canal requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('devis_relances')
    .insert({
      devis_id:    params.id,
      delai_jours: body.delai_jours,
      canal:       body.canal,
      message:     body.message ?? null,
      statut:      'programmee',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relance: data }, { status: 201 })
}
