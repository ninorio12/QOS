---
name: vividflow-agaas-product
description: Use when working on VividFlow AGAAS product strategy, CRM conversations, agentic SaaS scope, or avoiding confusion with Soren/BTP examples.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, agaas, crm, conversations, agentic-saas]
    related_skills: [workspace-dispatch, writing-plans]
---

# VividFlow AGAAS Product Brief

## Overview

VividFlow AGAAS is an Agentic-as-a-Service platform with two inseparable layers: a CRM/conversation workspace and an agentic layer operating on top of client communications. The core customer value is to stop managing leads in WhatsApp directly and instead centralize conversations in VividFlow, where AI can qualify, summarize, route, and trigger CRM actions.

Soren/BTP is only an example/prototype context. Do not treat BTP as the target vertical unless Thomas explicitly says so. For Thomas's VividFlow AGAAS Immobilier work, do not use “Soren” as the product identity: it was only the recovered SaaS/codebase label. Refer to the product as VividFlow AGAAS Immobilier and treat any Soren naming as legacy code/UI copy to migrate progressively when touching modules.

## When to Use

Use this skill when:
- Defining product scope for VividFlow AGAAS
- Designing CRM, Conversations, Pipeline, Contacts, Tasks, Calendar, KB, or Agent modules
- Reviewing Soren/app.qorpoia.com and separating prototype examples from actual product direction
- Writing implementation plans for the AGAAS MVP
- Briefing Codex/Claude/subagents on VividFlow context

Do not use this for Brvndlab work.

## Live Development Supervision

When Thomas wants real-time visibility into VividFlow AGAAS development:

- Prefer VS Code Remote SSH over local cloning so there is one source of truth on the VPS.
- Before giving a project path, verify the active workspace from the visible terminal prompt, VS Code Explorer root, or a direct `pwd`/`ls` check. Do not assume old paths from memory.
- Treat `/opt/vividflow` as the observed active VPS workspace when the terminal shows `hermes@...:/opt/vividflow$` and the Explorer contains `src`, `public`, `workflows`, `supabase`, `.env.local`, `next-env.d.ts`, `deploy.sh`, and `ecosystem.config.cjs`.
- If a proposed path does not exist, immediately correct to the observed workspace and tell Thomas the exact folder to supervise.
- Keep the guidance short: verdict, risk if any, and the exact action/command.

### Dev Fluidity / “Inutilisable” Triage

When Thomas says the app is unusable, frozen, slow, or a live URL does not respond, treat this as a product blocker before adding features. First verify the exact port/process/route (`ss`, `pm2 list`, `curl`) and make the URL Thomas gave work unless blocked by a real collision. Then look for dev-mode compilation storms: global root prefetchers, unrelated API waterfalls, too many root fonts, route remount animations, eager Supabase imports in shell components, and aggressive webpack polling. Use `references/dev-fluidity-and-live-preview.md` for the proven VividFlow checklist and verification recipe.

### Live Branding / Logo Corrections

When Thomas asks for VividFlow branding/logo changes on the live SaaS, treat placement as part of the requirement: if he says sidebar, keep the brand asset in the sidebar only unless he explicitly asks for login/marketing surfaces. Do not assume screenshots or validation images are wanted in the reply; use browser/DOM checks privately and report the verdict concisely.

Workflow:
1. Verify the live workspace and asset path (`/opt/vividflow`, `public/`, `src/components/Sidebar.tsx`) before editing.
2. Search all TSX content for the logo filename and screenshot/cache names; remove unintended usages outside the requested surface.
3. If a SVG logo appears invisible, check whether it is placed inside an identical-color orange wrapper; render the asset directly or increase size/contrast instead of adding extra duplicate icons.
4. Verify with `npx tsc --noEmit`, code search showing intended occurrences only, and `curl -I` for the asset URL.

### CRM Agentique Live Hardening

When Thomas asks to make the existing SaaS/CRM “fonctionnel avec des vraies API”, do not jump straight into new agent features. Stabilize the current CRM shell first: verify PM2/ports, smoke-test CRM pages and APIs, add/localize auth and integration fallbacks that keep dev auditable without weakening production, pass tenant credentials explicitly into live API functions, and expose integration status through a health endpoint. Keep user-facing agentic language productized (“Moteur IA”, “Demander à l’agent”) and avoid raw runtime/Hermes internals. Use `references/crm-agentic-live-hardening.md` for the detailed sequence and commands.

### Onboarding Process Activation

When Thomas asks to build or finish the “formulaire process d’onboarding”, treat it as a full activation workflow, not a visual form. Implement the complete vertical slice: `/onboarding` page, multi-step client validation, `/api/onboarding` GET/PATCH/POST, shared normalization/validation, generated activation plan, persistence fallback, tests, typecheck, production build, and browser smoke test. Keep the plan tied to agency identity, lead sources, channels, pipeline, agent guardrails, and go-live KPI. Use `references/onboarding-process-activation.md` for the proven file map, requirements, verification recipe, and pitfalls.

### Convex/Clerk Rebuild Supervision

When Thomas/Jonathan wants Hermes to supervise Claude Code or another coding agent for a full VividFlow AGAAS rebuild, treat the live Supabase app as UX/prototype input and the Convex/Clerk workspace as the target architecture. First verify schema/function coherence and workspace isolation before UI work. Build one complete vertical slice at a time: schema → auth/workspace → CRM data → conversations → agent runtime → approvals. Use `references/convex-clerk-migration-supervision.md` for the detailed handoff pattern and module audit checklist.

When Thomas asks for a “CDG/CDC ultra complet” to give to Claude Code, produce a developer-ready cahier des charges, not a generic SaaS checklist. It must lock the VividFlow AGAAS Immobilier context, explain every module by utility/input/output/backend/agentic role, include the Convex + Clerk + Hermès architecture, and end with a copy-paste Claude Code prompt plus mandatory implementation order. Use `references/claude-code-cdc-handoff.md` for the full structure, prompt template, and pitfalls.

## Product Thesis

VividFlow replaces scattered lead management with one operating system for Swiss real-estate agencies. It must be a scalable subscription SaaS with self-serve onboarding and near-instant activation, not a manual agency-style installation.

### VividFlow Immobilier AGaaS Pivot

When Jonathan/Thomas discusses VividFlow Immobilier after the old decks/maquette, treat the confirmed direction as **AGaaS immobilier généraliste / cockpit d'exploitation**, not an acquisition or ads product. The old acquisition stack (Meta ads, landing pages, qualification, WhatsApp follow-up, booking, lead recycling) is useful but should be reclassified as an input/source module. The core product is: CRM conversationnel + agents métiers + validation humaine + mémoire agence. Prioritize conversations, contacts, biens, mandats, visites, relances, matching, pipeline, and daily agency cockpit. See `references/immobilier-agaas-pivot-from-acquisition.md` for the session-derived doctrine, agents, modules, deck signals, and pitfalls.

For the métier/commercial packaging doctrine, do **not** design one generic agent that handles everything. Use: **socle commun + Agent Coordinateur + agents métiers activables par corps de métier**. Separate agencies/courtiers, promoteurs, gérances/régies, location, chasseurs/mandataires acheteurs, réseaux, and partners. Each pack should map to a buying reason and operational workflow, not a generic AI capability. See `references/immobilier-agaas-modular-metiers-cdc.md` for the agent map, packs, client-final experience, and PDF CDC delivery format.

When Jonathan is defining his own VividFlow/service OS from Kalvi-style references, frame it as a **Service Execution OS** rather than a generic CRM: every call, prospect, payment, feedback and deliverable becomes actionable data, then humans and agents are orchestrated to execute faster with quality control. Copy Kalvi's product grammar, not its org chart: do not add Cohorte/Incubateur/program modules unless they truly exist in VividFlow; keep `Clients` and `Équipe` as the people layer, with segmentation as filters. See `references/kalvi-data-os-and-service-execution-os.md` for the full doctrine and module map.

When reviewing or briefing the public/client VividFlow onboarding inspired by Kalvi/Boost IA, do **not** treat it as a friendly dark SaaS wizard. Jonathan wants a light canvas/system-builder experience: grid, blocks, arrows, progressive architecture, and a dynamic `Boost IA` recommendation that emerges from the user's sector, departments, tools, process pains and goals. The flow must be generalist by default; immobilier is one possible niche, not the baseline. See `references/vividflow-onboarding-kalvi-style-direction.md`.

When Jonathan/Thomas sends or validates a Vercel mockup for the **VividFlow Data OS / Service Execution OS**, treat the current vision as validated unless he asks to reopen it. Review/build the mockup as an operating system, not a design gallery: each module must show what data enters, what the system understands, what action/decision comes out, and which other module is impacted. Apply Switzerland context globally (CHF / francs suisses, not euros) and prioritize the tl;dv/Calls pipeline as the core data-to-action engine.

If Thomas says to continue coding on `https://vividflow-service-execution-os.vercel.app/`, use it as the live Data OS target and keep the build clear/action-first: do **not** turn 17 modules into decorative pages or a heavy catalogue. The first real vertical slice should be `Calls → IA summary/extraction → CRM/Tasks/Decisions → Dashboard impact → audit trail`. Avoid “brouhaha”: no extra widgets, badges, fake metrics, or explanatory screens unless they serve that execution loop. Use `developpeur` for the production audit before calling anything ready.

Use `references/service-execution-os-mockup-review.md` for the confirmed 17-module map, review passes, copy-paste Claude Code prompt, and pitfalls.

When Jonathan validates a Vercel mockup of the **VividFlow Service Execution OS / Data OS** and says the next step is a cahier des charges for Claude Code or an implementation agent, do not reopen the vision. Produce a developer-ready CDC/handoff that locks the validated 17-module map, warns against building 17 static pages, and centers the first proof on the tl;dv Call Cascade: transcript → summary → objections/actions → CRM/Tasks/Decisions/Delivery/R&D with HITL for sensitive actions. Use `references/service-execution-os-cdc-handoff.md` for structure, table families, workflows, phases, acceptance criteria, and copy-paste handoff wording.

When briefing another agent that only has the pre-pivot archive, BRIEF-MASTER.md, or Kalvi/PROSPECT-01 context, use `references/new-direction-data-os-handoff.md` for the sealed deltas: current model, product/stack, Data OS role, users/permissions, sealed vs open decisions, Kalvi differences, team/capacity and hard constraints.

## Context Disambiguation: Jonathan Data OS vs Thomas AGaaS

Before producing a long VividFlow brief, identify which chantier Jonathan is asking about:

- **Jonathan + external Claude / design work**: usually the **Data OS / SaaS de gestion global**. Center the brief on VividFlow as the internal cockpit for the operating company / holding machine: clients d’infrastructures IA, niches explored, data maturity, spinout opportunities, cash, decisions, risks, delivery, teams, and companies/products created later. Mention AGaaS only as adjacent context if useful.
- **Thomas / Soren / runtime / agents / Conversations MVP**: usually the **AGaaS** chantier. Use the CRM + conversation + agentic-loop sections of this skill.
- **Ambiguous request**: ask one short clarification before writing a dense handoff.

Pitfall learned from Jonathan: do **not** inject Thomas's AGaaS, tracker runtime, Soren, Erwan/mock clients, VPS paths, or low-level agent execution details into a brief for Claude designing the Data OS. It confuses the product frame. For Data OS briefing, use `references/data-os-briefing-filter.md`.

### Data OS Strategy Frame: Niche → Data → AGaaS

Do not frame the Data OS as an app containing fixed modules like “VividFlow Immo” or “VividFlow BTP” unless Jonathan explicitly chooses that naming. VividFlow first sells expensive AI/agentic infrastructures into precise niches to solve real problems and harvest operational data. When a niche has enough repeated patterns and clients, it may become a dedicated AGaaS product, business unit, or company with its own acquisition, project lead, P&L, team, and métier OS.

Use this maturity model in briefs/mockups:
- broad sector → precise niche → test client → mature niche → AGaaS spinout → dedicated company/product
- example: Bouquet Supreme is a test client in “boutiques de parfumerie / retail parfum premium,” not a niche called “parfum.”

- `references/data-os-niche-to-agaas-model.md`.
- `references/service-execution-os-mockup-review.md` — how to review Jonathan's Vercel Data OS / Service Execution OS mockups: confirmed 17-module map, CHF/Suisse cleanup, tl;dv Calls pipeline, module interconnections, and Claude Code prompt fragment.
- `references/discovery-call-agaas-deck-storyboard.md` — doctrine for the VividFlow discovery-call AGaaS/IAO presentation: identification → aggravation → education → bascule → projection → audit, less-is-more visual grammar, punchline slides, and hand-drawn schema patterns.

### Jonathan Validation Format for VividFlow UX

Jonathan should not be asked to validate long documents or local file paths for product/UX decisions. For VividFlow mockups and design reviews, provide a user-friendly Vercel URL with an intro screen, simple navigation, and concise annotations. Low-fi wireframes are acceptable, but they must be presented like a shareable mini-product, not as raw HTML files, folders, or 700-line docs.

## Jonathan Strategy Discussion Style

When discussing VividFlow vision, product strategy, positioning, decks, or doctrine with Jonathan, act as a thinking partner, not a roadmap generator. Keep the visible answer human, fluid, sharp, and conversational. The default shape is short, dense, and opinionated; do not unload a full slide plan or long operational breakdown unless Jonathan explicitly asks for it. Do the deep analysis privately, then surface only what helps the current exchange.

Operating mode:
- lead with the real conviction, not a neutral list
- give enough substance to create value, but keep it digestible
- use a few bullets/headings when they clarify separation of ideas
- do not impose artificial line counts or rigid formats
- avoid both extremes: long encyclopedic dumps and over-compressed robotic replies
- if Jonathan says he cannot follow, is not a fan, or says you are giving too much information, immediately compress to one core conviction + one next question; do not continue listing options
- for early-stage niche/offer brainstorming, prefer progressive narrowing: ask/answer one axis at a time (niche → pain → offer → channel), not a full market map unless requested
- ask one question when one is enough, several only when the topic truly needs it
- challenge sincerely when an idea is vague, risky, or too broad
- if something becomes concrete, state the conviction/principle clearly and ask whether to seal it
- if something becomes operational, say who should receive it and why

Jonathan explicitly corrected the style: the issue is not simply length. He wants discernment — human phrasing, tranchant ideas, value and substance without being submerged. A good answer sounds like an associate saying: “Le vrai angle, c’est X. Il y a 2-3 choses à voir. La plus importante, c’est Y.”

Avoid dumping full agent impacts, architecture, roadmap, data models, or long checklists unless Jonathan explicitly asks for an operational handoff. Do not force him to read the backend analysis. If a dense doctrine is useful, save it quietly to memory/GBrain or offer a short next step.

If Jonathan asks for “un petit message”, “pique de rappel”, “simplifie”, or says “trouve le bon équilibre”, compress the answer while preserving the core strategic value. Do not turn it into a dry slogan or a 3-line summary if the question needs nuance.

If Jonathan asks for “un petit message”, “pique de rappel”, or says “ne te prends pas trop la tête”, send a short strategic reminder only. Do not convert it into a full recadrage. For example: remind the recipient that VividFlow is an operational company/studio selling premium AI systems, learning from market data, and only later spinning mature niches into dedicated SaaS/AGaaS products; keep corporate/legal structure flexible unless Jonathan asks to lock it.

### Visual Validation Workflow for Jonathan

Jonathan is highly visual and time-constrained. For VividFlow UX/product validation, do not ask him to validate long docs, local file paths, or raw HTML artifacts. Convert specs into a user-friendly visual artifact first.

Preferred sequence:
1. Produce a concise written recommendation only for orientation.
2. Ask the design/dev agent for a presentable mockup board, not a document review.
3. Deploy the mockup to a stable Vercel URL when possible.
4. Include an intro screen with scope, non-scope, version/date, and 5-7 validation questions.
5. Keep navigation simple between screens and annotations short.
6. Ask Jonathan to judge comprehension, cockpit feel, CRM-generic risk, hierarchy, and operational pressure.

Pitfalls:
- Do not say “open `docs/.../file.html`” as the primary review method; a local path is not user-friendly for Jonathan.
- Do not jump from low-fi structure to high-fidelity visual design just because a mockup exists. Correct low-fi first, redeploy, validate structure, then move to visual direction.
- If a screen feels like “CRM enriched with badges”, push it toward Data OS: visible pressure, next action, decisions/risks/tasks, signal source, and holding/vertical consolidation.

Core loop:

1. Client subscribes and creates a workspace/agency
2. Client connects channels and invites team members in a guided onboarding
3. Message arrives from WhatsApp or another channel
4. It appears in VividFlow Conversations
5. AI reads context and classifies real-estate intent
6. Contact/lead/opportunity is created or updated
7. Agent suggests next action or reply
8. Human approves, edits, or delegates execution
9. CRM state stays synchronized

## MVP Loop

The first shippable loop must prove this:

- Connect a messaging channel, starting with WhatsApp/provider abstraction
- Receive inbound messages into Conversations
- Link message to contact and workspace
- Let AI summarize and qualify the lead
- Create/update opportunity in Pipeline
- Suggest reply and next task
- Require human approval before high-impact outbound actions

## Core Modules

### CRM Layer

- Workspaces/organizations
- Users and roles
- Contacts
- Leads
- Pipeline and opportunities
- Tasks
- Calendar events
- Notes and activity timeline

### Conversations Layer

- Channels
- Conversations
- Participants
- Messages
- Attachments
- Assignment/status
- AI summary
- AI intent/qualification
- Suggested replies

### Agentic Layer

- Agents
- Souls/system prompts
- Memory
- Skills
- Tools/MCP/API permissions
- Runs and steps
- Proposed actions
- Approvals
- Audit logs
- Cost tracking

## Positioning

One-line positioning:

VividFlow is a conversation-first CRM with AI agents that turn inbound messages into qualified pipeline and operational actions.

Avoid positioning it as:
- A generic chatbot
- A WhatsApp wrapper only
- A BTP-specific SaaS
- A dashboard-first analytics product

## Product Priorities

P0:
- Auth + organizations
- Subscription-ready workspace creation
- Guided self-serve onboarding
- Conversation inbox
- Contact linking
- Message ingestion
- Basic AI summary/qualification
- Pipeline update
- Agent action approval

P1:
- Multi-channel support
- Agent runtime logs
- KB/memory per workspace
- Human handoff and assignment
- Calendar/tasks integrations
- Usage metering foundation

P2:
- Voice/receptionist
- Billing and plan enforcement
- Advanced analytics
- Workflow builder

## Common Pitfalls

1. **Building 15 modules before proving Conversations.** The MVP should prove the message-to-pipeline loop first.
2. **Making WhatsApp the product.** WhatsApp is a channel; VividFlow is the system of record and operating interface.
3. **Letting agents act without permissions.** Every tool/action needs explicit scope, logging, and approval policy.
4. **Confusing prototype content with product direction.** Soren/BTP examples are not the target unless explicitly requested.
5. **Dashboard-first thinking.** The product is workflow-first: messages, decisions, actions, CRM state.
6. **Designing for manual setup.** VividFlow must sell as subscription SaaS: signup, workspace, integrations, team, agents, value quickly. Any MVP feature requiring heavy manual installation per client is suspect.
7. **Copying horizontal agent bundles.** Competitors like Limova package many generic agents well, but VividFlow should win via vertical real-estate depth and a CRM/conversation system of record.

## References

- `references/data-os-briefing-filter.md` — how to brief Claude/design agents on Jonathan's VividFlow Data OS without confusing it with Thomas's AGaaS chantier.
- `references/new-direction-data-os-handoff.md` — dense handoff for agents that only know the pre-pivot VividFlow archive / BRIEF-MASTER / Kalvi PROSPECT-01 context.
- `references/limova-quick-scan.md` — quick competitor scan: Limova agents, WhatsApp control, pricing signals, and VividFlow differentiation.
- `references/real-estate-cash-opportunity-axes.md` — concise doctrine for VividFlow Immobilier revenue axes: CRM reactivation, matching, valuation-to-mandate, referrals, promotions, rental solvency, partner commissions, and US proptech patterns.
- `references/strategy-source-analysis-and-tldv.md` — how to analyze Jonathan’s VividFlow strategy sources, Kalvi/Minozan benchmark context, multi-vertical interpretation, and tl;dv transcript extraction pattern.
- `references/kalvi-data-os-and-service-execution-os.md` — Kalvi Data OS observations, visible modules, and VividFlow Service Execution OS doctrine for turning calls/prospects/payments/feedback/livrables into an executable system.
- `references/crm-agentic-live-hardening.md` — sequence for stabilizing existing CRM modules with real/fallback APIs, tenant credentials, health endpoint, typecheck/smoke/browser validation, and productized agentic UX.
- `references/immobilier-agaas-pivot-from-acquisition.md` — doctrine from Jonathan's old VividFlow Immobilier maquette/decks/PDFs: reclassify acquisition as an input module and position the product as an operating cockpit with real-estate agents, memory, validations, matching, mandates, visits, and relances.
- `references/immobilier-agaas-modular-metiers-cdc.md` — métier-by-métier AGaaS packaging doctrine: socle commun, Agent Coordinateur, agents spécialisés, packs commerciaux, client-final experience, and PDF CDC delivery format.
- `references/convex-clerk-migration-supervision.md` — supervision pattern for migrating/rebuilding VividFlow AGAAS on Convex/Clerk with module-by-module audit, workspace isolation, and Claude Code handoff template.
- `references/data-os-prospection-modules-and-mcp.md` — doctrine for adding Prospection, Appels, and Plan d’attaque/Priorisation to the live Data OS without rewriting Contacts/Pipeline: contact source-of-truth, R1 handoff, hot/warm/cold cards, volume UX, synchronization rules, and MCP tool expansion.
- `references/data-os-acquisition-audit-and-system-layer.md` — session-derived doctrine for auditing/testing the Acquisition modules as one coherent system: real MCP/UI `TEST AUDIT -` flows, Contacts source of truth, Pipeline↔Prospection sync, Performance metrics, settings/users/permissions, notification bell, and theme placement.
- `references/data-os-acquisition-coherence-audit.md` — active audit workflow for Acquisition modules: use MCP/UI with `TEST AUDIT -` data, verify Contacts as source of truth, test Prospection/Pipeline/Performance/Activities sync, and especially guard the Pipeline→Perdu regression.
- `references/twenty-crm-client-data-os-evaluation.md` — evaluation of Twenty as a reusable client Data OS/CRM base: when it fits CRM-like clients, when to keep VividFlow’s custom stack, AGPL/monorepo cautions, and 1-day spike checklist.

## Verification Checklist

- [ ] Product decision supports CRM + conversation + agentic loop
- [ ] WhatsApp remains a channel, not the interface of record
- [ ] Agent actions are permissioned and auditable
- [ ] Multi-tenant/org context is explicit
- [ ] Subscription/self-serve onboarding path is preserved
- [ ] Feature does not require heavy manual installation per customer
- [ ] Real-estate vertical depth is favored over generic horizontal agent sprawl
- [ ] BTP/Soren assumptions are not treated as target requirements
