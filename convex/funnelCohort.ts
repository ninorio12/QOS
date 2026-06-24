// Source UNIQUE du funnel de conversion (modèle COHORTE).
// Importée par performance.funnel ET prospectionCockpit.coreMetrics pour que le funnel,
// les KPI et les scorecards/anneaux racontent EXACTEMENT la même histoire (plus de double moteur).
//
// Cohorte = contacts ACQUIS dans la période (créés dans [from,to]), Data OS uniquement.
// On suit les CONTACTS (qui persistent), pas les crm_leads (supprimés à la conversion en client).
// Chaque étape est un SOUS-ENSEMBLE de la cohorte → Leads ≥ R1 ≥ Shows ≥ Ventes, jamais >100%.

const STAGE_RANK: Record<string, number> = { "nouveau-lead": 0, "conversation": 1, "r1": 2, "r2": 3, "nouveau-client": 4 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function funnelCohort(contacts: any[], allLeads: any[], from: string, to: string, dayOf: (iso: string) => string) {
  const inWin = (iso?: string) => { if (!iso) return false; const d = dayOf(iso); return d >= from && d <= to }
  // Stage courant du lead par contact (pour savoir s'il a atteint R1).
  const leadStageByContact = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of allLeads) { if (l.contactId) leadStageByContact.set(l.contactId.toString(), l.stageId) }
  // Un contact a "atteint R1" si son lead est au stage r1+ (en cours), OU perdu en R1/R2, OU déjà client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reachedR1 = (c: any) => (STAGE_RANK[leadStageByContact.get(c._id.toString()) ?? ""] ?? -1) >= 2 || c.lostStage === "r1" || c.lostStage === "r2" || c.statut === "client"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cohort = contacts.filter((c: any) => inWin(c.createdAt))
  const r1Cohort = cohort.filter(reachedR1)
  const r1Booked = r1Cohort.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noShows = cohort.filter((c: any) => c.lostReason === "non_presentation" && (c.lostStage === "r1" || c.lostStage === "r2")).length
  const shows = Math.max(0, r1Booked - noShows)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ventes = r1Cohort.filter((c: any) => c.statut === "client").length
  const leadsTotal = cohort.length
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0

  return {
    leadsTotal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leadsInbound: cohort.filter((c: any) => c.source === "inbound").length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leadsOutbound: cohort.filter((c: any) => c.source === "outbound").length,
    r1Booked, noShows, shows, ventes,
    tauxLeadsR1: pct(r1Booked, leadsTotal),
    tauxShow: pct(shows, r1Booked),
    tauxClose: pct(ventes, r1Booked),
  }
}
