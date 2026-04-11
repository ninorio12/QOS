import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthContext } from '@/lib/auth-context'
import { type Opportunity } from '@/components/pipeline/types'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { ghlApiKey: apiKey, ghlLocationId: locationId, userId } = ctx
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const { contactName, email, phone, company, pipelineId, pipelineStageId, monetaryValue, source, contactId: existingContactId } =
    await req.json() as {
      contactName:      string
      email:            string
      phone:            string
      company:          string
      pipelineId:       string
      pipelineStageId:  string
      monetaryValue:    number
      source:           string
      contactId?:       string
    }

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }

  let contactId: string

  if (existingContactId) {
    contactId = existingContactId
  } else {
    const nameParts = contactName.trim().split(' ')
    const firstName = nameParts[0] ?? contactName
    const lastName  = nameParts.slice(1).join(' ') || undefined

    const contactRes = await fetch(`${baseUrl}/contacts/`, {
      method: 'POST', headers,
      body: JSON.stringify({ locationId, firstName, lastName, email: email || undefined, phone: phone || undefined, companyName: company || undefined }),
      cache: 'no-store',
    })

    if (!contactRes.ok) {
      const err = await contactRes.text()
      return NextResponse.json({ error: `Contact creation failed: ${err}` }, { status: contactRes.status })
    }

    const contactData = await contactRes.json() as { contact: { id: string } }
    contactId = contactData.contact.id
  }

  const oppRes = await fetch(`${baseUrl}/opportunities/`, {
    method: 'POST', headers,
    body: JSON.stringify({ locationId, pipelineId, pipelineStageId, contactId, name: contactName, status: 'open', monetaryValue: monetaryValue || 0 }),
    cache: 'no-store',
  })

  if (!oppRes.ok) {
    const err = await oppRes.text()
    return NextResponse.json({ error: `Opportunity creation failed: ${err}` }, { status: oppRes.status })
  }

  const oppData = await oppRes.json() as { opportunity: { id: string; createdAt: string } }
  const opp     = oppData.opportunity

  const initials = contactName.trim().split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

  const result: Opportunity = {
    id:         opp.id,
    name:       contactName,
    company,
    value:      monetaryValue || 0,
    source:     source && source !== 'CRM UI' ? source : '',
    createdAt:  opp.createdAt.split('T')[0],
    initials,
    stageId:    pipelineStageId,
    pipelineId,
    email,
    phone,
    contactId,
    tags:       [],
    status:     'open',
  }

  revalidateTag('ghl-opportunities')
  revalidateTag('ghl-contacts')

  try {
    const supabase = createAdminClient()
    await supabase.from('contact_attribution').upsert({
      ghl_contact_id: contactId,
      created_by:     ctx.isSuperAdmin ? 'Thomas' : userId,
    })
  } catch { /* non-blocking */ }

  return NextResponse.json({ opp: result })
}
