# Conversations V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 features to the conversations module: pipeline filter, AI toggle, multi-canal send, Kai live feed, and Meta source visibility.

**Architecture:** Supabase schema extended with 4 new columns → TypeScript types updated → InboxFilter type refactored (breaking change) → all consuming components updated → 5 new API routes created → 2 new pages/components added.

**Tech Stack:** Next.js 14 App Router, Tailwind, Supabase, GHL API, Anthropic SDK

---

## File Map

### Modified files
- `src/components/conversations/types.ts` — add `OpportunityStatus`, `ConversationSource`, `Pipeline`, `PipelineStage` types; extend `Conversation` with 4 new fields
- `src/components/conversations/InboxNav.tsx` — replace Lifecycle section with Pipeline + Sources; refactor `InboxFilter` to discriminated union (breaking)
- `src/components/conversations/ConversationList.tsx` — handle new `InboxFilter` union; add color coding for closed convs; add Meta badge
- `src/components/conversations/ConversationsView.tsx` — accept `pipelines` prop; pass to InboxNav
- `src/components/conversations/MessageThread.tsx` — AI toggle in header; channel selector in input; call `/api/send-message` for manual sends
- `src/app/conversations/page.tsx` — fetch pipelines + opportunities in parallel; enrich conversations
- `src/lib/ghl.ts` — add `assignedTo` to `GHLConversation`; add `sendGHLMessage` function
- `src/app/api/chat/route.ts` — check `ai_enabled` before generating
- `src/app/api/webhooks/meta/route.ts` — set `source: 'meta'` and `ai_enabled: true` on conversation insert

### Created files
- `src/app/api/send-message/route.ts` — POST: send via GHL multi-canal + save to Supabase
- `src/app/api/conversation/[id]/ai/route.ts` — PATCH: update `ai_enabled` in Supabase only
- `src/app/api/feed/route.ts` — GET: last 50 assistant messages with conversation join
- `src/app/conversations/feed/page.tsx` — Server Component: initial fetch for feed page
- `src/components/conversations/KaiFeed.tsx` — Client Component: Supabase Realtime feed

---

## Task 1 — Supabase Schema + Types

**Files:**
- Modify: `src/components/conversations/types.ts`

- [ ] **Step 1: Run the SQL migration in Supabase**

Open the Supabase dashboard → SQL Editor → run:

```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_enabled     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS source         text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS pipeline_stage_id   text DEFAULT null,
  ADD COLUMN IF NOT EXISTS opportunity_status  text DEFAULT null;
```

Expected: query runs without error.

- [ ] **Step 2: Update `types.ts`**

Replace the top of `src/components/conversations/types.ts` (keep everything after line 23 as-is):

```typescript
export type Channel = 'email' | 'phone' | 'sms' | 'whatsapp' | 'meeting' | 'note'

export type LeadStage = 'hot' | 'vip' | 'new' | 'payments' | 'client' | 'cold' | null

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned' | null

export type ConversationSource = 'meta' | 'manual' | 'ghl' | null

export type PipelineStage = {
  id: string
  name: string
}

export type Pipeline = {
  id: string
  name: string
  stages: PipelineStage[]
}

export type Conversation = {
  id: string
  user_id: string
  lead_id: string | null
  contact_id: string | null
  channel: Channel
  subject: string | null
  summary: string | null
  created_at: string
  updated_at: string
  // joined fields
  contact_name?: string
  contact_company?: string
  contact_phone?: string | null
  last_message?: string
  last_message_at?: string
  unread?: number
  lead_stage?: LeadStage
  // V2 fields
  ai_enabled?: boolean
  source?: ConversationSource
  pipeline_stage_id?: string | null
  opportunity_status?: OpportunityStatus
  assigned_to?: string | null
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

Expected: no errors related to types.ts (ignore any pre-existing errors).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/conversations/types.ts && rtk git commit -m "feat(conv-v2): add V2 types (OpportunityStatus, ConversationSource, Pipeline)"
```

---

## Task 2 — GHL lib: assignedTo + sendGHLMessage

**Files:**
- Modify: `src/lib/ghl.ts`

- [ ] **Step 1: Add `assignedTo` to `GHLConversation` type**

In `src/lib/ghl.ts`, find the `GHLConversation` type (currently at line 124) and add `assignedTo`:

```typescript
export type GHLConversation = {
  id: string
  contactId: string
  contactName: string | null
  fullName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  type: string
  unreadCount: number
  lastMessageDate: number | null
  dateAdded: number
  dateUpdated: number
  assignedTo?: string | null   // GHL user ID
}
```

- [ ] **Step 2: Add `sendGHLMessage` function**

Add this function after `getConversations` in `src/lib/ghl.ts`:

```typescript
export async function sendGHLMessage(
  conversationId: string,
  message: string,
  type: 'WhatsApp' | 'SMS' | 'Email',
  subject?: string,
) {
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const payload: Record<string, string> = {
    type,
    conversationId,
    message,
  }
  if (subject) payload.subject = subject

  const res = await fetch(`${baseUrl}/conversations/messages`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL sendMessage ${res.status}: ${await res.text()}`)
  return res.json()
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/lib/ghl.ts && rtk git commit -m "feat(conv-v2): add assignedTo to GHLConversation and sendGHLMessage"
```

---

## Task 3 — Page: fetch pipelines + opportunities + enrich conversations

**Files:**
- Modify: `src/app/conversations/page.tsx`

- [ ] **Step 1: Update the page to fetch in parallel and enrich**

Replace the entire content of `src/app/conversations/page.tsx`:

```typescript
import ConversationsView from '@/components/conversations/ConversationsView'
import { type Conversation, type Channel, type OpportunityStatus, type Pipeline } from '@/components/conversations/types'
import { getConversations, getOpportunities, getPipelines } from '@/lib/ghl'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

function mapGHLType(type: string): Channel {
  switch (type) {
    case 'TYPE_EMAIL':    return 'email'
    case 'TYPE_SMS':      return 'sms'
    case 'TYPE_WHATSAPP': return 'whatsapp'
    case 'TYPE_PHONE':    return 'phone'
    case 'TYPE_CALL':     return 'phone'
    default:              return 'note'
  }
}

function tsToISO(ts: number | null): string {
  if (!ts) return new Date().toISOString()
  return new Date(ts).toISOString()
}

export default async function ConversationsPage() {
  let dbConversations: Conversation[] = []
  let pipelines: Pipeline[] = []

  try {
    const [ghlConvs, ghlOpps, ghlPipelines] = await Promise.all([
      getConversations(100),
      getOpportunities(200),
      getPipelines(),
    ])

    // Map pipeline stages flat for quick lookup: stageId → pipelineId
    const stageToPipeline: Record<string, string> = {}
    pipelines = ghlPipelines.map(p => {
      p.stages.forEach(s => { stageToPipeline[s.id] = p.id })
      return { id: p.id, name: p.name, stages: p.stages.map(s => ({ id: s.id, name: s.name })) }
    })

    // Build contactId → opportunity info map (first opportunity wins)
    const contactOppMap: Record<string, { pipelineStageId: string; opportunityStatus: OpportunityStatus }> = {}
    for (const opp of ghlOpps) {
      const cid = opp.contact?.id
      if (cid && !contactOppMap[cid]) {
        contactOppMap[cid] = {
          pipelineStageId: opp.pipelineStageId,
          opportunityStatus: opp.status as OpportunityStatus,
        }
      }
    }

    dbConversations = ghlConvs.map((c): Conversation => {
      const channel     = mapGHLType(c.type)
      const contactName = c.fullName ?? c.contactName ?? c.email ?? 'Contact inconnu'
      const channelLabel: Record<Channel, string> = {
        email: 'Email', phone: 'Appel', sms: 'SMS', whatsapp: 'WhatsApp', meeting: 'Réunion', note: 'Note',
      }
      const subject = `${channelLabel[channel]} — ${contactName}`
      const opp = contactOppMap[c.contactId]

      return {
        id:                  c.id,
        user_id:             'ghl',
        lead_id:             null,
        contact_id:          c.contactId,
        channel,
        subject,
        summary:             null,
        created_at:          tsToISO(c.dateAdded),
        updated_at:          tsToISO(c.dateUpdated),
        contact_name:        contactName,
        contact_company:     c.companyName ?? undefined,
        contact_phone:       c.phone ?? null,
        last_message:        undefined,
        last_message_at:     tsToISO(c.lastMessageDate),
        unread:              c.unreadCount ?? 0,
        assigned_to:         c.assignedTo ?? null,
        pipeline_stage_id:   opp?.pipelineStageId ?? null,
        opportunity_status:  opp?.opportunityStatus ?? null,
        ai_enabled:          true,
        source:              null,
      }
    })
  } catch (err) {
    console.error('[Conversations] fetch failed:', err)
  }

  return <ConversationsView dbConversations={dbConversations} pipelines={pipelines} />
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/conversations/page.tsx && rtk git commit -m "feat(conv-v2): fetch pipelines+opportunities in parallel, enrich conversations"
```

---

## Task 4 — InboxNav: pipeline filter + sources (breaking change)

**Files:**
- Modify: `src/components/conversations/InboxNav.tsx`

This is a breaking change: `InboxFilter` becomes a discriminated union. `ConversationList` and `ConversationsView` will break until Task 5 and 6.

- [ ] **Step 1: Rewrite InboxNav**

Replace the entire content of `src/components/conversations/InboxNav.tsx`:

```typescript
'use client'

import { type Pipeline, type ConversationSource } from './types'

export type InboxFilter =
  | 'all'
  | 'unassigned'
  | 'closed'
  | { type: 'pipeline_stage'; stageId: string }
  | { type: 'source'; source: ConversationSource }

interface Props {
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
  totalUnread: number
  pipelines: Pipeline[]
}

function isActive(filter: InboxFilter, item: InboxFilter): boolean {
  if (typeof filter === 'string' && typeof item === 'string') return filter === item
  if (typeof filter === 'object' && typeof item === 'object') {
    if (filter.type !== item.type) return false
    if (filter.type === 'pipeline_stage' && item.type === 'pipeline_stage') {
      return filter.stageId === item.stageId
    }
    if (filter.type === 'source' && item.type === 'source') {
      return filter.source === item.source
    }
  }
  return false
}

function NavButton({
  label,
  filter,
  activeFilter,
  onFilterChange,
}: {
  label: string
  filter: InboxFilter
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
}) {
  const active = isActive(activeFilter, filter)
  return (
    <button
      onClick={() => onFilterChange(filter)}
      aria-current={active ? 'page' : undefined}
      className={`
        w-full text-left text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#E2FF8D] focus:ring-offset-1 focus:ring-offset-[#111111]
        ${active
          ? 'bg-[#E2FF8D] text-[#111111] font-medium'
          : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
        }
      `}
    >
      {label}
    </button>
  )
}

export default function InboxNav({ activeFilter, onFilterChange, totalUnread, pipelines }: Props) {
  return (
    <div className="flex flex-col w-[200px] flex-shrink-0 bg-[#111111] h-full overflow-y-auto">
      {/* Title */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Conversations</span>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2FF8D] text-[#111111]">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Main filters */}
      <nav aria-label="Filtres principaux" className="flex flex-col gap-0.5 px-2">
        <NavButton label="Toutes"         filter="all"        activeFilter={activeFilter} onFilterChange={onFilterChange} />
        <NavButton label="Non assignées"  filter="unassigned" activeFilter={activeFilter} onFilterChange={onFilterChange} />
        <NavButton label="Fermées"        filter="closed"     activeFilter={activeFilter} onFilterChange={onFilterChange} />
      </nav>

      {/* Pipelines */}
      {pipelines.length > 0 && (
        <nav aria-label="Pipelines" className="mt-5 px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
            Pipelines
          </p>
          <div className="flex flex-col gap-0.5">
            {pipelines.map(pipeline => (
              <div key={pipeline.id}>
                <p className="text-[10px] text-[#3D4F6B] px-3 py-1 font-medium">{pipeline.name}</p>
                {pipeline.stages.map(stage => (
                  <NavButton
                    key={stage.id}
                    label={stage.name}
                    filter={{ type: 'pipeline_stage', stageId: stage.id }}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>
      )}

      {/* Sources */}
      <nav aria-label="Sources" className="mt-5 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
          Sources
        </p>
        <NavButton
          label="Meta Ads"
          filter={{ type: 'source', source: 'meta' }}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/conversations/InboxNav.tsx && rtk git commit -m "feat(conv-v2): InboxNav — pipeline stages + Meta source filter (breaking InboxFilter)"
```

---

## Task 5 — ConversationList: new InboxFilter + color coding + Meta badge

**Files:**
- Modify: `src/components/conversations/ConversationList.tsx`

- [ ] **Step 1: Rewrite ConversationList**

Replace the entire content of `src/components/conversations/ConversationList.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { type Conversation, LEAD_STAGE_LABEL } from './types'
import { type InboxFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}min`
  return "à l'instant"
}

function getInitials(name?: string) {
  if (!name) return '??'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function getClosedBorderColor(conv: Conversation): string {
  if (conv.opportunity_status === 'won') return '#22c55e'
  if (conv.opportunity_status === 'lost' || conv.opportunity_status === 'abandoned') return '#EF4444'
  return 'transparent'
}

function ConvRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const initials   = getInitials(conv.contact_name)
  const stageLabel = conv.lead_stage ? LEAD_STAGE_LABEL[conv.lead_stage] : null
  const closedColor = getClosedBorderColor(conv)
  const borderColor = isSelected ? '#3462EE' : closedColor

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#EBEBEA] last:border-0
        ${isSelected ? 'bg-white' : 'hover:bg-[#EFEFED]'}
      `}
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-semibold truncate ${closedColor !== 'transparent' && !isSelected ? 'text-[#6B7280]' : 'text-[#111111]'}`}>
              {conv.contact_name ?? 'Contact inconnu'}
            </p>
            {closedColor !== 'transparent' && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: closedColor }}
              />
            )}
          </div>
          <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">
            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          {stageLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]">
              {stageLabel}
            </span>
          )}
          {conv.source === 'meta' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]">
              Meta
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#6B7280] truncate flex-1">
            {conv.last_message ?? 'Aucun message'}
          </p>
          {(conv.unread ?? 0) > 0 && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#3462EE] flex items-center justify-center text-[9px] font-bold text-white">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function getFilterLabel(filter: InboxFilter): string {
  if (filter === 'all')        return 'Toutes les conversations'
  if (filter === 'unassigned') return 'Non assignées'
  if (filter === 'closed')     return 'Fermées'
  if (typeof filter === 'object') {
    if (filter.type === 'pipeline_stage') return 'Pipeline'
    if (filter.type === 'source')         return filter.source === 'meta' ? 'Meta Ads' : filter.source ?? 'Source'
  }
  return 'Conversations'
}

function applyFilter(conversations: Conversation[], filter: InboxFilter): Conversation[] {
  if (filter === 'all') return conversations
  if (filter === 'unassigned') return conversations.filter(c => !c.assigned_to)
  if (filter === 'closed') return conversations.filter(c =>
    c.opportunity_status === 'won' || c.opportunity_status === 'lost' || c.opportunity_status === 'abandoned'
  )
  if (typeof filter === 'object') {
    if (filter.type === 'pipeline_stage') {
      return conversations.filter(c => c.pipeline_stage_id === filter.stageId)
    }
    if (filter.type === 'source') {
      return conversations.filter(c => c.source === filter.source)
    }
  }
  return conversations
}

interface Props {
  conversations: Conversation[]
  selected: Conversation | null
  onSelect: (c: Conversation) => void
  activeFilter: InboxFilter
  onConversationCreated: () => void
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  activeFilter,
  onConversationCreated,
}: Props) {
  const [query, setQuery]       = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    let result = applyFilter(conversations, activeFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        `${c.contact_name ?? ''} ${c.last_message ?? ''}`.toLowerCase().includes(q)
      )
    }
    return result
  }, [conversations, activeFilter, query])

  return (
    <div className="flex flex-col w-[340px] flex-shrink-0 bg-[#F8F8F6] border-r border-[#E5E7EB] h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#111111]">
            {getFilterLabel(activeFilter)}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] transition-colors"
          >
            + Nouveau
          </button>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">Aucune conversation</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isSelected={selected?.id === conv.id}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>

      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); onConversationCreated() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/conversations/ConversationList.tsx && rtk git commit -m "feat(conv-v2): ConversationList — new InboxFilter union, color-coded closed convs, Meta badge"
```

---

## Task 6 — ConversationsView: accept pipelines prop

**Files:**
- Modify: `src/components/conversations/ConversationsView.tsx`

- [ ] **Step 1: Add `pipelines` prop and pass it to InboxNav**

Replace the content of `src/components/conversations/ConversationsView.tsx`:

```typescript
'use client'

import { useState, useMemo, useEffect } from 'react'
import { type Conversation, type Pipeline, MOCK_CONVERSATIONS } from './types'
import InboxNav, { type InboxFilter } from './InboxNav'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'

interface Props {
  dbConversations: Conversation[]
  pipelines: Pipeline[]
}

export default function ConversationsView({ dbConversations, pipelines }: Props) {
  const allConversations = useMemo(() => {
    if (dbConversations.length >= 4) return dbConversations
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [selected, setSelected]       = useState<Conversation | null>(allConversations[0] ?? null)
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all')

  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)

  useEffect(() => {
    setSelected(null)
  }, [activeFilter])

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <InboxNav
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalUnread={totalUnread}
        pipelines={pipelines}
      />

      <ConversationList
        conversations={allConversations}
        selected={selected}
        onSelect={setSelected}
        activeFilter={activeFilter}
        onConversationCreated={() => {}}
      />

      <div className="flex-1 overflow-hidden bg-[#EEF0EB]">
        {selected ? (
          <MessageThread conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-[#9CA3AF]">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles (no breaking-change errors left)**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

Expected: no errors in conversations module.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/components/conversations/ConversationsView.tsx && rtk git commit -m "feat(conv-v2): ConversationsView — accept pipelines prop, pass to InboxNav"
```

---

## Task 7 — AI toggle route + MessageThread update

**Files:**
- Create: `src/app/api/conversation/[id]/ai/route.ts`
- Modify: `src/components/conversations/MessageThread.tsx`

- [ ] **Step 1: Create the AI toggle route**

Create `src/app/api/conversation/[id]/ai/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ai_enabled } = await req.json()
  if (typeof ai_enabled !== 'boolean') {
    return NextResponse.json({ error: 'ai_enabled must be boolean' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('conversations')
    .update({ ai_enabled })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Add AI toggle to MessageThread header**

In `src/components/conversations/MessageThread.tsx`, add `aiEnabled` state and toggle button. Modify the component:

Add to imports at top:
```typescript
import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
```

Remove `Smartphone, Zap` from imports (replaced by AI toggle in status bar).

Add state after existing state declarations (around line 77):
```typescript
const [aiEnabled, setAiEnabled] = useState<boolean>(conversation.ai_enabled ?? true)
```

Add effect to reset `aiEnabled` when conversation changes (after existing `useEffect` for tab reset):
```typescript
useEffect(() => {
  setAiEnabled(conversation.ai_enabled ?? true)
}, [conversation.id, conversation.ai_enabled])
```

Add this function before `handleSend`:
```typescript
async function toggleAI() {
  const next = !aiEnabled
  setAiEnabled(next) // optimistic
  try {
    await fetch(`/api/conversation/${conversation.id}/ai`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_enabled: next }),
    })
  } catch {
    setAiEnabled(!next) // rollback
  }
}
```

Replace the header section in the JSX (the `<div className="flex items-center justify-between px-5...">` block) with:

```tsx
{/* Header */}
<div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
      {conversation.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
    </div>
    <div>
      <p className="text-sm font-semibold text-[#111111]">{conversation.contact_name ?? 'Contact inconnu'}</p>
      {conversation.contact_company && (
        <p className="text-xs text-[#6B7280]">{conversation.contact_company}</p>
      )}
    </div>
  </div>
  <div className="flex items-center gap-3">
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full border"
      style={{ color: channel.color, borderColor: channel.color + '40', background: channel.bg }}
    >
      {channel.label}
    </span>
    <button
      onClick={toggleAI}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={aiEnabled
        ? { color: '#111111', borderColor: '#22c55e40', background: '#22c55e10' }
        : { color: '#9CA3AF', borderColor: '#9CA3AF40', background: 'transparent' }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: aiEnabled ? '#22c55e' : '#9CA3AF' }}
      />
      {aiEnabled ? 'Kai ON' : 'Kai OFF'}
    </button>
  </div>
</div>
```

Replace the status bar at the bottom (the `<div className="flex items-center justify-between mt-2...">` block) with:

```tsx
<div className="flex items-center mt-2 px-1">
  <span className="text-[10px] text-[#6B7280]">
    {aiEnabled ? 'Kai répond automatiquement' : 'Kai désactivé — réponse manuelle uniquement'}
  </span>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/conversation src/components/conversations/MessageThread.tsx && rtk git commit -m "feat(conv-v2): AI toggle — PATCH route + optimistic UI in MessageThread header"
```

---

## Task 8 — Multi-canal send: /api/send-message + channel selector

**Files:**
- Create: `src/app/api/send-message/route.ts`
- Modify: `src/components/conversations/MessageThread.tsx`

- [ ] **Step 1: Create /api/send-message route**

Create `src/app/api/send-message/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message, type, subject } = await req.json()

    if (!conversationId || !message?.trim() || !type) {
      return NextResponse.json({ error: 'conversationId, message et type requis' }, { status: 400 })
    }

    const validTypes = ['WhatsApp', 'SMS', 'Email']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type invalide: ${type}` }, { status: 400 })
    }

    // Send via GHL
    await sendGHLMessage(conversationId, message, type as 'WhatsApp' | 'SMS' | 'Email', subject)

    // Save to Supabase as user message (manual send)
    const supabase = await createClient()
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      metadata: { manual: true, channel: type },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/send-message] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Add channel selector to MessageThread**

In `src/components/conversations/MessageThread.tsx`, add channel state and selector in the input area.

Add state after `aiEnabled` state:
```typescript
type SendChannel = 'WhatsApp' | 'SMS' | 'Email'

const defaultChannel: SendChannel = (() => {
  const ch = conversation.channel
  if (ch === 'whatsapp') return 'WhatsApp'
  if (ch === 'sms')      return 'SMS'
  if (ch === 'email')    return 'Email'
  return 'WhatsApp'
})()

const [sendChannel, setSendChannel]     = useState<SendChannel>(defaultChannel)
const [channelOpen, setChannelOpen]     = useState(false)
```

Add effect to reset `sendChannel` when conversation changes (with other `useEffect` blocks):
```typescript
useEffect(() => {
  const ch = conversation.channel
  setSendChannel(ch === 'sms' ? 'SMS' : ch === 'email' ? 'Email' : 'WhatsApp')
  setChannelOpen(false)
}, [conversation.id, conversation.channel])
```

Replace the `handleSend` function with a version that distinguishes manual vs AI sends:
```typescript
async function handleSend() {
  const content = input.trim()
  if (!content || isSending) return
  setInput('')
  setIsSending(true)

  const userMsg: Message = {
    id: crypto.randomUUID(),
    conversation_id: conversation.id,
    role: 'user',
    content,
    created_at: new Date().toISOString(),
  }
  setMessages(prev => [...prev, userMsg])

  try {
    // Manual send via GHL channel selector
    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conversation.id,
        message: content,
        type: sendChannel,
      }),
    })

    // Kai auto-respond (only if ai_enabled)
    if (aiEnabled) {
      setStreaming('')
      const contactPhone = conversation.channel === 'whatsapp' && conversation.contact_phone
        ? conversation.contact_phone : undefined

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: content,
          contactName: conversation.contact_name,
          contactPhone,
        }),
      })

      if (res.ok && res.body) {
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let fullText  = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setStreaming(fullText)
        }
        fullText += decoder.decode()

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          conversation_id: conversation.id,
          role: 'assistant',
          content: fullText,
          created_at: new Date().toISOString(),
        }])
        setStreaming(null)
      }
    }
  } catch (err) {
    console.error('Send error:', err)
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      role: 'assistant',
      content: "Erreur lors de l'envoi.",
      created_at: new Date().toISOString(),
    }])
    setStreaming(null)
  } finally {
    setIsSending(false)
    inputRef.current?.focus()
  }
}
```

Replace the input area (the `<div className="flex-shrink-0 px-4 pb-4...">` block) with version including channel selector:

```tsx
{/* Input */}
<div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-[#E5E7EB] bg-white">
  <div className="flex items-end gap-2 border border-[#E5E7EB] rounded-xl px-3 py-2 focus-within:border-[#3462EE] transition-colors">
    {/* Channel selector */}
    <div className="relative flex-shrink-0 self-center">
      <button
        onClick={() => setChannelOpen(o => !o)}
        className="text-xs font-medium px-2 py-1 rounded-md bg-[#F8F8F6] text-[#6B7280] hover:bg-[#EFEFED] transition-colors"
      >
        {sendChannel}
      </button>
      {channelOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10 min-w-[90px]">
          {(['WhatsApp', 'SMS', 'Email'] as SendChannel[]).map(ch => (
            <button
              key={ch}
              onClick={() => { setSendChannel(ch); setChannelOpen(false) }}
              className={`w-full text-left text-xs px-3 py-2 hover:bg-[#F8F8F6] transition-colors ${ch === sendChannel ? 'text-[#111111] font-medium' : 'text-[#6B7280]'}`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>

    <textarea
      ref={inputRef}
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Écrire un message..."
      rows={1}
      disabled={isSending}
      className="flex-1 bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none resize-none leading-relaxed py-1 disabled:opacity-50"
      style={{ maxHeight: 120, overflowY: 'auto' }}
    />
    <button
      onClick={handleSend}
      disabled={!input.trim() || isSending}
      className="w-8 h-8 rounded-lg bg-[#111111] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
    >
      {isSending
        ? <Loader2 size={14} className="text-white animate-spin" />
        : <Send size={14} className="text-white" />
      }
    </button>
  </div>

  <div className="flex items-center mt-2 px-1">
    <span className="text-[10px] text-[#6B7280]">
      {aiEnabled ? 'Kai répond automatiquement' : 'Kai désactivé — réponse manuelle uniquement'}
    </span>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/send-message src/components/conversations/MessageThread.tsx && rtk git commit -m "feat(conv-v2): multi-canal send — /api/send-message + channel selector in MessageThread"
```

---

## Task 9 — /api/chat: check ai_enabled before generating

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Add ai_enabled check**

In `src/app/api/chat/route.ts`, add a check after the Supabase client is created (after line 19 `const supabase = await createClient()`):

```typescript
// Check ai_enabled if conversationId provided
if (conversationId) {
  const { data: conv } = await supabase
    .from('conversations')
    .select('ai_enabled')
    .eq('id', conversationId)
    .single()

  if (conv && conv.ai_enabled === false) {
    return new Response(null, { status: 204 })
  }
}
```

This block goes between the supabase creation and the "Save user message" comment (after line 19, before line 22).

- [ ] **Step 2: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/chat/route.ts && rtk git commit -m "feat(conv-v2): /api/chat checks ai_enabled, returns 204 if disabled"
```

---

## Task 10 — Meta webhook: set source='meta'

**Files:**
- Modify: `src/app/api/webhooks/meta/route.ts`

- [ ] **Step 1: Add source and ai_enabled to conversation insert**

In `src/app/api/webhooks/meta/route.ts`, find the conversation insert (around line 178):

```typescript
const { data: conversation, error: convError } = await supabase
  .from('conversations')
  .insert({
    user_id:    userId,
    lead_id:    lead.id,
    contact_id: contactId,
    channel,
    subject:    `Qualification — ${firstName} ${lastName}`,
  })
```

Replace with:
```typescript
const { data: conversation, error: convError } = await supabase
  .from('conversations')
  .insert({
    user_id:    userId,
    lead_id:    lead.id,
    contact_id: contactId,
    channel,
    subject:    `Qualification — ${firstName} ${lastName}`,
    source:     'meta',
    ai_enabled: true,
  })
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/webhooks/meta/route.ts && rtk git commit -m "feat(conv-v2): Meta webhook sets source='meta' and ai_enabled=true"
```

---

## Task 11 — Feed Kai: API route + page + component

**Files:**
- Create: `src/app/api/feed/route.ts`
- Create: `src/app/conversations/feed/page.tsx`
- Create: `src/components/conversations/KaiFeed.tsx`

- [ ] **Step 1: Create /api/feed route**

Create `src/app/api/feed/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      role,
      content,
      created_at,
      conversations (
        id,
        channel,
        ai_enabled,
        contact_name
      )
    `)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}
```

- [ ] **Step 2: Create KaiFeed component**

Create `src/components/conversations/KaiFeed.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Channel, CHANNEL_META } from './types'

type FeedMessage = {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
  conversations: {
    id: string
    channel: Channel
    ai_enabled: boolean
    contact_name: string | null
  } | null
}

type ChannelFilter = 'all' | 'WhatsApp' | 'SMS' | 'Email'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}min`
  return "à l'instant"
}

function channelMatchesFilter(channel: Channel, filter: ChannelFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'WhatsApp') return channel === 'whatsapp'
  if (filter === 'SMS')      return channel === 'sms'
  if (filter === 'Email')    return channel === 'email'
  return true
}

function FeedCard({ message }: { message: FeedMessage }) {
  const conv = message.conversations
  if (!conv) return null
  const channelMeta = CHANNEL_META[conv.channel]

  return (
    <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-[10px] font-bold text-white">
            {conv.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
          </div>
          <span className="text-sm font-semibold text-[#111111]">
            {conv.contact_name ?? 'Contact inconnu'}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
            style={{ color: channelMeta.color, borderColor: channelMeta.color + '40', background: channelMeta.bg }}
          >
            {channelMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9CA3AF]">{timeAgo(message.created_at)}</span>
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
            style={conv.ai_enabled
              ? { color: '#111111', background: '#22c55e18' }
              : { color: '#9CA3AF', background: '#9CA3AF18' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: conv.ai_enabled ? '#22c55e' : '#9CA3AF' }}
            />
            {conv.ai_enabled ? 'Kai ON' : 'Kai OFF'}
          </span>
        </div>
      </div>
      <p className="text-sm text-[#6B7280] leading-relaxed line-clamp-3">{message.content}</p>
    </div>
  )
}

interface Props {
  initialMessages: FeedMessage[]
}

export default function KaiFeed({ initialMessages }: Props) {
  const [messages, setMessages]   = useState<FeedMessage[]>(initialMessages)
  const [filter, setFilter]       = useState<ChannelFilter>('all')

  // Supabase Realtime — global messages subscription
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel('kai-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const newMsg = payload.new as { id: string; conversation_id: string; role: string; content: string; created_at: string }
        if (newMsg.role !== 'assistant') return

        // Fetch conversation details
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, channel, ai_enabled, contact_name')
          .eq('id', newMsg.conversation_id)
          .single()

        const feedMsg: FeedMessage = {
          ...newMsg,
          conversations: conv ?? null,
        }
        setMessages(prev => [feedMsg, ...prev].slice(0, 100))
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const filtered = messages.filter(m =>
    m.conversations ? channelMatchesFilter(m.conversations.channel, filter) : true
  )

  const CHANNEL_FILTERS: { id: ChannelFilter; label: string }[] = [
    { id: 'all',      label: 'Tous'      },
    { id: 'WhatsApp', label: 'WhatsApp'  },
    { id: 'SMS',      label: 'SMS'       },
    { id: 'Email',    label: 'Email'     },
  ]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#F8F8F6]">
      {/* Left: channel filter */}
      <div className="w-[160px] flex-shrink-0 bg-[#111111] h-full overflow-y-auto px-2 pt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-3">
          Canal
        </p>
        <div className="flex flex-col gap-0.5">
          {CHANNEL_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                filter === f.id
                  ? 'bg-[#E2FF8D] text-[#111111] font-medium'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: feed */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h1 className="text-base font-semibold text-[#111111]">Feed Kai Live</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Toutes les conversations IA en temps réel</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-[#9CA3AF]">Aucune conversation IA</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(msg => (
                <FeedCard key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the feed page**

Create `src/app/conversations/feed/page.tsx`:

```typescript
import KaiFeed from '@/components/conversations/KaiFeed'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function FeedPage() {
  let initialMessages: unknown[] = []

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4000'
    const res = await fetch(`${baseUrl}/api/feed`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      initialMessages = data.messages ?? []
    }
  } catch (err) {
    console.error('[FeedPage] fetch failed:', err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <KaiFeed initialMessages={initialMessages as any} />
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/thoma/qos && rtk git add src/app/api/feed src/app/conversations/feed src/components/conversations/KaiFeed.tsx && rtk git commit -m "feat(conv-v2): Feed Kai live — /api/feed + feed page + KaiFeed realtime component"
```

---

## Task 12 — Smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd C:/Users/thoma/qos && npm run dev -- -p 4000
```

- [ ] **Step 2: Test pipeline filter**

Open http://localhost:4000/conversations  
Expected: InboxNav shows "Pipelines" section with Acquisition/Réception/Réactivation + their stages. Clicking a stage filters the conversation list.

- [ ] **Step 3: Test closed color coding**

Click "Fermées" filter. Expected: conversations with `opportunity_status='won'` show green dot + green left border; `lost/abandoned` show red dot + red border.

- [ ] **Step 4: Test Meta badge**

If you have a conversation with `source='meta'` in Supabase, it should show a "Meta" blue badge in the conversation row.

- [ ] **Step 5: Test AI toggle**

Open a conversation. Header shows `● Kai ON`. Click it → turns to `○ Kai OFF`. Click again → back to ON. Check Supabase `conversations` table to confirm `ai_enabled` column updated.

- [ ] **Step 6: Test channel selector**

In the messages tab, the input area has a pill showing the current channel (e.g. "WhatsApp"). Click it → dropdown shows WhatsApp / SMS / Email. Select one → pill updates.

- [ ] **Step 7: Test feed page**

Open http://localhost:4000/conversations/feed  
Expected: left panel with channel filters, right panel with Kai assistant messages in cards. Realtime: send a message in another tab, it should appear in the feed within seconds.

- [ ] **Step 8: Final TypeScript check**

```bash
cd C:/Users/thoma/qos && rtk tsc --noEmit
```

Expected: 0 errors.

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Supabase columns `ai_enabled`, `source`, `pipeline_stage_id`, `opportunity_status` | Task 1 |
| TypeScript types `OpportunityStatus`, `ConversationSource`, `Pipeline`, `PipelineStage` | Task 1 |
| `GHLConversation.assignedTo` | Task 2 |
| `sendGHLMessage` in ghl.ts | Task 2 |
| Fetch pipelines + opportunities on page load | Task 3 |
| Enrich conversations with pipeline stage + opportunity status | Task 3 |
| InboxFilter discriminated union (breaking change) | Task 4 |
| Pipeline stages in InboxNav | Task 4 |
| Sources section (Meta Ads) in InboxNav | Task 4 |
| Filter: `unassigned` = `assigned_to === null` | Task 5 |
| Filter: `closed` = won/lost/abandoned | Task 5 |
| Color coding: won=green, lost/abandoned=red | Task 5 |
| Meta badge on conversation rows | Task 5 |
| `InboxFilter` union handled in ConversationList | Task 5 |
| `pipelines` prop passed through ConversationsView | Task 6 |
| `PATCH /api/conversation/[id]/ai` (Supabase only) | Task 7 |
| AI toggle in MessageThread header, optimistic update | Task 7 |
| Channel selector in input (WhatsApp/SMS/Email) | Task 8 |
| `POST /api/send-message` → GHL + Supabase save | Task 8 |
| Manual send calls `/api/send-message`, Kai via `/api/chat` independently | Task 8 |
| `/api/chat` checks `ai_enabled`, returns 204 if false | Task 9 |
| Meta webhook sets `source='meta'` and `ai_enabled=true` | Task 10 |
| `GET /api/feed` returns last 50 assistant messages | Task 11 |
| `/conversations/feed` page with Supabase Realtime | Task 11 |
| KaiFeed: channel filter sidebar, feed cards with Kai ON/OFF badge | Task 11 |
