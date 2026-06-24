import ContactsView from '@/components/contacts/ContactsView'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { type GHLContact } from '@/lib/ghl'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export type ContactPipelineInfo = { pipelineName: string; stageName: string; pipelineId: string }

export default async function ContactsPage() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  let contacts: GHLContact[] = []

  if (url) { try {
      const c = new ConvexHttpClient(url)
      const raw = await c.query(api.crm_contacts.list)
      contacts = (raw as {
        _id: string; firstName: string; lastName?: string; email?: string;
        phone?: string; companyName?: string; address1?: string; city?: string;
        postalCode?: string; website?: string; source?: string; statut?: string;
        lostStage?: string; lostReason?: string; lostObjection?: string; wonObjection?: string; dealDate?: string;
        canton?: string; role?: string; metier?: string; niche?: string; tags: string[]; notes?: string; createdAt: string; updatedAt?: string
      }[]).map(c => ({
        id:          c._id,
        contactName: `${c.firstName} ${c.lastName ?? ''}`.trim(),
        firstName:   c.firstName   || null,
        lastName:    c.lastName    || null,
        email:       c.email       || null,
        phone:       c.phone       || null,
        companyName: c.companyName || null,
        address1:    c.address1    || null,
        city:        c.city        || null,
        postalCode:  c.postalCode  || null,
        website:     c.website     || null,
        source:        c.source        || null,
        statut:        c.statut        || null,
        lostStage:     c.lostStage     || null,
        lostReason:    c.lostReason    || null,
        lostObjection: c.lostObjection || null,
        wonObjection:  c.wonObjection  || null,
        dealDate:      c.dealDate      || null,
        canton:        c.canton        || null,
        role:        c.role        || null,
        metier:      c.metier      || null,
        niche:       c.niche       || null,
        tags:        c.tags        ?? [],
        dateAdded:   c.createdAt,
        dateUpdated: c.updatedAt   || null,
      }))
    } catch (err) {
      console.error('[Contacts] Convex fetch failed:', err)
    }
  }

  // Pass source/canton/statut from Convex data directly (no attributions map needed)
  const attributions = new Map<string, string>()

  return <ContactsView contacts={contacts} attributions={attributions} />
}
