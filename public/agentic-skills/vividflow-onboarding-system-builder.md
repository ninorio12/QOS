---
name: vividflow-onboarding-system-builder
description: Use when designing, reviewing, or briefing an AI/dev agent on VividFlow onboarding, Boost IA, client diagnostic flows, Kalvi-inspired onboarding references, or public onboarding UX direction.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, onboarding, boost-ia, ui, product, claude-brief]
    related_skills: [vividflow-agaas-product, frontend-ui-workflow]
---

# VividFlow Onboarding System Builder

## Core Principle

VividFlow onboarding is not a friendly form. It is a guided diagnostic that progressively builds the client's initial AI operating architecture.

The user should feel: **“as I answer, my future AI system takes shape.”**

## When to Use

Use this skill when:
- Jonathan sends onboarding screenshots or asks to brief Claude/another AI.
- The topic is the VividFlow onboarding, Boost IA, client intake, audit, or activation flow.
- A version feels too SaaS-template, too user-friendly, too dark/glassmorphism, or too vertical-specific.
- The onboarding overfits immobilier/BTP instead of staying generalist.

## Product Direction

Bad interpretation:
- onboarding wizard / nice form
- static SaaS setup
- dark cyber/glassmorphism
- prebuilt “Boost IA” package
- immobilier-only vocabulary

Correct interpretation:
- diagnostic canvas
- progressive system builder
- clear operating architecture
- modules appear based on answers
- generalist business intake usable for immobilier, BTP, agencies, services, commerce, ops teams, and dirigeants

## Commercial/Delivery Sequence

Understand onboarding inside the whole VividFlow sales-to-delivery chain:

1. **R1 discovery** — prospect does not know VividFlow yet. The call identifies pains, chronophage tasks, current tools, processes, company context, and AI opportunities.
2. **R1 transcript → CDC** — tl;dv transcript/notes become an internal cahier des charges for technical agents. The CDC tells agents where AI can help, which tasks to solve, and which integrations/skills are needed. Example: if the client uses Planity and it is painful, agents know a Planity integration skill/script may be required.
3. **R2 presentation** — VividFlow presents the recommended stack: initial AI right-hand/bras droit, system/cockpit, and clear phase 1 scope. It should already seed future expansion paths.
4. **Payment/signature** — client commits.
5. **Onboarding form** — low-friction guided collection that educates the client, gathers access/integration information, and prepares implementation.
6. **Data OS ingestion** — onboarding answers are pushed into the client Data OS / internal delivery workspace so implementation can start immediately.
7. **Technical preparation** — if API keys, VPS, Vercel, or hosting details are already provided, agents can begin setup before the deep audit.
8. **2h audit/workshop** — team maps the company processes as flowcharts, confirms where the first AI assistant helps, and identifies future agents/modules for upsell.

The onboarding is therefore not a sales page. It is the bridge between R2 promise and implementation readiness.

## Visual Direction

Borrow the grammar of Kalvi-style references, not the brand:
- light/canvas base, not heavy dark SaaS
- subtle grid or workspace feeling
- blocks, flows, relations, progress lanes
- system map / schema builder energy
- orange VividFlow as accent, not overdose
- less 3D/icon decoration, more operational clarity
- premium, precise, structured, not playful

Avoid:
- generic glass cards
- hero icons that feel like a landing page
- “Simple / Progressif / Rentable” benefit cards
- cybersecurity/RGPD-first mood
- too much orange glow
- copy that says “we help you” instead of showing the system being built

## Navigation / Progression UX

The onboarding must feel like a **sequential guided progression**, not a free SaaS sidebar.

If a left rail/sidebar exists, it should act as a progress gauge/stepper:
- show `Step X/10` and a visible percentage/bar
- past steps: completed and optionally clickable for edits
- current step: active and visually dominant
- future steps: visible but disabled/locked/inactive
- always show the next expected step
- preserve numeric order; never display global step `8` before `6`

Avoid category-first sidebars that make all steps feel available at once. Phase labels are acceptable, but the primary visual story must be `1 → 10` progress. This is a key part of the Kalvi-like feel Jonathan wants: the user senses they are at 30%, 70%, 80%, and that each answer unlocks the next part of the system.

Design rule: **the sidebar is not navigation; it is a sequential progress rail.**

## Onboarding Form Role

The onboarding form is primarily a **post-R2 / post-signature operational preparation form**, not a sales asset, second R1, or deep strategic audit.

Its main job is to make the client prepare the simple/slow setup pieces before the onboarding/kick-off call so Thomas does not lose the call on “open this account / where is the login / who has access / which tool do you use”. The call must start from a clear base and move toward installation.

It must do three jobs:

1. **Guide setup** — tell the client exactly what can be created/shared before the call: Vercel, VPS/hosting, API keys, tools, documents, calendars, CRM, storage, etc.
2. **Collect safely** — gather the exact technical access/invite status, documents, tool inventory, useful IDs/codes/links, and missing items required for delivery. Never ask for passwords in plain text; prefer invite/access instructions or safe secret-sharing flows.
3. **Prepare delivery** — push structured answers into the Data OS/delivery workspace so Thomas/agents can start setup from the client’s real context.

Inline help videos are central, not optional. They make the experience human and low-friction: “how to create an API key”, “how to invite VividFlow to Vercel”, “how to open/configure a VPS”, “how to share documents safely”. Keep videos short (1–4 min) and pair every video with a direct clickable link.

The client should feel guided, not tested. The right feeling is: **“I add what I have under my hand; the rest we’ll see together with Thomas.”**

## Access Block Pattern

For every sensitive account/tool access, use a guided block with:

1. **Short video** — “Voir comment faire” / 1–4 minutes.
2. **Direct clickable link** — e.g. Open Vercel, Convex, OpenAI, Google Admin, Meta Business.
3. **Return field** — code, ID, project name, shared-folder link, invitation status, or note.
4. **Soft status** — `done`, `to_review_together`, `not_relevant`, `not_yet_known`.

Client-facing labels should be:
- “C’est fait”
- “À voir ensemble avec Thomas”
- “Pas concerné”
- “Je ne sais pas encore”

Avoid “bloqué” as the default visible label; it makes the client feel at fault. Use “À voir ensemble” for most uncertainty.

Never make completion depend on perfect technical setup. The user can always continue after adding what they have.

## V1 Implementation Boundary

For V1, it is valid and preferred for the onboarding front-end to be hardcoded:
- steps, text, layout, videos, helper links, and access categories can live in the app code;
- Convex/Data OS stores answers, statuses, files/links, access items, and notes;
- do not build a configurable form builder, complex RBAC, or dynamic step editor unless explicitly requested.

The V1 model is: hardcoded guided client journey → structured Convex answers → Data OS preparation view for Thomas/VividFlow.

## Data OS Mapping

Treat the form as the **first layer of the client Data OS**, not a throwaway form. Avoid storing only free text. Structure reusable objects:

- `client_profile`: company, sector, team size, interlocutors, business model, location.
- `tools`: tool name, category, usage, expected access type, status, link/ID/note, associated help video.
- `access_items`: Vercel, VPS/hosting, OpenAI/Anthropic, Convex, Google Workspace, Meta Business, CRM, Drive/documents, other tools.
- `processes`: priority process, steps, points to see together, frequency, owner.
- `team`: people, roles, access level, validation authority.
- `kickoff_preparation`: ready items, to-review-together items, not relevant items, Thomas notes.

Statuses should support the Data OS view: what is ready, what needs review, what is not relevant, and what Thomas should handle during the call.

## Boost IA Logic

“Boost IA” must not be pre-decided. It must be generated from answers and from the R1/R2 context.

It should emerge progressively from:
- sector/activity
- company size/model
- departments selected
- current tools
- process bottlenecks
- data sources
- goals/KPIs
- team roles
- constraints

Each recommended module should show:
- why it appeared
- which answer triggered it
- priority level
- data needed
- next implementation step

Example triggers:
- Sales team + inbound leads + manual follow-up → Sales Agent, pipeline dashboard, CRM/table sync, conversion/delay KPIs.
- HR/team/process docs → Collaborator Copilot, internal KB, internal onboarding automation.
- Direction + scattered tools + low visibility → Executive Data OS, weekly synthesis, AI chief-of-staff, KPI dashboard.

## Recommended 10-Step Flow

1. Welcome — sober VividFlow framing, not marketing-heavy.
2. Company — sector, size, business model.
3. Objectives — what leadership wants to improve.
4. Departments — direction, sales, marketing, ops, HR, finance, support.
5. Processes — where the business currently blocks.
6. Tools — CRM, WhatsApp, Gmail, Calendar, Notion, Drive, Excel, ERP, etc.
7. Data — where useful information lives.
8. Team — roles, decision-makers, collaborators.
9. Boost IA — dynamic generated architecture, editable by the user.
10. Finalization — initial AI plan + next steps + audit preparation.

## Copy/Wording Rules

Default vocabulary must be generalist:
- secteur d’activité
- départements
- processus commerciaux
- outils métier
- sources de données
- équipes
- objectifs opérationnels
- frictions actuelles
- KPI à suivre

Immobilier/BTP examples can appear as examples, not the default structure.

### Post-R2 client tone

Do not use school/test/friction language like “si vous bloquez”, “bloqué”, “erreur”, “obligatoire” unless it is a technical status only visible internally. For the client UI, prefer soft operational wording:
- “Remplissez simplement ce que vous avez sous la main.”
- “Le reste sera vu ensemble pendant le rendez-vous avec Thomas.”
- “À voir ensemble avec Thomas.”
- “Je ne sais pas encore.”
- “Pas concerné.”
- “J’ai ajouté ce que j’avais.”

Avoid making the client feel they can fail the form. They should feel accompanied. The form prepares installation; it does not evaluate technical competence.

## Briefing Claude / Another AI

When briefing Claude, use a detailed prompt. Jonathan prefers detailed AI briefs with:
- context
- diagnosis of current issue
- exact direction
- examples
- anti-patterns
- validation criteria
- implementation constraints

Do not over-compress. A long structured prompt is acceptable when the recipient is an AI/dev agent.

## Implementation / Deployment Workflow

When asked to make the onboarding usable, do not stop at mockups or a local route. Treat it as a vertical slice:

1. Locate the real VividFlow repo and confirm the existing route/API/files before editing.
2. Validate `/onboarding` and `/api/onboarding` together: page render, GET draft state, POST completed payload, PATCH/reset behavior if available.
3. Run the minimum quality gates before saying it is ready: onboarding tests, TypeScript check, production build, local smoke, and browser console check.
4. If the main working tree contains unrelated dirty files, use a temporary clean worktree or equivalent isolated deploy path so an onboarding deploy does not accidentally ship unrelated agent/runtime changes.
5. Prefer Vercel preview for normal checks, but if the preview is protected by Vercel auth/401 and Jonathan/Thomas needs a shareable link now, deploy the isolated onboarding slice to the existing production Vercel alias and clearly state that decision.
6. After any production POST smoke test, reset/clean the onboarding state so the public link is not left with QA/demo data.
7. Do not push to GitHub unless Jonathan explicitly approves; separate onboarding commits from unrelated dirty files.

Reference: see `references/onboarding-vercel-deployment-qa.md` for the tested QA/deployment pattern and pitfalls.

For Thomas/Jonathan’s post-R2 installation onboarding calibration — client tone, access blocks, videos/links, V1 hardcoded front, and Data OS mapping — see `references/post-r2-installation-onboarding-calibration.md`.

For the current public 9-step onboarding form and Jonathan’s validated micro-screen approach for dense steps, see `references/current-9-step-form-and-micro-screen-pattern.md`. Important: step 1 “On y va ?” is validated; do not reopen it by default. Dense steps should be split into internal micro-screens with a short title, one helpful sentence, then the choice/field.

## Validation Criteria

A good VividFlow onboarding version passes these checks:
- zero default immobilier specialization
- clearly framed as post-R2/post-signature installation preparation, not a sales diagnostic
- every access/tool block has a video, direct link, return field, and soft status
- client can continue even with incomplete technical access; uncertainty is captured as “À voir ensemble avec Thomas”
- front can be hardcoded in V1 while Convex/Data OS stores structured answers/statuses
- Boost IA depends visibly on user answers and R1/R2 context
- the UI feels like a diagnostic/system canvas, not a SaaS form template
- the sidebar/rail feels like sequential progress, not free navigation
- future steps are not freely clickable; past steps can be revisited
- percentage/progress and next step are obvious at a glance
- orange is present but restrained
- final page outputs an initial AI plan, not just success animation
- user understands how answers become modules
- answers are structured enough to feed the Data OS/delivery workspace
- access/tutorial steps remove repetitive live hand-holding before the call
- the onboarding/audit call can focus on process flowcharts and decisions, not account creation clicks
- the 2h audit can start from the onboarding answers, not from zero
- the experience shows data → understanding → recommended architecture → next action

## Common Mistakes

- Treating onboarding as UX polish rather than product logic.
- Treating the post-R2 onboarding as a sales/diagnostic “wow” asset instead of installation preparation.
- Using “si vous bloquez / bloqué” as the visible default tone; prefer “à voir ensemble avec Thomas”.
- Forcing the client to finish technical access perfectly before continuing.
- Making the first version too vertical because one ICP example was immobilier.
- Showing a “Boost IA” block before enough answers exist.
- Copying Kalvi visually instead of translating its system-builder grammar into VividFlow.
- Adding more friendliness instead of more operational intelligence.
- Designing the left rail as a clickable app menu; Jonathan wants a locked/sequential progress gauge with visible percent and next-step logic.
