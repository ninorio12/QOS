// Source UNIQUE du funnel de conversion (modèle COHORTE).
// Importée par performance.funnel ET prospectionCockpit.coreMetrics pour que le funnel,
// les KPI et les scorecards/anneaux racontent EXACTEMENT la même histoire (plus de double moteur).
//
// Cohorte = contacts ACQUIS dans la période (créés dans [from,to]), Data OS uniquement.
// On suit les CONTACTS (qui persistent), pas les crm_leads (supprimés à la conversion en client).
// Chaque étape est un SOUS-ENSEMBLE de la cohorte → Leads ≥ R1 ≥ Shows ≥ Ventes, jamais >100%.

const STAGE_RANK: Record<string, number> = { "nouveau-lead": 0, "conversation": 1, "r1": 2, "r2": 3, "nouveau-client": 4 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function funnelCohort(contacts: any[], allLeads: any[], from: string, to: string, dayOf: (iso: string) => string, salesCalls: any[] = []) {
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
  // Appels par round : tenus (issue enregistrée → status="done") vs no-show (status="no_show").
  const heldR1Calls = new Set<string>(), heldR2Calls = new Set<string>()
  const noShowR1 = new Set<string>(), noShowR2 = new Set<string>()
  for (const sc of salesCalls) {
    if (!sc.contactId) continue
    const id = sc.contactId.toString(), isR2 = sc.stage === "R2"
    if (sc.status === "no_show") (isR2 ? noShowR2 : noShowR1).add(id)
    else if (sc.status === "done") (isR2 ? heldR2Calls : heldR1Calls).add(id)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rankOf = (c: any) => STAGE_RANK[leadStageByContact.get(c._id.toString()) ?? ""] ?? -1
  // SHOW = le RDV a RÉELLEMENT eu lieu, détecté POSITIVEMENT (décision Thomas) : une issue a été
  // enregistrée — appel "done", OU le contact a avancé (R2+/client), OU perdu en R1/R2 pour une raison
  // autre que no-show. Un R1 encore EN ATTENTE (aucune issue) ne compte PLUS comme présent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heldR1 = (c: any) => heldR1Calls.has(c._id.toString()) || rankOf(c) >= 3 || c.statut === "client"
    || ((c.lostStage === "r1" || c.lostStage === "r2") && c.lostReason !== "non_presentation")
  const showsR1 = r1Cohort.filter(heldR1).length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noShowsR1 = r1Cohort.filter((c: any) => noShowR1.has(c._id.toString()) || (c.lostReason === "non_presentation" && c.lostStage === "r1")).length

  // R2 bookés = sous-cohorte ayant atteint le R2 (stage r2+, perdu en r2, ou un appel R2 existe).
  const r2CallContacts = new Set<string>()
  for (const sc of salesCalls) { if (sc.stage === "R2" && sc.contactId) r2CallContacts.add(sc.contactId.toString()) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reachedR2 = (c: any) => rankOf(c) >= 3 || c.lostStage === "r2" || r2CallContacts.has(c._id.toString())
  const r2Cohort = r1Cohort.filter(reachedR2)
  const r2Booked = r2Cohort.length
  // Show R2 = même logique positive (issue R2 enregistrée).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heldR2 = (c: any) => heldR2Calls.has(c._id.toString()) || rankOf(c) >= 4 || c.statut === "client"
    || (c.lostStage === "r2" && c.lostReason !== "non_presentation")
  const showsR2 = r2Cohort.filter(heldR2).length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noShowsR2 = r2Cohort.filter((c: any) => noShowR2.has(c._id.toString()) || (c.lostReason === "non_presentation" && c.lostStage === "r2")).length

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
    r1Booked, ventes,
    r2Booked, showsR1, showsR2, noShowsR1, noShowsR2,
    // Compat (score santé / scorecards) : shows/noShows/tauxShow = niveau R1.
    noShows: noShowsR1, shows: showsR1,
    tauxLeadsR1: pct(r1Booked, leadsTotal),
    tauxLeadsR2: pct(r2Booked, leadsTotal),  // total leads → R2 booké (legacy)
    tauxR1ToR2:  pct(r2Booked, r1Booked),    // total R1 bookés → R2 bookés
    tauxShow:    pct(showsR1, r1Booked),     // = taux de show R1 (compat)
    tauxShowR1:  pct(showsR1, r1Booked),
    tauxR1R2:    pct(r2Booked, showsR1),     // présents R1 → R2 booké
    tauxShowR2:  pct(showsR2, r2Booked),
    tauxClose:   pct(ventes, r1Booked),
  }
}
