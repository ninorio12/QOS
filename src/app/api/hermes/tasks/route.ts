import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { type Id } from '../../../../../convex/_generated/dataModel'
import { convex, guardHermes } from '@/lib/hermes'

export const dynamic = 'force-dynamic'

// Hermes creates a task (assigned to a human or agent)
export async function POST(req: NextRequest) {
  const blocked = guardHermes(req); if (blocked) return blocked
  try {
    const b = await req.json()
    const id = await convex().mutation(api.osTasks.create, {
      title: b.title,
      description: b.description,
      status: b.status,
      priority: b.priority,
      assigneeType: b.assigneeType,
      assigneeId: b.assigneeId,
      source: b.source ?? 'system',
      sourceRef: b.sourceRef,
      linkedClientId: b.linkedClientId,
      linkedProjectId: b.linkedProjectId,
      linkedMissionId: b.linkedMissionId,
      createdBy: b.createdBy ?? 'agent:chief_of_staff',
    })
    return NextResponse.json({ id })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}

// Hermes updates a task (status / assignment / blocker)
export async function PATCH(req: NextRequest) {
  const blocked = guardHermes(req); if (blocked) return blocked
  try {
    const b = await req.json()
    await convex().mutation(api.osTasks.update, {
      id: b.id as Id<'os_tasks'>,
      status: b.status, priority: b.priority,
      assigneeType: b.assigneeType, assigneeId: b.assigneeId,
      blockerReason: b.blockerReason, linkedClientId: b.linkedClientId, linkedProjectId: b.linkedProjectId,
      updatedBy: b.updatedBy ?? 'agent:chief_of_staff',
    })
    return NextResponse.json({ ok: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
