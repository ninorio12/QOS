import { createClient } from '@/lib/supabase/server'
import ContactsView from '@/components/contacts/ContactsView'
import { type Contact } from '@/components/contacts/types'

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  const dbContacts: Contact[] = error ? [] : (data ?? [])

  return <ContactsView dbContacts={dbContacts} />
}
