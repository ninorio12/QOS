import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getDashboardData } from '@/lib/dashboard'
import { getLocalDashboardData } from '@/lib/dashboard-local'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }
    const data = await getDashboardData(creds)
    // GHL returned useful data
    if (data.metrics.totalDeals > 0 || data.metrics.totalContacts > 0) {
      return NextResponse.json(data)
    }
  } catch { /* GHL unavailable — fall through */ }

  // Fallback: local Supabase data
  const local = await getLocalDashboardData()
  return NextResponse.json(local)
}
