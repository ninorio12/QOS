# Équipe IA — Plan C-Gateway: Tool Toggle + Health Extension

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the gateway the ability to enable/disable agent tools at runtime and expose active tools in the health endpoint — used by the SaaS control panel.

**Architecture:** Add `disableTool/enableTool/getActiveToolNames` to `SessionManager`, wire a new `POST /agents/:agent/tools/:tool/toggle` Express route, and extend `GET /health` to return active tool names per agent. All changes are backward-compatible — existing tools, sessions, and crons are unaffected.

**Tech Stack:** Node.js 20, TypeScript, Express, vitest (already configured at `gateway/`)

**This is Plan C-Gateway of 2:**
- **Plan C-Gateway (this):** Runtime tool toggle + extended health
- **Plan C-SaaS (next):** SaaS drawer UI consuming these endpoints

**Prereqs:** Plans A and B complete. 30 passing gateway tests. `gateway/src/sessions/SessionManager.ts`, `gateway/src/index.ts` exist.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `gateway/src/sessions/SessionManager.ts` | Modify | Add `disabledTools` map, `disableTool`, `enableTool`, `getActiveToolNames` |
| `gateway/src/sessions/SessionManager.test.ts` | Modify | Add 2 tests for disable/enable/getActive |
| `gateway/src/routes/tools.ts` | Create | `POST /agents/:agent/tools/:tool/toggle` handler |
| `gateway/src/routes/tools.test.ts` | Create | 3 integration tests (404 unknown, disable, enable) |
| `gateway/src/index.ts` | Modify | Mount tools router + extend `/health` response |

---

## Task 1: SessionManager — disableTool / enableTool / getActiveToolNames

**Files:**
- Modify: `gateway/src/sessions/SessionManager.ts`
- Modify: `gateway/src/sessions/SessionManager.test.ts`

- [ ] **Step 1: Add failing tests**

Open `gateway/src/sessions/SessionManager.test.ts`. Inside the `describe('SessionManager')` block, after the last `it(...)`, add:

```typescript
  it('disableTool removes a tool from active tools', async () => {
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool(
      'test_tool',
      { description: 'test', input_schema: { type: 'object' as const, properties: {} } },
      async () => ({})
    )
    expect(sm.getActiveToolNames()).toContain('test_tool')
    sm.disableTool('test_tool')
    expect(sm.getActiveToolNames()).not.toContain('test_tool')
  })

  it('enableTool restores a previously disabled tool', async () => {
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool(
      'test_tool',
      { description: 'test', input_schema: { type: 'object' as const, properties: {} } },
      async () => ({})
    )
    sm.disableTool('test_tool')
    sm.enableTool('test_tool')
    expect(sm.getActiveToolNames()).toContain('test_tool')
  })
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- SessionManager.test.ts
```
Expected: FAIL — `sm.getActiveToolNames is not a function`

- [ ] **Step 3: Add methods to SessionManager**

In `gateway/src/sessions/SessionManager.ts`, add a `disabledTools` field and three methods. The class currently ends with `trimHistory` and `updateSoul`. After `updateSoul`, add:

```typescript
  private disabledTools = new Map<string, ToolEntry>()

  /** Remove a tool from the active tools map (tool kept in disabledTools for re-enable) */
  disableTool(name: string): void {
    const entry = this.tools.get(name)
    if (entry) {
      this.disabledTools.set(name, entry)
      this.tools.delete(name)
    }
  }

  /** Restore a previously disabled tool to the active tools map */
  enableTool(name: string): void {
    const entry = this.disabledTools.get(name)
    if (entry) {
      this.tools.set(name, entry)
      this.disabledTools.delete(name)
    }
  }

  /** Returns names of all currently active (not disabled) tools */
  getActiveToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
```

Note: `private disabledTools` must be declared as a class field. Add it alongside the existing `private tools = new Map<string, ToolEntry>()` line.

Full updated field declarations section (lines 15-17 area):
```typescript
  private tools         = new Map<string, ToolEntry>()
  private disabledTools = new Map<string, ToolEntry>()
  private agentCfg: { model: string; soul: string; skills: readonly string[] }
```

- [ ] **Step 4: Run tests**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- SessionManager.test.ts
```
Expected: PASS — 5 tests pass (was 3, now 5).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add gateway/src/sessions/SessionManager.ts gateway/src/sessions/SessionManager.test.ts && rtk git commit -m "feat(gateway): add disableTool/enableTool/getActiveToolNames to SessionManager"
```

---

## Task 2: Tools Route

**Files:**
- Create: `gateway/src/routes/tools.ts`
- Create: `gateway/src/routes/tools.test.ts`

- [ ] **Step 1: Write failing tests**

Create `gateway/src/routes/tools.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { makeToolsRouter } from './tools'
import type { AgentName } from '../config'

const disableFn        = vi.fn()
const enableFn         = vi.fn()
const getActiveToolsFn = vi.fn().mockReturnValue(['tool_a', 'tool_b'])

const mockSessions = {
  kai: {
    disableTool:      disableFn,
    enableTool:       enableFn,
    getActiveToolNames: getActiveToolsFn,
  },
} as unknown as Record<AgentName, Parameters<typeof makeToolsRouter>[0][AgentName]>

const app = express()
app.use(express.json())
app.use('/agents', makeToolsRouter(mockSessions as never))

let server: ReturnType<typeof app.listen>
let port: number

beforeAll(() => new Promise<void>(resolve => {
  server = app.listen(0, () => {
    port = (server.address() as { port: number }).port
    resolve()
  })
}))

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))

describe('makeToolsRouter', () => {
  it('returns 404 for unknown agent', async () => {
    const res = await fetch(
      `http://localhost:${port}/agents/unknown/tools/twilio_send_sms/toggle`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: false }) }
    )
    expect(res.status).toBe(404)
  })

  it('calls disableTool when enabled:false', async () => {
    vi.clearAllMocks()
    const res = await fetch(
      `http://localhost:${port}/agents/kai/tools/twilio_send_sms/toggle`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: false }) }
    )
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.enabled).toBe(false)
    expect(disableFn).toHaveBeenCalledWith('twilio_send_sms')
    expect(enableFn).not.toHaveBeenCalled()
  })

  it('calls enableTool when enabled:true', async () => {
    vi.clearAllMocks()
    const res = await fetch(
      `http://localhost:${port}/agents/kai/tools/twilio_send_sms/toggle`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) }
    )
    expect(res.ok).toBe(true)
    expect(enableFn).toHaveBeenCalledWith('twilio_send_sms')
    expect(disableFn).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- tools.test.ts
```
Expected: FAIL — `Cannot find module './tools'`

- [ ] **Step 3: Create `gateway/src/routes/tools.ts`**

```typescript
import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'

export function makeToolsRouter(sessions: Record<AgentName, SessionManager>): Router {
  const router = Router()

  // POST /agents/:agent/tools/:tool/toggle
  // Body: { enabled: boolean }
  router.post('/:agent/tools/:tool/toggle', (req, res) => {
    const agent = req.params.agent as AgentName
    const tool  = req.params.tool
    const { enabled } = req.body as { enabled: boolean }

    if (!sessions[agent]) {
      res.status(404).json({ error: 'Unknown agent' })
      return
    }

    if (enabled) {
      sessions[agent].enableTool(tool)
    } else {
      sessions[agent].disableTool(tool)
    }

    res.json({
      ok:          true,
      agent,
      tool,
      enabled,
      activeTools: sessions[agent].getActiveToolNames(),
    })
  })

  return router
}
```

- [ ] **Step 4: Run tests**

```bash
cd C:/Users/thoma/qos/gateway && npm test -- tools.test.ts
```
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add gateway/src/routes/tools.ts gateway/src/routes/tools.test.ts && rtk git commit -m "feat(gateway): add POST /agents/:agent/tools/:tool/toggle route"
```

---

## Task 3: Wire Tools Router + Extend /health

**Files:**
- Modify: `gateway/src/index.ts`

- [ ] **Step 1: Add tools router import**

Open `gateway/src/index.ts`. In the imports section (after `import { makeSoulRouter } from './routes/soul'`), add:

```typescript
import { makeToolsRouter } from './routes/tools'
```

- [ ] **Step 2: Mount the tools router**

After `app.use('/agents', makeSoulRouter(sessions))`, add:

```typescript
  app.use('/agents', makeToolsRouter(sessions))
```

Note: Both `/agents` routes coexist — Express matches by method+path. Soul router handles `GET/POST /:agent/soul`, tools router handles `POST /:agent/tools/:tool/toggle`. No conflict.

- [ ] **Step 3: Extend /health response**

Replace the existing `/health` handler:

```typescript
  app.get('/health', (_req, res) => {
    res.json({ ok: true, agents: Object.keys(sessions), uptime: process.uptime() })
  })
```

With:

```typescript
  app.get('/health', (_req, res) => {
    const agentStatuses = Object.fromEntries(
      (Object.keys(sessions) as AgentName[]).map(name => [
        name,
        {
          online:      true,
          activeTools: sessions[name].getActiveToolNames(),
        },
      ])
    )
    res.json({
      ok:      true,
      uptime:  process.uptime(),
      agents:  agentStatuses,
    })
  })
```

- [ ] **Step 4: Build to verify TypeScript**

```bash
cd C:/Users/thoma/qos/gateway && npm run build
```
Expected: Zero errors, `dist/` regenerated.

- [ ] **Step 5: Run all gateway tests**

```bash
cd C:/Users/thoma/qos/gateway && npm test
```
Expected: 33 tests pass (30 existing + 2 SessionManager + 3 tools — wait: existing was 30 + new SessionManager 2 = 32 after Task 1, + 3 tools = 35 total).

Exact count: 3 config + 3 EventBus + 2 logger + **5** SessionManager + 2 tools-helpers + 2 whisper + 4 router + 4 ghl + 2 twilio + 1 dailyDigest + 2 pipelinePoller + 2 weeklyAnalysis + **3** tools-route = **35 tests**.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add gateway/src/index.ts && rtk git commit -m "feat(gateway): mount tools router + extend /health with active tools per agent"
```

---

## Running All Tests

```bash
cd C:/Users/thoma/qos/gateway && npm test
```
Expected: **35 tests, all passing.**

---

## Manual Verification (local)

Start the gateway in dev mode:
```bash
cd C:/Users/thoma/qos/gateway && npm run dev
```

Test toggle:
```bash
curl -X POST http://localhost:18789/agents/kai/tools/twilio_send_sms/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
# Expected: {"ok":true,"agent":"kai","tool":"twilio_send_sms","enabled":false,"activeTools":["telegram_send","sessions_send","log_interaction","ghl_get_pipeline","ghl_update_stage"]}

curl http://localhost:18789/health
# Expected: {"ok":true,"uptime":...,"agents":{"soren":{"online":true,"activeTools":[...]},...}}
```
