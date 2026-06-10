---
name: hermes-disaster-recovery
description: Reconstruct a full Hermes agent setup from conversation transcripts after VPS data loss. Covers memory, skills, crons, scripts, multi-agent profiles, and integrations.
keywords: [disaster-recovery, reconstruction, hermes, vps, backup, restore]
---

# Hermes Disaster Recovery — Rebuild from Conversations

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## When to Use
- VPS data lost / reinstalled
- Hermes freshly installed but all custom config/scripts/memory gone
- User provides conversation transcripts from previous sessions

## Reconstruction Order (dependency-aware)

### 1. Analyze Conversations
Extract from transcripts:
- Memory entries (user profile + system memory)
- Skills created
- Cron jobs (name, schedule, deliver, prompt, script)
- Scripts (filenames, purpose, key logic)
- Config changes (approvals mode, model routing, fallback)
- API keys mentioned
- Services (systemd units)
- Integrations (Discord, GHL, tl;dv, Convex, Google Sheets)

### 2. Check Current State
```bash
ls ~/.hermes/memories/ scripts/ skills/
hermes cron list && hermes profile list
cat ~/.hermes/config.yaml
grep -E '^[A-Z]' ~/.hermes/.env | sed 's/=.*/=***/'
```

### 3. Rebuild (this order matters)
1. **Memory** — user profile + system memory (needed for agent context)
2. **Config** — approvals: auto, smart_model_routing: false, fallback_model via OpenRouter
3. **Dependencies** — pip install, npm install (discord.py, lightrag-hku, dev-browser, etc.)
4. **Scripts** — delegate to subagent for bulk creation, then syntax check all
5. **Skills** — create with full SKILL.md content
6. **Cron jobs** — only AFTER scripts exist. Keep minimal (see heartbeat-system skill)
7. **Multi-agent profiles** — custom start-gateway.sh, NOT standard hermes gateway start
8. **Data sync** — Discord sync, tl;dv import, LightRAG indexing

### 4. Verify
```python
# Audit checklist to run
for script in scripts: ast.parse(open(script).read())  # syntax check
hermes cron list  # crons active
hermes profile list  # profiles + gateways
systemctl --user status hermes-gateway-*  # services
curl -sI <url>  # dashboard
```

## Key Lessons (from 2026-04-07 recovery)

### Don't recreate what agents can do natively
- CSM monitoring → use a real Hermes profile on Discord, not a custom discord.py bot
- Health checks → don't waste LLM tokens on "✅ RAS" crons
- operator wants "real agents, not hardcoded bots" → always use native multi-agent profiles

### smart_model_routing kills everything if cheap_model doesn't exist
`claude-haiku-4-20250414` caused HTTP 404 on EVERY request (Telegram AND Discord).
**Always disable** smart_model_routing on fresh installs or set a valid cheap model.

### LightRAG Gemini embedding bug (lightrag-hku 1.4.13)
Built-in `gemini_embed` has `send_dimensions=False` by default → vector count mismatch.
Must wrap with custom SafeEmbedFunc using `google.genai` directly.
See clientops-data-os skill or index-knowledge.py for the working wrapper.

### Multi-agent profile gateway pitfall
`hermes -p <name> gateway run` via systemd does NOT connect Discord reliably.
Must use custom start-gateway.sh calling `start_gateway()` directly.
See hermes-multi-agent-profiles skill for the full script.

### .env token ordering
Profile .env files are ~370 lines. Tokens placed at the bottom may not load.
**Always put active tokens on lines 1-5 of the .env.**

### Cron spam prevention
- Never cron every 15min with deliver=telegram (spams identical reports)
- Delta tracking (MD5 hash comparison) mandatory for frequent crons
- deliver=local for all background tasks, telegram only for weekly reports
- See heartbeat-system skill for the recommended architecture

## Recovery Checklist
- [ ] Memory (user + system) restored
- [ ] Config (approvals auto, smart_model_routing off, fallback OpenRouter)
- [ ] API keys verified (Anthropic, Discord, Gemini, OpenRouter, GHL, tl;dv)
- [ ] Scripts created and syntax-checked
- [ ] Skills documented
- [ ] Cron jobs minimal (5-6 max, mostly deliver=local)
- [ ] Main gateway running (Telegram)
- [ ] Profile gateways running (Discord CSM via custom start-gateway.sh)
- [ ] Discord sync operational (wiki populated)
- [ ] LightRAG indexed (knowledge base, custom SafeEmbedFunc)
- [ ] tl;dv sync configured (transcriptions → Convex Data OS)
- [ ] Dashboard accessible and data flowing
