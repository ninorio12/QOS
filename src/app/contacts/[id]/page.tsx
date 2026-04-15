// src/app/contacts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { type GHLContact, type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'
import ContactDetailPage from '@/components/contacts/ContactDetailPage'
import { type ContactAttribution } from '@/components/contacts/types'

export const revalidate = 300

const GHL_HEADERS = () => ({
  Authorization:  `Bearer ${process.env.GHL_API_KEY!}`,
  Version:        '2021-07-28',
  'Content-Type': 'application/json',
})
const BASE = () => process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
const LOC  = () => process.env.GHL_LOCATION_ID!

async function fetchContact(id: string): Promise<GHLContact | null> {
  try {
    const res = await fetch(`${BASE()}/contacts/${id}`, { headers: GHL_HEADERS(), cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { contact?: GHLContact }
    return data.contact ?? null
  } catch { return null }
}

async function fetchAttribution(id: string): Promise<ContactAttribution | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/contact/attribution?ids=${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { attributions?: ContactAttribution[] }
    return data.attributions?.[0] ?? null
  } catch { return null }
}

async function fetchContactOpportunities(contactId: string): Promise<GHLOpportunity[]> {
  try {
    const res = await fetch(
      `${BASE()}/opportunities/search?location_id=${LOC()}&contact_id=${contactId}&limit=20`,
      { headers: GHL_HEADERS(), cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json() as { opportunities?: GHLOpportunity[] }
    return data.opportunities ?? []
  } catch { return [] }
}

async function fetchPipelines(): Promise<GHLPipeline[]> {
  try {
    const res = await fetch(
      `${BASE()}/opportunities/pipelines?locationId=${LOC()}`,
      { headers: GHL_HEADERS(), cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json() as { pipelines?: GHLPipeline[] }
    return data.pipelines ?? []
  } catch { return [] }
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const [contact, attribution, opportunities, pipelines] = await Promise.all([
    fetchContact(params.id),
    fetchAttribution(params.id),
    fetchContactOpportunities(params.id),
    fetchPipelines(),
  ])

  if (!contact) notFound()

  return (
    <ContactDetailPage
      contact={contact}
      attribution={attribution}
      opportunities={opportunities}
      pipelines={pipelines}
    />
  )
}
