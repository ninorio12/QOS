import { createClient } from '@/lib/supabase/server'
import DevisView from '@/components/devis/DevisView'

export const dynamic = 'force-dynamic'

type Devis = {
  id: string; contact_name: string | null; titre: string; contenu: string
  montant_ht: number | null; statut: string; created_at: string; envoye_le: string | null
  conversation_id: string | null; contact_id: string | null; contact_email: string | null; contact_phone: string | null
}

export default async function DevisPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('devis').select('*').order('created_at', { ascending: false })
  return <DevisView devisList={(data ?? []) as Devis[]} />
}
