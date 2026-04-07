# OpenClaw Gateway — Plan B: Agent Skills + Proactive Crons

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Soren and Kai real operational skills (GHL pipeline + Twilio SMS) and wire up 3 autonomous cron behaviors: daily digest at 07h00, urgent lead detection every 10 minutes, and weekly self-improvement Sunday at 09h00.

**Architecture:** New `gateway/src/skills/` files expose GHL and Twilio as agent tools registered in `index.ts`. New `gateway/src/cron/` files implement each proactive behavior and are initialized by `scheduler.ts` called from `main()`. A new `update_soul` tool on Soren's session allows it to apply approved SOUL.md changes directly to disk and to the live SessionManager instance. All existing 18 tests continue to pass.

**Tech Stack:** Node.js 20+, TypeScript, GHL REST API v2021-07-28 (services.leadconnectorhq.com), Twilio REST API (native fetch + Basic auth), node-cron, @supabase/supabase-js, vitest

**This is Plan B of 3:**
- **Plan A (done):** Gateway + Telegram + Whisper → agents can talk in the group
- **Plan B (this):** GHL/Twilio skills + proactive crons + self-improvement
- **Plan C (next):** SaaS `/equipe` control panel

**Prereqs:** Plan A is complete. `gateway/src/index.ts`, `sessions/SessionManager.ts`, `sessions/tools.ts`, `config.ts`, `EventBus.ts`, `supabase/logger.ts` all exist.

---

## File Map

| File | Purpose |
|------|---------|
| `gateway/src/skills/ghl.ts` | GHL API tools: get pipeline, detect stale leads, update opportunity stage |
| `gateway/src/skills/ghl.test.ts` | Unit tests (mocked fetch) |
| `gateway/src/skills/twilio.ts` | Twilio SMS tool: sendSMS |
| `gateway/src/skills/twilio.test.ts` | Unit tests (mocked fetch) |
| `gateway/src/sessions/SessionManager.ts` | **Modified**: add `updateSoul(content)` method |
| `gateway/src/routes/soul.ts` | `POST /agents/:agent/soul` + `GET /agents/:agent/soul` |
| `gateway/src/cron/dailyDigest.ts` | 07h00: build GHL digest, post to Telegram via Soren |
| `gateway/src/cron/pipelinePoller.ts` | Every 10min: detect stale leads > 2h, alert Kai |
| `gateway/src/cron/weeklyAnalysis.ts` | Sunday 09h00: read Supabase, generate SOUL.md suggestions |
| `gateway/src/cron/scheduler.ts` | Register all 3 crons with node-cron |
| `gateway/src/index.ts` | **Modified**: register GHL/Twilio/soul tools, init scheduler, add soul route |
| `gateway/.env.example` | **Modified**: add GHL + Twilio env vars |

---

## Task 1: GHL Skill

**Files:**
- Create: `gateway/src/skills/ghl.ts`
- Create: `gateway/src/skills/ghl.test.ts`

The GHL tool lets Soren/Kai query the pipeline and update leads. Uses `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_BASE_URL` from env (same as the SaaS).

- [ ] **Step 1: Write the failing test**

Create `gateway/src/skills/ghl.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: {
    ghl: {
      apiKey:     'test-ghl-key',
      locationId: 'loc-123',
      baseUrl:    'https://services.leadconnectorhq.com',
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('getActivePipeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns open opportunities from GHL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-1',
            name: 'Jean Dupont — Façade',
            monetaryValue: 35000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-1',
            status: 'open',
            createdAt: '2026-04-05T10:00:00Z',
            updatedAt: '2026-04-05T14:00:00Z',
            contact: { id: 'c-1', name: 'Jean Dupont', email: null, phone: '+33612345678' },
          },
        ],
      }),
    })

    const { getActivePipeline } = await import('./ghl')
    const opps = await getActivePipeline()
    expect(opps).toHaveLength(1)
    expect(opps[0].name).toBe('Jean Dupont — Façade')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/search'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-ghl-key' }) })
    )
  })
})

describe('detectStaleLeads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns leads not updated in the last N hours', async () => {
    const twoHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3h ago

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-stale',
            name: 'Xavier Alvarez — Toiture',
            monetaryValue: 22000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-2',
            status: 'open',
            createdAt: '2026-04-04T08:00:00Z',
            updatedAt: twoHoursAgo,
            contact: { id: 'c-2', name: 'Xavier Alvarez', email: null, phone: '+33698765432' },
          },
        ],
      }),
    })

    const { detectStaleLeads } = await import('./ghl')
    const stale = await detectStaleLeads(2) // 2h threshold
    expect(stale).toHaveLength(1)
    expect(stale[0].id).toBe('opp-stale')
  })

  it('excludes recently updated leads', async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opportunities: [
          {
            id: 'opp-fresh',
            name: 'Inès Duprez',
            monetaryValue: 15000,
            pipelineId: 'pipe-1',
            pipelineStageId: 'stage-1',
            status: 'open',
            createdAt: '2026-04-07T08:00:00Z',
            updatedAt: thirtyMinAgo,
            contact: { id: 'c-3', name: 'Inès Duprez', email: null, phone: '+33677889900' },
          },
        ],
      }),
    })

    const { detectStaleLeads } = await import('./ghl')
    const stale = await detectStaleLeads(2)
    expect(stale).toHaveLength(0)
  })
})

describe('updateOpportunityStage', () => {
  it('calls PUT /opportunities/:id with new stageId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'opp-1' }) })

    const { updateOpportunityStage } = await import('./ghl')
    await updateOpportunityStage('opp-1', 'stage-proposal')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/opp-1'),
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- ghl.test.ts
```
Expected: FAIL — `Cannot find module './ghl'`

- [ ] **Step 3: Update `gateway/src/config.ts` to add GHL config**

At the end of the `config` object, add a `ghl` section (before the closing `} as const`):

```typescript
  ghl: {
    apiKey:     require_env('GHL_API_KEY'),
    locationId: require_env('GHL_LOCATION_ID'),
    baseUrl:    process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com',
  },
  twilio: {
    accountSid: require_env('TWILIO_ACCOUNT_SID'),
    authToken:  require_env('TWILIO_AUTH_TOKEN'),
    fromNumber: require_env('TWILIO_FROM_NUMBER'),
  },
```

Also update `gateway/.env.example` to add at the end:
```bash
# GHL (Go High Level CRM)
GHL_API_KEY=pit-...
GHL_LOCATION_ID=VZxWSmcMt2Hdtae8RuPs
GHL_BASE_URL=https://services.leadconnectorhq.com

# Twilio SMS (separate from WhatsApp — need a regular phone number)
TWILIO_ACCOUNT_SID=ACf014da...
TWILIO_AUTH_TOKEN=4356f5...
TWILIO_FROM_NUMBER=+33xxxxxxxxx
```

- [ ] **Step 4: Create `gateway/src/skills/ghl.ts`**

```typescript
import { config } from '../config'

export interface GHLOpportunity {
  id:              string
  name:            string
  monetaryValue:   number
  pipelineId:      string
  pipelineStageId: string
  status:          'open' | 'won' | 'lost' | 'abandoned'
  createdAt:       string
  updatedAt:       string
  contact: { id: string; name: string; email: string | null; phone: string | null } | null
}

async function ghlFetch(path: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${config.ghl.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${config.ghl.apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

/** Returns all open opportunities in the pipeline */
export async function getActivePipeline(): Promise<GHLOpportunity[]> {
  const data = await ghlFetch(
    `/opportunities/search?location_id=${config.ghl.locationId}&status=open&limit=50`
  ) as { opportunities?: GHLOpportunity[] }
  return data.opportunities ?? []
}

/** Returns open leads not updated in the last `hoursThreshold` hours */
export async function detectStaleLeads(hoursThreshold: number): Promise<GHLOpportunity[]> {
  const opps = await getActivePipeline()
  const cutoff = Date.now() - hoursThreshold * 60 * 60 * 1000
  return opps.filter(opp => new Date(opp.updatedAt).getTime() < cutoff)
}

/** Moves an opportunity to a new pipeline stage */
export async function updateOpportunityStage(oppId: string, stageId: string): Promise<void> {
  await ghlFetch(`/opportunities/${oppId}`, {
    method: 'PUT',
    body: JSON.stringify({ pipelineStageId: stageId }),
  })
}

// ─── Tool definitions for agent registration ──────────────────

export const ghlPipelineTool = {
  name: 'ghl_get_pipeline' as const,
  definition: {
    description: 'Get all open leads from the GHL CRM pipeline with their values and last update times',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  executor: async (_input: Record<string, unknown>) => {
    const opps = await getActivePipeline()
    return opps.map(o => ({
      id: o.id,
      name: o.name,
      value: o.monetaryValue,
      phone: o.contact?.phone,
      updatedAt: o.updatedAt,
      status: o.status,
    }))
  },
}

export const ghlStaleLeadsTool = {
  name: 'ghl_detect_stale_leads' as const,
  definition: {
    description: 'Find leads with no activity for more than N hours — used to trigger urgent follow-ups',
    input_schema: {
      type: 'object' as const,
      properties: {
        hours: { type: 'number', description: 'Hours threshold (default: 2)' },
      },
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const hours = typeof input.hours === 'number' ? input.hours : 2
    return detectStaleLeads(hours)
  },
}

export const ghlUpdateStageTool = {
  name: 'ghl_update_stage' as const,
  definition: {
    description: 'Move a GHL opportunity to a new pipeline stage',
    input_schema: {
      type: 'object' as const,
      properties: {
        oppId:   { type: 'string', description: 'Opportunity ID' },
        stageId: { type: 'string', description: 'Target pipeline stage ID' },
      },
      required: ['oppId', 'stageId'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    await updateOpportunityStage(String(input.oppId), String(input.stageId))
    return { ok: true }
  },
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- ghl.test.ts
```
Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/skills/ghl.ts gateway/src/skills/ghl.test.ts gateway/src/config.ts gateway/.env.example
git commit -m "feat(gateway): add GHL pipeline skill (get pipeline, detect stale leads, update stage)"
```

---

## Task 2: Twilio SMS Skill

**Files:**
- Create: `gateway/src/skills/twilio.ts`
- Create: `gateway/src/skills/twilio.test.ts`

Uses Twilio REST API with Basic auth (no SDK). Sends SMS to French phone numbers.

- [ ] **Step 1: Write the failing test**

Create `gateway/src/skills/twilio.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: {
    twilio: {
      accountSid: 'ACtest123',
      authToken:  'auth-token-test',
      fromNumber: '+33100000000',
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('sendSMS', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs to Twilio API with correct credentials and body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'SM123', status: 'queued' }),
    })

    const { sendSMS } = await import('./twilio')
    const result = await sendSMS('+33612345678', 'Bonjour Jean, je suis Kai...')

    expect(result.sid).toBe('SM123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic '),
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
  })

  it('throws when Twilio API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'The number is unverified' }),
    })

    const { sendSMS } = await import('./twilio')
    await expect(sendSMS('+33600000000', 'test')).rejects.toThrow('Twilio SMS error: 400')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- twilio.test.ts
```
Expected: FAIL — `Cannot find module './twilio'`

- [ ] **Step 3: Create `gateway/src/skills/twilio.ts`**

```typescript
import { config } from '../config'

interface TwilioResponse {
  sid:    string
  status: string
}

/** Sends an SMS via Twilio REST API (no SDK — native fetch) */
export async function sendSMS(to: string, body: string): Promise<TwilioResponse> {
  const { accountSid, authToken, fromNumber } = config.twilio

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!res.ok) {
    throw new Error(`Twilio SMS error: ${res.status}`)
  }

  return res.json() as Promise<TwilioResponse>
}

// ─── Tool definition for agent registration ───────────────────

export const twilioSmsTool = {
  name: 'twilio_send_sms' as const,
  definition: {
    description: 'Send an SMS to a prospect via Twilio. Use for first contact and follow-ups.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to:      { type: 'string', description: 'Phone number in E.164 format (e.g. +33612345678)' },
        message: { type: 'string', description: 'SMS content — max 160 chars, no markdown' },
      },
      required: ['to', 'message'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const result = await sendSMS(String(input.to), String(input.message))
    return { ok: true, sid: result.sid, status: result.status }
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- twilio.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/skills/twilio.ts gateway/src/skills/twilio.test.ts
git commit -m "feat(gateway): add Twilio SMS skill (native fetch, Basic auth)"
```

---

## Task 3: SessionManager.updateSoul()

**Files:**
- Modify: `gateway/src/sessions/SessionManager.ts`

Add a method to update an agent's SOUL.md content at runtime (needed for weekly self-improvement loop).

- [ ] **Step 1: Read the current SessionManager.ts**

Open `gateway/src/sessions/SessionManager.ts` to see the current structure. The file has `private agentCfg: { model: string; soul: string; skills: readonly string[] }`.

- [ ] **Step 2: Add `updateSoul` method**

After the `trimHistory` method (at the end of the class), add:

```typescript
  /** Replace this agent's SOUL.md content live — used by weekly self-improvement */
  updateSoul(newContent: string): void {
    this.agentCfg = { ...this.agentCfg, soul: newContent }
  }
```

- [ ] **Step 3: Add test for updateSoul in SessionManager.test.ts**

Open `gateway/src/sessions/SessionManager.test.ts` and add this test inside the `describe('SessionManager')` block:

```typescript
  it('updateSoul changes the system prompt used in subsequent calls', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'New soul response' }],
    })
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.updateSoul('You are a NEW version of Kai')
    await sm.send('Test')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      system: 'You are a NEW version of Kai',
    }))
  })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- SessionManager.test.ts
```
Expected: PASS — 3 tests pass (was 2, now 3).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/sessions/SessionManager.ts gateway/src/sessions/SessionManager.test.ts
git commit -m "feat(gateway): add SessionManager.updateSoul() for live SOUL.md hot-reload"
```

---

## Task 4: SOUL Route + update_soul Tool

**Files:**
- Create: `gateway/src/routes/soul.ts`
- Modify: `gateway/src/index.ts` (add soul route + register update_soul tool on Soren)

- [ ] **Step 1: Create `gateway/src/routes/soul.ts`**

```typescript
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config, type AgentName } from '../config'
import type { SessionManager } from '../sessions/SessionManager'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

const SOUL_DIR = path.join(__dirname, '../../../.agents')

export function makeSoulRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  // GET /agents/:agent/soul — return current soul content
  router.get('/:agent/soul', (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }
    const soulPath = path.join(SOUL_DIR, agent, 'SOUL.md')
    const content = fs.readFileSync(soulPath, 'utf-8')
    res.json({ agent, content })
  })

  // POST /agents/:agent/soul — update soul (from SaaS or self-improvement)
  router.post('/:agent/soul', async (req, res) => {
    const agent   = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }

    const { content, author = 'thomas' } = req.body as { content?: string; author?: string }
    if (!content) { res.status(400).json({ error: 'Missing content' }); return }

    // Write to disk
    const soulPath = path.join(SOUL_DIR, agent, 'SOUL.md')
    fs.writeFileSync(soulPath, content, 'utf-8')

    // Update live session
    sessions[agent].updateSoul(content)

    // Save version to Supabase
    await supabase.from('soul_versions').insert({ agent, content, author })

    res.json({ ok: true, agent, author })
  })

  return router
}
```

- [ ] **Step 2: Add `update_soul` tool registration in `gateway/src/index.ts`**

Open `gateway/src/index.ts`. After the existing tool loop (after `session.registerTool('log_interaction', ...)`), add a new block for Soren's extra tools:

```typescript
  // ── Soren-only: update_soul tool (used in weekly self-improvement) ──
  const soulDir = path.join(__dirname, '../../.agents')
  sessions.soren.registerTool(
    'update_soul',
    {
      description: 'Apply an approved SOUL.md update to Kai or Mia — saves to disk and activates immediately',
      input_schema: {
        type: 'object' as const,
        properties: {
          agent:   { type: 'string', enum: ['kai', 'mia'], description: 'Which agent to update' },
          content: { type: 'string', description: 'Complete new SOUL.md content' },
        },
        required: ['agent', 'content'],
      },
    },
    async (input) => {
      const agent   = input.agent as 'kai' | 'mia'
      const content = String(input.content)
      fs.writeFileSync(path.join(soulDir, agent, 'SOUL.md'), content, 'utf-8')
      sessions[agent].updateSoul(content)
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(config.supabase.url, config.supabase.serviceKey)
      await sb.from('soul_versions').insert({ agent, content, author: 'soren' })
      return { ok: true, agent, message: `${agent} SOUL.md updated and active` }
    }
  )
```

Also add `import fs from 'fs'` and `import path from 'path'` at the top of `index.ts` if not already there.

Add the soul router import and mounting:
```typescript
import { makeSoulRouter } from './routes/soul'
// ...in main(), after app.use('/events', makeEventsRouter()):
app.use('/agents', makeSoulRouter(sessions))
```

- [ ] **Step 3: Run all gateway tests**

```bash
cd C:/Users/thoma/qos/gateway && npm test
```
Expected: 22/22 passing (19 existing + 1 updateSoul + 2 twilio)

Wait: count is: 3 config + 3 EventBus + 2 logger + 3 SessionManager + 2 tools + 2 whisper + 4 router + 4 ghl + 2 twilio = 25 tests.

Expected: 25 passing.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/routes/soul.ts gateway/src/index.ts
git commit -m "feat(gateway): add SOUL.md route + update_soul tool for Soren self-improvement"
```

---

## Task 5: Cron — Daily Digest (07h00)

**Files:**
- Create: `gateway/src/cron/dailyDigest.ts`

Every day at 07h00, Soren wakes up, calls GHL, builds a formatted digest, and posts it to the Telegram group. No user interaction needed.

- [ ] **Step 1: Create `gateway/src/cron/dailyDigest.ts`**

```typescript
import type { SessionManager } from '../sessions/SessionManager'
import { getActivePipeline } from '../skills/ghl'

/**
 * buildDailyDigest: formats the GHL pipeline into a Telegram message for Soren to post.
 * Called by the 07h00 cron and by Soren's session so it uses telegram_send tool.
 */
export async function triggerDailyDigest(sorenSession: SessionManager): Promise<void> {
  const opps = await getActivePipeline()

  const open  = opps.filter(o => o.status === 'open')
  const total = open.reduce((sum, o) => sum + o.monetaryValue, 0)

  // Build the digest text — Soren will post this via telegram_send tool
  const digestPrompt = [
    'Génère et envoie le digest quotidien du pipeline. Utilise le tool telegram_send pour poster ce message EXACTEMENT dans le groupe :',
    '',
    `📊 *Digest pipeline — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}*`,
    '',
    `• ${open.length} leads actifs — valeur totale : *${total.toLocaleString('fr-FR')}€*`,
    ...open.slice(0, 5).map(o =>
      `  • ${o.contact?.name ?? o.name} | ${o.monetaryValue.toLocaleString('fr-FR')}€ | ↺ ${formatAge(o.updatedAt)}`
    ),
    open.length > 5 ? `  … et ${open.length - 5} autres` : '',
    '',
    'Bonne journée Thomas, je surveille le pipeline.',
  ].filter(Boolean).join('\n')

  await sorenSession.send(digestPrompt)
}

function formatAge(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffH  = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}j`
}
```

- [ ] **Step 2: Write a smoke test**

Create `gateway/src/cron/dailyDigest.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
vi.mock('../sessions/SessionManager', () => ({
  SessionManager: vi.fn(),
}))

const mockGetPipeline = vi.fn().mockResolvedValue([
  {
    id: 'opp-1', name: 'Dupont', monetaryValue: 30000, status: 'open',
    pipelineId: 'p1', pipelineStageId: 's1',
    createdAt: '2026-04-01T00:00:00Z', updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    contact: { id: 'c1', name: 'Jean Dupont', email: null, phone: '+336' },
  },
])
vi.mock('../skills/ghl', () => ({ getActivePipeline: mockGetPipeline }))

describe('triggerDailyDigest', () => {
  it('calls session.send with a digest prompt containing pipeline info', async () => {
    const fakeSession = { send: mockSend } as never
    const { triggerDailyDigest } = await import('./dailyDigest')
    await triggerDailyDigest(fakeSession)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Digest pipeline'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('30'))
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- dailyDigest.test.ts
```
Expected: PASS — 1 test passes.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/cron/dailyDigest.ts gateway/src/cron/dailyDigest.test.ts
git commit -m "feat(gateway): add daily digest cron (07h00 pipeline summary)"
```

---

## Task 6: Cron — Pipeline Poller (Every 10 Minutes)

**Files:**
- Create: `gateway/src/cron/pipelinePoller.ts`

Every 10 minutes, Soren checks for leads with no activity for > 2 hours. If found, it delegates urgent contact to Kai via sessions_send.

- [ ] **Step 1: Create `gateway/src/cron/pipelinePoller.ts`**

```typescript
import type { SessionManager } from '../sessions/SessionManager'
import { detectStaleLeads, type GHLOpportunity } from '../skills/ghl'
import { logInteraction } from '../supabase/logger'

/** Called every 10 minutes — finds stale leads and alerts Kai */
export async function runPipelinePoller(
  sorenSession: SessionManager
): Promise<void> {
  const stale = await detectStaleLeads(2)
  if (stale.length === 0) return

  for (const lead of stale) {
    const prompt = buildUrgentContactPrompt(lead)
    await sorenSession.send(prompt)

    await logInteraction({
      agent:   'soren',
      type:    'pipeline_poll',
      outcome: 'stale_lead_detected',
      duration: 0,
      lead_id: lead.id,
      metadata: { leadName: lead.contact?.name ?? lead.name, value: lead.monetaryValue },
    })
  }
}

function buildUrgentContactPrompt(lead: GHLOpportunity): string {
  const name  = lead.contact?.name ?? lead.name
  const phone = lead.contact?.phone ?? 'inconnu'
  const value = lead.monetaryValue.toLocaleString('fr-FR')
  const age   = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 3600_000)

  return [
    `🚨 Lead sans contact depuis ${age}h — action urgente requise.`,
    `Utilise sessions_send vers "kai" avec ce message :`,
    `"Contact urgent: ${name} (${phone}), budget estimé ${value}€,`,
    `pas de contact depuis ${age}h. Envoie un SMS de relance maintenant.`,
    `Lead ID GHL: ${lead.id}"`,
  ].join('\n')
}
```

- [ ] **Step 2: Write a smoke test**

Create `gateway/src/cron/pipelinePoller.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
const mockStale = vi.fn()
vi.mock('../skills/ghl', () => ({ detectStaleLeads: mockStale }))
vi.mock('../supabase/logger', () => ({ logInteraction: vi.fn().mockResolvedValue(undefined) }))

describe('runPipelinePoller', () => {
  it('does nothing when no stale leads', async () => {
    mockStale.mockResolvedValueOnce([])
    const { runPipelinePoller } = await import('./pipelinePoller')
    await runPipelinePoller({ send: mockSend } as never)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends urgent prompt to Soren for each stale lead', async () => {
    mockStale.mockResolvedValueOnce([
      {
        id: 'opp-1', name: 'Dupont', monetaryValue: 35000, status: 'open',
        pipelineId: 'p1', pipelineStageId: 's1',
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
        contact: { id: 'c1', name: 'Jean Dupont', email: null, phone: '+33612345678' },
      },
    ])
    const { runPipelinePoller } = await import('./pipelinePoller')
    await runPipelinePoller({ send: mockSend } as never)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Jean Dupont'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('sessions_send'))
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- pipelinePoller.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/cron/pipelinePoller.ts gateway/src/cron/pipelinePoller.test.ts
git commit -m "feat(gateway): add 10min pipeline poller — stale lead detection + Kai delegation"
```

---

## Task 7: Cron — Weekly Self-Improvement (Sunday 09h00)

**Files:**
- Create: `gateway/src/cron/weeklyAnalysis.ts`

Sunday morning, Soren reads the last 7 days of `agent_interactions` from Supabase, generates SOUL.md improvement suggestions for Kai and Mia, posts them to Telegram for Thomas's approval. When Thomas responds "oui", Soren's conversation history retains the pending context and it calls the `update_soul` tool to apply the changes.

- [ ] **Step 1: Create `gateway/src/cron/weeklyAnalysis.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { SessionManager } from '../sessions/SessionManager'
import { config } from '../config'
import { logInteraction } from '../supabase/logger'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

/** Runs Sunday 09h00: read interactions, generate SOUL.md suggestions, post to Telegram */
export async function runWeeklyAnalysis(sorenSession: SessionManager): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: interactions, error } = await supabase
    .from('agent_interactions')
    .select('agent, type, outcome, duration, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[weeklyAnalysis] Supabase read error:', error.message)
    return
  }

  if (!interactions || interactions.length === 0) {
    console.log('[weeklyAnalysis] No interactions this week — skipping analysis')
    return
  }

  const summary = buildInteractionSummary(interactions)

  const analysisPrompt = [
    'Analyse les interactions de la semaine et génère des suggestions d\'amélioration pour Kai et Mia.',
    'Utilise ensuite telegram_send pour poster le rapport dans le groupe.',
    '',
    'DONNÉES DE LA SEMAINE :',
    summary,
    '',
    'INSTRUCTIONS :',
    '1. Analyse les patterns (taux de succès par type, durées, outcomes)',
    '2. Génère 1-2 suggestions concrètes pour Kai (SMS, qualification)',
    '3. Génère 1 suggestion pour Mia si pertinent',
    '4. Propose les mises à jour SOUL.md sous forme de diff clair',
    '5. Poste via telegram_send et termine par : "Je mets à jour ? (oui/non)"',
    '6. Si Thomas répond "oui", applique avec update_soul.',
  ].join('\n')

  await sorenSession.send(analysisPrompt)

  await logInteraction({
    agent:    'soren',
    type:     'weekly_analysis',
    outcome:  'triggered',
    duration: 0,
    metadata: { interactionCount: interactions.length },
  })
}

interface Interaction {
  agent: string
  type: string
  outcome: string
  duration: number
  metadata: Record<string, unknown>
  created_at: string
}

function buildInteractionSummary(rows: Interaction[]): string {
  const byAgent = rows.reduce((acc, r) => {
    if (!acc[r.agent]) acc[r.agent] = []
    acc[r.agent].push(r)
    return acc
  }, {} as Record<string, Interaction[]>)

  return Object.entries(byAgent).map(([agent, items]) => {
    const successCount  = items.filter(i => i.outcome === 'success').length
    const total         = items.length
    const avgDuration   = Math.round(items.reduce((s, i) => s + (i.duration ?? 0), 0) / total)
    const byType = items.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      `${agent.toUpperCase()} — ${total} interactions, ${Math.round(successCount / total * 100)}% succès, durée moy: ${avgDuration}ms`,
      Object.entries(byType).map(([t, n]) => `  • ${t}: ${n}x`).join('\n'),
    ].join('\n')
  }).join('\n\n')
}
```

- [ ] **Step 2: Write a smoke test**

Create `gateway/src/cron/weeklyAnalysis.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.fn().mockResolvedValue('ok')
const mockSelect = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => ({
            limit: mockSelect,
          }),
        }),
      }),
    }),
  }),
}))
vi.mock('../config', () => ({
  config: { supabase: { url: 'https://test.supabase.co', serviceKey: 'key' } },
}))
vi.mock('../supabase/logger', () => ({ logInteraction: vi.fn().mockResolvedValue(undefined) }))

describe('runWeeklyAnalysis', () => {
  it('skips analysis when no interactions', async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null })
    const { runWeeklyAnalysis } = await import('./weeklyAnalysis')
    await runWeeklyAnalysis({ send: mockSend } as never)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('calls session.send with analysis prompt when interactions exist', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { agent: 'kai', type: 'sms', outcome: 'success', duration: 320, metadata: {}, created_at: new Date().toISOString() },
        { agent: 'kai', type: 'sms', outcome: 'no_response', duration: 0, metadata: {}, created_at: new Date().toISOString() },
      ],
      error: null,
    })
    const { runWeeklyAnalysis } = await import('./weeklyAnalysis')
    await runWeeklyAnalysis({ send: mockSend } as never)
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('Analyse les interactions'))
    expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('KAI'))
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- weeklyAnalysis.test.ts
```
Expected: PASS — 2 tests pass.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/cron/weeklyAnalysis.ts gateway/src/cron/weeklyAnalysis.test.ts
git commit -m "feat(gateway): add weekly self-improvement cron (Sunday 09h00 Supabase analysis)"
```

---

## Task 8: Cron Scheduler + Final index.ts Wiring

**Files:**
- Create: `gateway/src/cron/scheduler.ts`
- Modify: `gateway/src/index.ts` (register GHL/Twilio tools, init crons)

- [ ] **Step 1: Create `gateway/src/cron/scheduler.ts`**

```typescript
import cron from 'node-cron'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'
import { triggerDailyDigest } from './dailyDigest'
import { runPipelinePoller }  from './pipelinePoller'
import { runWeeklyAnalysis }  from './weeklyAnalysis'

export function initScheduler(sessions: Record<AgentName, SessionManager>): void {
  // 07h00 every day — daily digest
  cron.schedule('0 7 * * *', async () => {
    console.log('[cron] Daily digest triggered')
    await triggerDailyDigest(sessions.soren).catch(err =>
      console.error('[cron] Daily digest error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  // Every 10 minutes — pipeline poller
  cron.schedule('*/10 * * * *', async () => {
    console.log('[cron] Pipeline poll triggered')
    await runPipelinePoller(sessions.soren).catch(err =>
      console.error('[cron] Pipeline poll error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  // Sunday 09h00 — weekly self-improvement
  cron.schedule('0 9 * * 0', async () => {
    console.log('[cron] Weekly analysis triggered')
    await runWeeklyAnalysis(sessions.soren).catch(err =>
      console.error('[cron] Weekly analysis error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  console.log('[gateway] Cron scheduler initialized (3 jobs: digest, poller, weekly)')
}
```

- [ ] **Step 2: Register GHL + Twilio tools in `gateway/src/index.ts`**

Open `gateway/src/index.ts`. After the existing 3-tool registration loop (telegram_send, sessions_send, log_interaction), add skill registrations per agent.

Add imports at the top:
```typescript
import { ghlPipelineTool, ghlStaleLeadsTool, ghlUpdateStageTool } from './skills/ghl'
import { twilioSmsTool } from './skills/twilio'
import { initScheduler } from './cron/scheduler'
```

After the existing tool registration loop ends, add:
```typescript
  // ── Register agent-specific skills ───────────────────────────
  // Soren: GHL pipeline visibility
  sessions.soren.registerTool(ghlPipelineTool.name, ghlPipelineTool.definition, ghlPipelineTool.executor)
  sessions.soren.registerTool(ghlStaleLeadsTool.name, ghlStaleLeadsTool.definition, ghlStaleLeadsTool.executor)

  // Kai: GHL lead management + Twilio SMS
  sessions.kai.registerTool(ghlPipelineTool.name, ghlPipelineTool.definition, ghlPipelineTool.executor)
  sessions.kai.registerTool(ghlUpdateStageTool.name, ghlUpdateStageTool.definition, ghlUpdateStageTool.executor)
  sessions.kai.registerTool(twilioSmsTool.name, twilioSmsTool.definition, twilioSmsTool.executor)
```

After webhook registration, add:
```typescript
  // ── Initialize cron scheduler ────────────────────────────────
  initScheduler(sessions)
```

- [ ] **Step 3: Build to verify TypeScript compiles**

```bash
cd C:/Users/thoma/qos/gateway && npm run build
```
Expected: `dist/` regenerated, zero TypeScript errors.

- [ ] **Step 4: Run all gateway tests**

```bash
cd C:/Users/thoma/qos/gateway && npm test
```
Expected: 30+ tests all passing.

Exact count: 3 config + 3 EventBus + 2 logger + 3 SessionManager + 2 tools + 2 whisper + 4 router + 4 ghl + 2 twilio + 1 dailyDigest + 2 pipelinePoller + 2 weeklyAnalysis = **30 tests**.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos
git add gateway/src/cron/scheduler.ts gateway/src/index.ts
git commit -m "feat(gateway): wire GHL/Twilio skills + 3 cron jobs (digest, poll, weekly analysis)"
```

---

## Running All Tests

```bash
cd C:/Users/thoma/qos/gateway && npm test
```

Expected output:
```
✓ src/config.test.ts (3 tests)
✓ src/EventBus.test.ts (3 tests)
✓ src/supabase/logger.test.ts (2 tests)
✓ src/sessions/SessionManager.test.ts (3 tests)
✓ src/sessions/tools.test.ts (2 tests)
✓ src/telegram/whisper.test.ts (2 tests)
✓ src/telegram/router.test.ts (4 tests)
✓ src/skills/ghl.test.ts (4 tests)
✓ src/skills/twilio.test.ts (2 tests)
✓ src/cron/dailyDigest.test.ts (1 test)
✓ src/cron/pipelinePoller.test.ts (2 tests)
✓ src/cron/weeklyAnalysis.test.ts (2 tests)

Test Files  12 passed (12)
Tests      30 passed (30)
```

## Deploying Plan B on Hetzner

After tasks complete, deploy to VPS:

```bash
# On VPS:
cd /var/www/qos/gateway
git pull
npm install && npm run build
pm2 restart openclaw-gateway
pm2 logs openclaw-gateway --lines 20
```

Verify crons are registered:
```bash
curl http://localhost:18789/health
# Check logs show: "[gateway] Cron scheduler initialized (3 jobs)"
```
