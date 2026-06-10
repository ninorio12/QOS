// src/app/contacts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { ConvexHttpClient } from 'convex/browser'
import { type GHLContact, type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'
import ContactDetailPage from '@/components/contacts/ContactDetailPage'
import { type ContactAttribution } from '@/components/contacts/types'
import { api } from '../../../../convex/_generated/api'
import { type Id } from '../../../../convex/_generated/dataModel'

export const dynamic = 'force-dynamic'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// Convex crm_contacts doc → forme attendue par ContactDetailPage (GHLContact).
type ConvexContact = {
  _id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  address1?: string | null
  city?: string | null
  postalCode?: string | null
  website?: string | null
  source?: string | null
  statut?: string | null
  canton?: string | null
  metier?: string | null
  niche?: string | null
  tags?: string[]
  createdAt: string
  updatedAt?: string | null
}

function mapContact(ct: ConvexContact): GHLContact {
  return {
    id:          ct._id,
    contactName: `${ct.firstName ?? ''} ${ct.lastName ?? ''}`.trim(),
    firstName:   ct.firstName   ?? null,
    lastName:    ct.lastName    ?? null,
    email:       ct.email       ?? null,
    phone:       ct.phone       ?? null,
    companyName: ct.companyName ?? null,
    dateAdded:   ct.createdAt,
    dateUpdated: ct.updatedAt   ?? null,
    tags:        ct.tags        ?? [],
    source:      ct.source      ?? null,
    address1:    ct.address1    ?? null,
    city:        ct.city        ?? null,
    postalCode:  ct.postalCode  ?? null,
    website:     ct.website     ?? null,
    metier:      ct.metier      ?? null,
    niche:       ct.niche       ?? null,
    statut:      ct.statut      ?? null,
    canton:      ct.canton      ?? null,
  }
}

type ConvexLead = {
  _id: string
  contactId?: string
  name: string
  email?: string
  phone?: string
  pipelineId: string
  stageId: string
  value: number
  source?: string
  status: string
  createdAt: string
}

function mapOpportunity(l: ConvexLead): GHLOpportunity {
  const status = (['open', 'won', 'lost', 'abandoned'].includes(l.status) ? l.status : 'open') as GHLOpportunity['status']
  return {
    id:              l._id,
    name:            l.name,
    monetaryValue:   l.value,
    pipelineId:      l.pipelineId,
    pipelineStageId: l.stageId,
    status,
    source:          l.source ?? null,
    createdAt:       l.createdAt,
    updatedAt:       l.createdAt,
    contact:         { id: l.contactId ?? '', name: l.name, email: l.email ?? null, phone: l.phone ?? null },
  }
}

type ConvexPipeline = { _id: string; name: string; stages?: { id: string; name: string; position?: number }[] }

function mapPipeline(p: ConvexPipeline): GHLPipeline {
  return {
    id:   p._id,
    name: p.name,
    stages: (p.stages ?? []).map((s, i) => ({
      id: s.id, name: s.name, position: s.position ?? i, stageWinProbability: 0,
    })),
  }
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const c = convex()

  // Le contact vient de Convex (source de vérité). Un id invalide/inexistant → 404 propre.
  let contact: GHLContact | null = null
  try {
    const doc = await c.query(api.crm_contacts.get, { id: params.id as Id<'crm_contacts'> })
    if (doc) contact = mapContact(doc as ConvexContact)
  } catch {
    contact = null
  }
  if (!contact) notFound()

  // Opportunités du contact (crm_leads) + pipelines, best-effort.
  const [opportunities, pipelines] = await Promise.all([
    c.query(api.crm_leads.list)
      .then(rows => (rows as ConvexLead[]).filter(l => l.contactId === params.id).map(mapOpportunity))
      .catch(() => [] as GHLOpportunity[]),
    c.query(api.pipeline_config.list)
      .then(rows => (rows as ConvexPipeline[]).map(mapPipeline))
      .catch(() => [] as GHLPipeline[]),
  ])

  // L'attribution s'appuyait sur un self-fetch HTTP cassé (NEXT_PUBLIC_APP_URL absent) → on
  // la neutralise proprement ; le badge d'origine reste simplement masqué.
  const attribution: ContactAttribution | null = null

  return (
    <ContactDetailPage
      contact={contact}
      attribution={attribution}
      opportunities={opportunities}
      pipelines={pipelines}
    />
  )
}
