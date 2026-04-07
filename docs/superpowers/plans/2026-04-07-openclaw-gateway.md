# OpenClaw Gateway — Plan A: Gateway Core + Telegram Bots

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Node.js OpenClaw Gateway on Hetzner VPS that runs 3 AI agents (Soren/Kai/Mia) as real Telegram participants, handling text and voice messages with < 4s response time.

**Architecture:** A standalone Express server in `gateway/` reads `openclaw.config.json` + `.agents/*/SOUL.md` from the parent repo. Each agent is an Anthropic streaming session with persistent conversation history. Telegram webhooks route messages to the correct session; voice notes are transcribed via Whisper before routing. Agents communicate via a `sessions_send` tool. All events are emitted to an SSE stream for the SaaS frontend.

**Tech Stack:** Node.js 20+, TypeScript, Express, `@anthropic-ai/sdk@^0.80.0`, `node-telegram-bot-api@^0.66.0`, `@supabase/supabase-js@^2.49.4`, `node-cron@^3.0.3`, vitest, PM2, Nginx + Let's Encrypt

**This plan is Plan A of 3:**
- **Plan A (this):** Gateway + Telegram + Whisper → agents can talk in the group
- **Plan B (next):** GHL/Twilio skills + cron proactive behaviors + self-improvement
- **Plan C (later):** SaaS `/equipe` control panel (SOUL.md editor, skill toggles, live status)

---

## File Map

| File | Purpose |
|------|---------|
| `gateway/package.json` | Gateway dependencies (separate from SaaS) |
| `gateway/tsconfig.json` | TypeScript config for Node.js |
| `gateway/ecosystem.config.js` | PM2 process config |
| `gateway/nginx.conf.example` | Nginx reverse proxy + HTTPS template |
| `gateway/.env.example` | All required env vars documented |
| `gateway/src/config.ts` | Load env vars + `../openclaw.config.json` into typed config |
| `gateway/src/EventBus.ts` | Node EventEmitter wrapper for SSE broadcasting |
| `gateway/src/supabase/logger.ts` | Insert rows into `agent_interactions` table |
| `gateway/src/sessions/SessionManager.ts` | Anthropic agentic loop per agent (history + tool execution) |
| `gateway/src/sessions/tools.ts` | Tool definitions + executors: `telegram_send`, `sessions_send`, `log_interaction` |
| `gateway/src/telegram/whisper.ts` | Download voice file from Telegram + POST to Whisper API → text |
| `gateway/src/telegram/bots.ts` | 3 TelegramBot instances (Soren/Kai/Mia), one token each |
| `gateway/src/telegram/router.ts` | Handle incoming Telegram messages → whisper/text → SessionManager |
| `gateway/src/routes/webhooks.ts` | `POST /webhooks/telegram/:agent` → `bot.processUpdate()` |
| `gateway/src/routes/sessions.ts` | `POST /sessions/:agent/send` → SessionManager |
| `gateway/src/routes/events.ts` | `GET /events` → SSE stream from EventBus |
| `gateway/src/index.ts` | Entry point: Express app, register routes, init sessions, register webhooks |
| `supabase/migrations/20260407_agent_jarvis_tables.sql` | New tables: `agent_interactions`, `agent_memory`, `soul_versions` |

---

## Task 1: Project Setup

**Files:**
- Create: `gateway/package.json`
- Create: `gateway/tsconfig.json`
- Create: `gateway/.env.example`

- [ ] **Step 1: Create `gateway/package.json`**

```json
{
  "name": "openclaw-gateway",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@supabase/supabase-js": "^2.49.4",
    "express": "^4.21.0",
    "node-cron": "^3.0.3",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20",
    "@types/node-cron": "^3.0.11",
    "@types/node-telegram-bot-api": "^0.66.0",
    "tsx": "^4.19.2",
    "typescript": "^5",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `gateway/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `gateway/.env.example`**

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Telegram bot tokens (one per agent — each is a separate @BotFather bot)
TELEGRAM_SOREN_TOKEN=12345678:AAF...
TELEGRAM_KAI_TOKEN=12345678:AAG...
TELEGRAM_MIA_TOKEN=12345678:AAH...

# Telegram group chat ID (negative number for groups, e.g. -1001234567890)
TELEGRAM_GROUP_CHAT_ID=-1001234567890

# Whisper / OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# VPS domain for Telegram webhooks (no trailing slash, no protocol)
VPS_DOMAIN=soren.yourdomain.com

# Node environment
NODE_ENV=production
PORT=18789
```

- [ ] **Step 4: Install dependencies**

```bash
cd gateway && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/package.json gateway/tsconfig.json gateway/.env.example
git commit -m "feat(gateway): initialize OpenClaw Gateway Node.js project"
```

---

## Task 2: Config Loader

**Files:**
- Create: `gateway/src/config.ts`
- Create: `gateway/src/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `gateway/src/config.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  readFileSync: (path: string) => {
    if (path.endsWith('openclaw.config.json')) {
      return JSON.stringify({
        gateway: { port: 18789, host: 'localhost' },
        sessions: {
          kai: { model: 'claude-sonnet-4-6', soul: '.agents/kai/SOUL.md' },
          mia: { model: 'claude-haiku-4-5-20251001', soul: '.agents/mia/SOUL.md' },
        },
        skills: {
          soren: ['ghl-pipeline', 'telegram-digest', 'sessions-delegate'],
          kai: ['twilio-sms', 'ghl-contacts'],
          mia: ['devis-generator', 'kb-sync'],
        },
      })
    }
    if (path.includes('SOUL.md')) return '# Agent soul'
    return ''
  },
}))

vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
vi.stubEnv('TELEGRAM_SOREN_TOKEN', 'tok-soren')
vi.stubEnv('TELEGRAM_KAI_TOKEN', 'tok-kai')
vi.stubEnv('TELEGRAM_MIA_TOKEN', 'tok-mia')
vi.stubEnv('TELEGRAM_GROUP_CHAT_ID', '-100123')
vi.stubEnv('OPENAI_API_KEY', 'oai-key')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_KEY', 'svc-key')
vi.stubEnv('VPS_DOMAIN', 'test.example.com')
vi.stubEnv('PORT', '18789')

describe('config', () => {
  it('loads gateway port from json', async () => {
    const { config } = await import('./config')
    expect(config.port).toBe(18789)
  })
  it('exposes agent tokens', async () => {
    const { config } = await import('./config')
    expect(config.telegram.sorenToken).toBe('tok-soren')
  })
  it('loads soul content for soren', async () => {
    const { config } = await import('./config')
    expect(config.agents.soren.soul).toContain('Agent soul')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd gateway && npm test -- config.test.ts
```
Expected: FAIL — `Cannot find module './config'`

- [ ] **Step 3: Create `gateway/src/config.ts`**

```typescript
import fs from 'fs'
import path from 'path'

function require_env(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

const rawConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../openclaw.config.json'), 'utf-8')
)

function loadSoul(soulPath: string): string {
  return fs.readFileSync(path.join(__dirname, '../..', soulPath), 'utf-8')
}

export const config = {
  port: parseInt(process.env.PORT ?? String(rawConfig.gateway.port), 10),
  anthropicKey: require_env('ANTHROPIC_API_KEY'),
  openaiKey: require_env('OPENAI_API_KEY'),
  telegram: {
    sorenToken: require_env('TELEGRAM_SOREN_TOKEN'),
    kaiToken:   require_env('TELEGRAM_KAI_TOKEN'),
    miaToken:   require_env('TELEGRAM_MIA_TOKEN'),
    groupChatId: require_env('TELEGRAM_GROUP_CHAT_ID'),
  },
  supabase: {
    url:        require_env('SUPABASE_URL'),
    serviceKey: require_env('SUPABASE_SERVICE_KEY'),
  },
  vpsDomain: process.env.VPS_DOMAIN ?? '',
  agents: {
    soren: {
      model: rawConfig.agent.model.replace('anthropic/', ''),
      soul:  loadSoul(rawConfig.agent.soul),
      skills: rawConfig.skills.soren as string[],
    },
    kai: {
      model: rawConfig.sessions.kai.model,
      soul:  loadSoul(rawConfig.sessions.kai.soul),
      skills: rawConfig.skills.kai as string[],
    },
    mia: {
      model: rawConfig.sessions.mia.model,
      soul:  loadSoul(rawConfig.sessions.mia.soul),
      skills: rawConfig.skills.mia as string[],
    },
  },
} as const

export type AgentName = 'soren' | 'kai' | 'mia'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd gateway && npm test -- config.test.ts
```
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/src/config.ts gateway/src/config.test.ts
git commit -m "feat(gateway): add typed config loader with env validation"
```

---

## Task 3: EventBus

**Files:**
- Create: `gateway/src/EventBus.ts`
- Create: `gateway/src/EventBus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `gateway/src/EventBus.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { EventBus } from './EventBus'

describe('EventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EventBus()
    const received: unknown[] = []
    bus.subscribe((e) => received.push(e))
    bus.emit({ type: 'sms', from: 'Kai', to: 'Twilio', msg: 'test', timestamp: 'now' })
    expect(received).toHaveLength(1)
    expect((received[0] as { type: string }).type).toBe('sms')
  })

  it('unsubscribe stops delivery', () => {
    const bus = new EventBus()
    const received: unknown[] = []
    const unsub = bus.subscribe((e) => received.push(e))
    unsub()
    bus.emit({ type: 'webhook', from: 'A', to: 'B', msg: 'x', timestamp: 'now' })
    expect(received).toHaveLength(0)
  })

  it('multiple subscribers all receive events', () => {
    const bus = new EventBus()
    const a: unknown[] = []
    const b: unknown[] = []
    bus.subscribe((e) => a.push(e))
    bus.subscribe((e) => b.push(e))
    bus.emit({ type: 'delegate', from: 'Soren', to: 'Kai', msg: 'test', timestamp: 'now' })
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd gateway && npm test -- EventBus.test.ts
```
Expected: FAIL — `Cannot find module './EventBus'`

- [ ] **Step 3: Create `gateway/src/EventBus.ts`**

```typescript
export interface GatewayEvent {
  type: string
  from: string
  to:   string
  msg:  string
  timestamp: string
  [key: string]: unknown
}

type Subscriber = (event: GatewayEvent) => void

export class EventBus {
  private subscribers = new Set<Subscriber>()

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  emit(event: GatewayEvent): void {
    for (const fn of this.subscribers) {
      fn(event)
    }
  }
}

// Singleton for use across the gateway
export const eventBus = new EventBus()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd gateway && npm test -- EventBus.test.ts
```
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/src/EventBus.ts gateway/src/EventBus.test.ts
git commit -m "feat(gateway): add EventBus singleton for SSE event broadcasting"
```

---

## Task 4: Supabase Migration + Logger

**Files:**
- Create: `supabase/migrations/20260407_agent_jarvis_tables.sql`
- Create: `gateway/src/supabase/logger.ts`
- Create: `gateway/src/supabase/logger.test.ts`

- [ ] **Step 1: Create the SQL migration**

Create `supabase/migrations/20260407_agent_jarvis_tables.sql`:
```sql
-- Agent Jarvis tables — run in Supabase SQL editor or via supabase db push

-- 1. agent_interactions: learning base for weekly self-improvement
CREATE TABLE IF NOT EXISTS agent_interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  lead_id    text,
  type       text NOT NULL,   -- 'sms', 'delegation', 'voice', 'cron', 'devis'
  outcome    text,            -- 'success', 'no_response', 'error', 'escalated'
  duration   integer,         -- milliseconds
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. agent_memory: long-term per-lead memory (key/value per agent)
CREATE TABLE IF NOT EXISTS agent_memory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  key        text NOT NULL,   -- e.g. 'lead:phone:+33612345678'
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agent, key)
);

-- 3. soul_versions: history of SOUL.md edits for rollback
CREATE TABLE IF NOT EXISTS soul_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       text NOT NULL CHECK (agent IN ('soren', 'kai', 'mia')),
  content     text NOT NULL,
  deployed_at timestamptz DEFAULT now(),
  author      text NOT NULL DEFAULT 'thomas'  -- 'thomas' | 'soren' (auto-improve)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions (agent);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_lead  ON agent_interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_key   ON agent_memory (agent, key);
CREATE INDEX IF NOT EXISTS idx_soul_versions_agent      ON soul_versions (agent, deployed_at DESC);

-- RLS: open for now (lock down with auth in Plan C)
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_versions       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for agent_interactions" ON agent_interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for agent_memory"        ON agent_memory        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for soul_versions"        ON soul_versions        FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Write the failing test**

Create `gateway/src/supabase/logger.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (_table: string) => ({ insert: mockInsert }),
  }),
}))
vi.mock('../config', () => ({
  config: { supabase: { url: 'https://test.supabase.co', serviceKey: 'key' } },
}))

describe('logger', () => {
  it('inserts an interaction row', async () => {
    const { logInteraction } = await import('./logger')
    await logInteraction({
      agent: 'kai',
      type: 'sms',
      outcome: 'success',
      duration: 320,
      lead_id: 'lead-abc',
    })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'kai', type: 'sms', outcome: 'success' })
    )
  })

  it('does not throw when supabase returns error (fire-and-forget)', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'db error' } })
    const { logInteraction } = await import('./logger')
    await expect(logInteraction({ agent: 'soren', type: 'cron', outcome: 'success', duration: 0 }))
      .resolves.not.toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd gateway && npm test -- logger.test.ts
```
Expected: FAIL — `Cannot find module './logger'`

- [ ] **Step 4: Create `gateway/src/supabase/logger.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export interface InteractionLog {
  agent:    'soren' | 'kai' | 'mia'
  type:     string
  outcome:  string
  duration: number
  lead_id?: string
  metadata?: Record<string, unknown>
}

export async function logInteraction(log: InteractionLog): Promise<void> {
  const { error } = await supabase.from('agent_interactions').insert({
    ...log,
    metadata: log.metadata ?? {},
  })
  if (error) {
    console.error('[logger] Supabase insert failed:', error.message)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd gateway && npm test -- logger.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 6: Apply migration to Supabase**

Open Supabase dashboard → SQL Editor → paste contents of `supabase/migrations/20260407_agent_jarvis_tables.sql` → Run.

Verify: tables `agent_interactions`, `agent_memory`, `soul_versions` appear in Table Editor.

- [ ] **Step 7: Commit**

```bash
cd ..
git add supabase/migrations/20260407_agent_jarvis_tables.sql gateway/src/supabase/
git commit -m "feat(gateway): add Supabase Jarvis tables + interaction logger"
```

---

## Task 5: SessionManager (Anthropic Agentic Loop)

**Files:**
- Create: `gateway/src/sessions/SessionManager.ts`
- Create: `gateway/src/sessions/SessionManager.test.ts`

- [ ] **Step 1: Write the failing test**

Create `gateway/src/sessions/SessionManager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: mockCreate }
  },
}))
vi.mock('../config', () => ({
  config: {
    anthropicKey: 'test',
    agents: {
      kai: { model: 'claude-sonnet-4-6', soul: 'You are Kai', skills: [] },
    },
  },
}))

describe('SessionManager', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sends message and returns text response', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Bonjour Thomas !' }],
    })
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    const result = await sm.send('Bonjour')
    expect(result).toBe('Bonjour Thomas !')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-sonnet-4-6',
      system: 'You are Kai',
    }))
  })

  it('executes tool_use and loops until end_turn', async () => {
    const toolCallback = vi.fn().mockResolvedValue({ ok: true })
    mockCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'test_tool', input: { x: 1 } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done' }],
      })

    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool('test_tool', { description: 'A test tool', input_schema: { type: 'object', properties: {} } }, toolCallback)
    const result = await sm.send('Do something')
    expect(toolCallback).toHaveBeenCalledWith({ x: 1 })
    expect(result).toBe('Done')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd gateway && npm test -- SessionManager.test.ts
```
Expected: FAIL — `Cannot find module './SessionManager'`

- [ ] **Step 3: Create `gateway/src/sessions/SessionManager.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool, ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages'
import { config, type AgentName } from '../config'
import { eventBus } from '../EventBus'

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>

interface ToolEntry {
  definition: Tool
  executor:   ToolExecutor
}

export class SessionManager {
  private client:  Anthropic
  private history: MessageParam[] = []
  private tools    = new Map<string, ToolEntry>()
  private agentCfg: typeof config.agents[AgentName]

  constructor(private name: AgentName) {
    this.client   = new Anthropic({ apiKey: config.anthropicKey })
    this.agentCfg = config.agents[name]
  }

  registerTool(name: string, definition: Omit<Tool, 'name'>, executor: ToolExecutor): void {
    this.tools.set(name, { definition: { name, ...definition }, executor })
  }

  async send(userMessage: string): Promise<string> {
    this.history.push({ role: 'user', content: userMessage })

    let response = await this.client.messages.create({
      model:      this.agentCfg.model,
      max_tokens: 4096,
      system:     this.agentCfg.soul,
      messages:   this.history,
      tools:      Array.from(this.tools.values()).map(t => t.definition),
    })

    // Agentic loop: keep handling tool_use until end_turn
    while (response.stop_reason === 'tool_use') {
      this.history.push({ role: 'assistant', content: response.content })

      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use'
      )

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const entry = this.tools.get(block.name)
          let result: unknown
          if (entry) {
            result = await entry.executor(block.input as Record<string, unknown>)
          } else {
            result = { error: `Unknown tool: ${block.name}` }
          }

          eventBus.emit({
            type:      block.name,
            from:      this.name,
            to:        String((block.input as Record<string, unknown>).to ?? 'unknown'),
            msg:       String((block.input as Record<string, unknown>).message ?? block.name),
            timestamp: new Date().toISOString(),
          })

          return {
            type:        'tool_result' as const,
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          }
        })
      )

      this.history.push({ role: 'user', content: toolResults })

      response = await this.client.messages.create({
        model:      this.agentCfg.model,
        max_tokens: 4096,
        system:     this.agentCfg.soul,
        messages:   this.history,
        tools:      Array.from(this.tools.values()).map(t => t.definition),
      })
    }

    // Extract final text
    const text = response.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    this.history.push({ role: 'assistant', content: response.content })
    return text
  }

  // Trim history to last N exchanges to avoid context overflow
  trimHistory(maxExchanges = 20): void {
    if (this.history.length > maxExchanges * 2) {
      this.history = this.history.slice(-maxExchanges * 2)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd gateway && npm test -- SessionManager.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/src/sessions/SessionManager.ts gateway/src/sessions/SessionManager.test.ts
git commit -m "feat(gateway): add SessionManager with Anthropic agentic loop + tool execution"
```

---

## Task 6: Agent Tools

**Files:**
- Create: `gateway/src/sessions/tools.ts`
- Create: `gateway/src/sessions/tools.test.ts`

The 3 core tools registered on all agents:
- `telegram_send` — post a message to the Telegram group with this agent's bot
- `sessions_send` — delegate a message to another agent's session (returns that agent's response)
- `log_interaction` — write to Supabase `agent_interactions`

- [ ] **Step 1: Write the failing test**

Create `gateway/src/sessions/tools.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import type TelegramBot from 'node-telegram-bot-api'

vi.mock('../config', () => ({
  config: { telegram: { groupChatId: '-100123' } },
}))
vi.mock('../supabase/logger', () => ({
  logInteraction: vi.fn().mockResolvedValue(undefined),
}))

describe('makeTelegramSendTool', () => {
  it('calls bot.sendMessage with group chat id', async () => {
    const mockSend = vi.fn().mockResolvedValue({})
    const mockBot = { sendMessage: mockSend } as unknown as TelegramBot

    const { makeTelegramSendTool } = await import('./tools')
    const { executor } = makeTelegramSendTool('kai', mockBot)
    await executor({ message: 'Bonjour depuis Kai !' })

    expect(mockSend).toHaveBeenCalledWith('-100123', 'Bonjour depuis Kai !', expect.any(Object))
  })
})

describe('makeLogTool', () => {
  it('calls logInteraction with correct args', async () => {
    const { logInteraction } = await import('../supabase/logger')
    const { makeLogTool } = await import('./tools')
    const { executor } = makeLogTool('mia')
    await executor({ type: 'devis', outcome: 'success', duration: 150 })
    expect(logInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'mia', type: 'devis', outcome: 'success' })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd gateway && npm test -- tools.test.ts
```
Expected: FAIL — `Cannot find module './tools'`

- [ ] **Step 3: Create `gateway/src/sessions/tools.ts`**

```typescript
import type TelegramBot from 'node-telegram-bot-api'
import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import { config, type AgentName } from '../config'
import { logInteraction } from '../supabase/logger'

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>
export interface BuiltTool { definition: Omit<Tool, 'name'>; executor: ToolExecutor }

// ─── telegram_send ────────────────────────────────────────────
export function makeTelegramSendTool(agentName: AgentName, bot: TelegramBot): BuiltTool {
  return {
    definition: {
      description: 'Post a message to the Telegram group using this agent\'s bot identity',
      input_schema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string', description: 'Message text to send (max 4096 chars)' },
        },
        required: ['message'],
      },
    },
    executor: async (input) => {
      const text = String(input.message)
      await bot.sendMessage(config.telegram.groupChatId, text, { parse_mode: 'Markdown' })
      return { ok: true, agent: agentName }
    },
  }
}

// ─── sessions_send ────────────────────────────────────────────
// sessions_send executor is set up after sessions are initialized (circular dep)
// We use a registry pattern: index.ts registers the actual sessions after init
export type SessionsSendFn = (agent: AgentName, message: string) => Promise<string>

export function makeSessionsSendTool(sessionsSend: SessionsSendFn): BuiltTool {
  return {
    definition: {
      description: 'Delegate a task to another AI agent (Soren, Kai, or Mia)',
      input_schema: {
        type: 'object' as const,
        properties: {
          agent: {
            type: 'string',
            enum: ['soren', 'kai', 'mia'],
            description: 'Which agent to delegate to',
          },
          message: {
            type: 'string',
            description: 'Full instructions or context to send to the agent',
          },
        },
        required: ['agent', 'message'],
      },
    },
    executor: async (input) => {
      const agent  = input.agent as AgentName
      const msg    = String(input.message)
      const result = await sessionsSend(agent, msg)
      return { response: result, agent }
    },
  }
}

// ─── log_interaction ──────────────────────────────────────────
export function makeLogTool(agentName: AgentName): BuiltTool {
  return {
    definition: {
      description: 'Log an agent action to Supabase for analytics and self-improvement',
      input_schema: {
        type: 'object' as const,
        properties: {
          type:     { type: 'string', description: 'Action type: sms, delegation, devis, cron, voice' },
          outcome:  { type: 'string', description: 'Result: success, no_response, error, escalated' },
          duration: { type: 'number', description: 'Duration in milliseconds' },
          lead_id:  { type: 'string', description: 'GHL lead ID if applicable' },
        },
        required: ['type', 'outcome', 'duration'],
      },
    },
    executor: async (input) => {
      await logInteraction({
        agent:    agentName,
        type:     String(input.type),
        outcome:  String(input.outcome),
        duration: Number(input.duration),
        lead_id:  input.lead_id ? String(input.lead_id) : undefined,
      })
      return { ok: true }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd gateway && npm test -- tools.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/src/sessions/tools.ts gateway/src/sessions/tools.test.ts
git commit -m "feat(gateway): add telegram_send, sessions_send, log_interaction tools"
```

---

## Task 7: Whisper Transcription

**Files:**
- Create: `gateway/src/telegram/whisper.ts`
- Create: `gateway/src/telegram/whisper.test.ts`

- [ ] **Step 1: Write the failing test**

Create `gateway/src/telegram/whisper.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: { openaiKey: 'test-oai-key', telegram: { sorenToken: 'tok' } },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('transcribeVoice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns transcribed text from Whisper API', async () => {
    // First call: download voice file from Telegram
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { file_path: 'voice/file_123.ogg' } }),
      })
      // Second call: get file bytes
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      })
      // Third call: Whisper API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Qualifier le lead Jean Dupont' }),
      })

    const { transcribeVoice } = await import('./whisper')
    const result = await transcribeVoice('tok', 'AgAD...')
    expect(result).toBe('Qualifier le lead Jean Dupont')
  })

  it('throws when Whisper API fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { file_path: 'x.ogg' } }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(10) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'bad audio' } }) })

    const { transcribeVoice } = await import('./whisper')
    await expect(transcribeVoice('tok', 'file-id')).rejects.toThrow('Whisper API error: 400')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd gateway && npm test -- whisper.test.ts
```
Expected: FAIL — `Cannot find module './whisper'`

- [ ] **Step 3: Create `gateway/src/telegram/whisper.ts`**

```typescript
import { config } from '../config'

/**
 * transcribeVoice: download a Telegram voice note and transcribe via OpenAI Whisper API
 * @param botToken  - the bot token whose file access is used (the bot that received the message)
 * @param fileId    - Telegram file_id from the voice message
 * @returns transcribed text
 */
export async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  // Step 1: Get file path from Telegram
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  )
  const fileInfo = (await fileInfoRes.json()) as { result: { file_path: string } }
  const filePath = fileInfo.result.file_path

  // Step 2: Download the audio bytes
  const audioRes = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`
  )
  const audioBuffer = await audioRes.arrayBuffer()

  // Step 3: Post to Whisper API
  const form = new FormData()
  form.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg')
  form.append('model', 'whisper-1')
  form.append('language', 'fr')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}` },
    body:    form,
  })

  if (!whisperRes.ok) {
    throw new Error(`Whisper API error: ${whisperRes.status}`)
  }

  const { text } = (await whisperRes.json()) as { text: string }
  return text
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd gateway && npm test -- whisper.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add gateway/src/telegram/whisper.ts gateway/src/telegram/whisper.test.ts
git commit -m "feat(gateway): add Whisper voice transcription (< 4s pipeline)"
```

---

## Task 8: Telegram Bots + Router

**Files:**
- Create: `gateway/src/telegram/bots.ts`
- Create: `gateway/src/telegram/router.ts`
- Create: `gateway/src/telegram/router.test.ts`

- [ ] **Step 1: Create `gateway/src/telegram/bots.ts`**

```typescript
import TelegramBot from 'node-telegram-bot-api'
import { config } from '../config'

// In production: polling: false (webhooks registered in index.ts)
// In dev: set TELEGRAM_USE_POLLING=true for local testing
const usePolling = process.env.TELEGRAM_USE_POLLING === 'true'

export const sorenBot = new TelegramBot(config.telegram.sorenToken, { polling: usePolling })
export const kaiBot   = new TelegramBot(config.telegram.kaiToken,   { polling: usePolling })
export const miaBot   = new TelegramBot(config.telegram.miaToken,   { polling: usePolling })

export const bots = { soren: sorenBot, kai: kaiBot, mia: miaBot }
```

- [ ] **Step 2: Write the failing test for router**

Create `gateway/src/telegram/router.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import type TelegramBot from 'node-telegram-bot-api'

vi.mock('../config', () => ({
  config: { telegram: { sorenToken: 'tok', groupChatId: '-100123' } },
}))
const mockSend = vi.fn().mockResolvedValue('transcribed text')
vi.mock('./whisper', () => ({ transcribeVoice: mockSend }))

describe('routeMessage', () => {
  it('returns text directly for text messages', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: -100123 },
      text: 'Bonjour Soren',
      from: { id: 1, username: 'thomas' },
      message_id: 1,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(result).toBe('Bonjour Soren')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('calls transcribeVoice for voice messages', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: -100123 },
      voice: { file_id: 'AgAD123', duration: 5, mime_type: 'audio/ogg', file_size: 1000 },
      from: { id: 1, username: 'thomas' },
      message_id: 2,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(mockSend).toHaveBeenCalledWith('tok', 'AgAD123')
    expect(result).toBe('transcribed text')
  })

  it('returns null for messages not from the group', async () => {
    const { routeMessage } = await import('./router')
    const msg = {
      chat: { id: 999 },  // wrong chat
      text: 'hello',
      from: { id: 1, username: 'thomas' },
      message_id: 3,
    } as TelegramBot.Message

    const result = await routeMessage(msg, 'tok')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd gateway && npm test -- router.test.ts
```
Expected: FAIL — `Cannot find module './router'`

- [ ] **Step 4: Create `gateway/src/telegram/router.ts`**

```typescript
import type TelegramBot from 'node-telegram-bot-api'
import { config } from '../config'
import { transcribeVoice } from './whisper'

/**
 * routeMessage: normalize a Telegram message to plain text.
 * Returns null if the message should be ignored (wrong chat, bot message, etc).
 */
export async function routeMessage(
  msg: TelegramBot.Message,
  botToken: string
): Promise<string | null> {
  // Only process messages from the configured group
  if (String(msg.chat.id) !== config.telegram.groupChatId) return null

  // Ignore messages from bots (prevent loops)
  if (msg.from?.is_bot) return null

  // Voice note → Whisper
  if (msg.voice) {
    const text = await transcribeVoice(botToken, msg.voice.file_id)
    return text
  }

  // Plain text
  if (msg.text) return msg.text

  return null
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd gateway && npm test -- router.test.ts
```
Expected: PASS — 3 tests pass.

- [ ] **Step 6: Commit**

```bash
cd ..
git add gateway/src/telegram/bots.ts gateway/src/telegram/router.ts gateway/src/telegram/router.test.ts
git commit -m "feat(gateway): add 3 Telegram bots + message router with Whisper fallback"
```

---

## Task 9: HTTP Routes

**Files:**
- Create: `gateway/src/routes/webhooks.ts`
- Create: `gateway/src/routes/sessions.ts`
- Create: `gateway/src/routes/events.ts`

These are thin Express routers — they delegate to SessionManager. No unit tests needed; tested via integration in Task 10.

- [ ] **Step 1: Create `gateway/src/routes/webhooks.ts`**

```typescript
import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import { bots }        from '../telegram/bots'
import { routeMessage } from '../telegram/router'
import type { AgentName } from '../config'
import { config } from '../config'

const AGENT_TOKENS: Record<AgentName, string> = {
  soren: config.telegram.sorenToken,
  kai:   config.telegram.kaiToken,
  mia:   config.telegram.miaToken,
}

export function makeWebhooksRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  router.post('/telegram/:agent', async (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.sendStatus(404); return }

    // Telegram expects 200 immediately, process async
    res.sendStatus(200)

    const update = req.body
    if (!update.message) return

    const token = AGENT_TOKENS[agent]
    const text  = await routeMessage(update.message, token)
    if (!text) return

    // Soren is the primary receiver — all group messages go to Soren
    // (Soren routes to Kai/Mia via sessions_send tool)
    if (agent === 'soren') {
      await sessions.soren.send(text)
    }
  })

  return router
}
```

- [ ] **Step 2: Create `gateway/src/routes/sessions.ts`**

```typescript
import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'

export function makeSessionsRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  // POST /sessions/:agent/send  { message: string }
  router.post('/:agent/send', async (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }

    const { message } = req.body as { message?: string }
    if (!message) { res.status(400).json({ error: 'Missing message' }); return }

    const response = await sessions[agent].send(message)
    res.json({ agent, response })
  })

  return router
}
```

- [ ] **Step 3: Create `gateway/src/routes/events.ts`**

```typescript
import { Router, type Request, type Response } from 'express'
import { eventBus } from '../EventBus'

export function makeEventsRouter(): Router {
  const router = Router()

  router.get('/', (req: Request, res: Response) => {
    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.setHeader('Connection',    'keep-alive')
    res.flushHeaders()

    let eventId = 0

    function send(data: object): void {
      res.write(`id: ${eventId++}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    send({ type: 'connected', msg: 'OpenClaw SSE stream connected', timestamp: new Date().toISOString() })

    const unsub = eventBus.subscribe((event) => send(event))

    req.on('close', () => {
      unsub()
      res.end()
    })
  })

  return router
}
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add gateway/src/routes/
git commit -m "feat(gateway): add Express routes — webhooks, sessions, SSE events"
```

---

## Task 10: Entry Point + PM2 + Nginx

**Files:**
- Create: `gateway/src/index.ts`
- Create: `gateway/ecosystem.config.js`
- Create: `gateway/nginx.conf.example`

- [ ] **Step 1: Create `gateway/src/index.ts`**

```typescript
import 'dotenv/config'
import express from 'express'
import { config }           from './config'
import { eventBus }         from './EventBus'
import { SessionManager }   from './sessions/SessionManager'
import {
  makeTelegramSendTool,
  makeSessionsSendTool,
  makeLogTool,
  type SessionsSendFn,
} from './sessions/tools'
import { bots }             from './telegram/bots'
import { makeWebhooksRouter } from './routes/webhooks'
import { makeSessionsRouter } from './routes/sessions'
import { makeEventsRouter }   from './routes/events'
import type { AgentName }   from './config'

async function main() {
  // ── Init sessions ────────────────────────────────────────────
  const sessions: Record<AgentName, SessionManager> = {
    soren: new SessionManager('soren'),
    kai:   new SessionManager('kai'),
    mia:   new SessionManager('mia'),
  }

  // sessions_send bridges agents — defined after sessions are created
  const sessionsSend: SessionsSendFn = (agent, message) => sessions[agent].send(message)

  // Register tools on each agent
  for (const [name, session] of Object.entries(sessions) as [AgentName, SessionManager][]) {
    const bot           = bots[name]
    const telegramTool  = makeTelegramSendTool(name, bot)
    const sessionsTool  = makeSessionsSendTool(sessionsSend)
    const logTool       = makeLogTool(name)
    session.registerTool('telegram_send',   telegramTool.definition,  telegramTool.executor)
    session.registerTool('sessions_send',   sessionsTool.definition,  sessionsTool.executor)
    session.registerTool('log_interaction', logTool.definition,       logTool.executor)
  }

  // ── Register Telegram webhooks (production only) ─────────────
  if (config.vpsDomain && process.env.NODE_ENV === 'production') {
    await Promise.all([
      bots.soren.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/soren`),
      bots.kai.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/kai`),
      bots.mia.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/mia`),
    ])
    console.log('[gateway] Telegram webhooks registered')
  }

  // ── Express app ──────────────────────────────────────────────
  const app = express()
  app.use(express.json())

  app.use('/webhooks', makeWebhooksRouter(sessions))
  app.use('/sessions', makeSessionsRouter(sessions))
  app.use('/events',   makeEventsRouter())

  app.get('/health', (_req, res) => res.json({ ok: true, agents: Object.keys(sessions) }))

  app.listen(config.port, () => {
    console.log(`[gateway] OpenClaw Gateway running on port ${config.port}`)
    eventBus.emit({ type: 'connected', from: 'gateway', to: 'all', msg: 'Gateway started', timestamp: new Date().toISOString() })
  })
}

main().catch(console.error)
```

- [ ] **Step 2: Create `gateway/ecosystem.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name:         'openclaw-gateway',
      script:       'dist/index.js',
      instances:    1,
      autorestart:  true,
      watch:        false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     '18789',
      },
    },
  ],
}
```

- [ ] **Step 3: Create `gateway/nginx.conf.example`**

```nginx
# Nginx config for OpenClaw Gateway
# Place in /etc/nginx/sites-available/openclaw and symlink to sites-enabled/
# After: certbot --nginx -d soren.yourdomain.com

server {
    listen 443 ssl;
    server_name soren.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/soren.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soren.yourdomain.com/privkey.pem;

    # SSE: disable buffering for real-time events
    location /events {
        proxy_pass         http://localhost:18789;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection '';
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 86400s;
    }

    # All other gateway routes
    location / {
        proxy_pass         http://localhost:18789;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name soren.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

- [ ] **Step 4: Add `dotenv` dependency (needed for `dotenv/config` import)**

Edit `gateway/package.json` to add `"dotenv": "^16.4.5"` to `dependencies`:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@supabase/supabase-js": "^2.49.4",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "node-cron": "^3.0.3",
    "node-telegram-bot-api": "^0.66.0"
  }
}
```

Run:
```bash
cd gateway && npm install
```

- [ ] **Step 5: Build and verify TypeScript compiles**

```bash
cd gateway && npm run build
```
Expected: `dist/` directory created, no TypeScript errors.

- [ ] **Step 6: Test health endpoint locally**

```bash
# Copy .env.example to .env and fill in a minimal set (can use fake tokens for smoke test)
cp gateway/.env.example gateway/.env
# Edit gateway/.env: set NODE_ENV=development, fill real ANTHROPIC_API_KEY at minimum

cd gateway && TELEGRAM_USE_POLLING=false npm run dev &
sleep 3
curl http://localhost:18789/health
```
Expected output:
```json
{"ok":true,"agents":["soren","kai","mia"]}
```

Kill the dev server: `pkill -f "tsx watch"`

- [ ] **Step 7: Commit**

```bash
cd ..
git add gateway/src/index.ts gateway/ecosystem.config.js gateway/nginx.conf.example gateway/package.json gateway/package-lock.json
git commit -m "feat(gateway): add entry point, PM2 config, Nginx HTTPS template"
```

---

## Task 11: Hetzner VPS Deployment

These steps are run on the Hetzner VPS, not in the codebase. Document as a deploy checklist.

- [ ] **Step 1: SSH to VPS and clone/pull the repo**

```bash
ssh root@YOUR_VPS_IP
cd /var/www
git clone git@github.com:YOUR_ORG/qos.git || git pull
```

- [ ] **Step 2: Install Node.js 20 + PM2 (if not already installed)**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
```

- [ ] **Step 3: Copy and fill .env**

```bash
cp /var/www/qos/gateway/.env.example /var/www/qos/gateway/.env
nano /var/www/qos/gateway/.env
# Fill in all real values: API keys, 3 bot tokens, Supabase creds, domain
```

- [ ] **Step 4: Build the gateway**

```bash
cd /var/www/qos/gateway
npm install && npm run build
```

- [ ] **Step 5: Start with PM2**

```bash
cd /var/www/qos/gateway
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # copy and run the generated command to survive reboots
```

Verify:
```bash
pm2 status
curl http://localhost:18789/health
```
Expected: `{"ok":true,"agents":["soren","kai","mia"]}`

- [ ] **Step 6: Install Nginx + Let's Encrypt**

```bash
apt-get install -y nginx certbot python3-certbot-nginx
cp /var/www/qos/gateway/nginx.conf.example /etc/nginx/sites-available/openclaw
# Edit: replace soren.yourdomain.com with your actual domain
nano /etc/nginx/sites-available/openclaw
ln -s /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d soren.yourdomain.com
```

- [ ] **Step 7: Verify end-to-end**

1. In Telegram: create a group, add the 3 bots, add yourself
2. Get the group chat ID:
   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_SOREN_TOKEN}/getUpdates"
   # Look for chat.id in the response
   ```
3. Update `.env` with the real `TELEGRAM_GROUP_CHAT_ID`
4. `pm2 restart openclaw-gateway`
5. Send "Bonjour" in the Telegram group
6. Expected: Soren replies within 4 seconds from its bot identity

---

## Task 12: Update SaaS SSE Route

The SaaS already has a mock SSE route at `src/app/api/openclaw/events/route.ts`. Update it to proxy the real gateway in production.

**Files:**
- Modify: `src/app/api/openclaw/events/route.ts`

- [ ] **Step 1: Update the route to support real gateway**

Edit `src/app/api/openclaw/events/route.ts` — replace the TODO comment block with actual proxy logic:

```typescript
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL  // e.g. https://soren.yourdomain.com

// ─── Event templates (mock fallback) ──────────────────────────
const EVENT_TEMPLATES = [
  { type: 'webhook',  from: 'Meta Ads', to: 'Gateway', msg: 'Nouveau lead — Jean Dupont, façade 20-50k€' },
  { type: 'delegate', from: 'Soren',    to: 'Kai',     msg: 'Délégation lead #2891 — priorité haute' },
  { type: 'sms',      from: 'Kai',      to: 'Twilio',  msg: 'SMS envoyé +33652334975 — délai 47 sec' },
  { type: 'qualify',  from: 'Kai',      to: 'GHL',     msg: 'Lead qualifié — score 84/100, stage PROPOSITION' },
  { type: 'report',   from: 'Soren',    to: 'Telegram',msg: 'Digest 07h00 — 3 leads qualifiés, 1 RDV booké' },
  { type: 'devis',    from: 'Mia',      to: 'GHL',     msg: 'Devis #2851 façade 22 000€ — template BTP appliqué' },
  { type: 'webhook',  from: 'GHL',      to: 'Gateway', msg: 'Pipeline update — Xavier Alvarez → GAGNÉ' },
  { type: 'qualify',  from: 'Kai',      to: 'Soren',   msg: 'Relance J+2 planifiée — Inès Duprez, pas de réponse' },
]

export async function GET(req: NextRequest) {
  // If real gateway URL is configured, proxy it
  if (GATEWAY_URL) {
    const upstream = await fetch(`${GATEWAY_URL}/events`, {
      signal: req.signal,
    })
    return new Response(upstream.body, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-store',
        Connection:      'keep-alive',
      },
    })
  }

  // Fallback: mock stream for local development
  const encoder = new TextEncoder()
  let eventId = 0
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        const payload = `id: ${eventId++}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      send({ type: 'connected', msg: 'OpenClaw SSE stream connected (mock)' })

      intervalId = setInterval(() => {
        const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
        send({ ...tpl, timestamp: new Date().toISOString(), id: eventId })
      }, 8000 + Math.random() * 6000)

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        controller.close()
      })
    },
    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection:      'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Add `OPENCLAW_GATEWAY_URL` to `.env.local`**

In `C:\Users\thoma\qos\.env.local`, add:
```bash
# Leave empty for mock mode (local dev), set to real gateway in production
OPENCLAW_GATEWAY_URL=
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/openclaw/events/route.ts .env.local
git commit -m "feat(saas): proxy real OpenClaw gateway SSE when OPENCLAW_GATEWAY_URL is set"
```

---

## Running All Tests

```bash
cd gateway && npm test
```
Expected output:
```
✓ config.test.ts (3 tests)
✓ EventBus.test.ts (3 tests)
✓ logger.test.ts (2 tests)
✓ SessionManager.test.ts (2 tests)
✓ tools.test.ts (2 tests)
✓ whisper.test.ts (2 tests)
✓ router.test.ts (3 tests)

Test Files  7 passed (7)
Tests      17 passed (17)
```
