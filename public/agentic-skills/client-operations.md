---
name: client-operations
description: "Umbrella workflow for AIOS client delivery operations including client folders, onboarding/audit SOPs, transcript-to-taskboard conversion, project taskboards, and client-facing operational artifacts."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [AIOS, Client-Ops, Taskboard, SOP, Onboarding]
---

# AIOS Client Operations

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this skill for client-delivery work in AIOS: preparing onboarding artifacts, structuring client folders, converting calls/transcripts into taskboards, managing client taskboards, and running audit/onboarding SOPs.

## Operating model

1. **Context first**: create or update the client folder (`CONTEXT.md`, `STATUS.md`, notes, transcripts, CDC/deck) before producing plans.
2. **Onboarding sequence**: questionnaire public sans friction → access collection → audit call → client analysis → CDC brainstorm section-by-section → system/process/SOP mapping → implementation plan → taskboard. The questionnaire URL should be shareable without asking the client to enter a token; generate any token/session internally, and on final submit create/attach the Data OS client portal automatically.
3. **Delivery pipeline in Data OS**: when structuring AIOS delivery for technical recruits, create a real pipeline with stages, parent tasks, dependencies, acceptance criteria, owners, blockers, and proof artifacts — not a loose Notion-style checklist. Use `references/delivery-pipeline-data-os.md` for the canonical pipeline and onboarding/access fields.
4. **CDC quality bar**: for AIOS/Hermes clients, position Hermes as an evolving personal agent plugged into the client's existing tools and Second Brain — not a pile of fixed automations. Use `aios-blueprint` → `references/client-hermes-agent-positioning.md` for the detailed framing.
4. **Taskboard quality bar**: parent blocks should be client-readable; subtasks should be concrete, assigned, dependency-aware, and deliverable-oriented.
4. **Audit calls**: capture acquisition, delivery, tooling, credentials, current SOPs, blockers, and business outcomes.
5. **Transcript conversion**: fetch the source transcript/meeting, extract decisions and commitments, then build a structured project rather than dumping notes.
7. **Daily execution briefs**: when turning operator's voice-note task lists into a day plan, rank tasks by impact/effort and strategic dependency, not by raw mention order. Use `references/daily-execution-prioritization.md`.
8. **Founder delegation boundary**: when operator voice-notes operational ClientOps/Incubateur work, protect his role as content/acquisition/vision first. Default operating design: R1 owns delivery management and process execution; operator keeps only 1-2 weekly arbitration calls max. Amzac/CSM should surface student signals, drop-offs, recurring questions, and product insights; Damien can own grouped coaching and turn field questions into module/content/process inputs.

## Subtopics absorbed

Detailed prior session runbooks are stored under `references/`:

- `aios-client-folder.md` — canonical client folder structure and `CONTEXT.md` template.
- `aios-client-taskboard-mvp.md` — taskboard block/subtask quality contract.
- `call-transcript-to-taskboard.md` — tl;dv transcript to AIOS Team Task Board workflow.
- `fathom-public-share-extraction.md` — public Fathom share links: extract hidden transcripts, store raw source, and turn sales calls into R2 prep.
- `sop-questionnaire-onboarding.md` — onboarding questionnaire SOP and template.
- `sop-appel-audit.md` — technical audit call SOP.
- `delivery-pipeline-data-os.md` — canonical Data OS delivery pipeline, onboarding/access fields, Boost IA backend requirement, and production verification checklist.
7. `realadvisor-cross-client-reuse.md` — safe pattern for reusing RealAdvisor operating knowledge from one real-estate client (e.g. Example Client) for another (e.g. Example Client) without leaking sessions, credentials, or client data.
8. `daily-execution-prioritization.md` — turn messy daily voice-note task lists into impact/effort-ranked execution blocks for operator/AIOS.

## Real-estate CRM reuse rule

When a new immobilier client uses the same CRM/tool as an existing client, actively look for reusable client-specific skills and convert them into a sanitized class-level pattern before adapting them. Copy workflows, routes, UI pitfalls, GraphQL/query shapes, and dedupe heuristics; never copy cookies, browser profiles, sessions, credentials, raw CRM data, screenshots, or client-specific outputs.

## Pitfalls

- Do not create a taskboard before identifying the client context and source of truth.
- Do not let onboarding/access collection become a vague free-text dump: structure tools, cloud/docs, API keys, data boundaries, blockers, owner, and due date.
- Do not ship decorative AI helpers in onboarding; verify the helper calls a real backend/model/action in production.
- Avoid vague tasks like “improve automation”; define the observable deliverable and owner.
- Keep SOP content reusable: specific client data belongs in the client folder, not in the skill body.
