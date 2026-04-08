// src/app/devis/page.tsx
import { createClient } from '@/lib/supabase/server'
import DevisView from '@/components/devis/DevisView'

export const dynamic = 'force-dynamic'

export default async function DevisPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('devis')
    .select('*, signature_statut, signature_vu_le, signature_signe_le')
    .order('created_at', { ascending: false })
  return <DevisView devisList={data ?? []} />
}
