# Hermes & Agents Autonomes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer Hermes (bot Telegram) + 2 agents autonomes (Ops, Doc) qui lisent des tâches Supabase, les exécutent sur GHL/contacts/KB, et loguent chaque action — sans intervention humaine.

**Architecture:** Hermes reçoit les messages Telegram de Thomas et orchestre via Supabase. Un cron Vercel toutes les 2 minutes lit les tâches `col='todo'` pour les agents `ops` et `doc`, les exécute via la boucle agentic Anthropic, et écrit les résultats dans `agent_logs`. Les UIs TachesView, LogsView, KnowledgeView sont mises à jour pour afficher ces données réelles.

**Tech Stack:** Next.js 14 App Router, TypeScript, Anthropic SDK (claude-haiku-4-5-20251001), Supabase admin client, GHL REST API, Telegram Bot API, Vercel Cron.

---

## Fichiers

### Créer
- `supabase/migrations/20260420_hermes.sql`
- `src/lib/agents/hermes-tools.ts`
- `src/lib/agents/ops-tools.ts`
- `src/lib/agents/doc-tools.ts`
- `src/lib/agents/executor.ts`
- `src/app/api/telegram/hermes/route.ts`
- `src/app/api/agent-executor/route.ts`
- `src/app/api/agent-logs/route.ts`
- `src/app/api/knowledge/docs/route.ts`

### Modifier
- `src/lib/agents/tools.ts` — ajouter 16 nouveaux cas dans `executeTool` + mettre à jour la signature
- `src/lib/agents/runner.ts` — ajouter agents 'ops' et 'doc'
- `vercel.json` — ajouter cron
- `src/components/taches/TachesView.tsx` — ops/doc dans AGENT_META + log drawer
- `src/components/logs/LogsView.tsx` — données réelles Supabase
- `src/components/knowledge/KnowledgeView.tsx` — onglet KB docs

---

### Task 1 — SQL Migration

**Files:**
- Create: `supabase/migrations/20260420_hermes.sql`

- [ ] **Step 1 : Créer le fichier SQL**

```sql
-- supabase/migrations/20260420_hermes.sql

-- Table agent_logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent           text NOT NULL,
  level           text NOT NULL DEFAULT 'info',
  message         text NOT NULL,
  tool_used       text,
  tool_input      jsonb,
  tool_output     jsonb,
  created_at      timestamptz DEFAULT now(),
  organization_id uuid
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task_id    ON agent_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);

-- Table knowledge_docs
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  content         text NOT NULL,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text DEFAULT 'system',
  organization_id uuid
);

-- Étendre agent_tasks
ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS priority    int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS result      text,
  ADD COLUMN IF NOT EXISTS context     jsonb DEFAULT '{}';
```

- [ ] **Step 2 : Exécuter dans Supabase Dashboard**

Aller dans Supabase Dashboard → SQL Editor → coller et exécuter.

- [ ] **Step 3 : Commit**

```bash
rtk git add supabase/migrations/20260420_hermes.sql
rtk git commit -m "feat: SQL migration agent_logs + knowledge_docs + alter agent_tasks"
```

---

### Task 2 — Extend tools.ts (nouveaux outils partagés)

**Files:**
- Modify: `src/lib/agents/tools.ts`

- [ ] **Step 1 : Mettre à jour la signature de `executeTool`**

Ligne 196. Remplacer :
```typescript
export async function executeTool(
  toolName: string,
  input: ToolInput,
  creds: GHLCreds,
  orgId: string | null,
): Promise<ToolResult> {
```
Par :
```typescript
export async function executeTool(
  toolName: string,
  input: ToolInput,
  creds: GHLCreds,
  orgId: string | null,
  agentId?: string,
  chatId?: string,
): Promise<ToolResult> {
```

- [ ] **Step 2 : Ajouter les 16 nouveaux cas dans le switch**

Avant `default:` (ligne 360), ajouter :

```typescript
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
```

- [ ] **Step 3 : Vérifier que le build TypeScript passe**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 4 : Commit**

```bash
rtk git add src/lib/agents/tools.ts
rtk git commit -m "feat: add 16 new tool cases (GHL workflows, KB, logs, hermes) to executeTool"
```

---

### Task 3 — Créer hermes-tools.ts, ops-tools.ts, doc-tools.ts

**Files:**
- Create: `src/lib/agents/hermes-tools.ts`
- Create: `src/lib/agents/ops-tools.ts`
- Create: `src/lib/agents/doc-tools.ts`

- [ ] **Step 1 : Créer hermes-tools.ts**

```typescript
// src/lib/agents/hermes-tools.ts
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
    description: 'Lire les logs d\'activité des agents',
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
```

- [ ] **Step 2 : Créer ops-tools.ts**

```typescript
// src/lib/agents/ops-tools.ts
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
    description: 'Mettre à jour une opportunité dans le pipeline',
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
    description: 'Mettre à jour les informations d\'un contact GHL',
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
    description: 'Écrire un log d\'étape dans agent_logs',
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
```

- [ ] **Step 3 : Créer doc-tools.ts**

```typescript
// src/lib/agents/doc-tools.ts
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
    description: 'Analyser l\'état du pipeline pour les rapports',
    input_schema: { type: 'object', properties: { pipelineId: { type: 'string' } } },
  },
  {
    name: 'write_task_log',
    description: 'Écrire un log d\'étape dans agent_logs',
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
```

- [ ] **Step 4 : Commit**

```bash
rtk git add src/lib/agents/hermes-tools.ts src/lib/agents/ops-tools.ts src/lib/agents/doc-tools.ts
rtk git commit -m "feat: tool definitions for Hermes, OPS, and DOC agents"
```

---

### Task 4 — Extend runner.ts (agents ops + doc)

**Files:**
- Modify: `src/lib/agents/runner.ts`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer la ligne 8 :
```typescript
import { KAI_TOOLS, SOREN_TOOLS, MIA_TOOLS, executeTool } from './tools'
```
Par :
```typescript
import { KAI_TOOLS, SOREN_TOOLS, MIA_TOOLS, executeTool } from './tools'
import { OPS_TOOLS } from './ops-tools'
import { DOC_TOOLS } from './doc-tools'
```

- [ ] **Step 2 : Ajouter les system prompts OPS et DOC**

Dans `SYSTEM_PROMPTS`, après le prompt `mia`, ajouter :
```typescript
  ops: `Tu es Agent OPS, un agent opérationnel autonome de Qorpo IA.
Tu exécutes des tâches liées au CRM, pipeline et workflows GHL.

WORKFLOW OBLIGATOIRE pour chaque tâche :
1. Appelle read_knowledge pour charger le contexte métier avant d'agir
2. Exécute la tâche avec les outils disponibles
3. Appelle write_task_log à chaque étape importante
4. Appelle complete_task avec un résumé de ce que tu as fait
5. Appelle send_telegram si la tâche révèle une info critique pour Thomas

RÈGLES :
- Lis toujours la KB en premier (slug: directives-contact si disponible)
- Log chaque action via write_task_log (level: info/success/warning/error)
- Si la tâche est ambiguë : complete_task avec status='error' et explication`,

  doc: `Tu es Agent DOC, un agent documentaire autonome de Qorpo IA.
Tu maintiens la base de connaissance et génères des rapports.

WORKFLOW OBLIGATOIRE :
1. Lis la tâche attentivement
2. Si création/mise à jour KB : génère le contenu markdown structuré et utilise upsert_knowledge
3. Si rapport/synthèse : query_supabase pour récupérer les données, génère le rapport, stocke-le via upsert_knowledge et envoie-le via send_telegram
4. write_task_log à chaque étape
5. complete_task avec résumé

RÈGLES :
- Les docs KB doivent être en markdown, avec un titre H1 et des sections claires
- Les rapports envoyés via Telegram doivent être concis (< 300 mots)
- Slug KB = kebab-case, ex: tarifs-peinture-2026, rapport-hebdo-semaine-17`,
```

- [ ] **Step 3 : Mettre à jour TOOLS_BY_AGENT**

Remplacer le bloc `TOOLS_BY_AGENT`:
```typescript
const TOOLS_BY_AGENT: Record<string, Anthropic.Tool[]> = {
  soren: SOREN_TOOLS,
  kai:   KAI_TOOLS,
  mia:   MIA_TOOLS,
  ops:   OPS_TOOLS,
  doc:   DOC_TOOLS,
}
```

- [ ] **Step 4 : Mettre à jour le type AgentId et la signature de runAgent**

Remplacer la ligne 59 :
```typescript
export async function runAgent(
  agentId: 'soren' | 'kai' | 'mia',
```
Par :
```typescript
export type AgentId = 'soren' | 'kai' | 'mia' | 'ops' | 'doc'

export async function runAgent(
  agentId: AgentId,
```

- [ ] **Step 5 : Passer agentId à executeTool dans la boucle**

Dans la boucle `for (const toolUse of toolUseBlocks)`, remplacer :
```typescript
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        creds,
        orgId,
      )
```
Par :
```typescript
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        creds,
        orgId,
        agentId,
      )
```

- [ ] **Step 6 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 7 : Commit**

```bash
rtk git add src/lib/agents/runner.ts
rtk git commit -m "feat: add ops and doc agents to runner with system prompts"
```

---

### Task 5 — Créer executor.ts

**Files:**
- Create: `src/lib/agents/executor.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/lib/agents/executor.ts
/**
 * Logique d'exécution autonome des agents :
 * - runHermes : traite un message Telegram entrant
 * - executeAgentTask : exécute une tâche agent_tasks pour ops/doc
 */

import Anthropic from '@anthropic-ai/sdk'
import { HERMES_TOOLS } from './hermes-tools'
import { executeTool } from './tools'
import { runAgent } from './runner'
import { env } from '@/lib/env'
import type { GHLCreds } from '@/lib/ghl'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type AgentTask = {
  id: string
  title: string
  agent: 'ops' | 'doc'
  col: string
  priority?: number
  context?: Record<string, unknown>
  organization_id?: string | null
}

export type ExecutionResult = {
  taskId: string
  agentId: string
  response: string
  toolsUsed: string[]
  tokensUsed: number
}

// ─── System prompt Hermes ────────────────────────────────────────────

const HERMES_SYSTEM = `Tu es Hermes, l'assistant COO de Thomas chez Qorpo IA.
Tu reçois des instructions de Thomas via Telegram et tu les exécutes.

Tu peux :
- Créer des tâches pour les agents Ops, Doc, Kai, Soren, Mia
- Consulter le pipeline, les contacts, les logs d'agents
- Lire et mettre à jour la base de connaissance (docs markdown)
- Déclencher des workflows GHL
- Répondre avec des synthèses sur l'activité

Règles :
- Toujours confirmer ce que tu as fait via send_reply
- Pour les questions → réponds avec les données réelles (query Supabase/GHL)
- Pour les actions → exécute et confirme
- Format réponses : concis, en français, avec des emojis clés

Exemples de commandes de Thomas :
"Crée une tâche pour ops : vérifier les leads non contactés"
"Montre-moi les tâches en cours"
"Met à jour la KB 'tarifs' avec : tarif peinture = 35€/m2"
"Combien d'opportunités ouvertes ?"
"Trigger le workflow Relance-7j pour le contact ID abc123"`

// ─── Hermes ──────────────────────────────────────────────────────────

export async function runHermes(text: string, chatId: string): Promise<void> {
  const creds: GHLCreds = { apiKey: env.ghlApiKey(), locationId: env.ghlLocationId() }

  let currentMessages: Anthropic.MessageParam[] = [
    { role: 'user', content: text },
  ]

  for (let turn = 0; turn < 8; turn++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     HERMES_SYSTEM,
      tools:      HERMES_TOOLS,
      messages:   currentMessages,
    })

    if (response.stop_reason !== 'tool_use') break

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        creds,
        null,
        'hermes',
        chatId,
      )
      toolResults.push({
        type:        'tool_result',
        tool_use_id: toolUse.id,
        content:     JSON.stringify(result),
      })
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ]
  }
}

// ─── Task executor ───────────────────────────────────────────────────

export async function executeAgentTask(task: AgentTask): Promise<ExecutionResult> {
  const creds: GHLCreds = { apiKey: env.ghlApiKey(), locationId: env.ghlLocationId() }

  const userMessage = `TÂCHE ID: ${task.id}
TITRE: ${task.title}
PRIORITÉ: ${task.priority ?? 0}
CONTEXTE: ${JSON.stringify(task.context ?? {})}

Exécute cette tâche. N'oublie pas :
1. Appelle read_knowledge en premier pour charger le contexte métier
2. Logue tes actions via write_task_log(taskId="${task.id}", ...)
3. Finalise avec complete_task(taskId="${task.id}", result="...")`

  const result = await runAgent(
    task.agent,
    userMessage,
    creds,
    task.organization_id ?? null,
  )

  return { taskId: task.id, agentId: task.agent, ...result }
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 3 : Commit**

```bash
rtk git add src/lib/agents/executor.ts
rtk git commit -m "feat: executor.ts with runHermes and executeAgentTask"
```

---

### Task 6 — Webhook Telegram Hermes

**Files:**
- Create: `src/app/api/telegram/hermes/route.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/telegram/hermes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runHermes } from '@/lib/agents/executor'
import type { TelegramUpdate } from '@/lib/telegram'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const update = await req.json() as TelegramUpdate
  const message = update.message
  if (!message?.text) return NextResponse.json({ ok: true })

  // Vérification chat ID Thomas (sécurité)
  const allowedChatId = process.env.HERMES_TELEGRAM_CHAT_ID
  if (allowedChatId && String(message.chat.id) !== allowedChatId) {
    return NextResponse.json({ ok: true })
  }

  // Exécution non-bloquante — on répond à Telegram immédiatement
  const chatId = String(message.chat.id)
  runHermes(message.text, chatId).catch(err =>
    console.error('[Hermes webhook error]', err)
  )

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/api/telegram/hermes/route.ts
rtk git commit -m "feat: Telegram webhook for Hermes at /api/telegram/hermes"
```

---

### Task 7 — Task Executor API Route (cron)

**Files:**
- Create: `src/app/api/agent-executor/route.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/agent-executor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAgentTask, type AgentTask } from '@/lib/agents/executor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Vérification secret (Vercel Cron ou appel manuel)
  const secret = req.nextUrl.searchParams.get('secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_EXECUTOR_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Récupère jusqu'à 3 tâches 'todo' pour ops/doc
  const { data: tasks, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('col', 'todo')
    .in('agent', ['ops', 'doc'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) {
    console.error('[agent-executor] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tasks?.length) {
    return NextResponse.json({ executed: 0 })
  }

  const results = []

  for (const task of tasks as AgentTask[]) {
    // Marque inprogress immédiatement (évite double exécution)
    await supabase
      .from('agent_tasks')
      .update({ col: 'inprogress', started_at: new Date().toISOString() })
      .eq('id', task.id)

    try {
      const result = await executeAgentTask(task)
      results.push({ taskId: task.id, status: 'ok', toolsUsed: result.toolsUsed })
    } catch (err) {
      console.error(`[agent-executor] Task ${task.id} failed:`, err)
      // Marque error si l'exécution plante complètement
      await supabase
        .from('agent_tasks')
        .update({
          col:         'error',
          result:      err instanceof Error ? err.message : String(err),
          finished_at: new Date().toISOString(),
        })
        .eq('id', task.id)
      results.push({ taskId: task.id, status: 'error' })
    }
  }

  return NextResponse.json({ executed: results.length, results })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/api/agent-executor/route.ts
rtk git commit -m "feat: agent-executor cron endpoint with task polling and error handling"
```

---

### Task 8 — Agent Logs API Route

**Files:**
- Create: `src/app/api/agent-logs/route.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/agent-logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = req.nextUrl

  const agent  = searchParams.get('agent')
  const level  = searchParams.get('level')
  const taskId = searchParams.get('taskId')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200)

  let query = supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agent)  query = query.eq('agent',   agent)
  if (level)  query = query.eq('level',   level)
  if (taskId) query = query.eq('task_id', taskId)

  const { data, error } = await query

  if (error) return NextResponse.json({ logs: [] })
  return NextResponse.json({ logs: data ?? [] })
}
```

- [ ] **Step 2 : Commit**

```bash
rtk git add src/app/api/agent-logs/route.ts
rtk git commit -m "feat: GET /api/agent-logs with agent/level/taskId/limit filters"
```

---

### Task 9 — Knowledge Docs API Route

**Files:**
- Create: `src/app/api/knowledge/docs/route.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/knowledge/docs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/knowledge/docs → list all
// GET /api/knowledge/docs?slug=xxx → get one
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const slug = req.nextUrl.searchParams.get('slug')

  if (slug) {
    const { data, error } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) return NextResponse.json({ doc: null })
    return NextResponse.json({ doc: data })
  }

  const { data } = await supabase
    .from('knowledge_docs')
    .select('id, slug, title, updated_at, updated_by')
    .order('updated_at', { ascending: false })

  return NextResponse.json({ docs: data ?? [] })
}

// POST /api/knowledge/docs → upsert { slug, title, content }
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json() as { slug: string; title: string; content: string; updated_by?: string }

  const { data, error } = await supabase
    .from('knowledge_docs')
    .upsert({
      slug:       body.slug,
      title:      body.title,
      content:    body.content,
      updated_by: body.updated_by ?? 'thomas',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doc: data })
}

// DELETE /api/knowledge/docs → delete by slug in body
export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { error } = await supabase.from('knowledge_docs').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: slug })
}
```

- [ ] **Step 2 : Commit**

```bash
rtk git add src/app/api/knowledge/docs/route.ts
rtk git commit -m "feat: GET/POST/DELETE /api/knowledge/docs for KB CRUD"
```

---

### Task 10 — Vercel Cron

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1 : Mettre à jour vercel.json**

Remplacer le contenu actuel par :
```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "regions": ["cdg1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://qos.vercel.app"
  },
  "crons": [
    {
      "path": "/api/agent-executor",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

Note: Le cron Vercel envoie un header `Authorization: Bearer <VERCEL_CRON_SECRET>`. La route vérifie déjà ce header via `req.headers.get('authorization')`. Ajouter dans Vercel Dashboard : `AGENT_EXECUTOR_SECRET` = la valeur de `VERCEL_CRON_SECRET` (ou une valeur custom).

- [ ] **Step 2 : Commit**

```bash
rtk git add vercel.json
rtk git commit -m "feat: Vercel Cron every 2 minutes targeting /api/agent-executor"
```

---

### Task 11 — TachesView UI (ops/doc + log drawer)

**Files:**
- Modify: `src/components/taches/TachesView.tsx`

- [ ] **Step 1 : Étendre les types et AGENT_META**

Remplacer la ligne 8 :
```typescript
type AgentId   = 'soren' | 'kai' | 'mia'
```
Par :
```typescript
type AgentId   = 'soren' | 'kai' | 'mia' | 'ops' | 'doc'
```

Remplacer le bloc `AGENT_META` :
```typescript
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren: { label: 'Soren', color: '#4A91A8', bg: '#4A91A815' },
  kai:   { label: 'Kai',   color: '#1A5C38', bg: '#1A5C3815' },
  mia:   { label: 'Mia',   color: '#E8836A', bg: '#E8836A15' },
  ops:   { label: 'Ops',   color: '#7C3AED', bg: '#7C3AED15' },
  doc:   { label: 'Doc',   color: '#0F766E', bg: '#0F766E15' },
}
```

- [ ] **Step 2 : Étendre AGENTS_FILTER**

Remplacer :
```typescript
const AGENTS_FILTER: { id: AgentId | 'all'; label: string }[] = [
  { id: 'all',   label: 'Tous' },
  { id: 'soren', label: 'Soren' },
  { id: 'kai',   label: 'Kai' },
  { id: 'mia',   label: 'Mia' },
]
```
Par :
```typescript
const AGENTS_FILTER: { id: AgentId | 'all'; label: string }[] = [
  { id: 'all',   label: 'Tous' },
  { id: 'soren', label: 'Soren' },
  { id: 'kai',   label: 'Kai' },
  { id: 'mia',   label: 'Mia' },
  { id: 'ops',   label: 'Ops' },
  { id: 'doc',   label: 'Doc' },
]
```

- [ ] **Step 3 : Ajouter le type AgentLog et le composant LogDrawer**

Après le composant `KanbanCol` (ligne 195), ajouter :

```typescript
// ─── Types logs ───────────────────────────────────────────────
type AgentLog = {
  id: string
  agent: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  tool_used: string | null
  created_at: string
}

const LOG_LEVEL_COLOR: Record<string, string> = {
  info: '#8896AB', success: '#22c55e', warning: '#F59E0B', error: '#EF4444',
}

// ─── Log drawer ───────────────────────────────────────────────
function LogDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agent-logs?taskId=${task.id}&limit=50`)
      .then(r => r.json())
      .then((d: { logs: AgentLog[] }) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [task.id])

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-[#E5E7EB] shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE] flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#111111] truncate">{task.title}</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Logs d&apos;exécution</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#F5F5F0] flex items-center justify-center ml-2 flex-shrink-0">
          <X size={13} className="text-[#6B7280]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-[#9CA3AF]">Chargement…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-[#9CA3AF]">Aucun log pour cette tâche</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {logs.map((log, i) => (
              <div key={log.id} className="relative px-4 py-2.5 border-b border-[#F9FAFB] last:border-0">
                {/* Timeline dot */}
                <div className="absolute left-4 top-3.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: LOG_LEVEL_COLOR[log.level] ?? '#8896AB' }} />
                {i < logs.length - 1 && (
                  <div className="absolute left-[18px] top-5 bottom-0 w-px bg-[#F3F4F6]" />
                )}
                <div className="pl-4">
                  <p className="text-[11px] text-[#374151] leading-tight">{log.message}</p>
                  {log.tool_used && (
                    <p className="text-[9px] font-mono text-[#9CA3AF] mt-0.5">{log.tool_used}</p>
                  )}
                  <p className="text-[9px] text-[#C8CBD0] mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4 : Ajouter l'état selectedTask et le drawer dans TachesView**

Dans `TachesView`, après `const [showModal, setShowModal]` (ligne 204), ajouter :
```typescript
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
```

À la fin du JSX, avant la fermeture de la div principale, avant `{showModal && ...}`, ajouter :
```typescript
      {selectedTask && <LogDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />}
```

- [ ] **Step 5 : Connecter le clic sur TaskCard au drawer**

Mettre à jour la signature de `TaskCard` :
```typescript
function TaskCard({ task, onMove, onSelect }: { task: Task; onMove: (id: string, col: ColId) => void; onSelect: (task: Task) => void }) {
```

Ajouter `onClick={() => onSelect(task)}` sur la div racine de `TaskCard` :
```typescript
    <div
      onClick={() => onSelect(task)}
      className={`border rounded-lg px-3 py-2 flex flex-col gap-1 select-none transition-all group cursor-pointer ${
```

Mettre à jour l'appel dans `KanbanCol` :
```typescript
function KanbanCol({ colId, tasks, onMove, onSelect }: { colId: ColId; tasks: Task[]; onMove: (id: string, col: ColId) => void; onSelect: (task: Task) => void }) {
```

Et dans le mapping :
```typescript
          {tasks.map(t => <TaskCard key={t.id} task={t} onMove={onMove} onSelect={onSelect} />)}
```

Et dans `KanbanCol` dans le board :
```typescript
              <KanbanCol key={colId} colId={colId}
                tasks={filtered.filter(t => t.col === colId)}
                onMove={moveTask}
                onSelect={setSelectedTask}
              />
```

- [ ] **Step 6 : Ajouter ops/doc dans AddTaskModal**

Dans `AddTaskModal`, remplacer :
```typescript
          {(['soren', 'kai', 'mia'] as AgentId[]).map(a => {
```
Par :
```typescript
          {(['soren', 'kai', 'mia', 'ops', 'doc'] as AgentId[]).map(a => {
```

- [ ] **Step 7 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 8 : Commit**

```bash
rtk git add src/components/taches/TachesView.tsx
rtk git commit -m "feat: TachesView — add ops/doc agents + log drawer on task click"
```

---

### Task 12 — LogsView UI (données réelles Supabase)

**Files:**
- Modify: `src/components/logs/LogsView.tsx`

- [ ] **Step 1 : Mettre à jour les types**

Remplacer les deux premières lignes de types :
```typescript
type AgentId  = 'soren' | 'kai' | 'mia'
type LogLevel = 'info' | 'success' | 'error' | 'warning'
```
Par :
```typescript
type AgentId  = 'soren' | 'kai' | 'mia' | 'ops' | 'doc' | 'hermes'
type LogLevel = 'info' | 'success' | 'error' | 'warning'
```

Et le type `LogEntry` :
```typescript
type LogEntry = {
  id: string
  time: string
  agent: AgentId
  level: LogLevel
  message: string
  detail?: string
  tool_used?: string | null
  created_at?: string
}
```

- [ ] **Step 2 : Étendre AGENT_META**

Remplacer :
```typescript
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren: { label: 'Soren', color: '#4A91A8', bg: '#4A91A815' },
  kai:   { label: 'Kai',   color: '#1A5C38', bg: '#1A5C3815' },
  mia:   { label: 'Mia',   color: '#E8836A', bg: '#E8836A15' },
}
```
Par :
```typescript
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren:  { label: 'Soren',  color: '#4A91A8', bg: '#4A91A815' },
  kai:    { label: 'Kai',    color: '#1A5C38', bg: '#1A5C3815' },
  mia:    { label: 'Mia',    color: '#E8836A', bg: '#E8836A15' },
  ops:    { label: 'Ops',    color: '#7C3AED', bg: '#7C3AED15' },
  doc:    { label: 'Doc',    color: '#0F766E', bg: '#0F766E15' },
  hermes: { label: 'Hermes', color: '#1D4ED8', bg: '#1D4ED815' },
}
```

- [ ] **Step 3 : Étendre AGENT_OPTIONS**

Remplacer :
```typescript
const AGENT_OPTIONS: { id: AgentFilter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'soren', label: 'Soren' }, { id: 'kai', label: 'Kai' }, { id: 'mia', label: 'Mia' },
]
```
Par :
```typescript
const AGENT_OPTIONS: { id: AgentFilter; label: string }[] = [
  { id: 'all',    label: 'Tous' },
  { id: 'soren',  label: 'Soren' },
  { id: 'kai',    label: 'Kai' },
  { id: 'mia',    label: 'Mia' },
  { id: 'ops',    label: 'Ops' },
  { id: 'doc',    label: 'Doc' },
  { id: 'hermes', label: 'Hermes' },
]
```

- [ ] **Step 4 : Remplacer la logique de fetch par les données réelles**

Dans `LogsView`, remplacer :
```typescript
  const [logs, setLogs] = useState<LogEntry[]>(SEED_LOGS)
```
Par :
```typescript
  const [logs, setLogs] = useState<LogEntry[]>(SEED_LOGS)
  const [realLoaded, setRealLoaded] = useState(false)
```

Après les useEffects existants, ajouter un useEffect pour charger les vraies données :

```typescript
  // Charger les vrais logs Supabase
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res  = await fetch('/api/agent-logs?limit=100')
        const data = await res.json() as { logs: { id: string; agent: string; level: string; message: string; tool_used?: string | null; created_at: string }[] }
        if (data.logs && data.logs.length > 0) {
          const mapped: LogEntry[] = data.logs.map(l => ({
            id:       l.id,
            time:     new Date(l.created_at).toLocaleTimeString('fr-FR'),
            agent:    (l.agent as AgentId) in AGENT_META ? (l.agent as AgentId) : 'kai',
            level:    (['info', 'success', 'warning', 'error'].includes(l.level) ? l.level : 'info') as LogLevel,
            message:  l.message,
            detail:   l.tool_used ?? undefined,
            tool_used: l.tool_used,
            created_at: l.created_at,
          }))
          setLogs(mapped)
          setRealLoaded(true)
        }
      } catch { /* fallback sur SEED_LOGS */ }
    }
    void fetchLogs()
    // Polling toutes les 10s si liveMode
    const interval = setInterval(() => { if (liveMode) void fetchLogs() }, 10000)
    return () => clearInterval(interval)
  }, [liveMode])
```

- [ ] **Step 5 : Désactiver le générateur de logs fake quand données réelles disponibles**

Remplacer dans le useEffect du live generator :
```typescript
  useEffect(() => {
    if (!liveMode) return
```
Par :
```typescript
  useEffect(() => {
    if (!liveMode || realLoaded) return
```

- [ ] **Step 6 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 7 : Commit**

```bash
rtk git add src/components/logs/LogsView.tsx
rtk git commit -m "feat: LogsView — load real agent_logs from Supabase with 10s polling"
```

---

### Task 13 — KnowledgeView UI (onglet Base de connaissance)

**Files:**
- Modify: `src/components/knowledge/KnowledgeView.tsx`

- [ ] **Step 1 : Ajouter types et state pour KB docs**

Après les imports existants, ajouter le type :
```typescript
type KBDoc = {
  id: string
  slug: string
  title: string
  content?: string
  updated_at: string
  updated_by: string
}
```

Dans `KnowledgeView`, après `const [scraping, setScraping]`, ajouter :
```typescript
  const [kbDocs, setKbDocs]           = useState<KBDoc[]>([])
  const [kbSelected, setKbSelected]   = useState<KBDoc | null>(null)
  const [kbEditing, setKbEditing]     = useState(false)
  const [kbContent, setKbContent]     = useState('')
  const [kbSaving, setKbSaving]       = useState(false)
  const [kbLoadingDoc, setKbLoadingDoc] = useState(false)
  const [showKb, setShowKb]           = useState(false)
```

- [ ] **Step 2 : Fetch la liste KB au mount**

Après l'useEffect du fetch company settings, ajouter :
```typescript
  useEffect(() => {
    fetch('/api/knowledge/docs')
      .then(r => r.json())
      .then((d: { docs: KBDoc[] }) => setKbDocs(d.docs ?? []))
      .catch(() => {})
  }, [])
```

- [ ] **Step 3 : Ajouter les fonctions KB**

```typescript
  async function loadKbDoc(doc: KBDoc) {
    setKbLoadingDoc(true)
    setKbEditing(false)
    try {
      const res  = await fetch(`/api/knowledge/docs?slug=${doc.slug}`)
      const data = await res.json() as { doc: KBDoc }
      const full = data.doc ?? doc
      setKbSelected(full)
      setKbContent(full.content ?? '')
    } finally {
      setKbLoadingDoc(false)
    }
  }

  async function saveKbDoc() {
    if (!kbSelected) return
    setKbSaving(true)
    try {
      await fetch('/api/knowledge/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: kbSelected.slug, title: kbSelected.title, content: kbContent, updated_by: 'thomas' }),
      })
      setKbDocs(prev => prev.map(d => d.slug === kbSelected.slug ? { ...d, content: kbContent, updated_at: new Date().toISOString() } : d))
      setKbSelected(prev => prev ? { ...prev, content: kbContent } : prev)
      setKbEditing(false)
    } finally {
      setKbSaving(false)
    }
  }
```

- [ ] **Step 4 : Ajouter le bouton "Base de connaissance" dans la sidebar**

Dans la sidebar (après le bouton "Commun"), ajouter :
```tsx
        <div className="border-t border-[#F3F4F6] my-2" />
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-2 pb-1">Agents autonomes</p>

        <button
          onClick={() => { setShowKb(true); setKbSelected(null); setKbEditing(false) }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${showKb ? 'bg-[#F5F6F3]' : 'hover:bg-[#F9FAF8]'}`}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#7C3AED]/10">
            <Database size={15} className="text-[#7C3AED]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111111] leading-none">Base de connaissance</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">{kbDocs.length} documents</p>
          </div>
          {showKb && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" />}
        </button>
```

Also update the `selectAgent` and `selectCommun` functions to set `setShowKb(false)`.

- [ ] **Step 5 : Ajouter la vue KB dans le main panel**

Après la section `{selection.type === 'commun' && (...)}`, ajouter :

```tsx
        {/* ── BASE DE CONNAISSANCE ── */}
        {showKb && (
          <>
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#111111]">Base de connaissance</h2>
                <p className="text-xs text-[#9CA3AF]">{kbDocs.length} documents · mis à jour par Hermes et les agents</p>
              </div>
              {kbSelected && !kbEditing && (
                <button
                  onClick={() => setKbEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#111111] text-white hover:bg-[#333] transition-colors"
                >
                  <Pencil size={12} />
                  Modifier
                </button>
              )}
              {kbEditing && (
                <button
                  onClick={saveKbDoc}
                  disabled={kbSaving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: '#E2FF8D', color: '#111111' }}
                >
                  <Save size={12} />
                  {kbSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              )}
            </div>

            <div className="flex flex-1 gap-3 min-h-0">
              {/* Doc list */}
              <div className="w-48 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
                {kbDocs.length === 0 && (
                  <p className="text-xs text-[#9CA3AF] px-2">Aucun document</p>
                )}
                {kbDocs.map(doc => (
                  <button
                    key={doc.slug}
                    onClick={() => loadKbDoc(doc)}
                    className={`text-left px-3 py-2.5 rounded-xl transition-all ${kbSelected?.slug === doc.slug ? 'bg-[#F5F6F3]' : 'hover:bg-[#F9FAF8]'}`}
                  >
                    <p className="text-xs font-semibold text-[#111111] truncate">{doc.title}</p>
                    <p className="text-[9px] text-[#9CA3AF] mt-0.5 truncate">
                      {doc.updated_by} · {new Date(doc.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </button>
                ))}
              </div>

              {/* Doc viewer/editor */}
              <div className="flex-1 bg-white rounded-2xl overflow-hidden min-h-0">
                {!kbSelected ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-[#9CA3AF]">Sélectionnez un document</p>
                  </div>
                ) : kbLoadingDoc ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-[#9CA3AF]">Chargement…</p>
                  </div>
                ) : kbEditing ? (
                  <textarea
                    value={kbContent}
                    onChange={e => setKbContent(e.target.value)}
                    className="w-full h-full bg-white text-xs text-[#374151] font-mono leading-6 p-5 outline-none resize-none border-2 border-[#E2FF8D] rounded-2xl"
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <div className="h-full p-5 overflow-y-auto">
                    <pre className="text-xs text-[#374151] font-mono leading-6 whitespace-pre-wrap">
                      {kbSelected.content ?? 'Contenu non chargé'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
```

- [ ] **Step 6 : S'assurer que selectAgent et selectCommun désactivent showKb**

Dans `selectAgent` (ligne ~233), ajouter `setShowKb(false)` au début.
Dans `selectCommun` (ligne ~241), ajouter `setShowKb(false)` au début.

- [ ] **Step 7 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected: no errors

- [ ] **Step 8 : Commit**

```bash
rtk git add src/components/knowledge/KnowledgeView.tsx
rtk git commit -m "feat: KnowledgeView — add KB docs tab with list/view/edit via /api/knowledge/docs"
```

---

## Résumé des étapes manuelles pour Thomas

Après déploiement Vercel :

1. **Exécuter le SQL** dans Supabase Dashboard → SQL Editor (contenu de `supabase/migrations/20260420_hermes.sql`)

2. **Configurer le webhook Hermes** (une seule fois) :
   ```
   https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook?url=https://qos.vercel.app/api/telegram/hermes
   ```

3. **Ajouter les env vars** dans Vercel Dashboard :
   - `HERMES_TELEGRAM_CHAT_ID` = ton chat ID Telegram (visible dans les logs Vercel au premier message)
   - `AGENT_EXECUTOR_SECRET` = même valeur que `VERCEL_CRON_SECRET` (ou une valeur custom)

4. **Redéployer** pour activer le cron.
