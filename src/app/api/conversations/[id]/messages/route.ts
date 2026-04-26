import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getConversationMessages } from '@/lib/ghl'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type MappedMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata?: Record<string, unknown>
}

async function fetchSupabaseMessages(conversationId: string): Promise<MappedMessage[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    return (data ?? []) as MappedMessage[]
  } catch {
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ messages: [] }, { status: 401 })

  const { id } = params

  // Fetch from both sources in parallel — never throw
  const [ghlResult, supabaseResult] = await Promise.allSettled([
    getConversationMessages(id, 50),
    fetchSupabaseMessages(id),
  ])

  const ghlMessages  = ghlResult.status  === 'fulfilled' ? ghlResult.value  : []
  const supabaseMessages = supabaseResult.status === 'fulfilled' ? supabaseResult.value : []

  const ACTIVITY_TYPES = new Set(['TYPE_ACTIVITY_OPPORTUNITY', 'TYPE_ACTIVITY_CONTACT', 'TYPE_NOTE'])

  // Map GHL messages → Message format
  const fromGHL: MappedMessage[] = ghlMessages
    .filter(m => m.body?.trim())
    .map(m => {
      const isActivity = ACTIVITY_TYPES.has(m.messageType ?? '')
      return {
        id:              m.id,
        conversation_id: id,
        role:            isActivity ? 'system' : (m.direction === 'inbound' ? 'user' : 'assistant'),
        content:         m.body,
        created_at:      m.dateAdded,
        metadata:        {
          source:      'ghl',
          channel:     m.source ?? undefined,
          messageType: m.messageType ?? undefined,
        },
      }
    })

  // Merge — deduplicate by id, then sort by date
  const seen = new Set<string>()
  const merged: MappedMessage[] = []
  for (const msg of [...fromGHL, ...supabaseMessages]) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id)
      merged.push(msg)
    }
  }
  merged.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return NextResponse.json({ messages: merged, ghlCount: fromGHL.length, supabaseCount: supabaseMessages.length })
}
