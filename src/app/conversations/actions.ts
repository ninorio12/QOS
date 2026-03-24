'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createConversation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      channel: formData.get('channel') as string,
      subject: formData.get('subject') as string || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/conversations')
  return { success: true, id: data.id }
}

export async function sendMessage(conversationId: string, content: string, role: 'user' | 'assistant' = 'user') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, message: data }
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, messages: [] }
  return { messages: data ?? [] }
}
