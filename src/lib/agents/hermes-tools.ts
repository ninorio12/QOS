import type Anthropic from '@anthropic-ai/sdk'

export const HERMES_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Créer une tâche pour un agent (ops, doc, kai, soren, mia)',
    input_schema: {
      type: 'object',
      properties: {
        title:    { type: 'string', description: 'Titre de la tâche' },
        agent:    { type: 'string', enum: ['ops', 'doc', 'kai', 'soren', 'mia'] },
        priority: { type: 'number', description: '0=normal, 1=haute, 2=urgente', default: 0 },
        context:  { type: 'object', description: 'Contexte additionnel' },
      },
      required: ['title', 'agent'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lister les tâches par statut et/ou agent',
    input_schema: {
      type: 'object',
      properties: {
        col:   { type: 'string', enum: ['todo', 'inprogress', 'done', 'error'] },
        agent: { type: 'string' },
      },
    },
  },
  {
    name: 'read_knowledge',
    description: 'Lire un document KB (ou lister tous si pas de slug)',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug du doc. Omit pour lister.' },
      },
    },
  },
  {
    name: 'upsert_knowledge',
    description: 'Créer ou mettre à jour un document KB',
    input_schema: {
      type: 'object',
      properties: {
        slug:    { type: 'string' },
        title:   { type: 'string' },
        content: { type: 'string', description: 'Contenu markdown' },
      },
      required: ['slug', 'title', 'content'],
    },
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
    name: 'query_contacts',
    description: 'Chercher des contacts dans le CRM',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'query_pipeline',
    description: 'Récupérer les opportunités ouvertes dans le pipeline',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'trigger_workflow',
    description: 'Déclencher un workflow GHL sur un contact',
    input_schema: {
      type: 'object',
      properties: {
        contactId:  { type: 'string' },
        workflowId: { type: 'string' },
      },
      required: ['contactId', 'workflowId'],
    },
  },
  {
    name: 'list_workflows',
    description: 'Lister les workflows GHL disponibles',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'read_agent_logs',
    description: "Lire les logs d'activité des agents",
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string' },
        level: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'send_reply',
    description: 'Envoyer une réponse à Thomas via Telegram',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
]
