// LA CARTE DES INVARIANTS — source de vérité de la cohérence du Data OS.
// Seedée par le corpus d'audit (docs/superpowers/specs/2026-06-10-audit-corpus.md).
// Étape 0.0 : enrichie via extract-candidates.mjs + passe de découverte.
//
// Règle référentielle : { id, table, field, target, required? } → field doit exister dans target.
// Règle de cohérence  : { id, table, via, parentTable, ok(child,parent), describe(child,parent) }.

// NB : 'osProspection' est un LIBELLÉ LOGIQUE (la table Convex réelle est prospection_records),
// chargé via api.osProspection.list. Les libellés ici doivent matcher les clés de TABLE_QUERY (Task 4).
// Pas de table "paiements" dans ce schéma (les paiements sont dérivés de pipeline_clients/onboarding) → pas de règle paiement en Vague 0.
export const REFERENTIAL = [
  { id: 'crm_leads.contactId→crm_contacts',            table: 'crm_leads',        field: 'contactId',      target: 'crm_contacts' },
  { id: 'pipeline_clients.ghl_contact_id→crm_contacts', table: 'pipeline_clients', field: 'ghl_contact_id', target: 'crm_contacts' },
  { id: 'osProspection.contactId→crm_contacts',        table: 'osProspection',    field: 'contactId',      target: 'crm_contacts' },
  { id: 'osProspection.leadId→crm_leads',              table: 'osProspection',    field: 'leadId',         target: 'crm_leads' },
]

export const CONSISTENCY = [
  {
    id: 'crm_leads.stage↔contact.statut',
    table: 'crm_leads', via: 'contactId', parentTable: 'crm_contacts',
    // Un contact "perdu" ne doit pas avoir un lead dans une étape active (ex. Yasmine en R2).
    ok: (lead, contact) => !(contact.statut === 'perdu' && lead.stageId !== 'perdu'),
    describe: (lead, contact) => `lead en stage "${lead.stageId}" alors que le contact est "${contact.statut}"`,
  },
]

// Libellés logiques à charger (toute source + toute cible). Doit rester en phase avec les règles
// ci-dessus ET avec les clés de TABLE_QUERY (Task 4).
export const ALL_TABLES = [
  'crm_contacts', 'crm_leads', 'pipeline_clients', 'osProspection',
]
