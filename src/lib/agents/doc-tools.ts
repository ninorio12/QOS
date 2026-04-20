import type Anthropic from '@anthropic-ai/sdk'

export const DOC_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_knowledge',
    description: 'Lire un document KB',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Slug. Omit pour lister.' } },
    },
  },
  {
    name: 'upsert_knowledge',
    description: 'Créer ou mettre à jour un document KB en markdown',
    input_schema: {
      type: 'object',
      properties: {
        slug:    { type: 'string', description: 'kebab-case, ex: tarifs-peinture-2026' },
        title:   { type: 'string' },
        content: { type: 'string', description: 'Contenu markdown complet' },
      },
      required: ['slug', 'title', 'content'],
    },
  },
  {
    name: 'list_knowledge',
    description: 'Lister tous les documents KB (slug, title, updated_at)',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'delete_knowledge',
    description: 'Supprimer un document KB',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'query_supabase',
    description: 'SELECT en lecture seule dans Supabase (tables autorisées: agent_tasks, agent_logs, knowledge_docs)',
    input_schema: {
      type: 'object',
      properties: {
        table:   { type: 'string', enum: ['agent_tasks', 'agent_logs', 'knowledge_docs'] },
        filters: { type: 'object', description: 'key=value filters (optionnel)' },
        limit:   { type: 'number', default: 20 },
      },
      required: ['table'],
    },
  },
  {
    name: 'read_leads',
    description: 'Lire les contacts CRM pour les rapports',
    input_schema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } },
  },
  {
    name: 'analyze_pipeline',
    description: "Analyser l'état du pipeline pour les rapports",
    input_schema: { type: 'object', properties: { pipelineId: { type: 'string' } } },
  },
  {
    name: 'write_task_log',
    description: "Écrire un log d'étape dans agent_logs",
    input_schema: {
      type: 'object',
      properties: {
        taskId:   { type: 'string' },
        message:  { type: 'string' },
        level:    { type: 'string', enum: ['info', 'success', 'warning', 'error'], default: 'info' },
        toolUsed: { type: 'string' },
      },
      required: ['taskId', 'message'],
    },
  },
  {
    name: 'complete_task',
    description: 'Finaliser la tâche avec un résumé',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        result: { type: 'string' },
        status: { type: 'string', enum: ['done', 'error'], default: 'done' },
      },
      required: ['taskId', 'result'],
    },
  },
  {
    name: 'send_telegram',
    description: 'Envoyer le rapport ou alerte à Thomas',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
]
