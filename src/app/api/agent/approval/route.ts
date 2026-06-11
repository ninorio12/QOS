import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { tokenHashFromRequest, convexClient } from '@/lib/agentAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const tokenHash = tokenHashFromRequest(req)
  if (!tokenHash) return NextResponse.json({ error: 'missing agent token' }, { status: 401 })
  try {
    const b = await req.json()
    const r = await convexClient().mutation(api.agentApi.requestApproval, { tokenHash, requestedAction: b.requestedAction, riskLevel: b.riskLevel, reason: b.reason, context: b.context, payload: b.payload })
    return NextResponse.json(r)
  } catch (e) { return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 403 }) }
}
