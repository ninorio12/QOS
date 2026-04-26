import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const [{ data: devisList }, { data: settings }] = await Promise.all([
    supabase
      .from('devis')
      .select('id, numero, contact_name, contact_email, contact_phone, contact_id, conversation_id, titre, lignes, montant_ht, statut, created_at, pdf_url, source, envoye_le, notes, ville, date_validite, adresse_chantier, adresse_client, signature_statut, signature_vu_le, signature_signe_le')
      .order('created_at', { ascending: false }),
    supabase
      .from('company_settings')
      .select('brand_color')
      .single(),
  ])

  return NextResponse.json({
    devisList: devisList ?? [],
    brandColor: settings?.brand_color ?? '#d28e46',
  })
}
