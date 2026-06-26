import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpportunitiesLive } from '@/lib/ghl'
import { type Opportunity } from '@/components/pipeline/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ opps: [] }, { status: 401 })

  const pipelineId = req.nextUrl.searchParams.get('pipelineId') ?? undefined

  // Try GHL first
  if (pipelineId !== 'local-pipeline-01') {
    try {
      const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }
      const rawOpps = await getOpportunitiesLive(100, pipelineId, creds)
      if (rawOpps.length > 0) {
        const opps: Opportunity[] = rawOpps.map(opp => {
          const contactName = opp.contact?.name ?? opp.name
          const initials = contactName.trim().split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
          return {
            id: opp.id, name: contactName,
            company: ((opp.contact as Record<string, unknown> | null)?.companyName as string) ?? '',
            value: opp.monetaryValue ?? 0, source: '', createdAt: opp.createdAt.split('T')[0],
            initials, stageId: opp.pipelineStageId, pipelineId: opp.pipelineId,
            email: opp.contact?.email ?? '', phone: opp.contact?.phone ?? '',
            contactId: opp.contact?.id ?? '', tags: opp.contact?.tags ?? [],
            status: 'open' as const,
          }
        })
        return NextResponse.json({ opps })
      }
    } catch { /* fall through */ }
  }

  // Fallback: local Supabase opportunities
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('local_opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ opps: [] })

  const opps: Opportunity[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id:         r.id as string,
    name:       r.name as string,
    company:    (r.company as string) ?? '',
    value:      (r.value as number) ?? 0,
    source:     (r.source as string) ?? '',
    createdAt:  (r.created_at as string).split('T')[0],
    initials:   ((r.name as string).trim().split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()),
    stageId:    r.stage_id as string,
    pipelineId: 'local-pipeline-01',
    email:      (r.email as string) ?? '',
    phone:      (r.phone as string) ?? '',
    contactId:  '',
    tags:       [],
    status:     'open' as const,
  }))

  return NextResponse.json({ opps })
}
