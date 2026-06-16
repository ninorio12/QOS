import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { createHash } from 'node:crypto'
import { api } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type Id } from '../../../../convex/_generated/dataModel'
import { decide, requiredScopeForCall } from '../../../../convex/lib/permissions'

export const dynamic = 'force-dynamic'

// ───────────────────────────────────────────────────────────────────────────
// VividFlow Data OS — MCP server (Streamable HTTP, JSON-RPC 2.0)
// API opérationnelle complète : contacts, pipeline/leads, clients, sales calls,
// outreach, tâches, activités, mémoire, process, état COO. Backed by Convex.
// Toute écriture logge une activité. Auth Bearer HERMES_API_SECRET si défini.
// ───────────────────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'vividflow-dataos', version: '2.0.0' }

function cx() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAct(c: ConvexHttpClient, actorType: string, actorId: string, a: { eventType: string; summary: string; entityType?: string; entityId?: string; metadata?: any }) {
  try { await c.mutation(api.osActivities.log, { actorType, actorId, source: 'mcp', ...a }) } catch { /* ignore */ }
}
const initials = (name: string) => (name || 'X').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; run: (a: any, actor: string) => Promise<unknown>; log?: (a: any, r: any) => { eventType: string; summary: string; entityType?: string; entityId?: string } }
const obj = (props: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties: props, required, additionalProperties: true })
const Sx = { string: { type: 'string' }, number: { type: 'number' }, bool: { type: 'boolean' }, strArr: { type: 'array', items: { type: 'string' } } }

const TOOLS: Tool[] = [
  // ───────────── Contacts (source de vérité) ─────────────
  { name: 'contacts_list', description: 'Liste les contacts (source de vérité).', inputSchema: obj({}), run: () => cx().query(api.crm_contacts.list, {}) },
  { name: 'contacts_get', description: 'Récupère un contact par id.', inputSchema: obj({ id: Sx.string }, ['id']), run: (a) => cx().query(api.crm_contacts.get, { id: a.id }) },
  {
    name: 'contacts_create', description: "Crée un contact. name (requis), email, phone, company, source, statut (lead|client|perdu), metier, niche.",
    inputSchema: obj({ name: Sx.string, email: Sx.string, phone: Sx.string, company: Sx.string, source: Sx.string, statut: Sx.string, metier: Sx.string, niche: Sx.string }, ['name']),
    run: (a) => { const [firstName, ...rest] = (a.name || 'Contact').split(' '); return cx().mutation(api.crm_contacts.create, { firstName, lastName: rest.join(' ') || undefined, email: a.email, phone: a.phone, companyName: a.company, source: a.source, statut: a.statut ?? 'lead', metier: a.metier, niche: a.niche }) },
    log: (a, r) => ({ eventType: 'contact.created', summary: `Contact créé : ${a.name}`, entityType: 'contact', entityId: String(r) }),
  },
  {
    name: 'contacts_update', description: 'Met à jour un contact. id requis + champs (firstName,lastName,email,phone,companyName,statut,metier,niche,notes,...).',
    inputSchema: obj({ id: Sx.string, firstName: Sx.string, lastName: Sx.string, email: Sx.string, phone: Sx.string, companyName: Sx.string, statut: Sx.string, metier: Sx.string, niche: Sx.string, notes: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.crm_contacts.update, a),
    log: (a) => ({ eventType: 'contact.updated', summary: 'Contact mis à jour', entityType: 'contact', entityId: a.id }),
  },
  {
    name: 'contacts_delete_or_archive', description: "Archive un contact (statut='archived') — non destructif (source de vérité). id requis.",
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.crm_contacts.update, { id: a.id, statut: 'archived' }),
    log: (a) => ({ eventType: 'contact.archived', summary: 'Contact archivé', entityType: 'contact', entityId: a.id }),
  },

  // ───────────── Pipeline / Leads ─────────────
  {
    name: 'pipeline_list', description: 'Liste les leads avec leurs étapes (vue commerciale). Optionnel: pipelineId.',
    inputSchema: obj({ pipelineId: Sx.string }),
    run: async (a) => {
      const c = cx()
      const [leads, pipelines] = await Promise.all([
        a.pipelineId ? c.query(api.crm_leads.listByPipeline, { pipelineId: a.pipelineId }) : c.query(api.crm_leads.list),
        c.query(api.pipeline_config.list, {}),
      ])
      return { leads, pipelines }
    },
  },
  { name: 'pipeline_get', description: 'Récupère un lead par id.', inputSchema: obj({ id: Sx.string }, ['id']), run: (a) => cx().query(api.crm_leads.get, { id: a.id }) },
  {
    name: 'pipeline_move', description: 'Déplace un lead vers une étape (ex: R1, R2). id + stageId requis.',
    inputSchema: obj({ id: Sx.string, stageId: Sx.string, stageName: Sx.string }, ['id', 'stageId']),
    run: (a) => cx().mutation(api.crm_leads.updateStage, { id: a.id, stageId: a.stageId, stageName: a.stageName }),
    log: (a) => ({ eventType: 'pipeline.moved', summary: `Lead déplacé → ${a.stageName ?? a.stageId}`, entityType: 'lead', entityId: a.id }),
  },
  {
    name: 'leads_create', description: "Crée un lead. RÈGLE: contacts = source de vérité → réutilise le contact si l'email existe, sinon le crée, puis crée le lead lié. name (requis), email, phone, company, value, source, pipelineId?, stageId?.",
    inputSchema: obj({ name: Sx.string, email: Sx.string, phone: Sx.string, company: Sx.string, value: Sx.number, source: Sx.string, pipelineId: Sx.string, stageId: Sx.string }, ['name']),
    run: async (a) => {
      const c = cx()
      let contactId = a.contactId as string | undefined
      if (!contactId) {
        const contacts = await c.query(api.crm_contacts.list, {})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = a.email ? (contacts as any[]).find(x => (x.email || '').toLowerCase() === a.email.toLowerCase()) : null
        if (match) contactId = match._id
        else { const [firstName, ...rest] = (a.name || 'Lead').split(' '); contactId = await c.mutation(api.crm_contacts.create, { firstName, lastName: rest.join(' ') || undefined, email: a.email, phone: a.phone, companyName: a.company, source: a.source, statut: 'lead' }) as string }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipelines = await c.query(api.pipeline_config.list, {}) as any[]
      const pipeline = pipelines.find(p => p._id === a.pipelineId) ?? pipelines[0]
      const stageId = a.stageId ?? pipeline?.stages?.[0]?.id ?? 'nouveau-lead'
      const stageName = pipeline?.stages?.find((s: { id: string; name: string }) => s.id === stageId)?.name ?? stageId
      const leadId = await c.mutation(api.crm_leads.create, { contactId: contactId as Id<'crm_contacts'>, name: a.name, email: a.email, phone: a.phone, company: a.company, pipelineId: pipeline?._id ?? 'leads', stageId, stageName, value: a.value ?? 0, source: a.source ?? 'system', initials: initials(a.name) })
      return { leadId, contactId, pipelineId: pipeline?._id, stageId, stageName }
    },
    log: (a, r) => ({ eventType: 'lead.created', summary: `Lead créé : ${a.name}`, entityType: 'lead', entityId: String((r as { leadId?: string })?.leadId ?? '') }),
  },
  {
    name: 'leads_update', description: 'Met à jour un lead (name,email,phone,company,value,source,stageId,status). id requis.',
    inputSchema: obj({ id: Sx.string, name: Sx.string, email: Sx.string, phone: Sx.string, company: Sx.string, value: Sx.number, source: Sx.string, stageId: Sx.string, status: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.crm_leads.update, a),
    log: (a) => ({ eventType: 'lead.updated', summary: 'Lead mis à jour', entityType: 'lead', entityId: a.id }),
  },
  {
    name: 'leads_convert_to_client', description: "Convertit un lead en client : passe le contact en statut 'client' et synchronise le pipeline Clients. contactId requis, dealValue optionnel.",
    inputSchema: obj({ contactId: Sx.string, dealValue: Sx.number }, ['contactId']),
    run: async (a) => {
      const c = cx()
      await c.mutation(api.crm_contacts.update, { id: a.contactId, statut: 'client' })
      return await c.mutation(api.sync.syncContactToPipeline, { contactId: a.contactId, dealValue: a.dealValue })
    },
    log: (a) => ({ eventType: 'lead.converted', summary: 'Lead converti en client', entityType: 'contact', entityId: a.contactId }),
  },
  {
    name: 'leads_mark_lost', description: "Marque un lead comme perdu. id requis.",
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.crm_leads.updateStatus, { id: a.id, status: 'lost' }),
    log: (a) => ({ eventType: 'lead.lost', summary: 'Lead marqué perdu', entityType: 'lead', entityId: a.id }),
  },

  // ───────────── Clients ─────────────
  { name: 'clients_list', description: 'Liste les clients.', inputSchema: obj({}), run: () => cx().query(api.pipeline_clients.list, {}) },
  {
    name: 'clients_get', description: 'Récupère un client par id (pipeline_clients _id) ou par ghl_contact_id.', inputSchema: obj({ id: Sx.string }, ['id']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: async (a) => { const all = await cx().query(api.pipeline_clients.list, {}) as any[]; return all.find(c => c._id === a.id || c.ghl_contact_id === a.id) ?? null },
  },
  {
    name: 'clients_create_or_convert', description: "Crée ou convertit un client. Si contactId fourni → conversion (sync). Sinon crée directement (name, value, company, email, phone).",
    inputSchema: obj({ contactId: Sx.string, name: Sx.string, value: Sx.number, company: Sx.string, email: Sx.string, phone: Sx.string }),
    run: async (a) => {
      const c = cx()
      if (a.contactId) { await c.mutation(api.crm_contacts.update, { id: a.contactId, statut: 'client' }); return await c.mutation(api.sync.syncContactToPipeline, { contactId: a.contactId, dealValue: a.value }) }
      return await c.mutation(api.pipeline_clients.create, { name: a.name, company: a.company, email: a.email, phone: a.phone, value: a.value ?? 0, stageId: 'nouveau-client', initials: initials(a.name), createdAt: new Date().toISOString() })
    },
    log: (a) => ({ eventType: 'client.created', summary: `Client : ${a.name ?? a.contactId}`, entityType: 'client' }),
  },
  {
    name: 'clients_update', description: 'Met à jour un client. id requis + value et/ou stageId.',
    inputSchema: obj({ id: Sx.string, value: Sx.number, stageId: Sx.string }, ['id']),
    run: async (a) => { const c = cx(); if (a.value !== undefined) await c.mutation(api.pipeline_clients.updateValue, { id: a.id, value: a.value }); if (a.stageId) await c.mutation(api.pipeline_clients.updateStage, { id: a.id, stageId: a.stageId }); return { ok: true } },
    log: (a) => ({ eventType: 'client.updated', summary: 'Client mis à jour', entityType: 'client', entityId: a.id }),
  },
  {
    name: 'clients_health_summary', description: "Vue santé clients : nombre, CA encaissé, montant en attente.", inputSchema: obj({}),
    run: async () => {
      const c = cx()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [clients, pay] = await Promise.all([c.query(api.pipeline_clients.list, {}) as any, c.query(api.paiement.overview, { from: '2020-01-01', to: new Date().toISOString().split('T')[0] }) as any])
      return { clients: clients.length, totalDealValue: clients.reduce((s: number, x: { value?: number }) => s + (x.value ?? 0), 0), encaisse: pay?.encaisse ?? 0, attente: pay?.attente ?? 0, rembourse: pay?.rembourse ?? 0 }
    },
  },

  // ───────────── Sales calls ─────────────
  { name: 'sales_calls_list', description: 'Liste les sales calls. Filtres: contactId, leadId, clientId.', inputSchema: obj({ contactId: Sx.string, leadId: Sx.string, clientId: Sx.string }), run: (a) => cx().query(api.osSalesCalls.list, a) },
  {
    name: 'sales_calls_create', description: 'Crée un sales call (lié à un contact/lead/client). title requis.',
    inputSchema: obj({ title: Sx.string, contactId: Sx.string, leadId: Sx.string, clientId: Sx.string, date: Sx.string, status: Sx.string, outcome: Sx.string, notes: Sx.string, summary: Sx.string, nextStep: Sx.string }, ['title']),
    run: (a, actor) => cx().mutation(api.osSalesCalls.create, { ...a, createdBy: actor }),
    log: (a, r) => ({ eventType: 'call.created', summary: `Sales call : ${a.title}`, entityType: 'sales_call', entityId: String(r) }),
  },
  {
    name: 'sales_calls_update', description: 'Met à jour un sales call (status, outcome, notes, summary, nextStep, objections[]). id requis.',
    inputSchema: obj({ id: Sx.string, status: Sx.string, outcome: Sx.string, notes: Sx.string, summary: Sx.string, nextStep: Sx.string, objections: Sx.strArr }, ['id']),
    run: (a) => cx().mutation(api.osSalesCalls.update, a),
    log: (a) => ({ eventType: 'call.updated', summary: 'Sales call mis à jour', entityType: 'sales_call', entityId: a.id }),
  },
  { name: 'sales_calls_summary', description: 'Synthèse des sales calls (totaux, faits, avec objections).', inputSchema: obj({}), run: () => cx().query(api.osSalesCalls.summary, {}) },
  {
    name: 'objections_extract_or_save', description: "Enregistre une objection en Base de connaissance (kind 'objection', à valider). objection (requis). Optionnel: callId pour l'attacher au call.",
    inputSchema: obj({ objection: Sx.string, callId: Sx.string, context: Sx.string }, ['objection']),
    run: async (a, actor) => {
      const c = cx()
      const kid = await c.mutation(api.osKnowledge.create, { kind: 'objection', title: a.objection.slice(0, 80), body: a.context ?? a.objection, status: 'to_validate', source: 'mcp', createdBy: actor })
      if (a.callId) await c.mutation(api.osSalesCalls.addObjection, { id: a.callId, objection: a.objection })
      return { knowledgeId: kid }
    },
    log: (a) => ({ eventType: 'memory.update', summary: `Objection à valider : ${a.objection.slice(0, 60)}`, entityType: 'knowledge' }),
  },

  // ───────────── Outreach ─────────────
  { name: 'outreach_list', description: 'Liste les actions outreach. Filtres: contactId, leadId, status.', inputSchema: obj({ contactId: Sx.string, leadId: Sx.string, status: Sx.string }), run: (a) => cx().query(api.osOutreach.list, a) },
  {
    name: 'outreach_create', description: "Crée une action outreach. channel requis (email|linkedin|sms|whatsapp|call). contactId/leadId, message, status, nextFollowUpAt (ISO).",
    inputSchema: obj({ channel: Sx.string, contactId: Sx.string, leadId: Sx.string, message: Sx.string, status: Sx.string, sentAt: Sx.string, nextFollowUpAt: Sx.string, notes: Sx.string }, ['channel']),
    run: (a, actor) => cx().mutation(api.osOutreach.create, { ...a, createdBy: actor }),
    log: (a, r) => ({ eventType: 'outreach.created', summary: `Outreach ${a.channel}`, entityType: 'outreach', entityId: String(r) }),
  },
  {
    name: 'outreach_update', description: 'Met à jour une action outreach (status, message, sentAt, nextFollowUpAt, notes). id requis.',
    inputSchema: obj({ id: Sx.string, status: Sx.string, message: Sx.string, sentAt: Sx.string, nextFollowUpAt: Sx.string, notes: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.osOutreach.update, a),
    log: (a) => ({ eventType: 'outreach.updated', summary: 'Outreach mis à jour', entityType: 'outreach', entityId: a.id }),
  },
  { name: 'outreach_followup_due', description: 'Relances outreach échues (nextFollowUpAt passé, non répondu).', inputSchema: obj({}), run: () => cx().query(api.osOutreach.followupDue, {}) },
  { name: 'outreach_summary', description: 'Synthèse outreach (envoyés, réponses, relances dues).', inputSchema: obj({}), run: () => cx().query(api.osOutreach.summary, {}) },

  // ───────────── Tâches ─────────────
  { name: 'tasks_list', description: 'Liste les tâches (filtre status optionnel).', inputSchema: obj({ status: Sx.string }), run: (a) => cx().query(api.osTasks.list, { status: a.status }) },
  { name: 'tasks_create', description: 'Crée une tâche. title requis + description, priority, assigneeType, assigneeId, source, linkedClientId.', inputSchema: obj({ title: Sx.string, description: Sx.string, priority: Sx.string, assigneeType: Sx.string, assigneeId: Sx.string, source: Sx.string, linkedClientId: Sx.string }, ['title']), run: (a, actor) => cx().mutation(api.osTasks.create, { ...a, source: a.source ?? 'system', createdBy: actor }) },
  { name: 'tasks_update', description: 'Met à jour une tâche (status, priority, assigneeType, assigneeId, blockerReason). id requis.', inputSchema: obj({ id: Sx.string, status: Sx.string, priority: Sx.string, assigneeType: Sx.string, assigneeId: Sx.string, blockerReason: Sx.string }, ['id']), run: (a, actor) => cx().mutation(api.osTasks.update, { ...a, updatedBy: actor }) },
  { name: 'tasks_comment', description: 'Commente une tâche. id + text requis.', inputSchema: obj({ id: Sx.string, text: Sx.string }, ['id', 'text']), run: (a, actor) => cx().mutation(api.osTasks.addComment, { id: a.id, authorType: 'agent', authorId: actor, text: a.text }) },

  // ───────────── Activités ─────────────
  { name: 'activities_list', description: "Journal d'activités (preuve/audit). Filtres: limit, entityType, entityId.", inputSchema: obj({ limit: Sx.number, entityType: Sx.string, entityId: Sx.string }), run: (a) => cx().query(api.osActivities.list, a) },
  { name: 'activities_log', description: 'Écrit une entrée dans le journal. eventType + summary requis.', inputSchema: obj({ eventType: Sx.string, summary: Sx.string, entityType: Sx.string, entityId: Sx.string, metadata: { type: 'object' } }, ['eventType', 'summary']), run: (a, actor) => cx().mutation(api.osActivities.log, { actorType: 'agent', actorId: actor, source: 'mcp', ...a }) },

  // ───────────── Agents ─────────────
  { name: 'agents_list', description: 'Liste les agents opérationnels.', inputSchema: obj({}), run: () => cx().query(api.osAgents.list, {}) },

  // ───────────── Connaissance / mémoire ─────────────
  { name: 'knowledge_list', description: "Base de connaissance. Filtre kind: memory|decision|rule|client_project|pattern|risk|objection|candidate.", inputSchema: obj({ kind: Sx.string }), run: (a) => cx().query(api.osKnowledge.list, { kind: a.kind }) },
  { name: 'knowledge_propose', description: "Propose une entrée (à valider). kind + title requis.", inputSchema: obj({ kind: Sx.string, title: Sx.string, body: Sx.string, tags: Sx.strArr }, ['kind', 'title']), run: (a, actor) => cx().mutation(api.osKnowledge.create, { kind: a.kind, title: a.title, body: a.body, status: 'to_validate', tags: a.tags, source: 'mcp', createdBy: actor }) },
  { name: 'knowledge_approve', description: "Valide une entrée (active). id requis.", inputSchema: obj({ id: Sx.string }, ['id']), run: (a) => cx().mutation(api.osKnowledge.approve, { id: a.id }) },
  { name: 'objections_list', description: "Liste les objections enregistrées (knowledge kind 'objection').", inputSchema: obj({}), run: () => cx().query(api.osKnowledge.list, { kind: 'objection' }) },

  // ───────────── Process ─────────────
  { name: 'processes_list', description: 'Liste les process.', inputSchema: obj({}), run: () => cx().query(api.processes.list, {}) },

  // ───────────── Handoffs (transfert de responsabilité entre agents) ─────────────
  { name: 'handoffs_list', description: "Liste les handoffs (transferts de responsabilité). Filtres: toAgentSlug, status (pending|accepted|completed).", inputSchema: obj({ toAgentSlug: Sx.string, status: Sx.string }), run: (a) => cx().query(api.osHandoffs.list, a) },
  {
    name: 'handoffs_create', description: "Transfère une entité (task|lead|client|prospection|...) vers un autre agent. toAgentSlug, entityType, entityId, reason requis ; priority, slaDueAt (ISO), context optionnels. NB : un handoff ne donne aucun droit — le receveur doit déjà posséder le scope.",
    inputSchema: obj({ toAgentSlug: Sx.string, entityType: Sx.string, entityId: Sx.string, reason: Sx.string, priority: Sx.string, slaDueAt: Sx.string, context: { type: 'object' } }, ['toAgentSlug', 'entityType', 'entityId', 'reason']),
    run: async (a, actor) => {
      const c = cx()
      const slug = actor.replace(/^agent:/, '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me = (await c.query(api.osAgents.list, {}) as any[]).find(x => x.slug === slug)
      if (!me) throw new Error(`agent émetteur introuvable : ${slug}`)
      return await c.mutation(api.osHandoffs.create, { fromAgentId: me._id, toAgentSlug: a.toAgentSlug, entityType: a.entityType, entityId: a.entityId, reason: a.reason, priority: a.priority, slaDueAt: a.slaDueAt, context: a.context, createdBy: actor })
    },
    log: (a) => ({ eventType: 'handoff.created', summary: `Handoff → ${a.toAgentSlug} : ${a.reason}`, entityType: a.entityType, entityId: String(a.entityId) }),
  },
  {
    name: 'handoffs_accept', description: "Accepte un handoff (en prend la responsabilité ; réassigne la tâche si entityType=task). handoffId requis.",
    inputSchema: obj({ handoffId: Sx.string }, ['handoffId']),
    run: (a, actor) => cx().mutation(api.osHandoffs.accept, { handoffId: a.handoffId, acceptedBy: actor }),
    log: (a) => ({ eventType: 'handoff.accepted', summary: 'Handoff accepté', entityType: 'handoff', entityId: String(a.handoffId) }),
  },
  {
    name: 'handoffs_complete', description: "Clôt un handoff (travail terminé). handoffId requis ; note optionnelle.",
    inputSchema: obj({ handoffId: Sx.string, note: Sx.string }, ['handoffId']),
    run: (a) => cx().mutation(api.osHandoffs.complete, { handoffId: a.handoffId, note: a.note }),
    log: (a) => ({ eventType: 'handoff.completed', summary: 'Handoff terminé', entityType: 'handoff', entityId: String(a.handoffId) }),
  },

  // ───────────── Skills / SOPs persistants ─────────────
  { name: 'skills_list', description: "Liste les Skills/SOPs persistants du Data OS (procédures, playbooks).", inputSchema: obj({}), run: () => cx().query(api.osSkills.list, {}) },
  {
    name: 'skills_create', description: "Crée ou met à jour un Skill/SOP (upsert par skillId). skillId, name, body requis ; description, tags optionnels.",
    inputSchema: obj({ skillId: Sx.string, name: Sx.string, description: Sx.string, tags: Sx.strArr, body: Sx.string }, ['skillId', 'name', 'body']),
    run: (a, actor) => cx().mutation(api.osSkills.create, { skillId: a.skillId, name: a.name, description: a.description, tags: a.tags, body: a.body, createdBy: actor }),
    log: (a) => ({ eventType: 'skill.upserted', summary: `Skill/SOP : ${a.name}`, entityType: 'skill', entityId: String(a.skillId) }),
  },
  {
    name: 'skills_remove', description: "Supprime un Skill/SOP (destructif → validation humaine requise). id requis.",
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.osSkills.remove, { id: a.id }),
    log: (a) => ({ eventType: 'skill.removed', summary: 'Skill/SOP supprimé', entityType: 'skill', entityId: String(a.id) }),
  },

  // ───────────── Prospection (cockpit caller, Nouveau lead → R1) ─────────────
  { name: 'prospection_list', description: 'Liste les cartes de prospection (jointes au contact). Board = colonnes lead_a_traiter|r1_booke|perdu (filtre column). Phase 1/2/3 internes. Filtres: column, phase, temperature, channel, status, search.', inputSchema: obj({ column: Sx.string, phase: Sx.string, temperature: Sx.string, channel: Sx.string, status: Sx.string, search: Sx.string }), run: (a) => cx().query(api.osProspection.list, a) },
  {
    name: 'prospection_create_or_link_contact', description: "Crée un lead de prospection. Déduplique le contact (phone/email/linkedin/nom+entreprise), crée/lie le Contact (statut lead, stage Nouveau lead), crée la carte prospection + le lead Pipeline. fullName requis.",
    inputSchema: obj({ fullName: Sx.string, companyName: Sx.string, phone: Sx.string, email: Sx.string, linkedinUrl: Sx.string, source: Sx.string, niche: Sx.string, canton: Sx.string, channel: Sx.string, temperature: Sx.string }, ['fullName']),
    run: (a, actor) => cx().mutation(api.osProspection.createOrLink, { ...a, createdBy: actor }),
    log: (a, r) => ({ eventType: 'prospection.created', summary: `Prospection : ${a.fullName}`, entityType: 'prospection', entityId: String((r as { recordId?: string })?.recordId ?? '') }),
  },
  {
    name: 'prospection_quick_action', description: "Applique une action et synchronise colonne/Pipeline/Contact/Tâches. action ∈ appele|repondu|pas_repondu|message_laisse|a_rappeler|interesse|negatif|mauvais_numero|non_qualifie|r1_booke|perdu. La carte reste dans 'Lead à traiter' (phase1→2→3 interne) ; pas_repondu/message_laisse répétés font progresser la phase puis → Perdu après phase3. negatif/mauvais_numero/non_qualifie → Perdu. interesse → temperature chaud. r1_booke (r1At ISO) → handoff + tâche R1. id requis.",
    inputSchema: obj({ id: Sx.string, action: Sx.string, note: Sx.string, nextFollowUpAt: Sx.string, r1At: Sx.string, lostReason: Sx.string }, ['id', 'action']),
    run: (a, actor) => cx().mutation(api.osProspection.quickAction, { ...a, createdBy: actor }),
  },
  {
    name: 'prospection_move', description: "Déplace une carte de prospection (= prospection_quick_action). id + action requis.",
    inputSchema: obj({ id: Sx.string, action: Sx.string }, ['id', 'action']),
    run: (a, actor) => cx().mutation(api.osProspection.quickAction, { id: a.id, action: a.action, createdBy: actor }),
  },
  {
    name: 'prospection_mark_r1_booked', description: "Marque la carte comme R1 booké : status=handoff, Pipeline→R1, crée la tâche 'Préparer R1', log lead.r1_booked. id requis ; r1At = date ISO du R1.",
    inputSchema: obj({ id: Sx.string, r1At: Sx.string, note: Sx.string }, ['id']),
    run: (a, actor) => cx().mutation(api.osProspection.quickAction, { id: a.id, action: 'r1_booke', r1At: a.r1At, note: a.note, createdBy: actor }),
    log: (a) => ({ eventType: 'lead.r1_booked', summary: 'R1 booké', entityType: 'prospection', entityId: String(a.id) }),
  },
  {
    name: 'prospection_mark_lost', description: "Marque la carte comme Perdu : status=lost, Contact perdu/non_qualifie, Pipeline lost, log lead.lost. id requis ; lostReason ∈ reponse_negative|pas_de_reponse_phase3|mauvais_numero|non_qualifie|hors_cible|autre.",
    inputSchema: obj({ id: Sx.string, lostReason: Sx.string, note: Sx.string }, ['id']),
    run: (a, actor) => cx().mutation(api.osProspection.quickAction, { id: a.id, action: 'perdu', lostReason: a.lostReason, note: a.note, createdBy: actor }),
    log: (a) => ({ eventType: 'lead.lost', summary: 'Lead perdu', entityType: 'prospection', entityId: String(a.id) }),
  },
  {
    name: 'prospection_set_phase', description: "Met à jour une cellule du tracker (Phase 1/2/3) sans sortir le lead de 'Lead à traiter'. Dès qu'une phase est renseignée, le lead passe 'En conversation' dans le Pipeline. phase ∈ phase1|phase2|phase3 ; value ∈ ''|repondu|pas_repondu|a_rappeler. id requis.",
    inputSchema: obj({ id: Sx.string, phase: Sx.string, value: Sx.string }, ['id', 'phase', 'value']),
    run: (a, actor) => cx().mutation(api.osProspection.setPhaseCell, { ...a, createdBy: actor }),
  },
  { name: 'prospection_set_temperature', description: 'Définit la température (chaud|tiede|froid). id requis.', inputSchema: obj({ id: Sx.string, temperature: Sx.string }, ['id', 'temperature']), run: (a) => cx().mutation(api.osProspection.setTemperature, a) },
  { name: 'prospection_set_next_followup', description: 'Définit le prochain rappel (ISO date). id requis.', inputSchema: obj({ id: Sx.string, nextFollowUpAt: Sx.string }, ['id', 'nextFollowUpAt']), run: (a) => cx().mutation(api.osProspection.setNextFollowUp, a) },
  { name: 'prospection_summary', description: 'KPI prospection du jour (leads à traiter, appels/msg, réponses, rappels, conversations, leads chauds, R1 booké, restants vs objectif).', inputSchema: obj({}), run: () => cx().query(api.osProspection.summary, {}) },

  // ───────────── Performance (dashboard setter) ─────────────
  { name: 'performance_summary', description: "KPI prospection du setter (nb de LEADS distincts) : contactes, reponses, aRappeler, r1Booked, perdus, objectifR1, tauxReponse (reponses/contactes), conversionR1 (r1/contactes). setter = clé createdBy (ex 'human:thomas') ou omis = tous. from/to = dates YYYY-MM-DD. channel ∈ all|appel|linkedin|email.", inputSchema: obj({ setter: Sx.string, from: Sx.string, to: Sx.string, channel: Sx.string }), run: (a) => cx().query(api.performance.summary, a) },
  { name: 'performance_activity_calendar', description: "Calendrier d'exécution : par jour, nb de leads contactes/reponses/aRappeler/r1/perdus + avancees (avancées de phase) + objectif atteint. from/to requis (YYYY-MM-DD), setter optionnel.", inputSchema: obj({ setter: Sx.string, from: Sx.string, to: Sx.string }, ['from', 'to']), run: (a) => cx().query(api.performance.activityCalendar, a) },
  {
    name: 'performance_set_r1_objective', description: "Définit l'objectif R1 (éditable, persisté) pour une date donnée. date (YYYY-MM-DD) + target (nombre) requis.",
    inputSchema: obj({ date: Sx.string, target: Sx.number }, ['date', 'target']),
    run: (a, actor) => cx().mutation(api.performance.setR1Objective, { ...a, createdBy: actor }),
    log: (a) => ({ eventType: 'performance.objective_set', summary: `Objectif R1 ${a.date} : ${a.target}`, entityType: 'prospection_goal', entityId: String(a.date) }),
  },
  { name: 'performance_daily_tasks_list', description: "Objectifs quotidiens du setter (progression auto via les événements de prospection). date requise (YYYY-MM-DD), setter optionnel.", inputSchema: obj({ setter: Sx.string, date: Sx.string }, ['date']), run: (a) => cx().query(api.performance.dailyTasksList, a) },
  {
    name: 'performance_daily_tasks_create', description: "Crée un objectif quotidien. metric ∈ appels|messages|relances|reponses|r1 (progression auto) ou omis (manuel). setter/date/title/targetNumber requis.",
    inputSchema: obj({ setter: Sx.string, date: Sx.string, title: Sx.string, targetNumber: Sx.number, metric: Sx.string }, ['setter', 'date', 'title', 'targetNumber']),
    run: (a, actor) => cx().mutation(api.performance.dailyTasksCreate, { ...a, createdBy: actor }),
    log: (a) => ({ eventType: 'performance.task_created', summary: `Objectif : ${a.title}`, entityType: 'setter_task', entityId: '' }),
  },
  {
    name: 'performance_daily_tasks_update', description: "Met à jour un objectif : increment (+N), currentProgress (valeur), status (todo|in_progress|done). id requis.",
    inputSchema: obj({ id: Sx.string, increment: Sx.number, currentProgress: Sx.number, status: Sx.string }, ['id']),
    run: (a, actor) => cx().mutation(api.performance.dailyTasksUpdate, { ...a, createdBy: actor }),
    log: (a) => ({ eventType: 'performance.task_updated', summary: 'Objectif mis à jour', entityType: 'setter_task', entityId: String(a.id) }),
  },

  // ───────────── Devis ─────────────
  { name: 'devis_list', description: 'Liste les devis.', inputSchema: obj({}), run: () => cx().query(api.devis.listDevis, {}) },
  { name: 'devis_get', description: 'Récupère un devis par id.', inputSchema: obj({ id: Sx.string }, ['id']), run: (a) => cx().query(api.devis.getDevis, { id: a.id }) },
  {
    name: 'devis_create', description: 'Crée un devis. titre requis ; source, lignes[{description,quantite,unite,prixUnitaire,tvaRate}], notes, statut, contact_id/name/email/phone, adresse_client.',
    inputSchema: obj({ titre: Sx.string, source: Sx.string, lignes: { type: 'array', items: { type: 'object' } }, notes: Sx.string, statut: Sx.string, contact_id: Sx.string, contact_name: Sx.string, contact_email: Sx.string, contact_phone: Sx.string, adresse_client: Sx.string }, ['titre']),
    run: (a) => cx().mutation(api.devis.createDevis, { titre: a.titre, source: a.source ?? 'agent', lignes: a.lignes, notes: a.notes, statut: a.statut, contact_id: a.contact_id, contact_name: a.contact_name, contact_email: a.contact_email, contact_phone: a.contact_phone, adresse_client: a.adresse_client }),
    log: (a, r) => ({ eventType: 'devis.created', summary: `Devis : ${a.titre}`, entityType: 'devis', entityId: String(r) }),
  },
  {
    name: 'devis_update', description: 'Met à jour un devis. id requis + updates{titre,lignes,notes,statut,contact_name,contact_email,contact_phone,ville,date_validite,adresse_chantier,adresse_client}.',
    inputSchema: obj({ id: Sx.string, updates: { type: 'object' } }, ['id', 'updates']),
    run: (a) => cx().mutation(api.devis.updateDevis, { id: a.id, updates: a.updates ?? {} }),
    log: (a) => ({ eventType: 'devis.updated', summary: 'Devis mis à jour', entityType: 'devis', entityId: a.id }),
  },
  {
    name: 'devis_delete', description: 'Supprime un devis. id requis.',
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.devis.deleteDevis, { id: a.id }),
    log: (a) => ({ eventType: 'devis.deleted', summary: 'Devis supprimé', entityType: 'devis', entityId: a.id }),
  },

  // ───────────── Media buyer (cockpit Meta) ─────────────
  { name: 'media_buyer_board', description: "Board média Meta. level optionnel (creative|adset|campaign).", inputSchema: obj({ level: Sx.string }), run: (a) => cx().query(api.mediaBuyer.board, { level: a.level }) },
  {
    name: 'media_buyer_upsert', description: "Crée/maj une métrique d'annonce. level+name+spend requis ; id pour update ; campaign,adset,roas,cpa,ctr,hookRate,frequency,results,verdictOverride(scale|watch|kill).",
    inputSchema: obj({ id: Sx.string, level: Sx.string, name: Sx.string, campaign: Sx.string, adset: Sx.string, thumbUrl: Sx.string, periodFrom: Sx.string, periodTo: Sx.string, spend: Sx.number, roas: Sx.number, cpa: Sx.number, ctr: Sx.number, hookRate: Sx.number, frequency: Sx.number, results: Sx.number, verdictOverride: Sx.string, source: Sx.string }, ['level', 'name', 'spend']),
    run: (a) => cx().mutation(api.mediaBuyer.upsert, { id: a.id || undefined, level: a.level, name: a.name, campaign: a.campaign, adset: a.adset, thumbUrl: a.thumbUrl, periodFrom: a.periodFrom, periodTo: a.periodTo, spend: a.spend, roas: a.roas, cpa: a.cpa, ctr: a.ctr, hookRate: a.hookRate, frequency: a.frequency, results: a.results, verdictOverride: a.verdictOverride, source: a.source ?? 'agent' }),
    log: (a) => ({ eventType: 'media_buyer.upserted', summary: `Métrique Meta : ${a.name}`, entityType: 'meta_ad_metrics' }),
  },
  {
    name: 'media_buyer_remove', description: "Désactive une métrique (soft). id requis.",
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.mediaBuyer.remove, { id: a.id }),
    log: (a) => ({ eventType: 'media_buyer.removed', summary: 'Métrique Meta retirée', entityType: 'meta_ad_metrics', entityId: a.id }),
  },

  // ───────────── Onboarding ─────────────
  { name: 'onboarding_list', description: 'Liste les onboardings clients.', inputSchema: obj({}), run: () => cx().query(api.onboarding.list, {}) },
  { name: 'onboarding_get_by_contact', description: "Onboarding d'un contact. contactId requis.", inputSchema: obj({ contactId: Sx.string }, ['contactId']), run: (a) => cx().query(api.onboarding.getByContact, { contactId: a.contactId }) },
  { name: 'onboarding_payments_overview', description: "Tour de contrôle paiements (échéances + remboursements, encaissé/attente).", inputSchema: obj({}), run: () => cx().query(api.onboarding.paymentsOverview, {}) },
  {
    name: 'onboarding_save_progress', description: "Crée/maj l'onboarding (paiements, étapes). token requis ; name, contactId, state (objet complet, inclut payment.amounts/paidStatus/paidDates/refunds).",
    inputSchema: obj({ token: Sx.string, name: Sx.string, contactId: Sx.string, state: { type: 'object' } }, ['token', 'state']),
    run: (a) => cx().mutation(api.onboarding.saveProgress, { token: a.token, name: a.name, contactId: a.contactId, state: a.state ?? {} }),
    log: (a) => ({ eventType: 'onboarding.saved', summary: `Onboarding maj : ${a.name ?? a.contactId ?? a.token}`, entityType: 'onboarding' }),
  },

  // ───────────── Closing / confirmation ─────────────
  { name: 'closing_upcoming_calls', description: "Calls à venir (prép R1/R2). scope optionnel: today|week|all.", inputSchema: obj({ scope: Sx.string }), run: (a) => cx().query(api.closing.upcomingCalls, { scope: a.scope }) },
  {
    name: 'closing_save_call_note', description: "Note de prép d'un call. id (os_sales_calls) requis ; notes, nextStep.",
    inputSchema: obj({ id: Sx.string, notes: Sx.string, nextStep: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.closing.saveCallNote, { id: a.id, notes: a.notes, nextStep: a.nextStep }),
    log: (a) => ({ eventType: 'closing.note_saved', summary: 'Note de call enregistrée', entityType: 'sales_call', entityId: a.id }),
  },
  { name: 'confirmation_list_for_contact', description: "Soumissions formulaire de confirmation d'un contact. contactId ou email.", inputSchema: obj({ contactId: Sx.string, email: Sx.string }), run: (a) => cx().query(api.confirmationIntake.listForContact, { contactId: a.contactId || undefined, email: a.email || undefined }) },
  {
    name: 'confirmation_create', description: "Enregistre une soumission de confirmation (auto-lien contact par email). fullName requis ; email,company,companyType,headcount,monthlyRevenue,costliestFunction,repetitiveCost,whyNow,timing,budget.",
    inputSchema: obj({ fullName: Sx.string, email: Sx.string, company: Sx.string, companyType: Sx.string, headcount: Sx.string, monthlyRevenue: Sx.string, costliestFunction: Sx.string, repetitiveCost: Sx.string, whyNow: Sx.string, timing: Sx.string, budget: Sx.string }, ['fullName']),
    run: (a) => cx().mutation(api.confirmationIntake.create, { fullName: a.fullName, email: a.email, company: a.company, companyType: a.companyType, headcount: a.headcount, monthlyRevenue: a.monthlyRevenue, costliestFunction: a.costliestFunction, repetitiveCost: a.repetitiveCost, whyNow: a.whyNow, timing: a.timing, budget: a.budget }),
    log: (a, r) => ({ eventType: 'confirmation.created', summary: `Confirmation : ${a.fullName}`, entityType: 'confirmation_intake', entityId: String((r as { id?: string })?.id ?? '') }),
  },
  {
    name: 'confirmation_link', description: "Lie une soumission de confirmation à un contact. id + contactId requis.",
    inputSchema: obj({ id: Sx.string, contactId: Sx.string }, ['id', 'contactId']),
    run: (a) => cx().mutation(api.confirmationIntake.linkToContact, { id: a.id, contactId: a.contactId }),
    log: (a) => ({ eventType: 'confirmation.linked', summary: 'Confirmation liée au contact', entityType: 'confirmation_intake', entityId: a.id }),
  },

  // ───────────── État COO global enrichi ─────────────
  {
    name: 'dataos_state', description: "Vue COO complète du Data OS : agents, tâches (ouvertes/bloquées/dues), activités récentes, leads actifs par étape, leads stagnants, R1/R2 à relancer, clients actifs, paiements en attente, candidats mémoire, risques, prochaines actions recommandées.",
    inputSchema: obj({}),
    run: async () => {
      const c = cx()
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [tasks, activities, agents, leads, clients, knowledge, callsSum, followups, pay, prospSum, prospList] = await Promise.all([
        c.query(api.osTasks.list, {}) as any, c.query(api.osActivities.list, { limit: 25 }) as any, c.query(api.osAgents.list, {}) as any,
        c.query(api.crm_leads.list) as any, c.query(api.pipeline_clients.list, {}) as any, c.query(api.osKnowledge.list, {}) as any,
        c.query(api.osSalesCalls.summary, {}) as any, c.query(api.osOutreach.followupDue, {}) as any,
        c.query(api.paiement.overview, { from: '2020-01-01', to: today }).catch(() => null) as any,
        c.query(api.osProspection.summary, {}).catch(() => null) as any, c.query(api.osProspection.list, {}).catch(() => []) as any,
      ])
      const now = Date.now(); const days = (d?: string) => d ? (now - new Date(d).getTime()) / 86400000 : 0
      const openLeads = leads.filter((l: { status: string }) => l.status === 'open')
      const leadsByStage: Record<string, number> = {}; openLeads.forEach((l: { stageId: string }) => { leadsByStage[l.stageId] = (leadsByStage[l.stageId] ?? 0) + 1 })
      const staleLeads = openLeads.filter((l: { createdAt?: string }) => days(l.createdAt) > 14)
      const r1r2 = openLeads.filter((l: { stageId: string; createdAt?: string }) => ['r1', 'r2'].includes(l.stageId) && days(l.createdAt) > 3)
      const openTasks = tasks.filter((t: { status: string }) => t.status === 'todo' || t.status === 'in_progress')
      const blockedTasks = tasks.filter((t: { status: string }) => t.status === 'blocked')
      const candidates = knowledge.filter((k: { status: string }) => k.status === 'to_validate')
      const risks = knowledge.filter((k: { kind: string }) => k.kind === 'risk')

      const nextActions: string[] = []
      if (blockedTasks.length) nextActions.push(`Débloquer ${blockedTasks.length} tâche(s) bloquée(s)`)
      if (followups.length) nextActions.push(`${followups.length} relance(s) outreach à faire`)
      if (r1r2.length) nextActions.push(`Relancer ${r1r2.length} lead(s) en R1/R2 (>3j)`)
      if (staleLeads.length) nextActions.push(`${staleLeads.length} lead(s) stagnant(s) (>14j) à traiter`)
      if ((pay?.attente ?? 0) > 0) nextActions.push(`Paiements en attente : ${Math.round(pay.attente)} €`)
      if (candidates.length) nextActions.push(`${candidates.length} entrée(s) mémoire à valider`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const staleProsp = (prospList as any[]).filter(p => days(p.updatedAt) > 7)
      if ((prospSum?.callbacksScheduled ?? 0) > 0) nextActions.push(`${prospSum.callbacksScheduled} rappel(s) prospection prévus`)
      if (staleProsp.length) nextActions.push(`${staleProsp.length} carte(s) prospection inactives (>7j)`)

      return {
        prospection: prospSum ? { activeCount: (prospList as unknown[]).length, conversations: prospSum.activeConversations, followUpsDue: prospSum.callbacksScheduled, r1BookedToday: prospSum.r1BookedToday, hotLeads: prospSum.hotLeads, stale: staleProsp.length } : null,
        agents,
        tasks: { open: openTasks.length, blocked: blockedTasks.length, openList: openTasks.slice(0, 10), blockedList: blockedTasks },
        recentActivities: activities.slice(0, 15),
        activeLeads: openLeads.length, leadsByStage,
        staleLeads: staleLeads.map((l: { _id: string; name: string; stageId: string }) => ({ id: l._id, name: l.name, stage: l.stageId })),
        r1r2ToFollowUp: r1r2.map((l: { _id: string; name: string; stageId: string }) => ({ id: l._id, name: l.name, stage: l.stageId })),
        activeClients: clients.length,
        salesCalls: callsSum,
        outreachFollowupsDue: followups.length,
        paymentsPending: pay?.attente ?? 0, caEncaisse: pay?.encaisse ?? 0,
        memoryCandidates: candidates.slice(0, 10).map((k: { _id: string; title: string; kind: string }) => ({ id: k._id, title: k.title, kind: k.kind })),
        topRisks: risks.slice(0, 5).map((k: { _id: string; title: string }) => ({ id: k._id, title: k.title })),
        nextRecommendedActions: nextActions,
      }
    },
  },
]

// ── Auth par agent (token Bearer → identité + scopes) ───────────────────────
// Break-glass humain : Bearer == HERMES_API_SECRET → accès complet (console humaine).
// Sinon : hash du Bearer → resolveAgent (scopes effectifs). deny-by-default.
type Auth =
  | { kind: 'anon' }
  | { kind: 'invalid' }
  | { kind: 'human'; actor: string }
  | { kind: 'agent'; tokenHash: string; actor: string; scopes: Set<string>; approvalScopes: Set<string> }

function bearerOf(req: NextRequest): string {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.headers.get('x-hermes-secret') ?? ''
}

async function resolveAuth(req: NextRequest): Promise<Auth> {
  const bearer = bearerOf(req)
  if (!bearer) return { kind: 'anon' }
  const secret = process.env.HERMES_API_SECRET
  if (secret && bearer === secret) return { kind: 'human', actor: 'human:breakglass' }
  const tokenHash = createHash('sha256').update(bearer).digest('hex')
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await cx().query(api.agentGuard.resolveAgent, { tokenHash }) as any
    if (!r?.ok) return { kind: 'invalid' }
    return { kind: 'agent', tokenHash, actor: `agent:${r.agent.slug}`, scopes: new Set<string>(r.scopes), approvalScopes: new Set<string>(r.approvalScopes) }
  } catch { return { kind: 'invalid' } }
}

const riskOf = (verb: string) => (verb === 'read' || verb === 'write' || verb === 'heartbeat') ? 'low' : (['move', 'action', 'assign'].includes(verb) ? 'medium' : 'high')

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-hermes-secret, mcp-protocol-version, mcp-session-id' }
const jres = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcOk = (id: any, result: unknown) => ({ jsonrpc: '2.0', id, result })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcErr = (id: any, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
const textResult = (data: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(data ?? { ok: true }, null, 2) }] })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dispatch(msg: any, auth: Auth): Promise<unknown | null> {
  const { id, method, params } = msg ?? {}
  if (method === 'initialize') return rpcOk(id, { protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: "API opérationnelle du VividFlow Data OS. Authentification par token agent (Bearer) ; permissions/scopes par agent, deny-by-default. Les actions sensibles renvoient {status:'pending'} sans modifier les données. Appeler dataos_state avant de répondre. Contacts = source de vérité." })
  if (method === 'ping') return rpcOk(id, {})
  if (typeof method === 'string' && method.startsWith('notifications/')) return null
  if (method === 'tools/list') return rpcOk(id, { tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) })
  if (method === 'tools/call') {
    const tool = TOOLS.find(t => t.name === params?.name)
    if (!tool) return rpcErr(id, -32602, `Unknown tool: ${params?.name}`)
    if (auth.kind === 'anon' || auth.kind === 'invalid') return rpcErr(id, -32001, 'Unauthorized: token agent requis')
    const args = params?.arguments ?? {}

    // Break-glass humain : exécution directe, tracée comme humain.
    if (auth.kind === 'human') {
      try {
        const result = await tool.run(args, auth.actor)
        if (tool.log) { try { await logAct(cx(), 'human', auth.actor, tool.log(args, result)) } catch { /* ignore */ } }
        return rpcOk(id, textResult(result))
      } catch (e) { return rpcOk(id, { isError: true, ...textResult(`Erreur: ${String(e)}`) }) }
    }

    // Agent : deny-by-default → scope → approval/forbidden/execute.
    const need = requiredScopeForCall(tool.name, args)
    if (!need) {
      await cx().mutation(api.agentGuard.logDenied, { tokenHash: auth.tokenHash, tool: tool.name, requiredScope: 'unmapped' }).catch(() => {})
      return rpcErr(id, -32003, `Forbidden: outil non autorisé (non mappé)`)
    }
    const [moduleName, verb] = need.scope.split(':')
    let forceApproval = false
    if (need.criticalKnowledge && tool.name === 'knowledge_approve') {
      // Fail-closed : sans id, ou si la lecture échoue, ou si la connaissance est
      // critique (rule|decision) → on exige l'approbation humaine.
      if (!args.id) forceApproval = true
      else {
        try { const doc = await cx().query(api.osKnowledge.get, { id: args.id }) as { kind?: string } | null; if (!doc || doc.kind === 'rule' || doc.kind === 'decision') forceApproval = true } catch { forceApproval = true }
      }
    }
    const decision = decide(auth.scopes, auth.approvalScopes, need.scope, forceApproval)
    if (decision === 'forbidden') {
      await cx().mutation(api.agentGuard.logDenied, { tokenHash: auth.tokenHash, tool: tool.name, requiredScope: need.scope }).catch(() => {})
      return rpcErr(id, -32003, `Forbidden: scope « ${need.scope} » requis`)
    }
    if (decision === 'approval') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await cx().mutation(api.agentGuard.createPendingApproval, { tokenHash: auth.tokenHash, tool: tool.name, module: moduleName, verb, payload: args, riskLevel: riskOf(verb) }) as any
      return rpcOk(id, textResult({ status: 'pending', approvalId: r.approvalId, message: 'Action sensible : en attente de validation humaine/COO. Aucune donnée modifiée.' }))
    }
    // execute
    try {
      const result = await tool.run(args, auth.actor)
      const meta = tool.log ? tool.log(args, result) : undefined
      await cx().mutation(api.agentGuard.logToolUse, { tokenHash: auth.tokenHash, tool: tool.name, module: moduleName, verb, riskLevel: riskOf(verb), entityType: meta?.entityType, entityId: meta?.entityId, summary: meta?.summary }).catch(() => {})
      return rpcOk(id, textResult(result))
    } catch (e) {
      await cx().mutation(api.agentGuard.logToolUse, { tokenHash: auth.tokenHash, tool: tool.name, module: moduleName, verb, failed: true, summary: String(e).slice(0, 160) }).catch(() => {})
      return rpcOk(id, { isError: true, ...textResult(`Erreur: ${String(e)}`) })
    }
  }
  if (id === undefined) return null
  return rpcErr(id, -32601, `Method not found: ${method}`)
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return jres(rpcErr(null, -32700, 'Parse error'), 400) }
  const auth = await resolveAuth(req)
  if (Array.isArray(body)) { const out = (await Promise.all(body.map(m => dispatch(m, auth)))).filter(Boolean); return out.length ? jres(out) : new NextResponse(null, { status: 202, headers: CORS }) }
  const res = await dispatch(body, auth)
  return res ? jres(res) : new NextResponse(null, { status: 202, headers: CORS })
}

export async function GET() { return jres({ server: SERVER_INFO, protocol: PROTOCOL_VERSION, transport: 'streamable-http', toolCount: TOOLS.length, tools: TOOLS.map(t => t.name) }) }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }
