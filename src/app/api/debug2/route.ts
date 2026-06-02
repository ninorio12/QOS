import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL!
  const allLeads = await new ConvexHttpClient(url).query(api.crm_leads.list)
  const contacts = await new ConvexHttpClient(url).query(api.crm_contacts.list)
  let devisCount = -1
  try { devisCount = ((await new ConvexHttpClient(url).query(api.devis.listDevis)) as unknown[]).length } catch (e) { devisCount = -2 }
  return NextResponse.json({
    url,
    leadCount: (allLeads as unknown[]).length,
    contactCount: (contacts as unknown[]).length,
    devisCount,
  })
}
