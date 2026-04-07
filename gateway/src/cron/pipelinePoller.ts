import type { SessionManager } from '../sessions/SessionManager'
import { detectStaleLeads, type GHLOpportunity } from '../skills/ghl'
import { logInteraction } from '../supabase/logger'

/** Called every 10 minutes — finds stale leads and alerts Kai via Soren */
export async function runPipelinePoller(
  sorenSession: SessionManager
): Promise<void> {
  const stale = await detectStaleLeads(2)
  if (stale.length === 0) return

  for (const lead of stale) {
    const prompt = buildUrgentContactPrompt(lead)
    await sorenSession.send(prompt)

    await logInteraction({
      agent:   'soren',
      type:    'pipeline_poll',
      outcome: 'stale_lead_detected',
      duration: 0,
      lead_id: lead.id,
      metadata: { leadName: lead.contact?.name ?? lead.name, value: lead.monetaryValue },
    })
  }
}

function buildUrgentContactPrompt(lead: GHLOpportunity): string {
  const name  = lead.contact?.name ?? lead.name
  const phone = lead.contact?.phone ?? 'inconnu'
  const value = lead.monetaryValue.toLocaleString('fr-FR')
  const age   = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 3600_000)

  return [
    `🚨 Lead sans contact depuis ${age}h — action urgente requise.`,
    `Utilise sessions_send vers "kai" avec ce message :`,
    `"Contact urgent: ${name} (${phone}), budget estimé ${value}€,`,
    `pas de contact depuis ${age}h. Envoie un SMS de relance maintenant.`,
    `Lead ID GHL: ${lead.id}"`,
  ].join('\n')
}
