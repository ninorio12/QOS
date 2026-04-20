/**
 * Outils agents — définitions Anthropic SDK + exécuteurs
 * Chaque outil appelle les API routes internes du SaaS.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { ghlFetchWith, ghlMutateWith, type GHLCreds } from '@/lib/ghl'
import { sendTelegram } from '@/lib/telegram'

export type ToolInput = Record<string, unknown>
export type ToolResult = { success: boolean; data?: unknown; error?: string }

// ─── Définitions des outils (format Anthropic) ───────────────────────────────

export const KAI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'contact_lookup',
    description: 'Rechercher des contacts dans le CRM par nom, téléphone ou email',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nom, email ou téléphone à rechercher' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_leads',
    description: 'Lire la liste des leads/contacts récents dans le CRM',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre de contacts à récupérer (max 50)', default: 20 },
      },
    },
  },
  {
    name: 'update_opportunity',
    description: 'Mettre à jour le statut ou l\'étape d\'une opportunité dans le pipeline',
    input_schema: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'ID de l\'opportunité GHL' },
        status:        { type: 'string', description: 'Nouveau statut: open, won, lost, abandoned' },
        pipelineStageId: { type: 'string', description: 'Nouvel ID d\'étape de pipeline' },
        monetaryValue:   { type: 'number', description: 'Valeur monétaire mise à jour' },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'create_task',
    description: 'Créer une tâche pour un agent ou humain dans le tableau de bord',
    input_schema: {
      type: 'object',
      properties: {
        title:  { type: 'string', description: 'Titre de la tâche' },
        agent:  { type: 'string', description: 'Agent assigné: kai, soren, mia' },
        human:  { type: 'boolean', description: 'Vrai si la tâche nécessite une intervention humaine' },
      },
      required: ['title', 'agent'],
    },
  },
  {
    name: 'send_whatsapp',
    description: 'Envoyer un message WhatsApp à un contact',
    input_schema: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'Numéro de téléphone avec indicatif (+33...)' },
        message: { type: 'string', description: 'Contenu du message à envoyer' },
      },
      required: ['phone', 'message'],
    },
  },
  {
    name: 'log_interaction',
    description: 'Enregistrer une interaction avec un lead dans la mémoire de l\'agent',
    input_schema: {
      type: 'object',
      properties: {
        leadId:   { type: 'string', description: 'ID du contact GHL' },
        type:     { type: 'string', description: 'Type d\'interaction: qualification, relance, rdv, devis' },
        outcome:  { type: 'string', description: 'Résultat: qualifié, non-qualifié, en-attente, rdv-booké' },
        metadata: { type: 'object', description: 'Données supplémentaires (budget, type travaux, etc.)' },
      },
      required: ['leadId', 'type', 'outcome'],
    },
  },
]

export const SOREN_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_leads',
    description: 'Lire la liste des leads et contacts dans le CRM',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre de contacts (max 50)', default: 20 },
      },
    },
  },
  {
    name: 'analyze_pipeline',
    description: 'Analyser l\'état du pipeline commercial : opportunités par étape, valeur totale, tendances',
    input_schema: {
      type: 'object',
      properties: {
        pipelineId: { type: 'string', description: 'ID du pipeline à analyser (optionnel)' },
      },
    },
  },
  {
    name: 'get_dashboard',
    description: 'Récupérer les métriques clés du dashboard : leads actifs, valeur pipeline, conversions',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_task',
    description: 'Créer une tâche dans le système',
    input_schema: {
      type: 'object',
      properties: {
        title:  { type: 'string', description: 'Titre de la tâche' },
        agent:  { type: 'string', description: 'Agent assigné: kai, soren, mia' },
        human:  { type: 'boolean', description: 'Nécessite intervention humaine' },
      },
      required: ['title', 'agent'],
    },
  },
  {
    name: 'get_tasks',
    description: 'Voir les tâches en cours des agents',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'send_telegram',
    description: 'Envoyer un message proactif à Thomas via Telegram (alertes, rapports, notifications urgentes)',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message à envoyer à Thomas' },
      },
      required: ['message'],
    },
  },
]

export const MIA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_knowledge',
    description: 'Chercher dans la base de connaissance de l\'entreprise',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question ou sujet à rechercher' },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_contact',
    description: 'Mettre à jour les informations d\'un contact dans le CRM',
    input_schema: {
      type: 'object',
      properties: {
        contactId:   { type: 'string', description: 'ID du contact GHL' },
        firstName:   { type: 'string' },
        lastName:    { type: 'string' },
        email:       { type: 'string' },
        phone:       { type: 'string' },
        companyName: { type: 'string' },
        tags:        { type: 'array', items: { type: 'string' } },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'create_task',
    description: 'Créer une tâche dans le système',
    input_schema: {
      type: 'object',
      properties: {
        title:  { type: 'string' },
        agent:  { type: 'string' },
        human:  { type: 'boolean' },
      },
      required: ['title', 'agent'],
    },
  },
]

// ─── Exécuteurs des outils ────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  input: ToolInput,
  creds: GHLCreds,
  orgId: string | null,
  agentId?: string,
  chatId?: string,
): Promise<ToolResult> {
  try {
    switch (toolName) {

      case 'read_leads': {
        const limit = Math.min((input.limit as number) ?? 20, 50)
        const data = await ghlFetchWith(
          `/contacts/?locationId=${creds.locationId}&limit=${limit}`,
          creds
        )
        const contacts = (data.contacts ?? []).map((c: Record<string, unknown>) => ({
          id:          c.id,
          name:        c.contactName,
          firstName:   c.firstName,
          lastName:    c.lastName,
          email:       c.email,
          phone:       c.phone,
          company:     c.companyName,
          tags:        c.tags,
          dateAdded:   c.dateAdded,
        }))
        return { success: true, data: { contacts, total: contacts.length } }
      }

      case 'contact_lookup': {
        const query = String(input.query ?? '')
        const data = await ghlFetchWith(
          `/contacts/?locationId=${creds.locationId}&query=${encodeURIComponent(query)}&limit=10`,
          creds
        )
        return { success: true, data: { contacts: data.contacts ?? [] } }
      }

      case 'update_opportunity': {
        const { opportunityId, ...updates } = input as { opportunityId: string; [k: string]: unknown }
        await ghlMutateWith(`/opportunities/${opportunityId}`, 'PUT', updates, creds)
        return { success: true, data: { updated: opportunityId } }
      }

      case 'analyze_pipeline': {
        const pipelineId = input.pipelineId as string | undefined
        let url = `/opportunities/search?location_id=${creds.locationId}&limit=100`
        if (pipelineId) url += `&pipeline_id=${pipelineId}`
        const data = await ghlFetchWith(url, creds)
        const opps = (data.opportunities ?? []) as Record<string, unknown>[]
        const totalValue = opps.reduce((s, o) => s + ((o.monetaryValue as number) ?? 0), 0)
        const byStage: Record<string, { count: number; value: number }> = {}
        opps.forEach(o => {
          const stage = String(o.pipelineStageId ?? 'unknown')
          if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 }
          byStage[stage].count++
          byStage[stage].value += (o.monetaryValue as number) ?? 0
        })
        return { success: true, data: { totalOpportunities: opps.length, totalValue, byStage } }
      }

      case 'get_dashboard': {
        const supabase = createAdminClient()
        const data = await ghlFetchWith(
          `/opportunities/search?location_id=${creds.locationId}&limit=50`,
          creds
        )
        const opps = data.opportunities ?? []
        return {
          success: true,
          data: {
            activeLeads: opps.filter((o: Record<string, unknown>) => o.status === 'open').length,
            pipelineValue: opps.reduce((s: number, o: Record<string, unknown>) => s + ((o.monetaryValue as number) ?? 0), 0),
            wonDeals: opps.filter((o: Record<string, unknown>) => o.status === 'won').length,
          },
        }
      }

      case 'create_task': {
        const supabase = createAdminClient()
        const { data, error } = await supabase
          .from('agent_tasks')
          .insert({
            title:           String(input.title),
            agent:           String(input.agent),
            col:             'todo',
            human:           Boolean(input.human),
            organization_id: orgId,
          })
          .select()
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data: { task: data } }
      }

      case 'get_tasks': {
        const supabase = createAdminClient()
        const query = supabase
          .from('agent_tasks')
          .select('*')
          .neq('col', 'done')
          .order('created_at', { ascending: false })
          .limit(20)
        const { data } = orgId
          ? await query.eq('organization_id', orgId)
          : await query
        return { success: true, data: { tasks: data ?? [] } }
      }

      case 'send_whatsapp': {
        const { phone, message } = input as { phone: string; message: string }
        if (!phone || !message) return { success: false, error: 'phone et message requis' }
        // Log dans agent_interactions sans envoyer réellement (Twilio requis)
        const supabase = createAdminClient()
        await supabase.from('agent_interactions').insert({
          agent: 'kai', type: 'whatsapp_sent', lead_id: phone,
          outcome: 'sent', metadata: { phone, message },
          organization_id: orgId,
        })
        return { success: true, data: { sent: true, phone, preview: message.slice(0, 50) } }
      }

      case 'log_interaction': {
        const supabase = createAdminClient()
        const { data, error } = await supabase
          .from('agent_interactions')
          .insert({
            agent:           'kai',
            lead_id:         String(input.leadId),
            type:            String(input.type),
            outcome:         String(input.outcome),
            metadata:        input.metadata ?? {},
            organization_id: orgId,
          })
          .select()
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data: { logged: true, id: data.id } }
      }

      case 'search_knowledge': {
        const supabase = createAdminClient()
        const query = String(input.query ?? '')
        const { data } = await supabase
          .from('agent_memory')
          .select('key, value')
          .ilike('key', `%${query}%`)
          .limit(5)
        return { success: true, data: { results: data ?? [] } }
      }

      case 'update_contact': {
        const { contactId, ...fields } = input as { contactId: string; [k: string]: unknown }
        await ghlMutateWith(`/contacts/${contactId}`, 'PUT', fields, creds)
        return { success: true, data: { updated: contactId } }
      }

      case 'send_telegram': {
        const telegramChatId = process.env.TELEGRAM_CHAT_ID
        if (!telegramChatId) return { success: false, error: 'TELEGRAM_CHAT_ID non configuré' }
        const message = String(input.message ?? '')
        const ok = await sendTelegram(telegramChatId, message)
        return { success: ok, data: { sent: ok } }
      }

      // ── GHL Workflows ────────────────────────────────────────────

      case 'list_workflows': {
        const data = await ghlFetchWith(
          `/workflows/?locationId=${creds.locationId}`,
          creds
        )
        const workflows = (data.workflows ?? []).map((w: Record<string, unknown>) => ({
          id: w.id, name: w.name, status: w.status,
        }))
        return { success: true, data: { workflows } }
      }

      case 'trigger_workflow': {
        const { contactId, workflowId } = input as { contactId: string; workflowId: string }
        await ghlMutateWith(`/contacts/${contactId}/workflow/${workflowId}`, 'POST', {}, creds)
        return { success: true, data: { triggered: true, contactId, workflowId } }
      }

      case 'pause_workflow': {
        const { contactId, workflowId } = input as { contactId: string; workflowId: string }
        await ghlMutateWith(`/contacts/${contactId}/workflow/${workflowId}`, 'DELETE', null, creds)
        return { success: true, data: { paused: true, contactId, workflowId } }
      }

      case 'create_contact_note': {
        const { contactId, body } = input as { contactId: string; body: string }
        await ghlMutateWith(`/contacts/${contactId}/notes`, 'POST', { body }, creds)
        return { success: true, data: { created: true, contactId } }
      }

      // ── Knowledge Base ────────────────────────────────────────────

      case 'read_knowledge': {
        const supabase = createAdminClient()
        const slug = input.slug as string | undefined
        if (slug) {
          const { data } = await supabase
            .from('knowledge_docs')
            .select('*')
            .eq('slug', slug)
            .single()
          return { success: true, data: data ?? null }
        }
        const { data } = await supabase
          .from('knowledge_docs')
          .select('slug, title, updated_at, updated_by')
          .order('updated_at', { ascending: false })
        return { success: true, data: { docs: data ?? [] } }
      }

      case 'list_knowledge': {
        const supabase = createAdminClient()
        const { data } = await supabase
          .from('knowledge_docs')
          .select('slug, title, updated_at, updated_by')
          .order('updated_at', { ascending: false })
        return { success: true, data: { docs: data ?? [] } }
      }

      case 'upsert_knowledge': {
        const supabase = createAdminClient()
        const { slug, title, content } = input as { slug: string; title: string; content: string }
        const { error } = await supabase
          .from('knowledge_docs')
          .upsert({
            slug,
            title,
            content,
            updated_by: agentId ?? 'system',
            updated_at:  new Date().toISOString(),
          }, { onConflict: 'slug' })
        if (error) return { success: false, error: error.message }
        return { success: true, data: { upserted: slug } }
      }

      case 'delete_knowledge': {
        const supabase = createAdminClient()
        const { slug } = input as { slug: string }
        const { error } = await supabase
          .from('knowledge_docs')
          .delete()
          .eq('slug', slug)
        if (error) return { success: false, error: error.message }
        return { success: true, data: { deleted: slug } }
      }

      // ── Logs & Task control ───────────────────────────────────────

      case 'write_task_log': {
        const supabase = createAdminClient()
        const { taskId, message, level, toolUsed } = input as {
          taskId: string; message: string; level?: string; toolUsed?: string
        }
        const { error } = await supabase.from('agent_logs').insert({
          task_id:         taskId || null,
          agent:           agentId ?? 'system',
          level:           level ?? 'info',
          message,
          tool_used:       toolUsed ?? null,
          organization_id: orgId,
        })
        if (error) return { success: false, error: error.message }
        return { success: true, data: { logged: true } }
      }

      case 'complete_task': {
        const supabase = createAdminClient()
        const { taskId, result, status } = input as { taskId: string; result: string; status?: string }
        const { error } = await supabase
          .from('agent_tasks')
          .update({
            col:         status ?? 'done',
            result,
            finished_at: new Date().toISOString(),
          })
          .eq('id', taskId)
        if (error) return { success: false, error: error.message }
        return { success: true, data: { completed: taskId, status: status ?? 'done' } }
      }

      // ── Hermes-specific ───────────────────────────────────────────

      case 'list_tasks': {
        const supabase = createAdminClient()
        let query = supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(20)
        if (input.col)   query = query.eq('col',   input.col   as string)
        if (input.agent) query = query.eq('agent', input.agent as string)
        const { data } = await query
        return { success: true, data: { tasks: data ?? [] } }
      }

      case 'query_contacts': {
        const q = String(input.query ?? '')
        const limit = Math.min((input.limit as number) ?? 10, 20)
        const data = await ghlFetchWith(
          `/contacts/?locationId=${creds.locationId}&query=${encodeURIComponent(q)}&limit=${limit}`,
          creds
        )
        return { success: true, data: { contacts: data.contacts ?? [] } }
      }

      case 'query_pipeline': {
        const data = await ghlFetchWith(
          `/opportunities/search?location_id=${creds.locationId}&limit=50&status=open`,
          creds
        )
        const opps = (data.opportunities ?? []) as Record<string, unknown>[]
        const total = opps.reduce((s, o) => s + ((o.monetaryValue as number) ?? 0), 0)
        return { success: true, data: { count: opps.length, totalValue: total, opportunities: opps.slice(0, 10) } }
      }

      case 'read_agent_logs': {
        const supabase = createAdminClient()
        const limit = Math.min((input.limit as number) ?? 20, 50)
        let query = supabase
          .from('agent_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (input.agent) query = query.eq('agent', input.agent as string)
        if (input.level) query = query.eq('level', input.level as string)
        const { data } = await query
        return { success: true, data: { logs: data ?? [] } }
      }

      case 'send_reply': {
        const text = String(input.text ?? '')
        const targetId = chatId ?? process.env.HERMES_TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID
        if (!targetId) return { success: false, error: 'Chat ID non configuré' }
        const ok = await sendTelegram(targetId, text)
        return { success: ok, data: { sent: ok } }
      }

      case 'query_supabase': {
        const supabase = createAdminClient()
        const allowed = ['agent_tasks', 'agent_logs', 'knowledge_docs']
        const table = String(input.table ?? '')
        if (!allowed.includes(table)) return { success: false, error: `Table non autorisée: ${table}` }
        const limit = Math.min((input.limit as number) ?? 20, 50)
        let query = supabase.from(table).select('*').limit(limit)
        const filters = (input.filters ?? {}) as Record<string, unknown>
        for (const [k, v] of Object.entries(filters)) {
          query = query.eq(k, v as string)
        }
        const { data, error } = await query
        if (error) return { success: false, error: error.message }
        return { success: true, data: { rows: data ?? [] } }
      }

      default:
        return { success: false, error: `Outil inconnu: ${toolName}` }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
