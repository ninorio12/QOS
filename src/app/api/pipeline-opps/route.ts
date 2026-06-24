import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getOpportunitiesLive } from '@/lib/ghl'
import { type Opportunity } from '@/components/pipeline/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ opps: [] })

  const pipelineId = req.nextUrl.searchParams.get('pipelineId') ?? undefined
  const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }

  try {
    const rawOpps = await getOpportunitiesLive(100, pipelineId, creds)

    const opps: Opportunity[] = rawOpps.map(opp => {
      const contactName = opp.contact?.name ?? opp.name
      const initials    = contactName.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      const rawSource   = (opp as Record<string, unknown> & { attributions?: { utmSessionSource?: string }[] })
        .attributions?.[0]?.utmSessionSource
      return {
        id:         opp.id,
        name:       contactName,
        company:    ((opp.contact as Record<string, unknown> | null)?.companyName as string | undefined) ?? '',
        value:      opp.monetaryValue ?? 0,
        source:     rawSource && rawSource !== 'CRM UI' ? rawSource : '',
        createdAt:  opp.createdAt.split('T')[0],
        initials,
        stageId:    opp.pipelineStageId,
        pipelineId: opp.pipelineId,
        email:      (opp.contact?.email ?? ''),
        phone:      (opp.contact?.phone ?? ''),
        contactId:  (opp.contact?.id ?? ''),
        tags:       (opp.contact?.tags ?? []),
        status:     'open' as const,
      }
    })

    return NextResponse.json({ opps })
  } catch (err) {
    console.error('[pipeline-opps] fetch failed:', err)
    return NextResponse.json({ opps: [], error: String(err) }, { status: 500 })
  }
}
