import { NextRequest, NextResponse } from 'next/server'
import { api } from '../../../../../convex/_generated/api'
import { convex, guardHermes } from '@/lib/hermes'

export const dynamic = 'force-dynamic'

// Hermes reads current task/activity/agent state before answering Thomas/Jonathan.
export async function GET(req: NextRequest) {
  const blocked = guardHermes(req); if (blocked) return blocked
  try {
    const c = convex()
    const [tasks, activities, agents] = await Promise.all([
      c.query(api.osTasks.list, {}),
      c.query(api.osActivities.list, { limit: 50 }),
      c.query(api.osAgents.list, {}),
    ])
    return NextResponse.json({ tasks, activities, agents })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
