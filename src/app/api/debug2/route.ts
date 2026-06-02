import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL!
  const allLeads = await new ConvexHttpClient(url).query(api.crm_leads.list)
  return NextResponse.json({
    leadCount: (allLeads as unknown[]).length,
    leads: (allLeads as { name: string }[]).map(l => l.name),
  })
}
