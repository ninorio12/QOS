import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { convex, guardHermes } from '@/lib/hermes'

export const dynamic = 'force-dynamic'

// Hermes writes an activity log entry (proof/audit layer)
export async function POST(req: NextRequest) {
  const blocked = guardHermes(req); if (blocked) return blocked
  try {
    const b = await req.json()
    await convex().mutation(api.osActivities.log, {
      actorType: b.actorType ?? 'agent',
      actorId: b.actorId ?? 'agent:chief_of_staff',
      eventType: b.eventType,
      summary: b.summary,
      entityType: b.entityType,
      entityId: b.entityId,
      metadata: b.metadata,
      source: b.source,
    })
    return NextResponse.json({ ok: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
