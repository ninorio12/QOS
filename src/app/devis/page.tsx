// src/app/devis/page.tsx
import { createClient } from '@/lib/supabase/server'
import DevisView from '@/components/devis/DevisView'

export const dynamic = 'force-dynamic'

export default async function DevisPage() {
  const supabase = await createClient()

  const [{ data: devisList }, { data: settings }] = await Promise.all([
    supabase
      .from('devis')
      .select('*, signature_statut, signature_vu_le, signature_signe_le')
      .order('created_at', { ascending: false }),
    supabase
      .from('company_settings')
      .select('brand_color')
      .single(),
  ])

  const brandColor = settings?.brand_color ?? '#d28e46'

  return <DevisView devisList={devisList ?? []} brandColor={brandColor} />
}
