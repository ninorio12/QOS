---
name: vividflow-agent-runtime
description: Use when designing or implementing VividFlow agents, tool permissions, agent memory, runs, approvals, audit logs, or Hermes/Cockpit orchestration.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, agents, runtime, hermes, approvals, audit]
    related_skills: [vividflow-agaas-product, workspace-dispatch, hermes-agent]
---

# VividFlow Agent Runtime

## Overview

The VividFlow agentic layer must be controlled, observable, and safe. Agents are not vague chatbots. Each agent has a soul, memory, skills, tool permissions, triggers, runs, proposed actions, approvals, logs, and cost tracking.

Cockpit Hermes is the orchestration brain during build and operations. The SaaS stores agent state and exposes client-facing controls.

## When to Use

Use this skill when:
- Creating agent architecture for VividFlow AGAAS
- Defining agent tables, permissions, runs, or logs
- Letting AI act on CRM/conversation data
- Designing human approval flows
- Connecting Hermes, Convex, MCP, APIs, or cron jobs to client workspaces

## Agent Definition

An agent is:

- `soul`: system prompt, role, tone, mission, limits
- `memory`: workspace-specific durable context
- `skills`: reusable procedures and domain playbooks
- `tools`: APIs/MCP/Convex functions it may call
- `triggers`: events or schedules that start it
- `policy`: what it may do automatically vs propose for approval
- `runs`: every execution with inputs, steps, outputs, errors, cost

### R&R First, Runtime Second

For VividFlow internal agents and client AIOS agents, do **not** start from a loose prompt. Start from the R&R template: Role & Responsibilities / Rôle & Responsabilités. The R&R defines mission, users served, human organization, sources of truth, vocabulary, allowed actions, forbidden actions, autonomy level, proactive signals, permissions, output formats, QA scenarios, and scorecard.

Use `templates/agent-rr-template.md` as the master template. Flow:

1. Fill R&R.
2. Validate boundaries and scorecard.
3. Generate `SOUL.md`, `AGENTS.md`, `.hermes.md`, permissions, and QA pack.
4. Create/configure the Hermes profile.
5. Connect Slack bot/app surface.
6. Run supervised QA before production.

Core doctrine: freedom of reasoning, bounded execution, traceable responsibility. A Slack bot is only a mouth; the Hermes profile is the brain; the R&R is the operating definition.

### Agent R&R before Runtime

Before creating a Hermes profile or connecting a Slack/Telegram bot, create the agent's **R&R — Role & Responsibilities**. This is the operating definition that later generates `SOUL.md`, `AGENTS.md`, `.hermes.md`, permissions, QA scenarios, and scorecard.

Use `templates/agent-rr-template.md` as the master template and `references/agent-rr-framework.md` for the current VividFlow/client doctrine.

Core doctrine:

- A Slack/Telegram bot is the mouth, not the agent.
- The Hermes profile is the brain/runtime.
- The R&R is the spec for the brain.
- A strong agent has freedom of reasoning, bounded execution, and traceable responsibility.

Do not launch client or VividFlow agents from a vague prompt. Fill and validate the R&R first, especially mission, sources of truth, allowed/forbidden actions, autonomy level, Data OS vs GBrain routing, and QA scenarios.

### SOUL Maintenance (Post-Creation)

Once a SOUL.md is in production, it will need periodic maintenance:
- **Behavioral rules** — when Thomas/Jonathan decides all agents must "read their R&R before acting", add a `## RÈGLE ABSOLUE — AVANT D'AGIR` block right after `## VERITES ABSOLUES`.
- **Real credentials** — when Jonathan asks for tokens in the SOUL (not just `.env` references), add a `## CREDENTIALS` block just before the `--- MACHINE DE GUERRE` footer. Use the base64 workaround (direct Python `open()`) to read tokens from `.env` without exposing them through the Hermes censoring layer.
- **Slug integrity** — always cross-check that `DATA_OS_AGENT_SLUG` matches the agent's profile directory and role. Duplicate slugs between profiles cause routing conflicts.

See `references/soul-maintenance-pattern.md` for exact patch anchors, token extraction technique, and known slug issues.

## Minimum Data Model

Core tables/collections:

- `agents`: name, role, workspaceId, status, model/profile
- `agentSouls`: versioned instructions
- `agentMemories`: durable workspace/client facts
- `agentSkills`: enabled skill references
- `agentTools`: allowed tools and scopes
- `agentRuns`: execution records
- `agentRunSteps`: tool calls, reasoning summaries, outputs
- `agentActions`: proposed or executed CRM/conversation actions
- `agentApprovals`: human approval decisions
- `auditLogs`: immutable security and business logs
- `usageEvents`: token/API/cost events

## Permission Model

Classify every action:

### Read-only
Usually safe with workspace permissions:
- Read conversation
- Read contact
- Read pipeline
- Read KB

### Draft/propose
Default for outbound or business-impacting actions:
- Draft WhatsApp reply
- Suggest pipeline stage
- Propose task
- Propose contact update

### Execute with approval
Requires human approval by default:
- Send external message
- Move opportunity to won/lost
- Trigger workflow
- Create payment request
- Book/cancel appointment

### Restricted
Never automatic without explicit high-trust setup:
- Delete customer data
- Change billing
- Export full database
- Modify integration secrets
- Send bulk messages

## Runtime Flow

1. Trigger arrives: new message, schedule, manual command, webhook
2. Resolve workspace, scope and permissions. If the scope is obvious, proceed; if ambiguous, ask one simple question such as “VividFlow ou Brvndlab ?” instead of over-cadrage.
3. Classify the signal before memory write: raw event, task, decision, risk, knowledge candidate, skill candidate, or working-context only.
4. Load agent soul, memory, enabled skills, relevant CRM/conversation context
5. Run planner/model/tool loop
6. Produce summary and proposed actions
7. Execute allowed actions or create approval requests
8. Log run, steps, costs, and outcomes
9. Update memory only with durable facts. Agents should create “memory candidates” for validation when a signal is important or recurrent; they must not silently turn conversation into doctrine.

For long-running user-facing work, acknowledge immediately in natural French: “je prends un moment pour le faire proprement” or “ça me prend un peu de temps”. Avoid English/system wording like “Time”, “Expand”, or internal status labels in normal conversation.

## Conversation Agent MVP

First agent behavior to build:

- Detect inbound lead message
- Summarize conversation
- Extract contact fields
- Classify intent and urgency
- Score lead quality
- Create/update contact
- Create/update opportunity
- Draft reply
- Create follow-up task
- Wait for human approval before sending reply

## Hermes/Cockpit Role

Cockpit can:
- Audit product and architecture
- Dispatch coding/review workers
- Generate/maintain skills
- Inspect logs and issues
- Trigger operational checks
- Design agent souls and policies
- Run deterministic watch jobs for R&D/market/technical monitoring

Cockpit should not silently spam Telegram topics. Automations should be quiet by default unless explicitly requested.

### Telegram Topic Agents and Boardroom Routing

In VividFlow/Brvndlab Telegram groups, topics may represent Hermes agents. Do **not** assume separate Telegram bots are needed: the current model is often “one bot/runtime + topic-specific agent context”. A topic is an agent context, not a visible sender identity.

When Slack stays the file/visual/work surface but Jonathan/Thomas pilot from Telegram, the COO should bridge Slack signals into Telegram with a short visual status format showing who did what, on what subject, and the next action:

```text
🟠 Slack → Telegram
👤 Source :
🤖 Agent :
📌 Sujet :
✅ Fait :
🎯 Suite :
⏱️ Priorité :
```

For direct specialist assignment, keep it even shorter:

```text
🎨 CMO
Image Slack à analyser.
Retour : DA + 2 améliorations + prompt outil si utile.
```

Rule: 1 signal, 1 agent, 1 action, 1 expected output. Avoid long context unless necessary.

Routing rules:
- If Jonathan/Thomas writes in the general discussion and asks “tout le monde” / “tous les sujets” / “que tout le monde réponde”, do **not** send prompts into each agent topic or DM. Replies must stay in the original discussion.
- If live topic agents cannot safely be invoked into the origin discussion, Cockpit should publish a concise boardroom synthesis with role labels (`Tech — Je vois…`, `CMO — Je vois…`) and avoid pretending these are independent senders.
- Direct mention of one person/agent/topic → only that specific role answers, in the origin discussion unless asked to move.
- Message inside a specific topic → answer from that topic’s channel prompt/skills, in that exact topic. Never redirect a topic-specific reply to Telegram General unless explicitly requested; General is not a catch-all recovery channel.
- Cross-topic/private dispatch is allowed only on explicit request.
- If an accidental broadcast was sent to other topics, stop immediately, acknowledge it, and do not add more cleanup noise unless asked.

Pitfall: Telegram topics do not create separate author identities. If separate visible voices become a hard requirement, use separate bots/profiles; otherwise keep the single-bot boardroom format short and readable.
### Jonathan-Facing Strategic Outputs

For VividFlow strategy/vision conversations, separate internal rigor from what Jonathan sees. Keep the visible response conversational, short, and human: a few strong reads, little/no technical vocabulary, and at most 1-2 simple questions. Put dense doctrine, agent-routing detail, architecture implications, and operational checklists into GBrain/internal handoff or only expose them if Jonathan asks. Do not make Jonathan read the backend analysis just to get the strategic insight.

### Private Principal Agents

When configuring a personal/private VividFlow agent for a principal, never name the agent as if it *is* the human. The human remains the decision-maker; the agent is the private right hand.

For Thomas:
- **Thomas** = human principal / decision-maker
- **Soren** = Thomas's private VividFlow right hand
- Default posture: direct, lucid, pragmatic, demanding, business-oriented, protective of Thomas's time and energy
- Default analysis: importance, alignment, should Thomas do it himself, can it be delegated/automated, priority vs noise
- Default response shape: `Verdict`, `Risque`, `Action` by default; use `Lecture rapide` only when it adds clarity
- Brevity rule: Thomas explicitly wants short messages. Avoid long explanations, big module lists, and dense doctrine unless he asks to “détaille”. If he asks to redo a message, compress to the decision, risk, and next move.
- First-person access wording: when asking Thomas to give access, say “ajoute-moi”, “donne-moi accès”, “je récupère…”. Avoid third-person phrasing like “ajoute Soren” unless discussing product/UI labels.
- Privacy: personal/sensitive reflections stay private and are not shared automatically with other agents

Use this distinction in prompts, memory scopes, UI labels, and audit logs to avoid identity confusion and accidental sharing.

### Long-Running Telegram Topic Tasks

When a VividFlow topic agent is asked for a production task (Figma assets, DA, visual generation, research, audits) and work exceeds ~10 minutes, the agent must not stay silent. It should post a concise status with: `% complete`, `done`, `blocked`, `decision recommended`, and `next delivery`. If a tool blocks, state the exact missing access/key/export and provide a fallback deliverable.

Known fallback rules:
- Figma inaccessible: request the precise Figma link/token/export, but continue with screenshots, visual extraction, and Figma-ready specs.
- Image generation blocked by missing `FAL_KEY`: do not keep retrying image generation; deliver art direction, prompts, layout specs, or existing-asset handoff.
- Topic roles missing in Hermes config: add `telegram.channel_prompts` for the relevant VividFlow topic and restart the gateway.

### R&D Watch Agents

For external research monitoring, prefer a read-only `no_agent` cron script with stateful deduplication and concise delivery only when new items appear. Treat the first execution as baseline creation to avoid flooding Telegram. For the proven GitHub/X/Reddit/nousresearch.com pattern, see `references/rd-watch-agent.md`.

### Second Brain / GBrain

For durable VividFlow/Hermes research notes, repo audits, decisions, and agent knowledge, use GBrain instead of bloating Hermes memory. See `references/gbrain-second-brain.md` for installed paths, commands, caveats, and the note → commit → import → search workflow.

For the internal VividFlow agency architecture, keep the separation strict: **Data OS is the visible source of truth, GBrain/RMS is the invisible memory/graph backend, Slack is team operations, Telegram is private right-hand cockpit**. Humans should not have to interact with or feed GBrain manually; agents capture, classify, update Data OS/GBrain, and alert only when useful. Do not add a prominent GBrain module by default; surface GBrain context inside clients, projects, decisions, agents, search, and knowledge. See `references/slack-data-os-gbrain-operating-architecture.md`.

For Slack multi-bot cleanup, distinguish new visible specialists in `Favoris` from stale installed `Executor` apps under `Applications`; do not uninstall old executors before Hermes profile/gateway migration and smoke tests. If Jonathan complains that “les photos c’est pas les vrais”, treat generated letter icons as temporary placeholders and replace them with the verified persona avatars via Slack Developer app General pages. See `references/vividflow-slack-multibot-operations.md`.

When creating the Slack layer, treat the first production slice as `Slack → one capture agent (Mia/VividFlow Ops) → Data OS/GBrain`, not as a full multi-bot launch. Use Slack CLI for workspace/app auth, Slack App/events/reactions/modals as the surface, Hermes profiles as the real agents, and Context7 as doc fuel for implementation details. For the tested setup sequence, event mappings, Data OS endpoint shape, and Context7 notes, see `references/slack-agent-dataos-context7-setup.md`.

For WhatsApp Business integration, prefer the durable OpenWA self-hosted pattern for VividFlow/client pilots when Jonathan wants reusable infrastructure: VPS OpenWA API-only first, QR pairing handled by the human, Hermes profile bridge, and OpenWA send API. Treat the WhatsApp number as always-on infrastructure: OpenWA and the bridge both need persistent supervision/autostart; Jonathan should never have to manually start services after delivery. See `references/whatsapp-openwa-runtime.md` for architecture, persistence/autostart systemd pattern, API-key pitfalls, security boundaries, dual-number/session identity rules, incident triage, and verification. For mobile-quality conversation behavior — incoming voice note transcription and the WhatsApp typing bubble — use `references/whatsapp-openwa-voice-typing.md`; validate with real inbound text and vocal messages, not only health checks.

For Baileys pilots where the goal is a true personal WhatsApp agent rather than a marketing bot, use `references/whatsapp-personal-agent-baileys.md`: optimize for natural low-volume 1:1 conversations, allowlisted testers, dry-run first, fluid human timing, strict no-campaign/no-group/no-broadcast boundaries, and anti-ban via normal usage patterns rather than excessive throttling.

When Jonathan asks concretely how Slack connects to the Data OS/GBrain, avoid another broad brainstorm. Give the short bridge model first: `Slack message/reaction/modal → Slack App event → Hermes agent/router → Context Loader → Data OS visible record/audit + GBrain durable memory → Slack confirmation/approval`. Slack itself does not write directly to the Data OS; the Slack App captures events and Hermes/agents decide what becomes a task, decision, memory, risk, approval, or log. Start with one capture agent (Mia) and three actions only: task, decision, memory. See `references/slack-app-data-os-gbrain-bridge.md`.

For the current internal multi-bot Slack operating setup, use `references/vividflow-slack-multibot-operations.md`: visible specialist apps are `Agent KB`, `Agent CSM`, `Agent Operations`, and `Data Analyst`; do **not** create a separate COO Slack app unless Jonathan explicitly asks, and treat `CMO/Executor` labels as stale unless inspecting history. The reference covers app recreation under the ops account, Socket Mode, scopes/events, App Home Messages Tab, profile-specific `xapp`/`xoxb` token binding, avatar mapping, and the Telegram → COO/orchestrator → Slack specialist → Data OS/GBrain → Telegram flow.

For the latest COO quality-gate, human voice, Slack channel naming, mention routing, asset handoff, and required Slack scopes (`groups:write`, `users:read`, `files:write`), use `references/vividflow-slack-coo-agent-operating-rules.md`. Key rule: Slack missions are natural and short; agents answer like humans by default; COO audits/iterates before sending anything final to Telegram; no decorative dashes or Telegram handles in Slack.

When Jonathan says the Slack bots/apps are already created, stop explaining bot creation and move to the profile layer: the work is now R&R → `SOUL.md` → Hermes profile `.env` token binding → gateway → QA. Use `references/agent-rr-template-before-profile-build.md` for the pre-build contract: human org, sources of truth, permissions, mission, runtime deliverables, and pitfalls.

When wiring VividFlow Hermes/Slack agents to the Data OS with machine-agent tokens, use `references/data-os-agent-token-binding.md`: map each Hermes profile to its Data OS slug, write env vars without exposing secrets, verify read/write scope, and recommend token rotation if the tokens came through a screenshot. Do not keep retrying Slack bot renames with `xoxb` tokens when Slack returns `not_allowed_token_type`; rename via Slack App settings or an admin/user token with the right scopes.

### Data OS as Source of Truth

When Jonathan frames `https://vividflow-service-execution-os.vercel.app/` as the internal Data OS, treat it as the official VividFlow source-of-truth surface. Slack is the company execution conversation layer; Telegram remains the private right-hand layer. Data OS must not be evaluated as a decorative dashboard: audit/design the full loop `Slack signal → structured record/task/decision → agent run → human approval when needed → audit log → GBrain/Second Brain durable note`. For the detailed module map, credibility checks, and pitfalls, see `references/data-os-gbrain-source-of-truth.md`.

For the current VividFlow memory doctrine, use the 5-layer human memory model in `references/human-memory-5-layer-dataos-supermemory.md`: Perception captures inputs, Episodic stores raw events in Second Brain, Semantic consolidates wiki/Supermemory knowledge, Procedural stores SOPs/playbooks/skills, and Working Memory is the context-loader/GBrain snippet used before action. Keep Data OS as the business source of truth; Supermemory is semantic recall, not a second truth. Keep Jonathan private, Thomas private, VividFlow shared, and Brvndlab scopes distinct.

For Data OS agentic module audits/coding, use `references/data-os-agentic-memory-modules.md`: keep `Process` focused on SOPs/playbooks/workflows métier, and put agents, skills, wiki/Second Brain references, Supermemory scopes, GBrain/context-loader, runs, permissions, costs, approvals, health and logs inside the Agentique modules (`Équipe IA`, `Tâches`, `Activités`, `Base de connaissance`). For mockups, preserve the current VividFlow shell and make Agentique feel like a serious operator cockpit showing the real loop `Signal → Contexte → Décision → Action → Preuve → Mémoire`, not a decorative AI dashboard.

When the existing Data OS modules are already in place, **do not blindly rename or duplicate them**. Jonathan corrected the direction: keep `Tâches` and `Activités` when they already work; strengthen them so Hermes can create/update tasks and write logs. `Équipe IA` and `Base de connaissance` can be improved more deeply, but still inside the existing shell/sidebar. For Contacts/Pipeline work, use `references/data-os-existing-modules-lead-sync.md`: Contacts are the source of truth, Pipeline is a high-level commercial view, Tâches are next actions, Activités are proof/logs, and Base de connaissance stores sales learnings. Avoid adding a separate Leads system if Contacts/Pipeline already cover it.

For the agentic nav/module layer in a greenfield or redesign context, prefer functional operator labels like `Agents`, `Missions`, `Journal`, and `Mémoire`; but in the existing VividFlow Data OS, preserve current labels unless Jonathan/Thomas explicitly requests renaming.

### Targeted Agentic Module Upgrades

When Jonathan is dissatisfied with the Data OS agentic modules because they feel superficial, do **not** answer with a massive redesign prompt by default. He corrected the workflow: optimize for the developer too — “ne rajoute pas du boulot”, “pas tout refaire”, “densifie intelligemment”. Preserve the existing shell and modules, then specify the smallest high-leverage upgrade that reveals the real system nerveux.

Second correction from Jonathan: do **not** compensate by overfilling pages. Too many badges, filters, fake graphs, mocks, or dashboard blocks make the product less useful. The right move is: clarify hierarchy, connect real VPS/Supermemory data, keep top-level navigation simple, and reveal detail on click.

Default upgrade framing:
- `Équipe IA`: show a simple organigramme first with **COO** as the coordinator (never “Chief of Staff” in the VividFlow UI) over `CSM`, `KB Executor`, `Ops Executor`, and `Data Analyst`. Compact cards must answer “qui fait quoi ?” in 5 seconds: role, 2–3 responsibilities, status, linked tasks/logs, last activity. Put responsibilities/logs/skills/boundaries in detail panels.
- `Tâches`: keep the current kanban/task structure; show only practical execution fields at card level: assignee, source, status, priority, next action, context OK/to complete, human intervention, blocked state, useful skill. Filters should include `Tous`, `Par agent`, `Intervention humaine`, `Bloquées`, `Historique`; historical tasks are visually quieter/greyed and cancelled tasks may be lightly struck through.
- `Activités`: keep simple logs of what agents/COO/systems did. Show datetime, actor/agent, action, result, status, error yes/no; keep filters minimal (`Tous`, `Par agent`, `Erreurs`, optionally task/memory links in detail). Do not turn this into a complex audit-trail page at first level.
- `Base de connaissance`: top-level tabs should be `Skills`, `Mémoire`, `SOPs`, `Playbooks`. `Skills` lists real VPS `SKILL.md` files with `Tous`, `Skills internes`, `Skills importés`, `Skills natifs` plus search; keep Markdown reading compact (smaller type, calmer hierarchy for long skills). It must scan the active profile path `/home/hermes/.hermes/profiles/chief_of_staff/skills` in addition to global/repo paths; `business/brainstorm-profond/SKILL.md` is a required `Skills internes` smoke test. Skill detail must preserve the exact source file: include a raw/VS Code-like view with full frontmatter and Markdown order, and optionally a rendered preview. On Vercel, label file content as a faithful deployment snapshot rather than a broken live read. The YAML/frontmatter parser must handle block scalars such as `description: >-` and display the actual description, not `>-`. `Mémoire` shows the 5 layers (Perception, Épisodique, Sémantique, Procédurale, Travail) with softer human/cognition/body-inspired icons and a single small intro line: `Mémoire opérationnelle : ce que le système capte, comprend, retient et charge avant d’agir.` It explores real Second Brain/wiki/raw files on the VPS, places Supermemory graph under `Mémoire sémantique`, and places GBrain under `Mémoire de travail`. `SOPs` are fixed checklists; `Playbooks` are contextual decision guides. Both should reuse/inspire from the existing Process module and avoid a second source of truth.

Supermemory graph rule: do not show a decorative fake graph. Use the official MCP UI resource `ui://memory-graph/mcp-app.html` when available, or local `fetch_graph_data` clearly labeled as `Aperçu local du graphe Supermemory`. Do not leave “non branché” if MCP resources/data exist.

Clickability/usefulness rule: every visible operational object should be useful, clickable, or honestly marked unavailable. Agents, skills, tasks, logs, SOPs, playbooks, files, process links, memory items, and graph nodes must route to a detail view, filtered module, Markdown/text viewer, Process record, or memory/graph detail. If a relation is absent, show `non branché`, `à compléter`, or `source introuvable`; never imply a link works when it does not.

SOPs and Playbooks rule: in `Base de connaissance`, keep top-level tabs `Skills`, `Mémoire`, `SOPs`, `Playbooks`. Do not rename `Skills` to `Méthodes` in the current Data OS. `SOPs` are fixed executable checklists; `Playbooks` are contextual decision guides. Both should reuse or enrich the existing `Process` module rather than creating a second source of truth, and both must be useful for humans (clear next step) and agents (linked IDs, inputs, outputs, proof, memory writeback, escalation rules).

Use product language at first level and keep detail technical only where useful. For the full current implementation brief, wording, data sources, and pitfalls, see `references/base-connaissance-agentique-vividflow.md`. For clickability, human-friendly/agent-friendly QA, SOP/Playbook detail patterns, and routing expectations across all agentic modules, use `references/data-os-agentic-clickability-audit.md`. For Jonathan's latest UI naming/preferences (COO not Chief of Staff, Skills filters, softer memory icons, tasks/activity filters), use `references/data-os-agentic-ui-preferences.md`. For the latest Knowledge/Skills implementation lessons — active profile skill scan, `brainstorm-profond` smoke test, snapshot vs live wording, raw VS Code-like viewer, YAML `description: >-` parsing, and short memory intro — use `references/data-os-knowledge-skills-vps-snapshot.md`.

Pitfall: a prompt that says “make it inspired by LangSmith/LangGraph/Obsidian/OpenAI/Retool” without scope control can push the developer into a refactor. Add explicit guardrails: no shell change, no module recreation, no huge redesign, mocks isolated if backend fields are absent, verify the four modules and console/build/typecheck.

### VividFlow COO + Executor Operating Model

When Thomas/Jonathan design the internal VividFlow operating system, default to the updated model: **COO as strategic/operational control layer; specialist agents as production/execution lanes**. Avoid prénom/persona labels by default; use clear métier/function names.

Current identity correction: in the VividFlow UI and agentic Data OS, do **not** label the coordinator “Chief of Staff”. The visible coordinating agent is **COO**. It is Jonathan + Thomas's high-level operating right hand across Telegram and Slack: lucidity, priority, coordination, challenge, synthesis, routing, and bridge to Data OS/GBrain. Specialist agents are designed through R&R and operate as executors/specialists under this coordination layer.

Default shape:
- **COO** — coordination, priority, arbitration, routing, challenge, validation, synthesis, privacy boundary. Exists in Telegram private/group direction and as the Slack coordinator/orchestration surface; do not create a separate COO Slack app by default.
- **Agent CSM** — onboarding, client follow-up, relances, retention, satisfaction, risks, next steps.
- **Agent KB** — Data OS / GBrain librarian: Base de connaissance, Wiki, Raw, Second Brain, information qualification, context preparation, links between Skills/SOPs/Playbooks, memory cleanliness. This replaces the old CMO-facing label; do not surface `CMO Executor`.
- **Agent Operations** — external tasks, emails, relances, administrative actions, Data OS updates, handoffs, SOP execution.
- **Data Analyst** — scraping, signal collection, business analysis, dashboards, insights, opportunities, anomaly detection.

Private Thomas/Jonathan assistant conversations remain private-by-default and do not automatically publish into Slack. Default workflow: humans talk to COO first; COO activates executors, receives outputs, then writes actions to Data OS and durable knowledge to Second Brain/GBrain. Direct specialist DMs are allowed for drafting, but any decision/task/doctrine/client signal must be recapped to COO. Do not push every conversation directly into the wiki: capture broadly into `raw/`, synthesize only durable/validated knowledge into `wiki/`, and keep the capture cron silent so humans feel no extra workflow.

For the detailed current model, naming guardrails, DM recap rule, and anti-chaos flow, see `references/vividflow-chief-of-staff-executor-model.md`. For the latest pyramid/Miro explanation, second-brain capture path, and silent cron pattern, see `references/vividflow-second-brain-capture-and-pyramid-model.md`. For the current Slack lane names, COO handoff rules, human agent voice, and Data OS agentic module naming (`Agents`, `Missions`, `Journal`, `Mémoire`), see `references/data-os-agentic-slack-operating-module.md`. The older `references/vividflow-four-agent-operating-model.md` is legacy context for prior naming and should not override the no-prénom/Chief-of-Staff-first model unless Jonathan explicitly asks to revert.

For creating specialist agents, use `templates/agent-rr-template.md` as the reusable master R&R template before generating `SOUL.md`, `AGENTS.md`, `.hermes.md`, permissions, and QA. Do not apply this R&R rewrite to the COO identity unless Jonathan explicitly requests it.

### Strategic Doctrine Work

For deep VividFlow brainstorming or long-range doctrine work, do not route to deprecated or removed specialist identities. Keep the work inside the currently active COO/private right-hand flow unless Jonathan explicitly names a current destination. COO owns execution; strategic doctrine updates should be concise, validated, and written back only when durable.

When Jonathan has already validated a VividFlow direction, do not reopen the full strategic debate by default. Preserve the validation and move into the requested next layer: handoff quality, product section coverage, navigation completeness, or review protocol. For mockups, a common post-validation ask is: make every sidebar/module entry clickable and create a sober base screen for each section so Jonathan can review module by module.

### Telegram Routing: Thomas / Soren

If Jonathan asks to message Thomas privately and Telegram DM fails with `Forbidden: bot can't initiate conversation with a user`, use Thomas's VividFlow assistant topic when available instead of stopping. For the observed Soren/Thomas assistant channel, send to `telegram:-1003845223802:1021`. If a named target returns `Message thread not found`, inspect session history/gateway logs for the exact `chat_id:thread_id` before retrying. For tl;dv-style links, ask for Telegram delivery and an open/public link or explicit authorization if access is blocked. See `references/vision-driver-and-telegram-routing.md`.

### Agentic CRM SaaS Product Frame

When Thomas discusses embedding Hermes into the SaaS, do **not** reduce the goal to rebuilding the Hermes dashboard. The product frame is bi-functional: VividFlow is a CRM/inbox/pipeline/devis SaaS first, with a native Hermes agentic layer inside it. Hermes is the runtime/workforce that can act on CRM context; the SaaS owns UX, permissions, data, audit, approvals, billing, and business workflows.

Default answer shape for Thomas in exploratory architecture/product conversations: keep it short first (`Verdict`, `Setup recommandé`, `À éviter`, `Prochaine action`). He explicitly pushed back with “plus court” and “pas de brouhaha inutile”; expand only when he asks to detail. For Data OS / agent runtime work, lead with the execution loop and next concrete slice, not broad module inventories.

For the confirmed product vision including persistent agents, Workspace Vault/Obsidian bridge, YouTube transcript pipeline, Convex-centered dev stack, and Hermes+Cursor stance, see `references/agentic-crm-saas-hermes-obsidian-youtube.md`.

### Hermes Dashboard inside VividFlow SaaS

When adapting Hermes/Nous dashboard UX into the VividFlow frontend, start from the **native Nous Research Hermes dashboard code and screenshots first**. Do not jump to a generic dashboard or approximate re-skin. Required sequence:
1. Run or inspect the native Hermes dashboard (`web/src/App.tsx`, pages like `SessionsPage`, `LogsPage`, `CronPage`) and capture the original state.
2. Reuse the logical links already coded in Hermes before inventing new abstractions: `web/src/lib/api.ts`, `web/src/lib/gatewayClient.ts`, `web/src/lib/slashExec.ts`, `web/src/plugins/types.ts`, `web/src/plugins/usePlugins.ts`, plus pages like `SessionsPage`, `LogsPage`, `PluginsPage`, `ConfigPage`.
3. Map modules one by one: Sessions/Runs, Logs, Cron, Skills/Tools, Agents, Approvals, Backend/Status, Audit/Usage.
4. Preserve native operator UX: dense rows, side navigation, sticky headers, empty states, logs, selected-run details, command/system actions.
5. Then apply VividFlow product language and skin: dark mode, orange `#FA5001`, glassmorphism, CRM/conversation-first labels.
6. Implement backend as scalable Convex/Clerk primitives before wiring UI: workspace-scoped agents, runs, steps, actions, approvals, audit logs, usage events.
7. Verify with TDD, build/typecheck, and screenshots.

**Shell-first route contract:** VividFlow modules must preserve the native SaaS shell before adding Hermes-inspired functionality. Keep the existing sidebar/header/breadcrumb and route-level `AppShell` layout; do not introduce standalone dark/fullscreen workspaces unless explicitly requested. Hermes is a functional/interaction reference, not a skin to paste over Soren/VividFlow. When adding a new module, verify the route visually for sidebar/header continuity as part of completion.

Thomas explicitly rejects approximations here: this work must feel like a production-grade SaaS cockpit for thousands of users, not a decorative mockup. For the proven TDD + screenshots + Convex/Clerk backend handoff pattern, see `references/hermes-dashboard-vividflow-integration.md`.

For the detailed handoff sequence, native dashboard observations, scalable Convex table baseline, and Thomas's motion/interaction contract, see `references/hermes-native-dashboard-agentic-saas-handoff.md`. For the previous TDD + screenshots + Convex/Clerk backend handoff pattern, see `references/hermes-dashboard-vividflow-integration.md`.

When Thomas asks to “claque littéralement le vrai code de Hermes dashboard” inside the VividFlow Service Execution OS / Data OS portal while keeping the current design, use `references/hermes-data-os-module-parity.md`: preserve the existing VividFlow shell, map `Tâches IA` to Sessions, `Skills` to SkillsPage, `Heartbeats` to CronPage, and `Logs` to LogsPage, then verify every tab in browser plus visual QA for clipped rows.

### VividFlow AGAAS Immobilier Module Integration Guardrails

When adding Hermes-inspired modules into the existing VividFlow AGAAS Immobilier SaaS, Hermes is a functional reference, not a UI skin. Preserve the native SaaS shell (sidebar/header/AppShell), existing visual system, and existing native modules. Add isolated route modules with route-level `AppShell` layouts where needed; never replace `/equipe`, `/taches`, `/logs`, or `/knowledge` with detached fullscreen prototypes unless explicitly requested. For the communication-module pattern, Supabase graceful degradation, and pitfalls, see `references/soren-hermes-module-integration.md`.

Thomas explicitly corrected the product frame: **do not use “Soren” as the product identity**; treat it as recovered legacy code only. User-facing language should say VividFlow / VividFlow AGAAS Immobilier. Do not expose internal labels like Hermes/QOS/Soren unless the page is specifically a technical runtime/admin surface.

For Thomas’s VividFlow AGAAS Immobilier dev tasks, default to autonomous execution: ask fewer questions, audit the current app first, make small but real code changes, then verify in browser with screenshots like a UX/product reviewer. Before editing, identify the **actual live root serving the requested URL/port** with process/port inspection when needed; do not assume `/home/hermes/workspace/vividflow-agaas` is the live app if port `3000` is served by another root such as `/opt/vividflow`. Think like a production SaaS builder, not a mockup generator: module order must follow the business loop (message entrant → contact/lead → qualification → pipeline/action → validation humaine → audit), and every agentic feature must clarify trigger, permission boundary, proposed action, approval state, and audit trail before polishing visuals.

Visual/brand implementation guardrail for VividFlow SaaS: use the existing real logo asset (`/vividflow-v-logo.svg`) when present, and enforce the orange contrast contract globally in CSS: any `#FA5001` orange surface/card/caption/pill/button/nav/avatar must render text/icons white, including nested children. After color changes, run typecheck and browser vision on the live route to catch dark text on orange.

When Thomas asks to “intégrer Hermes” or challenges that Hermes is not really integrated, treat labels/specs/static demos as insufficient. Build or verify a real SaaS runtime slice: workspace-scoped runs, steps, actions, approvals, audit, policies, API endpoints, CRM contextual buttons, and verification evidence. See `references/hermes-runtime-crm-integration-pattern.md` for the proven minimum slice and pitfalls.

For a Discussion/chat module based on native Hermes Workspace / Claude Workspace code, inspect native chat files first but port the interaction model into VividFlow rather than pasting the Hermes stack. Build module-by-module, keep changes small for Thomas's SSH supervision, and verify files/typecheck/route/browser screenshot before claiming done. See `references/hermes-discussion-module-porting.md`.

### Tracker Interne VividFlow

When designing the internal VividFlow operational tracker, use the MVP name and flow in `references/tracker-interne-vividflow.md`: sources → inbox → AI triage → client/tasks/risks/agents/decisions updates → attention homepage → action → journal. Keep it pragmatic and short for Thomas.

If Thomas asks for a `cahier des charges`, `spec`, or “PDF dans la conv” for the Tracker, treat the deliverable as the PDF file itself. Do not continue tunnel/local access troubleshooting unless he explicitly asks for access again. Generate and attach a concise complete PDF immediately, with a minimal visible reply. Use `references/tracker-cahier-des-charges-pdf.md` for the section structure, Tracker defaults, and quick PDF generation fallback.

When implementing the Tracker and Thomas asks to reuse `hermes-workspace.com` / public Hermes Workspace code, use `references/tracker-implementation-hermes-workspace.md`: inspect current VividFlow first, clone Hermes Workspace only as a reference, selectively port operations UI patterns, add tests, and verify with test/typecheck/build. If Thomas asks for autonomous overnight work, follow the same reference’s bounded module-by-module build loop: implement → test → UX audit → improve → next module, then write a local report.

When Thomas asks to copy the Hermes dashboard “à 100%”, “module par module”, or make the Tracker native to RMS operations, use `references/rms-tracker-hermes-module-parity.md`: preserve the native Hermes module map (Sessions, Analytics, Models, Logs, Cron, Skills, Plugins, Profiles, Config, Keys, Docs, Chat/Console), rename to **VividFlow Internal Tracker**, keep only the VividFlow skin/color changes, and verify every module plus at least one persisted action.

When Thomas asks to create the Tracker as a live micro-SaaS and explicitly rejects diagrams/spec-only answers, use `references/tracker-live-micro-saas.md`: identify the exact live target/port, replace placeholders with a real action-first dark/orange Tracker, TDD the model, verify tests/build/browser, and report concise evidence.

When Thomas asks to clone or strongly reuse the Hermes dashboard UX for the Tracker, use `references/tracker-hermes-live-micro-saas-implementation.md`: inspect native Hermes first, TDD Proof Gate/Inbox/Audit before styling, then build the dense dark/orange operator UI and verify with tests, build, API smoke, Playwright interactions, reload/no-console, and screenshot evidence.

For tl;dv meeting/folder links, use `references/tldv-meeting-ingest.md`: verify transcript/recording access before summarizing, never fabricate inaccessible meeting content, and convert each accessible meeting into summary, decisions, tasks, risks, and activity-log updates.

## Observability Requirements

Every run must track:
- workspaceId
- agentId
- trigger source
- input references, not unnecessary full PII dumps
- tool calls
- proposed/executed actions
- human approvals
- errors
- model/provider
- token usage and estimated cost
- timestamps

## Common Pitfalls

1. **No approval boundary.** Sending messages or modifying CRM automatically can damage client trust.
2. **No audit trail.** If an agent acts, the client must know why and when.
3. **One global memory.** Memory must be scoped by workspace/client/agent.
4. **Tool access too broad.** Give minimum necessary permissions.
5. **No cost tracking.** Agentic SaaS can become expensive silently.
6. **Agent prompt hardcoded in app code.** Souls should be versioned and editable with governance.
7. **Exposing GBrain as another user task surface too early.** For the VividFlow internal agency, GBrain should usually run behind the scenes; the Data OS should show the useful context, not ask humans to manage another knowledge tool.
8. **Letting every agent search all memory.** Central memory must still be scoped. Require workspace/domain/confidentiality context and allowlisted scopes so VividFlow, Brvndlab, client work, and private right-hand contexts do not bleed into each other.
9. **Answering about Slack agents from vibes.** A private Telegram right-hand must read Data OS/audit/Slack/GBrain state before reporting on Slack bots; if the source of truth is insufficient, say exactly what is missing instead of guessing.
10. **Slug mismatch between profile and Data OS.** When reading agent `.env` files, cross-check that `DATA_OS_AGENT_SLUG` and `VIVIDFLOW_DATA_OS_AGENT_SLUG` match the role. Known case: `cmo_executor` had `agent-kb` (same as KB Agent), causing routing conflicts.

## Verification Checklist

- [ ] Agent has soul, memory, tools, triggers, policy, and logs
- [ ] Reads/writes are workspace-scoped
- [ ] External sends require approval unless explicitly allowed
- [ ] Every action is auditable
- [ ] Costs are tracked by workspace and agent
- [ ] Memory stores only durable facts
- [ ] Restricted actions cannot execute silently
