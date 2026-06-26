import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ company: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()

  const allowed = [
    'name', 'tagline', 'address', 'phone', 'email',
    'siret', 'capital', 'tva_intra', 'assurance',
    'brand_color', 'logo_svg', 'website_url',
  ]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body && body[key] !== null) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from('company_settings')
    .update(update)
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ company: data })
}
