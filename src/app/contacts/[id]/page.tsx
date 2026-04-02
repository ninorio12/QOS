// src/app/contacts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { type GHLContact } from '@/lib/ghl'
import ContactDetailPage from '@/components/contacts/ContactDetailPage'
import { type ContactAttribution } from '@/components/contacts/types'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

async function fetchContact(id: string): Promise<GHLContact | null> {
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  try {
    const res = await fetch(`${baseUrl}/contacts/${id}`, {
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        Version:        '2021-07-28',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json() as { contact?: GHLContact }
    return data.contact ?? null
  } catch {
    return null
  }
}

async function fetchAttribution(id: string): Promise<ContactAttribution | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/contact/attribution?ids=${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { attributions?: ContactAttribution[] }
    return data.attributions?.[0] ?? null
  } catch {
    return null
  }
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const [contact, attribution] = await Promise.all([
    fetchContact(params.id),
    fetchAttribution(params.id),
  ])

  if (!contact) notFound()

  return <ContactDetailPage contact={contact} attribution={attribution} />
}
