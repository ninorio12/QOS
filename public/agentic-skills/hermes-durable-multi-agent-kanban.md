---
name: hermes-durable-multi-agent-kanban
description: Use when designing or operating VividFlow/Brvndlab multi-agent execution that must survive restarts, coordinate workers, reclaim stalled tasks, and close loops without hallucinated completion.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, hermes, multi-agent, kanban, orchestration, durability]
    related_skills: [hermes-agent, vividflow-agent-runtime, workspace-dispatch, brvndlab-agent-heartbeat]
---

# Hermes Durable Multi-Agent Kanban

## Overview

Hermes Agent v2026.5.7 reinforces a useful pattern for our system: a multi-agent setup should not be “several bots chatting”. It should be a durable execution board where every task has an owner, heartbeat, status, retry budget, evidence, and completion gate.

For VividFlow/Brvndlab, this is the reference pattern for durable agent orchestration: Cockpit/COO creates or routes work, specialized agents execute, the board tracks state, and completion is accepted only with verifiable evidence.

## When to Use

Use this skill when:
- Designing VividFlow/Brvndlab agent orchestration
- Creating or improving topic agents, worker profiles, or subagents
- Turning Telegram instructions into durable tasks
- Running long work that must survive restarts or interruptions
- Building an internal Tracker / Agent OS / SaaS runtime around agents
- Auditing whether an agent workflow is real execution or just chat

Do not use it for:
- Single-turn answers
- Simple research summaries
- One-off synchronous delegation where `delegate_task` is enough

## Core Doctrine

A durable multi-agent system needs these primitives:

1. **Board** — persistent source of truth for tasks and state.
2. **Task** — clear title, owner/assignee, status, priority, due context, retry budget.
3. **Worker** — agent/profile responsible for one task at a time.
4. **Heartbeat** — recurring “I am alive and progressing” signal.
5. **Reclaim** — stalled tasks return to queue after missed heartbeats.
6. **Zombie detection** — crashed or disconnected workers are detected, not trusted.
7. **Auto-block** — repeated failures move a task to blocked with reason.
8. **Completion evidence** — task is not done because the worker says so; it is done because evidence passes verification.
9. **Handoff** — downstream agents receive structured context, artifacts, and blockers.
10. **Audit trail** — every assignment, action, failure, retry, and completion is logged.

## Task Contract

Every task created for an agent should include:

- `title`: specific outcome, not vague intent
- `business_context`: why this matters
- `scope`: exact files/modules/channels/client/workspace concerned
- `assignee`: profile/topic/agent responsible
- `allowed_tools`: what the worker may access
- `forbidden_actions`: what must not happen silently
- `exit_criteria`: machine-checkable or human-reviewable proof
- `evidence_required`: screenshots, tests, links, file paths, logs, PR, summary
- `max_retries`: default 2-3 depending on risk
- `blocked_condition`: when to stop retrying and ask for decision

## Default VividFlow Execution Flow

1. Capture instruction from Telegram, repo, issue, meeting, or client signal.
2. Convert it into one or more board tasks.
3. Assign each task to the right role:
   - Cockpit: triage, routing, synthesis, user-facing decisions
   - COO: execution orchestration and business ops
   - Tech/Dev: implementation, tests, PRs, deployment checks
   - CMO/Content: content strategy and production
   - CSM: client follow-up and retention signals
   - Market Radar: monitoring and competitive intelligence
4. Worker claims the task and sends heartbeat during long execution.
5. Worker produces completion evidence.
6. Orchestrator verifies evidence before marking done.
7. If verification fails, retry with precise failure context.
8. If repeated failure or missing access, block with a concise decision request.
9. Update relevant memory/skills only for durable facts or reusable workflows.

## Completion Gate

A task is complete only when at least one evidence class passes:

- **Code:** tests/typecheck/build pass; file diffs match request; no unrelated refactor.
- **UI:** live route checked; screenshot/vision evidence; no console errors.
- **Research:** source links captured; claims grounded; synthesis actionable.
- **Ops:** command output verifies state; logs checked; no hidden failure.
- **Client/business:** final message/deliverable attached; next action clear.

Never accept “done” without evidence when the task has side effects.

## Heartbeat Standard

For long tasks, workers should post or log:

- `% complete`
- `done`
- `currently working on`
- `blocked by`
- `next verification`
- `ETA / next delivery point` when useful

If no progress is visible after the heartbeat threshold, reclaim or inspect before trusting the worker.

## Retry / Block Policy

Default retry policy:

- Attempt 1: normal execution
- Attempt 2: retry with exact failed evidence and narrowed scope
- Attempt 3: only for low-risk tasks or when failure is clearly transient
- After retry budget: block with reason + recommended decision

Auto-block reasons:

- Missing credential/access
- Repeated test/build failure
- Worker exits without completion evidence
- Scope ambiguity that changes architecture
- Risky/destructive operation requires approval
- External platform instability

## Hallucination Recovery

If a worker claims completion but evidence is missing:

1. Do not mark complete.
2. Ask for concrete artifact path/link/log.
3. Verify independently.
4. If artifact does not exist, mark hallucinated completion and retry with stricter exit criteria.
5. If repeated, reassign to another worker or escalate to human decision.

## Telegram Topic Adaptation

Telegram topics are not enough as a durable system. Treat topics as conversational surfaces; the board remains the execution source of truth.

Rules:
- Topic messages can create tasks, but task state lives in the board.
- Replies in topics should summarize board state, not replace it.
- Long work must emit status updates or board heartbeats.
- Cross-topic routing must be intentional and role-filtered.
- Never broadcast generic context to all agents unless explicitly requested.

## SaaS Runtime Adaptation

For VividFlow/Brvndlab product work, mirror this as data primitives:

- `tasks`
- `taskAssignments`
- `agentRuns`
- `agentRunSteps`
- `agentHeartbeats`
- `agentArtifacts`
- `agentFailures`
- `agentApprovals`
- `auditLogs`

UI surfaces:

- Agent board / mission control
- Worker detail drawer
- Run timeline
- Evidence panel
- Retry/block controls
- Human approval queue
- Cost and usage panel

## Common Pitfalls

1. **Confusing chat with execution.** Multiple agents answering in Telegram is not a durable multi-agent system.
2. **No heartbeat.** Silent workers create false confidence and lost tasks.
3. **Trusting completion claims.** Always require evidence for side-effecting work.
4. **No reclaim path.** A crashed worker must not freeze a task forever.
5. **Global memory leaks.** Agent memory must be scoped by workspace/client/task when productized.
6. **No retry budget.** Infinite retries waste time; no retries creates brittle automation.
7. **Unclear ownership.** Every active task needs exactly one current owner.
8. **No audit trail.** If an agent acts, we need to know why, when, and with what input.

## Quick Checklist

Before launching a durable agent workflow:

- [ ] Board/source of truth exists
- [ ] Task has owner and status
- [ ] Exit criteria are explicit
- [ ] Worker has scoped tools and permissions
- [ ] Heartbeat/reclaim behavior exists
- [ ] Retry budget is set
- [ ] Completion evidence is required
- [ ] Human approval boundary is clear
- [ ] Audit trail is preserved
- [ ] Final summary is short and decision-oriented

## Source Note

Distilled from Hermes Agent v2026.5.7 “Tenacity Release”: durable Multi-Agent Kanban, heartbeats, reclaim, zombie detection, per-task retries, hallucination recovery, auto-block on incomplete exit, persistent goals, cron `no_agent` watchdogs, and session durability after gateway restarts.
