---
name: software-delivery-workflow
description: "Umbrella workflow for software delivery in Hermes covering brainstorm/design, plan execution, parallel agents, and evidence-first verification."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [Software-Development, Planning, Agents, Verification]
---

# Software Delivery Workflow

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this skill for implementation work that spans more than one trivial edit: designing a change, writing/executing a plan, dispatching subagents, and verifying completion with evidence.

## Lifecycle

1. **Brainstorm/design** before building when requirements, UX, architecture, or behavior are not obvious.
2. **Plan** into small executable tasks with paths, commands, risks, and verification checks.
3. **Execute** the plan critically: load it, check assumptions, implement step by step, and revise when blockers appear.
4. **Parallelize** only independent domains with clear boundaries and no shared-state races.
5. **Verify before completion**: run the relevant command, inspect output, and report evidence instead of optimistic claims.

## Subtopics absorbed

Detailed prior session runbooks are stored under `references/`:

- `brainstorming.md` — creative/product design exploration before implementation.
- `executing-plans.md` — plan loading, critical review, execution checkpoints.
- `dispatching-parallel-agents.md` — when and how to use delegate_task batch mode.
- `verification-before-completion.md` — evidence-first completion rule.
- `repo-red-verification.md` — how to verify a feature cleanly when the repo already has unrelated typecheck/build failures.
- `next-vercel-build-artifacts.md` — Next.js/Vercel App Router build artifact failures, legacy `vercel.json` quirks, memory-kill retries, and remote deploy inspection.

## Pitfalls

- “Simple” changes still need verification if they affect behavior.
- Do not dispatch subagents for tightly coupled edits that require shared state.
- Do not end with next-step promises when tools can execute the next step now.
- If global verification is red from unrelated debt, do not stop at `typecheck failed` and shrug. Run targeted verification on the changed surface, then report the feature status separately from the repo health blocker.
- Next/Vercel builds can fail from stale `.next` artifacts or legacy config, especially with App Router errors like `Cannot find module for page: /_document` / `/_not-found`. Root-cause before patching app code: remove `.next` and `tsconfig.tsbuildinfo`, inspect `vercel.json` for obsolete `builds`, verify Pages Router fallbacks only if the build truly expects them, then rerun with constrained `NODE_OPTIONS` if memory pressure kills the process.
- If `vercel deploy` is interrupted locally after upload/build starts, do not assume failure. Use `vercel inspect <deployment-url>` and wait until it reports `Ready` or `Error`; Vercel may finish remotely after the CLI process stops.
