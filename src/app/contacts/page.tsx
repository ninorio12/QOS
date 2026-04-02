// src/app/contacts/page.tsx
import ContactsView from '@/components/contacts/ContactsView'
import { type GHLContact, getContacts } from '@/lib/ghl'
import { type ContactAttribution } from '@/components/contacts/types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

async function fetchAttributions(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res  = await fetch(`${baseUrl}/api/contact/attribution?ids=${ids.join(',')}`, { cache: 'no-store' })
    if (!res.ok) return new Map()
    const data = await res.json() as { attributions?: ContactAttribution[] }
    return new Map((data.attributions ?? []).map(a => [a.ghl_contact_id, a.created_by]))
  } catch {
    return new Map()
  }
}

export default async function ContactsPage() {
  let contacts: GHLContact[] = []
  let attributions: Map<string, string> = new Map()

  try {
    const { contacts: raw } = await getContacts(100)
    contacts = raw
    attributions = await fetchAttributions(raw.map(c => c.id))
  } catch (err) {
    console.error('[Contacts] fetch failed:', err)
  }

  return <ContactsView contacts={contacts} attributions={attributions} />
}
