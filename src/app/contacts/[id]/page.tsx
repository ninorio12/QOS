import { notFound } from 'next/navigation'
import { type GHLContact } from '@/lib/ghl'
import ContactDetailPage from '@/components/contacts/ContactDetailPage'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Attribution = { ghl_contact_id: string; created_by: string; created_at: string }

async function fetchContact(id: string): Promise<GHLContact | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/contact/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as { contact?: GHLContact }
  return data.contact ?? null
}

async function fetchAttribution(id: string): Promise<Attribution | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/contact/attribution?ids=${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as { attributions?: Attribution[] }
  return data.attributions?.[0] ?? null
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const [contact, attribution] = await Promise.all([
    fetchContact(params.id),
    fetchAttribution(params.id),
  ])

  if (!contact) notFound()

  return <ContactDetailPage contact={contact} attribution={attribution} />
}
