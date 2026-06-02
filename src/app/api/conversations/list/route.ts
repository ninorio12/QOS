import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getConversations, getOpportunities, getPipelines } from '@/lib/ghl'

export const dynamic = 'force-dynamic'

type Channel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'meeting' | 'note'
type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned'

function mapGHLType(type: string): Channel {
  switch (type) {
    case 'TYPE_EMAIL':    return 'email'
    case 'TYPE_SMS':      return 'sms'
    case 'TYPE_WHATSAPP': return 'whatsapp'
    case 'TYPE_PHONE':    return 'phone'
    case 'TYPE_CALL':     return 'phone'
    default:              return 'note'
  }
}

function tsToISO(ts: number | null): string {
  if (!ts) return new Date().toISOString()
  return new Date(ts).toISOString()
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) { const { MOCK_CONVERSATIONS } = await import('@/lib/mock-data'); return NextResponse.json({ conversations: MOCK_CONVERSATIONS }) }

  try {
    const [convRes, oppRes, pipeRes] = await Promise.allSettled([
      getConversations(100),
      getOpportunities(100),
      getPipelines(),
    ])

    if (convRes.status === 'rejected') {
      console.error('[Conversations API] getConversations failed:', convRes.reason)
    }

    const ghlConvs     = convRes.status  === 'fulfilled' ? convRes.value  : []
    const ghlOpps      = oppRes.status   === 'fulfilled' ? oppRes.value   : []
    const ghlPipelines = pipeRes.status  === 'fulfilled' ? pipeRes.value  : []

    const pipelines = ghlPipelines.map(p => ({
      id: p.id, name: p.name,
      stages: p.stages.map(s => ({ id: s.id, name: s.name })),
    }))

    const contactOppMap: Record<string, { pipelineStageId: string; opportunityStatus: OpportunityStatus }> = {}
    for (const opp of ghlOpps) {
      const cid = opp.contact?.id
      if (cid && !contactOppMap[cid]) {
        contactOppMap[cid] = {
          pipelineStageId: opp.pipelineStageId,
          opportunityStatus: opp.status as OpportunityStatus,
        }
      }
    }

    const channelLabel: Record<Channel, string> = {
      email: 'Email', phone: 'Appel', sms: 'SMS', whatsapp: 'WhatsApp', meeting: 'Réunion', note: 'Note',
    }

    // Garder les échanges réels + conversations sans message encore (type null = nouvelle conv)
    const REAL_MESSAGE_TYPES = new Set(['TYPE_WHATSAPP', 'TYPE_SMS', 'TYPE_EMAIL'])
    const realConvs = ghlConvs.filter(c =>
      REAL_MESSAGE_TYPES.has(c.lastMessageType ?? '') || !c.lastMessageType
    )

    const conversations = realConvs.map(c => {
      // Préférer le type du dernier message (plus fiable que c.type)
      const channel = mapGHLType(c.lastMessageType ?? c.type)
      const contactName = c.fullName ?? c.contactName ?? c.email ?? 'Contact inconnu'
      const opp = contactOppMap[c.contactId]
      return {
        id: c.id, user_id: 'ghl', lead_id: null,
        contact_id: c.contactId, channel,
        subject: `${channelLabel[channel]} — ${contactName}`,
        summary: null,
        created_at: tsToISO(c.dateAdded),
        updated_at: tsToISO(c.dateUpdated),
        contact_name: contactName,
        contact_company: c.companyName ?? undefined,
        contact_phone: c.phone ?? null,
        contact_email: c.email ?? null,
        last_message: c.lastMessageBody ?? undefined,
        last_message_at: tsToISO(c.lastMessageDate),
        unread: c.unreadCount ?? 0,
        assigned_to: c.assignedTo ?? null,
        pipeline_stage_id: opp?.pipelineStageId ?? null,
        opportunity_status: opp?.opportunityStatus ?? null,
        ai_enabled: true,
        source: null,
      }
    })

    return NextResponse.json({ conversations, pipelines })
  } catch (err) {
    console.error('[Conversations API]', err)
    return NextResponse.json({ conversations: [], pipelines: [] }, { status: 500 })
  }
}
