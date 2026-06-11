import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { tokenHashFromRequest, convexClient } from '@/lib/agentAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const tokenHash = tokenHashFromRequest(req)
  if (!tokenHash) return NextResponse.json({ error: 'missing agent token' }, { status: 401 })
  const r = await convexClient().query(api.agentApi.getContext, { tokenHash })
  if (!r.ok) return NextResponse.json({ error: 'invalid token' }, { status: 403 })
  return NextResponse.json(r)
}
