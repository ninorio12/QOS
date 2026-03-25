import { createClient } from '@/lib/supabase/server'
import ConversationsView from '@/components/conversations/ConversationsView'
import { type Conversation } from '@/components/conversations/types'

export default async function ConversationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*, contacts(first_name, last_name, phone, company)')
    .order('updated_at', { ascending: false })

  type RawRow = Record<string, unknown> & {
    contacts?: { first_name?: string; last_name?: string; phone?: string | null; company?: string | null } | null
  }
  const dbConversations: Conversation[] = error ? [] : (data ?? []).map((row: RawRow) => {
    const contact = row.contacts ?? null
    const { contacts: _c, ...rest } = row
    void _c
    return {
      ...rest,
      contact_name: contact ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || undefined : undefined,
      contact_company: contact?.company ?? undefined,
      contact_phone: contact?.phone ?? null,
    } as Conversation
  })

  return <ConversationsView dbConversations={dbConversations} />
}
