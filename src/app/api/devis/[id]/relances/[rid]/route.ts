import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('devis_relances')
    .update(body)
    .eq('id', params.rid)
    .eq('devis_id', params.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relance: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const supabase = await createClient()
  await supabase.from('devis_relances').delete().eq('id', params.rid).eq('devis_id', params.id)
  return Response.json({ ok: true })
}
