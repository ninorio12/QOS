---
name: prepare-coaching-session
description: "Prepare a technical coaching session for Mastermind IAO cohort — plan, architecture diagram, cheat sheet, and Discord announcement."
version: 1.0.0
author: operator + Hermes
metadata:
  hermes:
    tags: [coaching, mastermind-iao, support, live-demo]
    related_skills: [architecture-diagram, brainstorming]
---

# Prepare Coaching Session

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this skill when operator asks to prepare a coaching session for the Mastermind IAO cohort.

## operator's Coaching Style
- No slide decks — live demos + architecture diagrams + simple reference docs
- Mixed-tech audience — entrepreneurs, some technical, some not
- Keep it simple — straight to the point, not heavy, ~60 min total
- Structure — ~5 min/section, live demo is the centerpiece, Q&A at the end
- Share after — replay + downloadable supports (cheat sheet, guide, diagram)

## Outputs to Generate

### 1. PLAN-INTERNE-COACHING.md (private for operator)
Internal plan with objective, message key, timing structure (60 min, 5-10 min per section), talking points, and presentation tips.

### 2. hermes-architecture.html (to share on screen)
Dark-themed SVG architecture diagram using the architecture-diagram skill template. Show the full stack visually. Include comparison tables if relevant. Cards for key info.

### 3. CHEAT-SHEET-TOPIC.md (one-pager for students)
What it is (2 lines), install in 5 steps, comparison table, useful commands, use cases by niche, resource links. ONE page max.

### 4. GUIDE-REFERENCE-ELEVES.md (detailed reference)
Full guide with architecture, security, comparison, referenced articles integrated, links to official docs.

### 5. Discord announcement message
Catchy but short. Topic + time + what they learn. What they walk away with. Link to Skool calendar.

## Workflow

### Phase A — Understand & Research
1. Understand the topic and audience
2. **If previous session replay exists** → extract Fathom transcript, analyze pedagogical quality
3. Search for relevant context (sessions, wiki, articles, internal files)
4. For conceptual topics (e.g., Second Brain), research source material (Karpathy gist, web articles)

### Phase B — Produce Content Pack
Generate outputs in `/workspace/outputs/coaching-[topic]-[date]/`.

**Two coaching archetypes:**

**Archetype A — Tech Stack Demo** (Hermès, VPS, Claude Code)
- PLAN-INTERNE-COACHING.md — internal timing + talking points
- hermes-architecture.html — dark SVG visual stack diagram
- CHEAT-SHEET-TOPIC.md — one-pager install/commands/use cases
- GUIDE-REFERENCE-ELEVES.md — full reference with links
- Discord announcement

**Archetype B — Concept / Pattern** (Second Brain, Framework IAO)
- PLAN-COACHING.md — pedagogical arc: Hook, Problem, Concept, Why, Concrete, Action
- diagramme-[topic].html — interactive 3-tab diagram (Concept / Structure / Action)
- TEMPLATE-STRUCTURE.md — ready-to-paste templates + one-liner setup command
- CHEAT-SHEET-[TOPIC].md — quick ref: operations, folder rules, frontmatter, anti-patterns
- SKILL-[action]-[topic].md — installable skill for students
- Discord message with clear CTA: "Before next session, you must have..."

**Second Brain specific:**
- MUST cover all three agent context roles: (1) universal multi-tool config file, (2) coding-agent-specific config, (3) conversational agent personality + knowledge schema file
- NEVER claim a .hermes.md root config exists — it does NOT. The conversational agent reads its personality from a SOUL file in its profile directory
- MUST mention the native wiki skill available in Hermes for automated ingest/query/lint operations
- MUST explain the live cron automation pipeline: capture script (30min) -> ingest script (2h) -> lint script (Sunday 4am)
- Progressive rollout over 4 weeks: Week 1 structure + configs, Week 2 capture, Week 3 ingest, Week 4 lint
- NEVER include raw shell commands in student deliverables — use natural-language prompts they can paste into their coding agent instead

### Phase C — Review & Package
5. Review with operator — adjust tone, depth, emphasis
6. Package for sharing (Discord upload or link)

---

## Replay Analysis

When a Fathom replay link is provided:
1. Try `web_extract` first — often truncated
2. If truncated → `browser_navigate` → click Transcript tab → `browser_console` with JS extraction of all paragraph elements
3. Analyze pedagogical quality: what worked, what didn't, time sinks, unresolved bugs
4. Feed findings into the new session's plan

---

## Reviewing Student Sales Assets After Coaching

Use this when operator/operator asks what to answer to a student after they send a deck, HTML mockup, offer doc, pricing, or Discord attachment after a coaching call.

1. **Ground in the coaching transcript first.** Identify what was actually advised before judging the asset.
2. **Recover latest assets from Discord/logs if needed.** Download signed/ephemeral attachments locally under `/workspace/outputs/<student>-review/`; never paste signed CDN URLs or secrets.
3. **Extract the asset text and scan for commercial structure.** If `bs4` is missing, use stdlib regex + `html.unescape`; don't stall on dependency installs.
4. **Check for the classic mismatch:** deck sells the entry wedge, mockup shows the full vision. Make the student label full cockpit/agent suite as “vision cible” unless included in Acte 1.
5. **Give a sendable answer, not a giant audit.** User usually needs “what do I reply?” — provide verdict + exact message.
6. **When the ask is pricing/catalogue, produce an actual grid.** If the student asks for “catalogue”, “grille de prix”, “retainer”, or “tout ça”, don't stop at one recommended price: create a progressive brick catalogue, subcontracting AIOS→partner grid, partner margins, retainer tiers, and first-case exception rules.
6. **Strip internal notes warning.** HTML decks often contain speaker/coaching notes; explicitly tell the student to remove them before client send.
7. **For subcontracting/pricing grids, separate who invoices what.** If Client Delivery is subcontractor for a student/agency, produce a client-safe catalogue with: `AIOS → agency` setup price, estimated AIOS workload, `agency → end client` resale price, and whether recurring run belongs to AIOS or the agency. Do not assume AIOS takes MRR/run; if the user says the partner keeps run, remove all AIOS recurring fees.
8. **Use fixed prices when the user needs a catalogue.** Fourchettes are useful for internal strategy, but catalogues sent to a partner should usually use fixed numbers. If the user asks for a “grille/catalogue de prix”, default to fixed prices unless they explicitly request ranges.
9. **Separate platform/socle from agents.** Do not bundle Data OS, orchestrator, CRM, and business agents into one monster offer by default. Make Data OS/Léa the product d’appel, then price each agent separately (Iris, Victor, Mia, Atlas, Théo, Sam, Cash) with included/excluded scope.
10. **Respect partner-owned scope.** If the partner wants to own CRM/pipeline/client relationship, exclude it from AIOS’s subcontracting scope and lower AIOS setup accordingly. State exclusions bluntly to avoid delivery creep.

See `references/student-sales-asset-review.md` for the Jungle Agency / BeSapiens example and reusable pricing/offer patterns.
See `references/subcontracting-pricing-catalogues.md` for the fixed-price AIOS→partner→client catalogue pattern learned from Jungle Agency.
See `references/student-pricing-catalogs.md` for the catalogue/pricing-grid pattern: offer bricks, retainers, subcontracting prices, margins, and commercial framing.

---

## Critical Rules
- **NEVER make competitor comparisons without verifying real data first.** Always check GitHub stats, official docs, and actual feature sets before claiming X is better than Y. operator will call you out.
- **When user provides reference content (articles, images), fetch and integrate.** If X/Twitter can't be fetched, ask user to paste content. Don't skip the reference material.
- **If operator corrects something, fix it immediately** across ALL files (plan, diagram, guide, cheat sheet) — not just one.
- **Frame comparisons as philosophies, not feature lists.** "Two approaches to different problems" > "X is better because Y".
- **Tier list format preferred for LLM rankings** (Tier 1/2/3) over simple price tables.
- **For file sharing from VPS:** start HTTP server on port 8765 (`python3 -m http.server 8765`), open firewall (`ufw allow 8765/tcp`), give IP:port link.

## Tips
- If user provides X/Twitter articles, fetch and integrate content
- Use the architecture-diagram skill for visual supports
- Keep cheat sheet to ONE page max
- The live demo script should list exact commands in order
- Always mention what is useful for their BUSINESS, not just the tech
- When audience is mixed-tech, err on the side of simple — they can ask questions after
- See `references/coaching-pedagogy.md` for detailed pedagogical arc, HTML diagram technique, and anti-patterns
