import type Anthropic from '@anthropic-ai/sdk'

export const OPS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_leads',
    description: 'Lire la liste des leads/contacts récents dans le CRM',
    input_schema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } },
  },
  {
    name: 'contact_lookup',
    description: 'Rechercher un contact par nom, email ou téléphone',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'update_opportunity',
    description: "Mettre à jour une opportunité dans le pipeline",
    input_schema: {
      type: 'object',
      properties: {
        opportunityId:   { type: 'string' },
        status:          { type: 'string', enum: ['open', 'won', 'lost', 'abandoned'] },
        pipelineStageId: { type: 'string' },
        monetaryValue:   { type: 'number' },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'update_contact',
    description: "Mettre à jour les informations d'un contact GHL",
    input_schema: {
      type: 'object',
      properties: {
        contactId:   { type: 'string' },
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
    description: 'Créer une nouvelle tâche pour un agent',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        agent: { type: 'string' },
        human: { type: 'boolean', default: false },
      },
      required: ['title', 'agent'],
    },
  },
  {
    name: 'list_workflows',
    description: 'Lister les workflows GHL disponibles',
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
    name: 'pause_workflow',
    description: 'Stopper un workflow GHL sur un contact',
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
    name: 'read_knowledge',
    description: 'Lire un document KB (obligatoire au début de chaque tâche)',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Slug du doc. Omit pour lister.' } },
    },
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
    description: 'Marquer la tâche comme terminée avec un résumé',
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
    description: 'Notifier Thomas via Telegram si info critique',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
  {
    name: 'create_contact_note',
    description: 'Ajouter une note sur un contact dans GHL',
    input_schema: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        body:      { type: 'string' },
      },
      required: ['contactId', 'body'],
    },
  },
]
