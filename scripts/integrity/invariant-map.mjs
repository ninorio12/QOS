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
  { id: 'pipeline_clients.contactId→crm_contacts',       table: 'pipeline_clients', field: 'contactId',      target: 'crm_contacts' },
  { id: 'osProspection.contactId→crm_contacts',        table: 'osProspection',    field: 'contactId',      target: 'crm_contacts' },
  { id: 'osProspection.leadId→crm_leads',              table: 'osProspection',    field: 'leadId',         target: 'crm_leads' },
  { id: 'os_sales_calls.contactId→crm_contacts',       table: 'os_sales_calls',   field: 'contactId',      target: 'crm_contacts' },
  { id: 'os_sales_calls.leadId→crm_leads',             table: 'os_sales_calls',   field: 'leadId',         target: 'crm_leads' },
  { id: 'os_outreach.contactId→crm_contacts',          table: 'os_outreach',      field: 'contactId',      target: 'crm_contacts' },
  { id: 'os_outreach.leadId→crm_leads',                table: 'os_outreach',      field: 'leadId',         target: 'crm_leads' },
  { id: 'onboarding.contactId→crm_contacts',           table: 'onboarding',       field: 'contactId',      target: 'crm_contacts' },
]

export const CONSISTENCY = [
  {
    id: 'crm_leads.open↔contact.statut=lead',
    table: 'crm_leads', via: 'contactId', parentTable: 'crm_contacts',
    // Un lead OUVERT (présent dans la pipeline leads) doit avoir un contact de statut "lead".
    // Si le contact est "client" ou "perdu", il n'a rien à faire dans la pipeline leads.
    ok: (lead, contact) => lead.status !== 'open' || contact.statut === 'lead',
    describe: (lead, contact) => `lead ouvert mais contact "${contact.statut}" (pipeline leads = contacts "lead" uniquement)`,
  },
  {
    id: 'crm_leads.source↔contact.source',
    table: 'crm_leads', via: 'contactId', parentTable: 'crm_contacts',
    // Le badge source de la card pipeline dérive de la source (inbound/outbound) ; elle doit
    // rester alignée avec celle du contact (source unique de vérité). Filet anti-drift.
    ok: (lead, contact) => !lead.source || !contact.source || lead.source === contact.source,
    describe: (lead, contact) => `lead.source "${lead.source}" ≠ contact.source "${contact.source}"`,
  },
  {
    // Une ligne pipeline_clients doit avoir un contact de statut "client". Combiné à la règle
    // ci-dessus (lead ouvert ⇒ contact "lead"), ça garantit qu'un contact n'est JAMAIS dans
    // les deux pipelines : lead → leads, client → clients, jamais les deux.
    id: 'pipeline_clients↔contact.statut=client',
    table: 'pipeline_clients', via: 'contactId', parentTable: 'crm_contacts',
    ok: (client, contact) => contact.statut === 'client',
    describe: (client, contact) => `dans la pipeline clients mais contact "${contact.statut}" (devrait être "client")`,
  },
]

// Libellés logiques à charger (toute source + toute cible). Doit rester en phase avec les règles
// ci-dessus ET avec les clés de TABLE_QUERY (Task 4).
export const ALL_TABLES = [
  'crm_contacts', 'crm_leads', 'pipeline_clients', 'osProspection',
  'os_sales_calls', 'os_outreach', 'onboarding',
]
