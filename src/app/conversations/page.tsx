import { createClient } from '@/lib/supabase/server'
import ConversationsView from '@/components/conversations/ConversationsView'
import { type Conversation } from '@/components/conversations/types'

export default async function ConversationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })

  const dbConversations: Conversation[] = error ? [] : (data ?? [])

  return <ConversationsView dbConversations={dbConversations} />
}
