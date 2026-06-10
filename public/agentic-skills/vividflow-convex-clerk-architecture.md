---
name: vividflow-convex-clerk-architecture
description: Use when designing or implementing VividFlow AGAAS with Convex, Clerk, Next.js, organizations, real-time data, and backend authorization.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, convex, clerk, nextjs, multitenant, realtime]
    related_skills: [vividflow-agaas-product, nextjs-development-setup, test-driven-development]
---

# VividFlow Convex + Clerk Architecture

## Overview

Thomas wants VividFlow AGAAS built on Convex and Clerk. Convex becomes the reactive backend/database/functions layer. Clerk handles authentication, users, organizations, and memberships. Next.js is the frontend application shell.

Architecture principle: Clerk identifies the human and active organization; Convex enforces all data access and business authorization using that identity and org context.

## When to Use

Use this skill when:
- Implementing auth, organizations, workspaces, or multi-tenant access
- Designing Convex tables/functions for CRM, Conversations, or Agent Runtime
- Integrating Clerk with Convex in Next.js App Router
- Reviewing whether backend functions enforce workspace/org isolation
- Planning migrations from Supabase/N8N assumptions to Convex/Clerk

## Core Stack

- Frontend: Next.js App Router + TypeScript
- Auth: Clerk
- Organization/multi-tenancy: Clerk Organizations + Convex workspace records
- Backend: Convex database, queries, mutations, actions, scheduler
- Realtime UX: Convex subscriptions
- External integrations: Convex actions/webhooks + API route endpoints where needed
- Agent orchestration: Hermes/Cockpit external runtime + Convex state/logs
- Triggered execution: Convex mutations schedule internal actions immediately for Hermès task dispatch; polling is only a fallback, not the primary UX path

## Reference Repos

For local upstream references already installed/audited for VividFlow AGAAS, see `references/agaas-reference-repos.md`. Treat these repos as pattern sources, not dependencies to execute blindly.

## Prototype Import Notes

When importing a local Soren/Supabase prototype into the Convex + Clerk roadmap, use `references/supabase-prototype-import.md` for the GitHub-first audit flow, first PR docs, and common Next/Supabase build stabilisation fixes.

For the proven GitHub-first sequence that merged VividFlow blueprint, Next security upgrade, Agent Workspace UI, and Convex/Clerk foundation while keeping the Supabase CRM building, see `references/github-first-workspace-foundation-2026-05-12.md`.

When taking over Claude Code-generated VividFlow SaaS code, use `references/claude-generated-saas-handoff.md` for the repo audit, local placeholder env, Next 16 proxy migration, and smoke-test flow.

For the Soren/Nino Rio CRM migration into VividFlow, use `references/soren-crm-convex-migration.md`: preserve the frontend visual language and pipeline UX, treat Soren as legacy code/UI base only, rebuild backend/data from zero in Convex/Clerk, remove GHL/Supabase as core assumptions, and borrow lean CRM object/timeline patterns from Twenty.

For VPS deployment of a fresh QOS/VividFlow repo followed by the Hermes-style agentic dashboard layer, use `references/vividflow-vps-hermes-dashboard-layer.md`.

When Jonathan/Thomas asks to build the **VividFlow Service Execution OS / Data OS CDC #0 socle technique**, use `references/service-execution-os-cdc0-foundation.md`: lock scope to Convex + Clerk + RBAC + audit logs + action queue + approvals + agent/automation bases + idempotent tl;dv stub webhook, and prove only the loop `agent stub → proposed action → human approval → audit log → fake tl;dv duplicate ignored` before moving to Tasks/Decisions/CRM/Calls.

When Thomas rejects a static/mock/localStorage-only cockpit and asks to “push” a real internal micro-SaaS before Convex is wired, use `references/local-json-micro-saas-backend.md`: add a Next route-handler backend, local JSON persistence, typed mutations, audit redaction, and browser/API verification while keeping the model Convex-ready.

When SSH is unavailable but code-server is exposed for a VPS-hosted QOS/VividFlow repo, use `references/code-server-vps-handoff.md` for the browser/code-server workflow: trust the workspace, use the integrated terminal, and write non-secret inspection output to temporary `public/*.txt` files readable from the live Next app.

For taking over the live QOS/Soren code-server workspace and migrating Dashboard from `/api/dashboard`/legacy mocks to Convex while preserving the Soren shell, use `references/qos-code-server-dashboard-migration.md`.

For SaaS events that must activate Hermès actions through Convex triggers/task queues, use `references/convex-to-hermes-task-triggers.md`: mutation creates/updates source-of-truth data, schedules an internal Convex action immediately, Hermès executes with its own credentials, then writes results back to Convex for the SaaS UI. This is the default pattern when Thomas asks for the SaaS to run “with Hermès in backend” while Convex remains the source-of-truth/orchestration layer.

## Clerk + Convex Integration Pattern

Convex auth config must validate Clerk JWTs:

```ts
// convex/auth.config.ts
import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

Next.js client provider pattern:

```tsx
'use client'

import { ReactNode } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
```

Layout order:

```tsx
<ClerkProvider>
  <ConvexClientProvider>{children}</ConvexClientProvider>
</ClerkProvider>
```

## Tenant Model

Use Clerk Organizations as the source for active org context, but mirror required data in Convex.

Recommended Convex tables:

- `workspaces`: Clerk org mapping and product settings
- `workspaceMembers`: local role/capability cache if needed
- `contacts`
- `pipelines`
- `pipelineStages`
- `opportunities`
- `channels`
- `conversations`
- `conversationParticipants`
- `messages`
- `properties` / `biens` (real-estate asset object)
- `tasks`
- `notes`
- `timelineEvents`
- `agents`
- `agentSouls`
- `agentMemories`
- `agentRuns`
- `agentActions`
- `approvals`
- `integrationAccounts`
- `webhookEvents`
- `auditLogs`
- `usageEvents`

Every tenant-owned table must include `workspaceId`.

For Soren-derived real-estate CRM code, prefer these canonical mappings:
- `prospects` → `contacts`
- `leads` → `opportunities`
- `biens` → `properties`
- `devis` → `proposals`/`offers`
- `ghl_*` fields → generic `externalRefs` provider mappings

## Authorization Rule

Never trust client filters alone. Every Convex query/mutation must:

1. Read authenticated user identity via Convex auth
2. Resolve active Clerk org/workspace context
3. Check membership/role/capability
4. Filter by `workspaceId`
5. Reject cross-workspace access
6. Log sensitive writes/actions

## Data Modeling Rules

- Use provider IDs only as external mappings, never primary product identity
- Store `workspaceId` on all CRM/conversation/agent resources
- Store `createdBy`, `updatedBy`, and timestamps on important records
- Use indexes for common workspace queries
- Keep raw webhook payloads in `webhookEvents` for debugging, with retention policy
- Store secrets outside client-readable tables

## Convex Functions

Use queries for reads:
- list conversations for active workspace
- list messages in conversation
- get contact timeline
- get pipeline state

Use mutations for transactional writes:
- create/update contact
- append message
- assign conversation
- create opportunity
- propose agent action
- approve/reject action
- create durable Hermès tasks from user actions or system events

Use actions for external APIs:
- WhatsApp send/receive adapter
- GHL sync
- AI model calls
- ElevenLabs calls
- Stripe billing calls
- Hermès task dispatch webhooks triggered via `ctx.scheduler.runAfter(0, internal.*)`

For Hermès-backed SaaS actions, prefer: normal mutation writes source-of-truth state → internal mutation inserts `hermesTasks` row with idempotency → internal action POSTs to Hermès → Hermès claims/completes/fails → SaaS subscribes/polls Convex for result.

## Common Pitfalls

1. **Assuming Clerk orgId automatically secures Convex data.** Convex functions must enforce access explicitly.
2. **Using provider IDs as internal IDs.** Keep internal Convex IDs and separate external mappings.
3. **Putting service secrets in frontend env vars.** Only public keys go to Next.js client.
4. **Skipping indexes.** Realtime conversation UI needs fast workspace/conversation/message queries.
5. **Treating Convex as only a DB.** Use functions/actions/scheduler to centralize backend logic.
6. **Letting agents write directly without policy.** Agent actions should go through mutations with permission checks.
7. **Next canary + Clerk peer range conflicts.** If a patched Next canary is required to clear `npm audit` before a stable release exists, `@clerk/nextjs` may reject the peer dependency. Prefer documenting the tradeoff and use `npm install ... --legacy-peer-deps` only when build + audit verification pass.
8. **Provider envs breaking transitional builds.** During Supabase → Convex/Clerk migration, gate `ClerkProvider`/`ConvexProviderWithClerk` on public env vars so the existing CRM can still build without real Clerk/Convex credentials. For local build/dev, use minimal Supabase placeholders in ignored `.env.local`; do not invent fake Clerk/Convex envs because Clerk may inject malformed browser scripts.
9. **Convex codegen dry-run can require remote env.** `npx convex codegen --dry-run` may still hit the configured deployment and fail if `CLERK_JWT_ISSUER_DOMAIN` is not set in Convex env. Treat this as deployment setup, not a local code blocker.
10. **Next 16 middleware rename.** On Next.js 16/canary, migrate `middleware.ts` to `proxy.ts` and rename exported `middleware()` to `proxy()` before treating the warning as harmless.
11. **Soren CRM migration trap.** Do not do a naive field-for-field Supabase/GHL → Convex rewrite. Preserve the frontend skin, but remodel the backend around workspaces, contacts, opportunities, properties, conversations, timeline events, agent actions, approvals, and audit logs. Borrow Twenty-style object/timeline patterns without importing Twenty’s full complexity.
12. **SSH dev-server leftovers.** When smoke-testing the local Mac repo from the VPS, kill any existing `next dev` process after curl/browser checks; otherwise the next run may fail with “Another next dev server is already running.”
13. **Trigger half-wiring.** If a Convex mutation schedules `internal.someFunction`, implement that internal function in the same pass and run codegen/build before saying it works. A missing internal mutation breaks the whole app even if the trigger location is correct.
14. **Fake analytics linger.** When repairing analytics pages, remove placeholder counters and fragile `api as unknown` casts. Add/read aggregate Convex queries from real tables, then wire KPI cards, platform badges, breakdowns, and tables from those aggregates.

## Verification Checklist

- [ ] ClerkProvider wraps ConvexProviderWithClerk, or transitional provider gate is documented
- [ ] `convex/auth.config.ts` uses Clerk issuer domain
- [ ] Existing Supabase CRM still builds with dummy Supabase envs when Clerk/Convex envs are absent
- [ ] Placeholder local env does not inject fake Clerk scripts into `/login` HTML
- [ ] Next 16 projects use `proxy.ts`/`proxy()` instead of deprecated `middleware.ts`/`middleware()`
- [ ] Every tenant table has `workspaceId`
- [ ] Every Convex function checks auth and workspace access
- [ ] External API calls live in actions/server code only
- [ ] Conversation queries are indexed for realtime use
- [ ] Soren-derived CRM names are mapped to canonical VividFlow objects (`contacts`, `opportunities`, `properties`, `proposals`) before migrating UI pages
- [ ] GHL/Supabase provider IDs live in external mappings, not product identity
- [ ] Timeline events are emitted for material CRM and agent actions
- [ ] Agent proposals go through `agentActions` + `approvals` before sensitive execution
- [ ] For Service Execution OS CDC #0, the only required proof loop is `agent stub → actionQueue → approval/rejection → auditLogs → duplicate tl;dv webhook ignored`; full Tasks/Decisions/CRM/Calls modules stay out of scope
