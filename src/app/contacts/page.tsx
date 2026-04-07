// src/app/contacts/page.tsx
import ContactsView from '@/components/contacts/ContactsView'
import { getContacts, getOpportunities, getPipelines } from '@/lib/ghl'
import { createClient } from '@/lib/supabase/server'
import { type GHLContact } from '@/lib/ghl'

export const dynamic   = 'force-dynamic'

export type ContactPipelineInfo = { pipelineName: string; stageName: string; pipelineId: string }

export default async function ContactsPage() {
  let contacts: GHLContact[] = []
  let attributions: Map<string, string> = new Map()
  let pipelineInfo: Map<string, ContactPipelineInfo> = new Map()

  // Fetch contacts (critical)
  try {
    const { contacts: raw } = await getContacts(100)
    contacts = raw
  } catch (err) {
    console.error('[Contacts] getContacts failed:', err)
  }

  // Fetch attributions from Supabase (independent)
  if (contacts.length > 0) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('contact_attribution')
        .select('ghl_contact_id, created_by')
        .in('ghl_contact_id', contacts.map(c => c.id))
      attributions = new Map((data ?? []).map(
        (a: { ghl_contact_id: string; created_by: string }) => [a.ghl_contact_id, a.created_by]
      ))
    } catch (err) {
      console.error('[Contacts] attribution fetch failed:', err)
    }
  }

  // Fetch pipeline info (independent — won't break contacts/attributions if it fails)
  try {
    const [opportunities, pipelines] = await Promise.all([
      getOpportunities(100),
      getPipelines(),
    ])
    const pipelineNames = new Map(pipelines.map(p => [p.id, p.name]))
    const stageNames = new Map<string, string>()
    for (const p of pipelines) {
      for (const s of p.stages) stageNames.set(s.id, s.name)
    }
    for (const opp of opportunities) {
      if (!opp.contact?.id) continue
      if (pipelineInfo.has(opp.contact.id)) continue
      const pName = pipelineNames.get(opp.pipelineId)
      const sName = stageNames.get(opp.pipelineStageId)
      if (pName && sName) pipelineInfo.set(opp.contact.id, { pipelineName: pName, stageName: sName, pipelineId: opp.pipelineId })
    }
  } catch (err) {
    console.error('[Contacts] pipeline fetch failed:', err)
  }

  return <ContactsView contacts={contacts} attributions={attributions} />
}
