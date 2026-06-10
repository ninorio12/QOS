---
name: second-brain-ops
description: "Second Brain v3 pipeline Karpathy : capture (30m), ingest (2h) avec extraction business, lint (hebdo) structurel + métier. Pipeline autonome, silent, watermark-based."
version: 3.0.0
author: AIOS
metadata:
  hermes:
    tags: [knowledge-management, wiki, second-brain, karpathy, automation]
    category: productivity
---

# Second Brain Operations (v3 Pipeline)

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## When This Skill Activates

- New file in `raw/` → **INGEST**
- Question about business → **QUERY**
- Periodic maintenance → **LINT**
- "ingest", "ajoute au wiki" → **INGEST**
- "cherche", "qu'est-ce qu'on sait sur" → **QUERY**
- "vérifie le wiki", "lint", "santé" → **LINT**

## Architecture

Second Brain at `/root/`. Structure:

```
/root/
├── config/         Business identity (READ-ONLY for agent)
├── raw/            Immutable sources (APPEND-ONLY)
│   ├── transcriptions/   Calls, meetings, interviews
│   ├── meetings/         tl;dv auto-captured
│   ├── conversations/    Chat sessions (Telegram, WhatsApp)
│   ├── discord/          Discord messages
│   ├── messages/         Group messages
│   ├── docs/             Documents
│   ├── brainstorming/    Brainstorming notes
│   ├── web/              Articles, clippings
│   └── assets/           Images, diagrams
├── wiki/           Compiled knowledge (AGENT MANAGES)
│   ├── entities/         People, companies, products
│   ├── concepts/         Methods, frameworks, processes
│   ├── comparisons/      Comparative analyses
│   ├── queries/          Archived query results
│   ├── index.md          Catalog (ALWAYS up to date)
│   ├── log.md            Append-only journal
│   └── SCHEMA.md         Conventions + business frontmatter
├── ops/            Operations (AGENT MANAGES)
├── outputs/        Generated deliverables (AGENT MANAGES)
├── projects/       Codebases (READ-ONLY)
└── archive/        Dormant content
```

## Scripts (in `~/.hermes/scripts/`)

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `sb-capture.py` | Capture Telegram + Discord + tl;dv → raw/ | 30min |
| `sb-context-scan.py` | Scan raw/ for new files, output JSON | 120min |
| `sb-lint.py` | Wiki health check (structural + business) | Weekly |
| `sb-health.py` | Dashboard KPIs | On-demand |

State files: `~/.hermes/state/second_brain_{capture,context,lint}.json`

For Hermes-operated business workspaces where the user wants zero-friction Telegram/Slack capture into a Karpathy-style wiki, also load `references/hermes-second-brain-capture-pattern.md`. It captures the validated pattern: write to `raw/` first, synthesize selectively into `wiki/`, use a silent scheduler as the server autopilot, and remember Hermes cron scripts must live under `~/.hermes/scripts/`.

## INGEST — Process new source

### Automated (cron `sb-ingest`, every 120min)

1. Run `python3 ~/.hermes/scripts/sb-context-scan.py`
2. If `[SILENT]` → no-op
3. For each new file:
   - Read the file
   - Read `/workspace/wiki/index.md` for existing pages
   - **Extract BUSINESS SIGNALS** (not just summaries):
     - Call type (sales/coaching/internal/technical/client)
     - Participants
     - Decisions made
     - Actions (what, by whom, deadline)
     - Pain points
     - Deal signal (advancing/receding, budget discussed)
     - Post-call status
   - Create/update wiki pages with full YAML frontmatter
   - Update `index.md` and `log.md`

### Business frontmatter (SCHEMA.md v2)

Clients:
```yaml
status: lead | r1-fait | r2-planifié | cdc-livré | cdc-signé | en-cours | live | perdu
deal_value: "X€" or "4.5-20K€"
last_contact: YYYY-MM-DD
responsible: operator | operator | damien | hamza
```

Students (incubator):
```yaml
phase: inscription | r1-fait | r2-fait | onboarding | actif | graduated | churned
niche: "description"
offer: "description + prix"
```

### Rules
- `raw/` is IMMUTABLE — never modify source files
- Max 15 files per run, most recent first
- Priority: meetings > coaching > sales > clarity calls
- Skip "confirm----découverte" calls (noise)
- Silent delivery — Telegram only on [ALERTE]

## Operational Pitfalls

**Client VPS/non-root cron paths**
On client deployments where Second Brain crons run as a non-root user (often `hermes`), do not hardcode `~/.hermes/state` for watermarks/state. Use a writable neutral path like `/opt/data/state`, and explicitly fix permissions for `/root/raw`, `/root/wiki`, `/root/ops`, `/root/outputs` or their client equivalents before declaring capture/ingest/health/lint healthy. Verify each cron with its actual runtime user, not just as root.

**Hermes profile cron script alignment**
If a profile cron fails with `Script not found` but the script exists in global `~/.hermes/scripts/`, align the scripts into the active profile's `~/.hermes/profiles/<profile>/scripts/` directory and verify by reading the latest cron output, not just by running the global script. See `references/hermes-profile-cron-script-alignment.md`.

**Append-only logs — never read+rewrite from a truncated tool view**
`/workspace/wiki/log.md` is append-only. Add entries with a true filesystem append (`cat >> /workspace/wiki/log.md`, Python `open(path, 'a')`, or a precise end-of-file patch). Do **not** `read_file`/`hermes_tools.read_file` then `write_file` the whole log: tool reads may be limited/truncated or include display line numbers, and rewriting can silently delete history. Verify with `tail -n 30 /workspace/wiki/log.md` after appending.

**Python edits from `execute_code`**
For local wiki/index/log edits inside `execute_code`, prefer `pathlib.Path(...).read_text()` / `.write_text()` over `hermes_tools.read_file/write_file`: the helper schema can differ from native tools (e.g. `KeyError: 'content'`). After any programmatic write, run deterministic verification before final JSON: frontmatter dates bumped, index/log entries present, and Markdown tables do not contain accidental double-pipe rows (`'\n||' not in content`).

**Dream nocturne — pre-run JSON vs executed dream.py**
When a cron provides pre-run JSON and also asks to run `~/.hermes/scripts/dream.py`, treat the executed run as the source of truth for confirmed metrics/changes. If pre-run and final diverge, report as:
- `confirmed final run`: official counts and changes
- `pre-run signals to watch`: useful but unconfirmed divergences
For engagement <10% or massive silence, persist the insight in `wiki/ops/engagement-tracker.md`, the program/entity page (e.g. `entities/incubateur-ia-clientops.md`), and `/workspace/ops/dream-YYYY-MM-DD.json`. If persistent memory is unavailable, continue with wiki/ops persistence and only mention the memory failure when the final report is non-silent.

**INGEST cron — pre-run JSON beats `[SILENT]`**
If the prompt includes pre-run JSON from the scanner, process `new_raw_files` and `changed_files` even when a subsequent live `sb-context-scan.py` call prints `[SILENT]`. `[SILENT]` only means the live scanner found no fresh delta since its own watermark; it does not cancel already-provided work. In cron context, do not ask questions: ingest up to the run cap, newest first, then output the required JSON or `[SILENT]` only if both pre-run and live scan are genuinely empty. Treat this as a hard precedence rule: pre-run files are actionable work, not stale noise.

**Discord changed_files — ingest late deltas, not just sources**
When a Discord JSONL (`/workspace/raw/messages/*.jsonl`) appears in `changed_files`, relis the full file even if `wiki/log.md` already has an ingest entry for the same source that day. Compare the newest raw messages against the wiki page/log summary and ingest any uncaptured late deltas: doc/link shared after a call, call not recorded, replay missing, confusion about time/link, bot/agent errors such as `No LLM provider configured`, or even a weak ping/relance (`<@...>`) when it updates `last_contact` or proves the student/client is waiting on the team. Treat these as operational pain points + action items, not as chat noise. For weak-but-actionable pings, bump `updated`/`last_contact`, add a short chronology/last-signal line, add the follow-up action owner, update index/log/daily brief if the indexed status changed, and do **not** return `[SILENT]`.

**Discord voice messages — grab fresh CDN audio before it dies**
If the newest JSONL messages include Discord voice attachments and the CDN token is still valid, download immediately to `/tmp/<entity>_voice/` and run local Whisper before the URL expires, e.g. `whisper /tmp/<entity>_voice/*.ogg --language French --model tiny --output_format txt --output_dir /tmp/<entity>_voice/transcripts`. Tiny Whisper on noisy phone audio will be messy, but it can still reveal deal-grade signals (need, ICP, decision, next step) when combined with surrounding text. If the URL is expired, do not retry forever: mark the voice as non-transcribed/expired and flag manual re-upload only if it blocks a deal/action.

**Frontmatter taxonomy hygiene**
When updating an existing page, validate its tags against `/workspace/wiki/SCHEMA.md` instead of blindly preserving old tags. If a page contains a non-taxonomy tag (e.g. a casual label from an older ingest), replace it with the closest allowed taxonomy tag before saving. This prevents lint debt while touching the page anyway.

**Append-only log safety after partial reads**
For `wiki/log.md` append operations, prefer direct append via Python/open or a full-file read before patching. Do not patch `log.md` using an `old_string` from an offset/limited read; append-only files are long and repeated snippets make partial patches risky.

## QUERY — Answer a question

1. Read `wiki/index.md` to find relevant pages
2. Load wiki pages (not raw — wiki is the compiled synthesis)
3. Synthesize with citations: `(cf. wiki/entities/nom.md)`
4. If new insight → create wiki page
5. If valuable → save to `wiki/queries/YYYY-MM-DD-sujet.md`

Rules:
- ALWAYS cite wiki sources
- If info not in wiki: "Pas d'info dans le wiki sur ce sujet."
- NEVER fabricate information

## LINT — Wiki health (cron `sb-lint`, weekly Sunday 4AM)

1. Run `python3 ~/.hermes/scripts/sb-lint.py`
2. Fix: missing frontmatter, broken wikilinks, incomplete index
3. Run `python3 ~/.hermes/scripts/sb-health.py`
4. **Business lint**:
   - Cold deals: clients with status `cdc-livré`/`r1-fait` but `last_contact` > 30 days
   - Ghost students: `phase: actif` but no interaction > 21 days
   - Missing frontmatter fields
5. Update `wiki/log.md`

Severity: low/medium → silent. High → [ALERTE LINT].

## Crons

| Cron | ID | Schedule | Script | Delivery |
|------|----|----------|--------|----------|
| sb-capture | 0a21545c84f6 | every 30m | sb-capture.py | local |
| sb-ingest | f3f18f1cb88a | every 120m | sb-context-scan.py | local |
| sb-lint | 0123aaf536d8 | Sunday 4AM | sb-lint.py | local |
| sb-tldv-sync | d8f419c3a16e | daily 1AM | sb-capture.py | local |

All silent (deliver: local). Telegram only on emergency.

## During Conversations

- Important business fact emerges → immediately capture it as a raw source before wiki edits: `raw/messages/YYYYMMDD-HHMMSS_<source>_<topic>.md` with minimal frontmatter (`source`, `chat/thread`, `sender`, `date`). Do not leave durable facts only in the chat transcript or memory.
- Business correction changes a doctrine/offre/ICP/content strategy → treat it as a mini-ingest now, not a passive memory update: create a raw source in `raw/conversations/`, update relevant wiki pages, `wiki/index.md`, `wiki/log.md`, and any active operational mirrors that agents actually load (e.g. `/workspace/projects/ClientOps-/.../Content OS/*.md`, `CLAUDE.md`).
- Then update the relevant wiki page, `wiki/index.md`, and append to `wiki/log.md` with the created raw source path.
- Example pattern: Telegram topic defines a ClientOps Finance OS cockpit → create a raw message source, enrich `entities/agence-clientops.md` (tools, current enjeux, new Finance OS section), update index, append log.
- New operational mandate from a Telegram/voice message → treat it as a business decision: create `/workspace/raw/conversations/YYYY-MM-DD_<channel>-<topic>-mandate.md`, update the relevant umbrella wiki concept, update index/log, and create an ops/output artifact if it implies a working system. See `references/conversation-mandate-capture.md`.
- New organization/system Second Brain requested from an active conversation → bootstrap a compact Karpathy-style wiki now instead of waiting for cron: create a raw bootstrap source, SCHEMA/index/log, and a small compiled wiki of concepts/agents/processes/decisions. Use `references/conversation-to-second-brain-bootstrap.md`.
- If the user says the Second Brain must “function” or complains that it is only a raw capture, do not wait for another instruction: add the ingest layer immediately. Create/update stable wiki pages, update `index.md` and append `log.md`, then install a silent ingest cron (typically every 2h) that converts new `raw/messages` captures into compiled wiki pages. Verify both layers: capture cron status + ingest state/page existence. For the VividFlow-specific implementation shape, see `references/vividflow-second-brain-ingest-pattern.md`.
- For VividFlow/agency operating-system design (Telegram direction + Slack executors + Data OS + Second Brain + GBrain), use `references/vividflow-agentic-operating-system.md` for the validated role model, memory architecture, and Miro diagram structure.
- When Jonathan says the memory stack feels messy, duplicated, not human enough, or that VividFlow is “galère” despite Second Brain/GBrain/memory, use `references/vividflow-human-memory-architecture.md`: model the system as perception → episodic → semantic → procedural → working memory, audit before adding tools, and treat Supermemory as semantic recall only after taxonomy/source-of-truth cleanup.
- When Jonathan asks whether the VividFlow Second Brain/GBrain “fonctionne bien”, use `references/vividflow-gbrain-health-audit.md`: check Hermes crons, script path alignment, manual capture/ingest runs, wiki tree, and GBrain/context regression before giving an OK/Fragile/Cassé verdict.
- When Jonathan asks for a “vraie mémoire qui fonctionne comme l'humain”, or mentions Second Brain + GBrain + Supermemory together, use `references/vividflow-human-memory-architecture.md`: distinguish local memory, Second Brain, GBrain/context loader, Supermemory, and Data OS; audit capture → consolidation → recall → agent usage before proposing improvements.
- When VividFlow agents must actively use GBrain/Second Brain context (not just store wiki pages), use `references/vividflow-context-loader-pattern.md`: create a context loader, generate per-profile `GBRAIN_CONTEXT.md`, patch executor SOUL.md files, wrap briefs, install/verify crons, and audit Slack mention replies visually.
- When Jonathan wants the VividFlow Second Brain/GBrain to become automatic and functional, use `references/vividflow-autonomous-gbrain-implementation.md`: Second Brain = bibliothèque, GBrain = bibliothécaire, R&D ≠ GBrain, COO = Orchestrateur Qualité, and capture scripts must normalize non-string Hermes session content before calling `.strip()`.
- When Jonathan asks to keep testing/improving the VividFlow agent OS, use `references/vividflow-agent-os-regression-pattern.md`: run layered system/basic/deep/human-quality audits, treat agents as staff, verify Slack mentions/replies, and patch rules/context before claiming the system is healthy.
- When Jonathan/Thomas correct a VividFlow multi-agent workflow and expect it to become acquired behavior, use `references/vividflow-agent-pattern-acquisition.md`: convert the correction into a Second Brain process, regenerate affected `GBRAIN_CONTEXT.md`, and verify the expert-agent → COO → Telegram loop rather than relying on memory only.
- New entity/concept discovered → create page if threshold met (2+ mentions)
- User corrects info → update wiki page
- Business question answered → cite wiki sources

### Voice/message requests that produce business outputs
When a Telegram/Discord voice note asks for an analysis, pricing recommendation, client document, or other reusable business output:
1. Treat the transcript as a new source: create a concise immutable raw note under `raw/telegram/`, `raw/discord/`, or `raw/conversations/` with date, source, business instruction, and produced output path.
2. Read existing wiki/entity pages and previous outputs before drafting; do not overwrite or publicly deploy existing client-facing docs unless the user explicitly validates publication.
3. Write the new work product under `outputs/<topic>/` and mark status clearly (`brouillon interne`, `à valider`, `publiable`, etc.).
4. Update the relevant wiki entity frontmatter/body with the new decision/recommendation and source path.
5. Append `wiki/log.md` with source, pages updated, output created, and the business signal.
6. Final response should give the artifact path plus the sharp recommendation; avoid dumping the whole document in chat.

### Live topic micro-ingest pattern

Use this when a Telegram/Discord topic becomes an operational cockpit (finance, marketing, sales) and the user sends voice transcripts, screenshots, rules, or sheet/export snippets:

1. **Raw first:** create a timestamped immutable source in `/workspace/raw/messages/` or `/workspace/raw/conversations/` with frontmatter: `source`, `chat`, `thread`, `sender`, `date`/`captured_at`, `type`, and `attachments` when relevant. For voice/ASR, keep both the raw transcript and an explicit interpretation note when terms are ambiguous (`3.992` → `3 992 €`, “date OS” → “Data OS”, “enseigné” → “signé`).
2. **Concept over flat notes:** if the topic describes a reusable operating system, create/update a `wiki/concepts/<topic>.md` page and backlink the relevant business entity (ex: `entities/agence-clientops.md`). Do not bury operational rules only in an entity paragraph.

### Finance sheet / cash guidance pattern

Use this when the user shares a finance Google Sheet or asks how to pilot cash with current balances:
1. Load `google-workspace`; try public XLSX/CSV export before OAuth.
2. Extract current month + YTD figures and calculate with tools: CA, costs, net cash, margin, MoM trend, pipeline/runway. Never mental-math finance guidance.
3. Create raw snapshots for both the sheet extraction (`raw/docs/...snapshot.md`) and any user cash instruction (`raw/messages/...finance-guidance.md`) before updating wiki.
4. Update the existing Finance OS concept page with a dated snapshot, sources, and operational recommendation.
5. Reply in cash-envelopes, not generic analysis: TAX, CLOSER/commissions, OPEX/runway, VAULT, OWNER PAY, PROFIT.
6. If cash available is lower than theoretical allocation, say the full rule is impossible and switch to defensive mode: tax + commissions + OPEX first, Vault second, Owner Pay/Profit frozen until cash thresholds are rebuilt.
3. **Extract actions, not vibes:** capture accounts/envelopes, thresholds, calendars, formulas, alert rules, source-of-truth data inputs, open questions, and next actions.
4. **Images/screenshots:** transcribe visible figures/rules into the raw source; if a displayed percentage or total looks approximate, verify with a calculator/tool and record the discrepancy in the wiki.
5. **Voice notes:** convert the transcript into operational bullets and update the concept page with how the agent should use the data (ex: Google Sheet expenses → alert/action engine).
6. **Index/log discipline:** update `wiki/index.md` only when a page is created or its indexed summary changes; increment total pages only for new pages. Append to `wiki/log.md` with a true append or after re-reading the full log if any prior view was paginated.
7. **Verification:** use `search_files` to confirm the raw source, wiki page, backlinks/index/log contain the new signals before replying.

### Client VPS / agent infrastructure audits as business sources

When documenting a client's Hermes/Claude VPS so the setup can be reused for another client or niche:
1. Write the complete operational report to `outputs/clients/<slug>/vps-hermes-structure.md`.
2. Preserve an append-only source copy in `raw/docs/<slug>-vps-hermes-audit-YYYY-MM-DD.md`.
3. If the learning is reusable, create a **class-level** wiki concept/playbook (example: `concepts/playbook-vps-hermes-immobilier.md`) rather than a narrow one-session stub.
4. Update `wiki/index.md` and append `wiki/log.md` in the same turn.
5. Before answering, scan generated docs for secrets: provider keys (`sk-*`), Slack tokens (`xox*`), JWT-like strings, Telegram bot tokens, OAuth credentials. Never write `.env`, `auth.json`, `.credentials.json`, cookies, private keys, or raw client sessions into wiki/raw/outputs.
6. Treat local Hermes/Claude self-reports as context only; verify with filesystem, cron JSON, process table, config excerpts, and generated file checks.

## Batch Processing Large Volumes

### Problem
Subagent delegation FAILS for bulk ingest of large files (30-60KB). LLM reads too much context, causes timeouts after ~10-15 files.

### Solution: Use Claude Code

For heavy file processing, use `delegate_task` with `acp_command="claude"`:
```python
delegate_task(
    goal="Read transcriptions in /workspace/raw/transcriptions/ and create wiki pages...",
    acp_command="claude",
    acp_args=["--acp", "--stdio"],
    toolsets=["terminal", "file"],
    max_iterations=60
)
```

Claude Code is much faster than regular subagents for reading large files and writing structured content.

### Python-first fallback

If Claude Code also struggles:
1. Use `execute_code` with Python to extract programmatically
2. Cluster by entity (filename patterns)
3. Generate skeleton pages with frontmatter + file listings
4. Let daily INGEST cron fill content incrementally

## Cron Hermes — scripts globaux vs profil

Quand les jobs Second Brain/GBrain échouent mais que les scripts passent en manuel, vérifier l’alignement entre scripts globaux et scripts du profil actif.

Pattern de diagnostic :
1. lister les crons Hermes et identifier les jobs en erreur ;
2. inspecter le chemin appelé par le cron ;
3. comparer :
   - `/home/hermes/.hermes/scripts/`
   - `/home/hermes/.hermes/profiles/<profile>/scripts/`
4. si le cron cherche un script absent côté profil alors qu’il existe côté global, copier ou symlinker le script dans le dossier profil ;
5. lancer le script manuellement depuis le chemin profil ;
6. relancer le cron ;
7. vérifier les outputs réels, pas seulement `last_status` qui peut prendre du retard.

Exemples de scripts concernés :
- `vividflow_sb_capture.py`
- `vividflow_sb_ingest.py`
- `vividflow_agent_os_regression.py`
- `vividflow_context_loader.py`
- `vividflow_agent_brief.py`

Ne pas conclure “Second Brain cassé” si l’ingest/capture passent à la main : c’est souvent un problème de routage de script cron.

## Pitfalls

- **Telegram topic = source opérationnelle, même sans fichier capturé.** Quand un utilisateur poste dans un topic Telegram des règles business, captures d'écran, tableaux ou décisions, ne pas attendre le cron capture si le signal est important : créer immédiatement une source brute datée dans `/workspace/raw/messages/` ou `/workspace/raw/conversations/`, transcrire/synthétiser le contenu, puis ingérer. Si `supermemory_store` échoue (quota/429) ou si la mémoire courte est pleine, ne bloque pas : le wiki + raw sont la source durable opérationnelle.
- Pour les images/tableaux : garder `attachments: N images` dans le frontmatter raw, transcrire les chiffres/règles clés, créer une page concept dédiée si le message définit un système réutilisable (Finance OS, Marketing OS), puis mettre à jour entité liée + index + log.
- **Log append-only après lecture partielle : append, ne patch pas.** `wiki/log.md` est append-only. Si tu l'as lu avec `offset`/`limit`, ne fais pas un `patch` sur la dernière ligne même si ça marche souvent : relis le fichier complet avant toute modification structurée, ou mieux, ajoute la nouvelle entrée avec un append déterministe (`cat >> /workspace/wiki/log.md <<'EOF' ... EOF`). Le warning de partial-read existe pour éviter la corruption silencieuse.
- Vérifier les calculs issus de tableaux utilisateur avec Python/terminal avant de les recopier comme vérité ; si une valeur source est approximative ou incohérente, conserver la valeur source mais ajouter le calcul strict et le point à clarifier.
- Don't create wiki pages for every "découverte ClientOps" call — skip noise
- Always check Data OS (skills, existing processes) BEFORE creating new resources
- `raw/` is append-only — NEVER modify source files
- `wiki/index.md` must ALWAYS be current — update after every wiki change
- Frontmatter business fields (status, deal_value, last_contact) are required for client pages
- Max 15 files per ingest run to avoid context overflow
- Stubs (<35 lines) degrade the wiki — either enrich or delete, don't accumulate
- Cron ingest: if the live scan returns `[SILENT]` but the pre-run payload lists `new_raw_files` or `changed_files`, process those files anyway. `[SILENT]` from the script is not authoritative when the cron wrapper already captured actionable file deltas.
- After any partial `read_file(..., offset/limit)` on a wiki/index/log file, re-read the whole file before using `patch`. If a tool warns that a file was partially read, stop patching and reload the complete file first; otherwise you risk corrupting logs/index with non-unique snippets.
- For append-only files like `wiki/log.md`, prefer deterministic append via shell/Python (`Path(...).read_text() + entry`) over patching line-numbered tool output.
- Normalize wikilinks to actual slugs (`[[example-client-immobilier|Example Client Immobilier]]`, not `[[Example Client Immobilier]]`) when touching pages; broken display-name links are silent rot.
- **Student auto-sync stubs are destructive/partial.** If `entities/students/<slug>.md` starts with `# 🔒│...` and lacks YAML, treat it as an auto-sync overwrite even if older rich sections still exist below the stub. Rebuild the page with full frontmatter from: current raw JSONL, surviving old sections, and recent `wiki/log.md` entries. Do not leave the sync header at top and do not create a duplicate entity page elsewhere.


## Consolidated references: migration and legacy batch ingestion

The previous `supermemory-migration` and `lightrag-nocturnal-batch` skills are now references under this umbrella. Use them for Supermemory ingestion/migration detail and for legacy LightRAG nocturnal batch recipes while keeping this skill as the class-level Second Brain operations entrypoint.
