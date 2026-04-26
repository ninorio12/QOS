# Hermes & Agents Autonomes — Spec Complète

## Goal

Déployer un système agentique complet : Hermes (bot Telegram) orchestre deux agents IA autonomes (Ops, Doc) qui lisent les tâches dans Supabase, les exécutent sur le SaaS (GHL, contacts, pipeline, KB, workflows), et écrivent leurs logs — sans intervention humaine.

## Architecture

```
Thomas
  │  Telegram message
  ▼
HERMES (/api/telegram/hermes)
  │  Claude Haiku + hermes_tools
  │  Crée tâches • Query Supabase • Update KB • Trigger agents
  ▼
Supabase
  ├── agent_tasks     (existant + colonnes étendues)
  ├── agent_logs      (nouveau)
  └── knowledge_docs  (nouveau)
  ▼
TASK EXECUTOR (/api/agent-executor)
  │  Vercel Cron toutes les 2 minutes
  │  Lit col='todo', agent IN ('ops','doc')
  ├── agent='ops' → Agent OPS (GHL, contacts, pipeline, workflows)
  └── agent='doc' → Agent DOC (KB, reporting, queries)
        │  Les deux agents écrivent dans agent_logs
        │  Mettent à jour agent_tasks col → done/error
        └─→ Notifient Thomas via Telegram si besoin
```

## Tech Stack

Next.js 14 App Router, TypeScript, Anthropic SDK (claude-haiku-4-5-20251001), Supabase (admin client), GHL REST API, Telegram Bot API, Vercel Cron.

---

## Fichiers

### Nouveaux
- `src/app/api/telegram/hermes/route.ts` — webhook Hermes
- `src/app/api/agent-executor/route.ts` — task executor (cron target)
- `src/lib/agents/hermes-tools.ts` — outils Hermes
- `src/lib/agents/ops-tools.ts` — outils Agent OPS
- `src/lib/agents/doc-tools.ts` — outils Agent DOC
- `src/lib/agents/executor.ts` — logique d'exécution autonome
- `supabase/migrations/20260420_hermes.sql` — DDL nouvelles tables

### Modifiés
- `src/lib/agents/tools.ts` — ajouter outils partagés (KB, logs, workflows)
- `src/lib/agents/runner.ts` — ajouter agents 'ops' et 'doc'
- `src/components/taches/TachesView.tsx` — ajouter ops/doc dans AGENT_META + log drawer
- `src/components/logs/LogsView.tsx` — connecter à Supabase agent_logs (remplace seed)
- `vercel.json` — ajouter cron `/api/agent-executor`

---

## Supabase Schema

### Table `agent_logs` (nouvelle)

```sql
CREATE TABLE agent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent           text NOT NULL,          -- 'ops' | 'doc' | 'hermes'
  level           text NOT NULL DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'error'
  message         text NOT NULL,
  tool_used       text,
  tool_input      jsonb,
  tool_output     jsonb,
  created_at      timestamptz DEFAULT now(),
  organization_id uuid
);
CREATE INDEX idx_agent_logs_task_id ON agent_logs(task_id);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);
```

### Table `knowledge_docs` (nouvelle)

```sql
CREATE TABLE knowledge_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,   -- 'tarifs-2026', 'process-devis'
  title           text NOT NULL,
  content         text NOT NULL,          -- markdown
  updated_at      timestamptz DEFAULT now(),
  updated_by      text DEFAULT 'system',  -- 'hermes' | 'thomas' | 'doc'
  organization_id uuid
);
```

### Extension `agent_tasks` (ALTER TABLE)

```sql
ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS priority    int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS result      text,
  ADD COLUMN IF NOT EXISTS context     jsonb DEFAULT '{}';
```

---

## Hermes (/api/telegram/hermes)

### Webhook handler

```typescript
// src/app/api/telegram/hermes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runHermes } from '@/lib/agents/executor'
import type { TelegramUpdate } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const update: TelegramUpdate = await req.json()
  const message = update.message
  if (!message?.text) return NextResponse.json({ ok: true })

  // Vérification chat ID Thomas
  const allowedChatId = process.env.HERMES_TELEGRAM_CHAT_ID
  if (allowedChatId && String(message.chat.id) !== allowedChatId) {
    return NextResponse.json({ ok: true })
  }

  // Exécution non-bloquante
  runHermes(message.text, String(message.chat.id)).catch(console.error)
  return NextResponse.json({ ok: true })
}
```

### Hermes tools (`src/lib/agents/hermes-tools.ts`)

```typescript
export const HERMES_TOOLS: Anthropic.Tool[] = [
  { name: 'create_task',        /* title, agent: 'ops'|'doc'|'kai'|'soren'|'mia', priority? */ },
  { name: 'list_tasks',         /* col?: 'todo'|'inprogress'|'done'|'error', agent? */ },
  { name: 'read_knowledge',     /* slug? — liste tous si absent */ },
  { name: 'upsert_knowledge',   /* slug, title, content */ },
  { name: 'delete_knowledge',   /* slug */ },
  { name: 'query_contacts',     /* limit?, query? */ },
  { name: 'query_pipeline',     /* — retourne opportunités actives */ },
  { name: 'trigger_workflow',   /* contactId, workflowId */ },
  { name: 'list_workflows',     /* — retourne workflows GHL */ },
  { name: 'read_agent_logs',    /* agent?, limit?, level? */ },
  { name: 'send_reply',         /* text — réponse Telegram à Thomas */ },
]
```

### System prompt Hermes

```
Tu es Hermes, l'assistant COO de Thomas chez Qorpo IA.
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
"Trigger le workflow Relance-7j pour le contact ID abc123"
```

---

## Agent OPS

### Tools (`src/lib/agents/ops-tools.ts`)

```typescript
export const OPS_TOOLS: Anthropic.Tool[] = [
  { name: 'read_leads' },           // existant
  { name: 'contact_lookup' },       // existant
  { name: 'update_opportunity' },   // existant
  { name: 'update_contact' },       // existant
  { name: 'create_task' },          // existant
  { name: 'list_workflows' },       // NOUVEAU — GHL workflows
  { name: 'trigger_workflow' },     // NOUVEAU — déclenche workflow sur contact
  { name: 'pause_workflow' },       // NOUVEAU — stop workflow
  { name: 'read_knowledge' },       // NOUVEAU — lit KB avant d'agir
  { name: 'write_task_log' },       // NOUVEAU — écrit dans agent_logs
  { name: 'complete_task' },        // NOUVEAU — marque task done + result
  { name: 'send_telegram' },        // existant — notifie Thomas si nécessaire
  { name: 'create_contact_note' },  // NOUVEAU — ajoute note GHL sur contact
]
```

### System prompt OPS

```
Tu es Agent OPS, un agent opérationnel autonome de Qorpo IA.
Tu exécutes des tâches liées au CRM, pipeline et workflows GHL.

WORKFLOW OBLIGATOIRE pour chaque tâche :
1. Appelle read_knowledge pour charger le contexte métier avant d'agir
2. Exécute la tâche avec les outils disponibles
3. Appelle write_task_log à chaque étape importante
4. Appelle complete_task avec un résumé de ce que tu as fait
5. Appelle send_telegram si la tâche révèle une info critique pour Thomas

RÈGLES :
- Lis toujours la KB en premier
- Log chaque action via write_task_log (level: info/success/warning/error)
- Ne contacte jamais un client sans vérifier la KB 'directives-contact'
- Si la tâche est ambiguë : complete_task avec status='error' et explication
```

---

## Agent DOC

### Tools (`src/lib/agents/doc-tools.ts`)

```typescript
export const DOC_TOOLS: Anthropic.Tool[] = [
  { name: 'read_knowledge' },       // lit un doc KB
  { name: 'upsert_knowledge' },     // crée ou met à jour un doc KB
  { name: 'list_knowledge' },       // liste tous les docs KB
  { name: 'delete_knowledge' },     // supprime un doc KB
  { name: 'query_supabase' },       // NOUVEAU — SELECT générique (read-only)
  { name: 'read_leads' },           // pour les rapports
  { name: 'analyze_pipeline' },     // pour les rapports
  { name: 'write_task_log' },       // log ses actions
  { name: 'complete_task' },        // finalise la tâche
  { name: 'send_telegram' },        // notifie Thomas avec le résultat
]
```

### System prompt DOC

```
Tu es Agent DOC, un agent documentaire autonome de Qorpo IA.
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
- Slug KB = kebab-case, ex: 'tarifs-peinture-2026', 'rapport-hebdo-semaine-17'
```

---

## Task Executor (`/api/agent-executor`)

```typescript
// src/app/api/agent-executor/route.ts
// Appelé par Vercel Cron toutes les 2 minutes

export async function GET(req: NextRequest) {
  // Vérification secret
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.AGENT_EXECUTOR_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Récupère jusqu'à 3 tâches 'todo' pour ops/doc (évite les conflits)
  const supabase = createAdminClient()
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('col', 'todo')
    .in('agent', ['ops', 'doc'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(3)

  if (!tasks?.length) return NextResponse.json({ executed: 0 })

  // Exécute chaque tâche (séquentiel pour éviter les race conditions)
  const results = []
  for (const task of tasks) {
    // Marque inprogress immédiatement
    await supabase.from('agent_tasks')
      .update({ col: 'inprogress', started_at: new Date().toISOString() })
      .eq('id', task.id)

    const result = await executeAgentTask(task)
    results.push(result)
  }

  return NextResponse.json({ executed: results.length, results })
}
```

### Logique executeAgentTask (`src/lib/agents/executor.ts`)

```typescript
export async function executeAgentTask(task: AgentTask): Promise<ExecutionResult> {
  const agentId = task.agent as 'ops' | 'doc'
  const tools   = agentId === 'ops' ? OPS_TOOLS : DOC_TOOLS

  // Message pour l'agent = titre de la tâche + contexte
  const userMessage = `
TÂCHE ID: ${task.id}
TITRE: ${task.title}
PRIORITÉ: ${task.priority ?? 0}
CONTEXTE: ${JSON.stringify(task.context ?? {})}

Exécute cette tâche. N'oublie pas :
1. Appelle read_knowledge en premier
2. Logue tes actions via write_task_log(task_id="${task.id}", ...)
3. Finalise avec complete_task(task_id="${task.id}", result="...")
`

  const result = await runAgent(agentId, userMessage, defaultCreds(), task.organization_id)
  return { taskId: task.id, agentId, ...result }
}
```

---

## Nouveaux outils partagés (à ajouter dans tools.ts)

### GHL Workflow tools

```typescript
// list_workflows
GET /workflows/?locationId={id}
→ { workflows: [{ id, name, status }] }

// trigger_workflow
POST /contacts/{contactId}/workflow/{workflowId}
body: {}

// pause_workflow
DELETE /contacts/{contactId}/workflow/{workflowId}

// create_contact_note
POST /contacts/{contactId}/notes
body: { body: string, userId: string }
```

### Knowledge tools

```typescript
// read_knowledge(slug?)
// Si slug : SELECT WHERE slug = ? / Sinon : SELECT ALL (slug, title, updated_at)
supabase.from('knowledge_docs').select(...)

// upsert_knowledge(slug, title, content)
supabase.from('knowledge_docs').upsert({ slug, title, content, updated_by: agent, updated_at: now() })

// list_knowledge()
supabase.from('knowledge_docs').select('slug, title, updated_at')

// delete_knowledge(slug)
supabase.from('knowledge_docs').delete().eq('slug', slug)
```

### Log & Task tools

```typescript
// write_task_log(taskId, message, level?, toolUsed?, toolInput?, toolOutput?)
supabase.from('agent_logs').insert({ task_id, agent, level, message, tool_used, ... })

// complete_task(taskId, result, status?: 'done'|'error')
supabase.from('agent_tasks').update({
  col: status ?? 'done',
  result,
  finished_at: now()
}).eq('id', taskId)

// query_supabase(table, filters?, limit?)
// Lecture seule — tables autorisées: agent_tasks, contacts (via GHL), agent_logs, knowledge_docs
```

---

## UI Updates

### TachesView — extensions

Ajouter dans `AGENT_META`:
```typescript
ops: { label: 'Ops',  color: '#7C3AED', bg: '#7C3AED15' },
doc: { label: 'Doc',  color: '#0F766E', bg: '#0F766E15' },
```

Ajouter `AgentId` = `'soren' | 'kai' | 'mia' | 'ops' | 'doc'`

Ajouter log drawer : clic sur task → panel droit avec les `agent_logs` WHERE `task_id = task.id`, affichés en timeline avec level + message + tool_used.

### LogsView — connexion Supabase

Remplacer les SEED_LOGS par un `useEffect` qui fetch `/api/agent-logs` (nouvelle route GET) :
- Query `agent_logs` ORDER BY created_at DESC LIMIT 100
- Ajouter `ops` et `doc` dans AGENT_META du LogsView
- Polling toutes les 10s (ou SSE si possible)

### KnowledgeView — onglet KB docs

Ajouter un onglet "Base de connaissance" qui liste les `knowledge_docs` :
- Liste des docs avec slug, title, updated_at, updated_by
- Clic → expand contenu markdown
- Bouton "Éditer" → textarea éditable + save → PATCH `/api/knowledge/docs/{slug}`

---

## Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/agent-executor?secret=AGENT_EXECUTOR_SECRET_VALUE",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

---

## Variables d'environnement requises

Ces variables doivent être ajoutées dans Vercel Dashboard :
```
HERMES_TELEGRAM_CHAT_ID=   # ton chat ID Telegram avec le bot
AGENT_EXECUTOR_SECRET=     # clé secrète aléatoire (ex: openssl rand -hex 32)
TELEGRAM_BOT_TOKEN=        # déjà configuré
ANTHROPIC_API_KEY=         # déjà configuré
GHL_API_KEY=               # déjà configuré
GHL_LOCATION_ID=           # déjà configuré
```

---

## Ce que Thomas doit faire manuellement (liste courte)

1. **Exécuter le SQL** dans Supabase Dashboard > SQL Editor :
   ```sql
   -- contenu de supabase/migrations/20260420_hermes.sql
   ```

2. **Configurer le webhook Hermes** (une seule fois après deploy) :
   ```
   https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook
   ?url=https://{ton-domaine}/api/telegram/hermes
   ```

3. **Récupérer ton HERMES_TELEGRAM_CHAT_ID** : envoie `/start` au bot, Hermes répond avec ton chat ID dans les logs Vercel.

4. **Ajouter les env vars** `HERMES_TELEGRAM_CHAT_ID` et `AGENT_EXECUTOR_SECRET` dans Vercel Dashboard.

5. **Redéployer** pour activer le cron Vercel.

C'est tout — le reste est automatique.
