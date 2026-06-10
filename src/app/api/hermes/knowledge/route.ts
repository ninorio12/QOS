import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { convex, guardHermes } from '@/lib/hermes'

export const dynamic = 'force-dynamic'

// Hermes proposes a knowledge/memory entry → lands as "to_validate" for human approval
export async function POST(req: NextRequest) {
  const blocked = guardHermes(req); if (blocked) return blocked
  try {
    const b = await req.json()
    const id = await convex().mutation(api.osKnowledge.create, {
      kind: b.kind ?? 'candidate',
      title: b.title,
      body: b.body,
      status: 'to_validate',
      tags: b.tags,
      linkedClientId: b.linkedClientId,
      linkedProjectId: b.linkedProjectId,
      source: b.source ?? 'hermes',
      createdBy: b.createdBy ?? 'agent:chief_of_staff',
    })
    return NextResponse.json({ id })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
