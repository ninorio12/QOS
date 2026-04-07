# Équipe IA — Plan C-SaaS: Drawer de contrôle agents

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated `/equipe` page with a live-connected control panel: real agent statuses from the gateway, SSE event feed, and a lateral drawer per agent with SOUL.md editor, skill toggles, and Prompt Lab.

**Architecture:** Two hooks (`useGatewayEvents`, `useAgentStatus`) feed real data into the existing organigram. Clicking an agent opens `AgentDrawer` (480px, 4 tabs). Four proxy Next.js API routes relay calls to the OpenClaw gateway. No new Supabase tables. SaaS has no test setup — verification is TypeScript build (`npm run build`).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, lucide-react, Anthropic SDK (already installed), `OPENCLAW_GATEWAY_URL` env var (already used in `/api/openclaw/events`)

**This is Plan C-SaaS of 2:**
- **Plan C-Gateway (done first):** Runtime tool toggle + health extension
- **Plan C-SaaS (this):** SaaS UI consuming those endpoints

**Prereqs:**
- Plan C-Gateway complete and deployed (or running locally at `http://localhost:18789`)
- `OPENCLAW_GATEWAY_URL=http://localhost:18789` in `.env.local` for local dev
- `src/app/api/openclaw/events/route.ts` exists (already uses `OPENCLAW_GATEWAY_URL`)
- `src/app/api/test-agent/route.ts` exists
- `src/components/equipe/EquipeView.tsx` (607 lines, fully simulated) exists
- `src/components/equipe/agents.ts` with `EQUIPE_AGENTS`, `EquipeAgent` type exists

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/openclaw/status/route.ts` | Replace | Call real gateway `/health`, fallback to offline when `OPENCLAW_GATEWAY_URL` unset |
| `src/app/api/test-agent/route.ts` | Modify | Accept optional `systemPrompt` param to override hardcoded prompts |
| `src/app/api/openclaw/agents/[agent]/soul/route.ts` | Create | Proxy `GET/POST` to gateway `/agents/:agent/soul` |
| `src/app/api/openclaw/agents/[agent]/tools/[tool]/route.ts` | Create | Proxy `POST` to gateway `/agents/:agent/tools/:tool/toggle` |
| `src/hooks/useGatewayEvents.ts` | Create | SSE hook — subscribes to `/api/openclaw/events`, returns last 50 events |
| `src/hooks/useAgentStatus.ts` | Create | Polling hook — polls `/api/openclaw/status` every 30s, returns per-agent status |
| `src/components/equipe/tabs/LiveTab.tsx` | Create | SSE events filtered by agent + heartbeat status |
| `src/components/equipe/tabs/SoulTab.tsx` | Create | SOUL.md textarea editor + save |
| `src/components/equipe/tabs/SkillsTab.tsx` | Create | Skill toggle list + live toggle calls |
| `src/components/equipe/tabs/PromptLabTab.tsx` | Create | Test SOUL.md with real Anthropic, then publish |
| `src/components/equipe/AgentDrawer.tsx` | Create | 480px fixed drawer, 4 tabs, backdrop close |
| `src/components/equipe/EquipeView.tsx` | Modify | Replace simulation with real hooks + open drawer on agent click |

---

## Task 1: Fix `/api/openclaw/status` — Connect to Real Gateway

**Files:**
- Replace: `src/app/api/openclaw/status/route.ts`

The current file is 90 lines of mock data with a TODO comment. Replace it entirely.

- [ ] **Step 1: Replace `src/app/api/openclaw/status/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

interface AgentHealth {
  online:      boolean
  activeTools: string[]
}

function offlineStatus() {
  const offline: AgentHealth = { online: false, activeTools: [] }
  return {
    ok:     false,
    uptime: 0,
    agents: { soren: offline, kai: offline, mia: offline },
  }
}

export async function GET() {
  if (!GATEWAY_URL) return NextResponse.json(offlineStatus())

  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json(offlineStatus())
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(offlineStatus())
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:/Users/thoma/qos && rtk next build 2>&1 | tail -5
```
Expected: Build completes, no TypeScript errors on this file.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/openclaw/status/route.ts && rtk git commit -m "feat(saas): connect /api/openclaw/status to real gateway health endpoint"
```

---

## Task 2: Extend `/api/test-agent` — Accept `systemPrompt` Override

**Files:**
- Modify: `src/app/api/test-agent/route.ts`

The Prompt Lab needs to test a custom SOUL.md. Current route uses hardcoded system prompts. Accept optional `systemPrompt` param that overrides the default.

- [ ] **Step 1: Update the POST handler**

The current handler reads `{ messages, agent }`. Change it to also accept `systemPrompt`:

Replace lines 16-22 (the handler signature and destructure):
```typescript
export async function POST(req: NextRequest) {
  try {
    const { messages, agent = 'kai', systemPrompt } = await req.json() as {
      messages:     Anthropic.MessageParam[]
      agent:        string
      systemPrompt?: string
    }
```

Replace line 27 (system prompt assignment):
```typescript
    const systemToUse = systemPrompt ?? (SYSTEM_PROMPTS[agent] ?? SYSTEM_PROMPTS.kai)
```

Replace line 31 (stream call):
```typescript
    const stream = anthropic.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     systemToUse,
      messages,
    })
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "test-agent"
```
Expected: No errors on this file.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/test-agent/route.ts && rtk git commit -m "feat(saas): add optional systemPrompt override to /api/test-agent"
```

---

## Task 3: Soul + Tools Proxy API Routes

**Files:**
- Create: `src/app/api/openclaw/agents/[agent]/soul/route.ts`
- Create: `src/app/api/openclaw/agents/[agent]/tools/[tool]/route.ts`

These are thin proxies — they forward requests to the OpenClaw gateway.

- [ ] **Step 1: Create `src/app/api/openclaw/agents/[agent]/soul/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

type Params = { params: { agent: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
  }
  try {
    const res  = await fetch(`${GATEWAY_URL}/agents/${params.agent}/soul`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Gateway unreachable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const res  = await fetch(`${GATEWAY_URL}/agents/${params.agent}/soul`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Gateway unreachable' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/openclaw/agents/[agent]/tools/[tool]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

type Params = { params: { agent: string; tool: string } }

export async function POST(req: NextRequest, { params }: Params) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const res  = await fetch(
      `${GATEWAY_URL}/agents/${params.agent}/tools/${params.tool}/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Gateway unreachable' }, { status: 503 })
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep -E "soul|tools"
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/openclaw/agents/ && rtk git commit -m "feat(saas): add proxy routes for soul GET/POST and tool toggle"
```

---

## Task 4: `useGatewayEvents` Hook

**Files:**
- Create: `src/hooks/useGatewayEvents.ts`

- [ ] **Step 1: Create `src/hooks/useGatewayEvents.ts`**

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'

export interface GatewayEvent {
  type:      string
  from:      string
  to:        string
  msg:       string
  timestamp: string
  id?:       number
}

/** Subscribes to the OpenClaw SSE stream. Returns the last `maxEvents` events. */
export function useGatewayEvents(maxEvents = 50): GatewayEvent[] {
  const [events, setEvents] = useState<GatewayEvent[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/openclaw/events')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as GatewayEvent
        if (data.type === 'connected') return
        setEvents(prev => [...prev.slice(-(maxEvents - 1)), data])
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      // EventSource reconnects automatically — no action needed
    }

    return () => {
      es.close()
    }
  }, [maxEvents])

  return events
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "useGatewayEvents"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/hooks/useGatewayEvents.ts && rtk git commit -m "feat(saas): add useGatewayEvents SSE hook"
```

---

## Task 5: `useAgentStatus` Hook

**Files:**
- Create: `src/hooks/useAgentStatus.ts`

- [ ] **Step 1: Create `src/hooks/useAgentStatus.ts`**

```typescript
'use client'
import { useEffect, useState } from 'react'

export interface AgentStatusData {
  online:      boolean
  activeTools: string[]
}

export type AgentStatusMap = Record<string, AgentStatusData>

/** Polls /api/openclaw/status every 30s. Returns per-agent online status and active tools. */
export function useAgentStatus(): AgentStatusMap {
  const [status, setStatus] = useState<AgentStatusMap>({})

  useEffect(() => {
    async function poll() {
      try {
        const res  = await fetch('/api/openclaw/status')
        const data = await res.json() as { agents?: AgentStatusMap }
        if (data.agents) setStatus(data.agents)
      } catch {
        // keep last known state on error
      }
    }

    poll()
    const interval = setInterval(poll, 30_000)
    return () => clearInterval(interval)
  }, [])

  return status
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "useAgentStatus"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/hooks/useAgentStatus.ts && rtk git commit -m "feat(saas): add useAgentStatus polling hook (30s interval)"
```

---

## Task 6: LiveTab

**Files:**
- Create: `src/components/equipe/tabs/LiveTab.tsx`

- [ ] **Step 1: Create `src/components/equipe/tabs/LiveTab.tsx`**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import type { GatewayEvent } from '@/hooks/useGatewayEvents'
import type { AgentStatusData } from '@/hooks/useAgentStatus'

interface LiveTabProps {
  agentId: string
  events:  GatewayEvent[]
  status:  AgentStatusData | undefined
}

export function LiveTab({ agentId, events, status }: LiveTabProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Filter events involving this agent
  const agentEvents = events.filter(
    e => e.from === agentId || e.to === agentId
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentEvents.length])

  const isOnline = status?.online ?? false

  return (
    <div className="flex flex-col gap-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-sm font-medium text-white">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
        {status?.activeTools && (
          <span className="text-xs text-gray-400 ml-auto">
            {status.activeTools.length} tool{status.activeTools.length !== 1 ? 's' : ''} actif{status.activeTools.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Active tools list */}
      {status?.activeTools && status.activeTools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {status.activeTools.map(tool => (
            <span
              key={tool}
              className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/5 text-gray-300 border border-white/10"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Event feed */}
      <div className="bg-black/40 rounded-xl border border-white/10 p-3 h-64 overflow-y-auto font-mono text-xs">
        {agentEvents.length === 0 ? (
          <p className="text-gray-500 text-center mt-8">
            {isOnline ? 'En attente d\'événements…' : 'Connectez le gateway pour voir les événements'}
          </p>
        ) : (
          agentEvents.map((e, i) => (
            <div key={i} className="flex gap-2 mb-1 text-gray-300 leading-relaxed">
              <span className="text-gray-500 shrink-0">
                {new Date(e.timestamp).toLocaleTimeString('fr-FR')}
              </span>
              <span className="text-blue-400 shrink-0">{e.type}</span>
              <span className="text-gray-400 truncate">{e.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "LiveTab"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/tabs/LiveTab.tsx && rtk git commit -m "feat(saas): add LiveTab — SSE event feed + active tools"
```

---

## Task 7: SoulTab

**Files:**
- Create: `src/components/equipe/tabs/SoulTab.tsx`

- [ ] **Step 1: Create `src/components/equipe/tabs/SoulTab.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

interface SoulTabProps {
  agentId: string
}

export function SoulTab({ agentId }: SoulTabProps) {
  const [original, setOriginal] = useState('')
  const [content,  setContent]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const isDirty = content !== original

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/openclaw/agents/${agentId}/soul`)
      .then(r => r.json())
      .then((data: { content?: string; error?: string }) => {
        if (data.error) { setError(data.error); return }
        setOriginal(data.content ?? '')
        setContent(data.content ?? '')
      })
      .catch(() => setError('Gateway inaccessible'))
      .finally(() => setLoading(false))
  }, [agentId])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/openclaw/agents/${agentId}/soul`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Erreur gateway')
      setOriginal(content)
      setToast('SOUL.md mis à jour ✓')
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-white/5 rounded-xl" />
  }

  if (error) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className="px-3 py-2 rounded-lg bg-green-900/40 border border-green-500/30 text-green-400 text-sm">
          {toast}
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[320px] bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 resize-y focus:outline-none focus:border-white/30 leading-relaxed"
        spellCheck={false}
      />

      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          enabled:bg-[#3462EE] enabled:text-white enabled:hover:bg-[#2450CC]"
      >
        <Save size={14} />
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "SoulTab"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/tabs/SoulTab.tsx && rtk git commit -m "feat(saas): add SoulTab — SOUL.md inline editor with dirty tracking"
```

---

## Task 8: SkillsTab

**Files:**
- Create: `src/components/equipe/tabs/SkillsTab.tsx`

Skills visible = `config.agents[agent].skills` from `openclaw.config.json`. We hardcode the skill list per agent (it's static config — read at startup) using the values in `openclaw.config.json`. Active state comes from `AgentStatusData.activeTools`.

- [ ] **Step 1: Create `src/components/equipe/tabs/SkillsTab.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { AgentStatusData } from '@/hooks/useAgentStatus'

// Tool name → display name + description (from openclaw.config.json skills list)
const TOOL_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  telegram_send:          { label: 'Telegram Send',    description: 'Poste des messages dans le groupe Telegram' },
  sessions_send:          { label: 'Sessions Send',    description: 'Délègue vers un autre agent' },
  log_interaction:        { label: 'Log Interaction',  description: 'Enregistre les actions dans Supabase' },
  ghl_get_pipeline:       { label: 'GHL Pipeline',     description: 'Lit les opportunités du CRM' },
  ghl_detect_stale_leads: { label: 'GHL Stale Leads',  description: 'Détecte les leads sans contact > 2h' },
  ghl_update_stage:       { label: 'GHL Update Stage', description: 'Change le stage d\'une opportunité' },
  twilio_send_sms:        { label: 'Twilio SMS',       description: 'Envoie des SMS via Twilio' },
  update_soul:            { label: 'Update Soul',      description: 'Met à jour le SOUL.md d\'un agent' },
}

interface SkillsTabProps {
  agentId: string
  status:  AgentStatusData | undefined
  onToggle: (tool: string, enabled: boolean) => Promise<void>
}

export function SkillsTab({ agentId, status, onToggle }: SkillsTabProps) {
  const [pending, setPending] = useState<string | null>(null)
  const activeTools = status?.activeTools ?? []
  const isGatewayOnline = status?.online ?? false

  // All known tools for this agent (from both active and possible disabled)
  // We show all tools that were ever registered — infer from TOOL_DESCRIPTIONS keys
  // filtered by what makes sense per agent
  const AGENT_TOOLS: Record<string, string[]> = {
    soren: ['telegram_send', 'sessions_send', 'log_interaction', 'ghl_get_pipeline', 'ghl_detect_stale_leads', 'update_soul'],
    kai:   ['telegram_send', 'sessions_send', 'log_interaction', 'ghl_get_pipeline', 'ghl_update_stage', 'twilio_send_sms'],
    mia:   ['telegram_send', 'sessions_send', 'log_interaction'],
  }

  const tools = AGENT_TOOLS[agentId] ?? []

  async function handleToggle(tool: string, currentlyActive: boolean) {
    setPending(tool)
    try {
      await onToggle(tool, !currentlyActive)
    } finally {
      setPending(null)
    }
  }

  if (!isGatewayOnline) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Gateway hors ligne — impossible de modifier les skills
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tools.map(tool => {
        const isActive = activeTools.includes(tool)
        const isPending = pending === tool
        const meta = TOOL_DESCRIPTIONS[tool] ?? { label: tool, description: '' }

        return (
          <div
            key={tool}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium text-white">{meta.label}</p>
              {meta.description && (
                <p className="text-xs text-gray-400 truncate">{meta.description}</p>
              )}
            </div>

            {/* Toggle switch */}
            <button
              onClick={() => handleToggle(tool, isActive)}
              disabled={isPending}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0
                ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                ${isActive ? 'bg-[#3462EE]' : 'bg-white/20'}
              `}
              aria-label={`${isActive ? 'Désactiver' : 'Activer'} ${meta.label}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                  ${isActive ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "SkillsTab"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/tabs/SkillsTab.tsx && rtk git commit -m "feat(saas): add SkillsTab — live skill toggle per agent"
```

---

## Task 9: PromptLabTab

**Files:**
- Create: `src/components/equipe/tabs/PromptLabTab.tsx`

- [ ] **Step 1: Create `src/components/equipe/tabs/PromptLabTab.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Play, Upload } from 'lucide-react'

interface PromptLabTabProps {
  agentId:     string
  currentSoul: string  // passed from SoulTab's loaded content
}

export function PromptLabTab({ agentId, currentSoul }: PromptLabTabProps) {
  const [labSoul,    setLabSoul]    = useState(currentSoul)
  const [testMsg,    setTestMsg]    = useState('')
  const [response,   setResponse]   = useState('')
  const [testing,    setTesting]    = useState(false)
  const [tested,     setTested]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)

  async function handleTest() {
    if (!testMsg.trim()) return
    setTesting(true)
    setResponse('')
    setTested(false)

    try {
      const res = await fetch('/api/test-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agent:        agentId,
          systemPrompt: labSoul,
          messages:     [{ role: 'user', content: testMsg }],
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setResponse(full)
      }

      setTested(true)
    } catch (e) {
      setResponse(e instanceof Error ? `Erreur: ${e.message}` : 'Erreur inconnue')
    } finally {
      setTesting(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/openclaw/agents/${agentId}/soul`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: labSoul }),
      })
      if (!res.ok) throw new Error('Erreur gateway')
      setToast('SOUL.md publié et actif ✓')
      setTested(false)
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="px-3 py-2 rounded-lg bg-green-900/40 border border-green-500/30 text-green-400 text-sm">
          {toast}
        </div>
      )}

      {/* SOUL.md temp editor */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">SOUL.md à tester</label>
        <textarea
          value={labSoul}
          onChange={e => { setLabSoul(e.target.value); setTested(false) }}
          className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 resize-y focus:outline-none focus:border-white/30"
          spellCheck={false}
        />
      </div>

      {/* Test message */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Message de test</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testMsg}
            onChange={e => { setTestMsg(e.target.value); setTested(false) }}
            onKeyDown={e => e.key === 'Enter' && handleTest()}
            placeholder="Ex: Nouveau lead façade 35k€, pas de réponse depuis 3h"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleTest}
            disabled={!testMsg.trim() || testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#3462EE] text-white
              disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2450CC] transition-colors"
          >
            <Play size={13} />
            {testing ? '…' : 'Tester'}
          </button>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 min-h-[80px] whitespace-pre-wrap leading-relaxed">
          {response}
          {testing && <span className="animate-pulse ml-1">▋</span>}
        </div>
      )}

      {/* Publish */}
      <button
        onClick={handlePublish}
        disabled={!tested || publishing}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          enabled:bg-[#C8F135] enabled:text-black enabled:hover:bg-[#b8e120]"
      >
        <Upload size={14} />
        {publishing ? 'Publication…' : 'Publier ce SOUL.md'}
      </button>
      {!tested && !response && (
        <p className="text-xs text-gray-500 text-center -mt-2">
          Testez d'abord pour activer le bouton Publier
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep "PromptLabTab"
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/tabs/PromptLabTab.tsx && rtk git commit -m "feat(saas): add PromptLabTab — test SOUL.md + streaming Anthropic + publish"
```

---

## Task 10: AgentDrawer

**Files:**
- Create: `src/components/equipe/AgentDrawer.tsx`

The drawer receives the agent data, the live events, and the live status. It manages the active tab and the `onToggle` callback.

- [ ] **Step 1: Create `src/components/equipe/AgentDrawer.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Cpu, Users, Database } from 'lucide-react'
import type { EquipeAgent } from './agents'
import type { GatewayEvent } from '@/hooks/useGatewayEvents'
import type { AgentStatusData } from '@/hooks/useAgentStatus'
import { LiveTab }      from './tabs/LiveTab'
import { SoulTab }      from './tabs/SoulTab'
import { SkillsTab }    from './tabs/SkillsTab'
import { PromptLabTab } from './tabs/PromptLabTab'

const ICON_MAP = { cpu: Cpu, users: Users, database: Database } as const

type Tab = 'live' | 'soul' | 'skills' | 'prompt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'live',   label: 'Live'       },
  { id: 'soul',   label: 'SOUL.md'    },
  { id: 'skills', label: 'Skills'     },
  { id: 'prompt', label: 'Prompt Lab' },
]

interface AgentDrawerProps {
  agent:   EquipeAgent
  events:  GatewayEvent[]
  status:  AgentStatusData | undefined
  onClose: () => void
}

export function AgentDrawer({ agent, events, status, onClose }: AgentDrawerProps) {
  const [tab,       setTab]       = useState<Tab>('live')
  const [soulCache, setSoulCache] = useState('')
  const Icon = ICON_MAP[agent.icon]

  async function handleToolToggle(tool: string, enabled: boolean) {
    const res = await fetch(
      `/api/openclaw/agents/${agent.id}/tools/${tool}/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled }),
      }
    )
    if (!res.ok) throw new Error('Toggle failed')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-[#0D1117] border-l border-white/10 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b border-white/10"
          style={{ borderTopColor: agent.accentColor, borderTopWidth: 3 }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: agent.accentColor + '18', border: `1px solid ${agent.accentColor}35` }}
          >
            <Icon size={16} style={{ color: agent.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{agent.name}</p>
            <p className="text-gray-400 text-xs truncate">{agent.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status?.online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'live' && (
            <LiveTab agentId={agent.id} events={events} status={status} />
          )}
          {tab === 'soul' && (
            <SoulTab
              agentId={agent.id}
              onLoad={setSoulCache}
            />
          )}
          {tab === 'skills' && (
            <SkillsTab agentId={agent.id} status={status} onToggle={handleToolToggle} />
          )}
          {tab === 'prompt' && (
            <PromptLabTab agentId={agent.id} currentSoul={soulCache} />
          )}
        </div>
      </div>
    </>
  )
}
```

Note: `SoulTab` needs an `onLoad` callback to share the loaded soul content with `PromptLabTab`. Update `SoulTab` to accept and call `onLoad?: (content: string) => void` after the fetch resolves.

- [ ] **Step 2: Update `SoulTab` to expose loaded content**

In `src/components/equipe/tabs/SoulTab.tsx`, add `onLoad?: (content: string) => void` to props and call it after fetch:

Change the props interface:
```typescript
interface SoulTabProps {
  agentId: string
  onLoad?: (content: string) => void
}
```

In the `useEffect` fetch success path, after `setContent(data.content ?? '')`, add:
```typescript
        onLoad?.(data.content ?? '')
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | grep -E "AgentDrawer|SoulTab"
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/AgentDrawer.tsx src/components/equipe/tabs/SoulTab.tsx && rtk git commit -m "feat(saas): add AgentDrawer with 4 tabs (Live, SOUL.md, Skills, Prompt Lab)"
```

---

## Task 11: Wire EquipeView

**Files:**
- Modify: `src/components/equipe/EquipeView.tsx`

Replace the simulation with real hooks and open the drawer on agent click. The existing organigram, SVG lines, AgentCard, and animation code stays untouched. Only the data sourcing and click handler change.

- [ ] **Step 1: Add imports to EquipeView**

At the top of `src/components/equipe/EquipeView.tsx`, add after existing imports:

```typescript
import { useGatewayEvents } from '@/hooks/useGatewayEvents'
import { useAgentStatus }   from '@/hooks/useAgentStatus'
import { AgentDrawer }      from './AgentDrawer'
```

- [ ] **Step 2: Replace simulation state with real hooks**

In the `EquipeView` component function, find the existing state declarations (around line 210-230). The current code has:
- `const [runStates, setRunStates] = useState<Record<string, AgentRunState>>({...})` with Soren/Kai online, Mia offline
- `useEffect` intervals for heartbeat simulation
- `startAgent` and `stopAgent` functions

**Keep:** `selectedAgent` state, SVG line refs, the `setInterval` for heartbeat logs (these still run for visual feedback).

**Add** after existing `useState` declarations:

```typescript
  const gatewayEvents = useGatewayEvents()
  const agentStatus   = useAgentStatus()
```

**Update** the `isOnline` check in `AgentCard` usage. The existing code passes `runState.status === 'online'`. After adding the hooks, also feed the real status into `runStates` — override the local `status` with the real gateway status:

Add a `useEffect` that syncs gateway status into local runStates:

```typescript
  useEffect(() => {
    setRunStates(prev => {
      const updated = { ...prev }
      for (const [id, data] of Object.entries(agentStatus)) {
        if (updated[id]) {
          updated[id] = {
            ...updated[id],
            status: data.online ? 'online' : 'offline',
          }
        }
      }
      return updated
    })
  }, [agentStatus])
```

- [ ] **Step 3: Replace detail panel with drawer**

Find the existing selected agent detail panel (around line 380-500 — the `{selectedAgent && <DetailPanel ...>}` block). Replace it with the drawer:

```tsx
      {selectedAgent && (
        <AgentDrawer
          agent={selectedAgent}
          events={gatewayEvents}
          status={agentStatus[selectedAgent.id]}
          onClose={() => setSelectedAgent(null)}
        />
      )}
```

Remove the old `DetailPanel` component and its usages (it was defined inline in EquipeView — search for `function DetailPanel` and delete it).

Remove the `useCommFeed` hook and its usage (replace with real SSE events from `useGatewayEvents`).

- [ ] **Step 4: Build to verify**

```bash
cd C:/Users/thoma/qos && rtk next build 2>&1 | tail -10
```
Expected: Build succeeds. If TypeScript errors appear, fix them before committing.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/equipe/EquipeView.tsx && rtk git commit -m "feat(saas): wire EquipeView to real gateway data + open AgentDrawer on click"
```

---

## Running the Full Feature

```bash
# Terminal 1 — gateway
cd C:/Users/thoma/qos/gateway && npm run dev

# Terminal 2 — SaaS
cd C:/Users/thoma/qos && OPENCLAW_GATEWAY_URL=http://localhost:18789 npm run dev
```

Open `http://localhost:3000/equipe`:
1. Agent status dots reflect real gateway state
2. SVG data-packets animate when gateway is online
3. Click an agent → drawer opens
4. Live tab shows real SSE events
5. SOUL.md tab loads real content, save updates it live
6. Skills tab shows toggles — disable Twilio → Kai stops sending SMS immediately
7. Prompt Lab → write custom soul → test → streaming response → publish
