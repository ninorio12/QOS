import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const { data, error } = await supabase
    .from('devis')
    .insert({
      contact_id:      body.contact_id,
      conversation_id: body.conversation_id,
      contact_name:    body.contact_name,
      contact_email:   body.contact_email,
      contact_phone:   body.contact_phone,
      titre:           body.titre ?? 'Devis',
      contenu:         body.contenu ?? '',
      montant_ht:      body.montant_ht,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ devis: data }, { status: 201 })
}
