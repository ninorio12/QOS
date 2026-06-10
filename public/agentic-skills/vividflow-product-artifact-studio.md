---
name: vividflow-product-artifact-studio
description: Use when Jonathan or Thomas asks to create, audit, refine, or ship a pitch deck, Vercel mockup, micro-SaaS prototype, Data OS/AGaaS screen, CDC handoff, visual editor, or client-facing product artifact. This skill turns vague visual/product requests into an editable, verifiable, deployed artifact with layout control, QA, and a clear next handoff.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, product-artifacts, pitchdeck, microsaas, editor, vercel, qa, handoff]
    related_skills: [vividflow-interactive-editor, vividflow-agent-runtime, vividflow-agaas-product, vividflow-figma-production, vividflow-carousel-production-system, frontend-design]
---

# VividFlow Product Artifact Studio

## Core Principle

Jonathan and Thomas rarely need “a document” or “a mockup” in isolation. They need a **decision artifact**: something visual, editable, testable, and shareable that lets them validate a product direction, sales narrative, SaaS module, deck, or operational system quickly.

Default behavior: turn fuzzy requests into a concrete artifact loop:

**audit context → choose artifact type → build/editable prototype → verify visually → deploy/share → produce handoff**

Do not leave them with raw markdown, static HTML, or a long explanation if the real need is visual validation.

## When to Use

Use this skill when Jonathan or Thomas asks for:

- pitch deck / discovery deck / sales deck
- micro-SaaS / live micro-SaaS / prototype
- Data OS / Service Execution OS mockup
- AGaaS / CRM / conversations / agent runtime screen
- Tracker / internal cockpit
- CDC / cahier des charges for Claude Code or another builder
- Vercel mockup / validation URL
- visual editor / drag-and-drop / caption alignment
- “fais un truc que je peux voir”
- “pas un doc, un vrai rendu”
- “audit tous les projets et déduis le skill idéal”
- repeated layout/caption/section alignment failures

## Pattern Audit From Jonathan + Thomas Projects

Recurring project classes:

1. **Discovery / pitch decks**
   - Need: narrative clarity, visual punch, fewer words, client mental shift.
   - Output: deck/storyboard + visual slides + shareable preview.
   - Risk: too much text, generic AI education, uneditable layout.

2. **Vercel validation mockups**
   - Need: Jonathan validates visually, not via file paths or long docs.
   - Output: deployed URL with intro screen, navigation, annotations, validation questions.
   - Risk: raw local HTML, static pages without interaction, unverified console/layout.

3. **Micro-SaaS / Data OS prototypes**
   - Need: prove an operating loop, not show 17 decorative modules.
   - Output: one vertical slice where modules communicate.
   - Risk: dashboard gallery, fake metrics, no data/action/audit relationship.

4. **Agentic SaaS / AGaaS modules**
   - Need: conversation-first CRM + agent proposals + approvals + audit trail.
   - Output: workflow screen with trigger, context, proposed action, human validation.
   - Risk: agent labels without real runtime boundaries.

5. **Tracker / internal cockpit**
   - Need: convert messy signals into tasks, risks, decisions, memory, and proof.
   - Output: inbox/attention/action/journal flow.
   - Risk: passive dashboard or analytics instead of action system.

6. **Interactive visual editing**
   - Need: move captions, align sections, adjust cards/logos/CTA, export.
   - Output: editor with draggable/resizable/selectable elements and JSON persistence.
   - Risk: another static mockup that still requires code changes for micro-adjustments.

7. **CDC / handoff to build agents**
   - Need: lock decisions and implementation order.
   - Output: developer-ready scope, file map, data model, acceptance criteria, copy-paste prompt.
   - Risk: generic spec disconnected from validated visual/product artifact.

## Default Artifact Decision Tree

Before producing anything, classify the ask:

### A. Sales/strategy narrative
Build: pitch deck / storyboard / Vercel deck.
Prioritize: message, sequence, mental shift, proof slide, CTA.

### B. Product direction validation
Build: clickable Vercel mockup board.
Prioritize: intro, module navigation, low-fi clarity, validation questions.

### C. Real SaaS/prototype execution
Build: micro-SaaS vertical slice.
Prioritize: data model, live state, CRUD/API, agent/action loop, browser verification.

### D. Visual correction / layout control
Build: interactive editor.
Prioritize: canvas, drag/drop, inspector, alignment, save JSON, export.
If the user asks for a quick live test, ship a focused static Vercel POC before a full app. The decision to unlock is whether the editing interaction feels useful, not whether the final architecture is complete.

### E. Developer handoff
Build: CDC + implementation prompt.
Prioritize: decisions sealed, module map, data contracts, acceptance criteria.

If unsure, choose the smallest artifact that enables the next decision.

## Mandatory Workflow

### 1. Recover context first
Before creating, search relevant memory/session/project files if available. Identify:
- project: Data OS, AGaaS, Tracker, deck, Brvndlab, client delivery, etc.
- owner: Jonathan, Thomas, both, external client
- purpose: sell, validate, build, audit, handoff, demo
- expected medium: Vercel, PDF, editor, Figma, codebase, Telegram summary

Do not ask the user to repeat context if it can be retrieved.

### 2. Define the “decision the artifact must unlock”
Write internally:
- What must Jonathan/Thomas decide after seeing this?
- What is the one loop/story/screen that proves the point?
- What should not be included yet?

### 3. Choose artifact type
Use the decision tree. Avoid defaulting to documents.

### 4. Build for editability
For any visual product/deck/editor:
- avoid flattening all elements into screenshots
- keep captions/cards/logos/CTA as separate objects where possible
- expose positions and sizes in data or code variables
- for recurring layout changes, create an editor layer

### 5. Verify visually and technically
Before claiming done:
- run app/deck locally or inspect deployed URL
- use browser/Playwright screenshot when possible
- check console errors
- test at least one interaction if interactive
- check responsive/overflow/collisions
- verify export/deploy if promised

### 6. Deliver in Thomas/Jonathan format
For Thomas:
- short: `Verdict`, `Risque`, `Action`
- include exact path/URL/evidence only if useful

For Jonathan:
- concise, human, strategic
For Jonathan:
- concise, human, strategic
- one idea at a time; avoid long process dumps unless he asks
- when running a multi-step website/deck/artifact brainstorm, explicitly separate: `Étape validée`, `Étape en cours`, and `Prochaine étape`; if Jonathan has not validated a step, keep brainstorming instead of moving ahead
- keep one clear speaker/voice; do not imply “we are all talking” or that multiple agents are participating unless Jonathan explicitly asked for multi-agent coordination
- if discussing multi-agent work, keep one clear speaker and one next action
- give a shareable URL or visual artifact, not local paths
- ask at most one useful question

## Artifact Requirements By Type

### Framer / reference-led website prototype

When Jonathan/Thomas gives a Framer/Vercel reference site and wants a fast visual test, use `references/framer-reference-to-prototype-workflow.md`. Build a small visual prototype first, then QA contrast/hero/CTA before explaining.

For the current VividFlow website direction, also use `references/vividflow-generalist-website-calibration.md` before writing copy or briefing design. It captures the validated generalist B2B positioning, hero, structure, agents, CTA rules, and Jonathan’s step-validation workflow.

For VividFlow website work inspired by Naiom/AI-agent agencies, also read `references/naiom-vividflow-website-benchmark.md`: VividFlow is now generalist B2B automation/AI-agent infrastructure for PME, not immobilier-only.

### Pitch Deck / Discovery Deck
Must include:
- one narrative spine
- slide roles, not just titles
- less text, more proof/visual schemas
- one clear mental shift
- Vercel preview if visual validation is needed
- export path or handoff to Figma if final production

Quality gate:
- no generic AI evangelism
- no overloaded slides
- each slide advances the prospect toward audit/demo/projection

### Personalized outbound projection deck
For VividFlow outbound pages/decks (`email → personalized projection page → verification call → 15–20 min meeting`), use `references/vividflow-projection-slide-iteration.md`.

Rules:
- Start from the prospect's current situation; do not open by defending VividFlow's positioning (`pas un CRM`, `pas un chatbot`). That belongs later as a clarification.
- The page reveals one concrete lever and keeps 2 points for the call; it is a projection, not a full sales pitch.
- If Jonathan is confused by a slide, reduce to one job for the slide and give a decisive keep/remove verdict.
- If a system-map slide is directionally right but too dense, prefer progressive motion/reveal over adding more labels or rebuilding the concept.

### Vercel Mockup Board
Must include:
- intro screen: scope, non-scope, version/date
- navigation between key screens/modules
- short annotations
- 5–7 validation questions max
- noindex when appropriate
- verified live URL

Quality gate:
- Jonathan can understand what to validate in under 2 minutes
- not a raw file path
- no decorative module catalogue without operational logic

### Micro-SaaS / Data OS Prototype
Must include:
- one real vertical loop
- source data/input
- system interpretation
- action/decision output
- audit trail / status
- at least stubbed persistence or clear data model

Quality gate:
- not just a pretty dashboard
- modules communicate or clearly show how they will
- human-in-the-loop boundary visible for sensitive actions

### AGaaS / CRM Screen
Must include:
- conversation/contact context
- agent analysis or summary
- proposed action
- approval/edit/execute states
- audit/log line

Quality gate:
- WhatsApp/channel remains input, not the product itself
- VividFlow remains the system of record
- no automatic risky actions without approval

### Tracker / Internal Cockpit
Must include:
- signal/source inbox
- triage/confidence
- task/risk/decision/memory output
- attention homepage
- journal/proof/audit

Quality gate:
- action-first, not passive analytics
- proof of activity and redaction for sensitive data

### Interactive Editor
Must include:
- canvas/stage
- selectable elements
- drag/drop
- resize
- inspector X/Y/W/H
- alignment controls
- save/load JSON
- export PNG/PDF or screenshot fallback

Quality gate:
- a caption can be moved without code edits
- layout persists after reload
- one real edit tested in browser

### CDC / Handoff
Must include:
- decisions sealed vs open questions
- implementation order
- data model / tables / APIs
- UI/module map
- acceptance criteria
- copy-paste prompt for Claude Code / Codex / dev agent

Quality gate:
- specific enough to build
- not a generic SaaS checklist
- warns against known failure modes

## Tool / Repo Heuristics

For deck/editor/tooling research, evaluate first:
- `pipipi-pikachu/PPTist` for full PowerPoint-like editor, but likely heavy/overkill
- `slidevjs/slidev` for markdown/developer decks, not drag/drop visual editing
- `tldraw` or canvas primitives for custom editing
- `react-konva` or `fabric.js` for focused internal visual editor

Default VividFlow recommendation:
- Build a focused editor or prototype unless full PowerPoint compatibility is explicitly required.

## Common Pitfalls

1. **Giving a doc when they need a visual decision artifact.** Convert to Vercel/PDF/editor when appropriate.
2. **Building 17 static screens.** Prove one operating loop first.
3. **No editability.** If captions/sections need adjustment, expose interactive controls or data-driven positions.
4. **No verification.** Do not claim visual/interface work is done without browser evidence.
5. **Mixing Jonathan Data OS and Thomas AGaaS.** Identify chantier before writing dense briefs.
6. **Overloading Thomas.** Thomas wants short execution guidance, not doctrine dumps.
7. **Forgetting human approval boundaries.** Agentic actions need propose/approve/audit by default.
8. **Do not freeze VividFlow into old vertical positioning.** Current VividFlow is generalist B2B AI-agent/automation infrastructure for PME. Only use immobilier framing for explicit real-estate client/use-case work.
9. **Using local file paths for Jonathan validation.** Prefer stable URL or attached media/PDF.
10. **Polishing before structure.** Validate low-fi operational logic before high-fidelity design.
11. **Opening a projection deck with positioning defense.** For personalized outbound projections, do not start with “not a CRM/chatbot/tool”; first show the prospect's concrete situation, then clarify infrastructure positioning later.
12. **Showing all system layers at once.** If a slide has sources, memory, agents, statuses, actions, consultants, and baseline simultaneously, it is likely too loaded. Use motion/progressive reveal or remove layers.
13. **Over-correcting into literal realism.** When Jonathan asks for “human” or “realistic”, do not automatically create a full office/laptop/photo scene; usually he wants the prospect to feel their daily workflow while staying in the premium deck/maquette language.

## Response Format

When advising what to do next, answer:

- **Verdict:** artifact type to build
- **Pourquoi:** one-sentence reason
- **MVP:** exact smallest useful scope
- **Stack/repo:** recommended stack or repo candidate
- **Action:** next concrete step

Keep it short unless asked to detail.

## Verification Checklist

- [ ] Context/project recovered from memory/session/files
- [ ] Artifact type chosen by decision need
- [ ] Scope is smallest useful loop
- [ ] Visual deliverable is editable or has clear handoff
- [ ] Layout/caption risks handled
- [ ] Browser or export verified when built
- [ ] Output is shareable: URL, PDF, screenshot, repo path, or prompt
- [ ] Known VividFlow identity/product guardrails respected
