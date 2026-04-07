// src/app/contacts/page.tsx
import ContactsView from '@/components/contacts/ContactsView'
import { getContacts } from '@/lib/ghl'
import { createClient } from '@/lib/supabase/server'
import { type GHLContact } from '@/lib/ghl'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  let contacts: GHLContact[] = []
  let attributions: Map<string, string> = new Map()

  try {
    const { contacts: raw } = await getContacts(100)
    contacts = raw
  } catch (err) {
    console.error('[Contacts] getContacts failed:', err)
  }

  if (contacts.length > 0) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('contact_attribution')
        .select('ghl_contact_id, created_by')
        .in('ghl_contact_id', contacts.map(c => c.id))
      attributions = new Map((data ?? []).map(
        (a: { ghl_contact_id: string; created_by: string }) => [a.ghl_contact_id, a.created_by]
      ))
    } catch (err) {
      console.error('[Contacts] attribution fetch failed:', err)
    }
  }

  return <ContactsView contacts={contacts} attributions={attributions} />
}
