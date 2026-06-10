---
name: hermes-agent
description: "Configure, extend, or contribute to Hermes Agent."
version: 2.1.0
author: Hermes Agent + Teknium
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [hermes, setup, configuration, multi-agent, spawning, cli, gateway, development]
    homepage: https://github.com/NousResearch/hermes-agent
    related_skills: [claude-code, codex, opencode]
---

See also `references/telegram-message-cleanup.md` for deleting Telegram messages by `chat_id` + `message_id`, including bounded cleanup windows, disposable probe messages, and Bot API interpretation.
## Jonathan/Rafaela live setup note

When guiding a non-technical Mac user live via screenshots through Antigravity + Claude Code + Hermes, use `references/nontechnical-mac-antigravity-hermes-setup.md`: one action per turn, minimal stack only, authenticate Claude Code first, then configure Hermes with existing Claude Code credentials; skip Telegram until local Hermes works.

Hermes Agent is an open-source AI agent framework by Nous Research that runs in your terminal, messaging platforms, and IDEs. It belongs to the same category as Claude Code (Anthropic), Codex (OpenAI), and OpenClaw — autonomous coding and task-execution agents that use tool calling to interact with your system. Hermes works with any LLM provider (OpenRouter, Anthropic, OpenAI, DeepSeek, local models, and 15+ others) and runs on Linux, macOS, and WSL.

What makes Hermes different:

- **Self-improving through skills** — Hermes learns from experience by saving reusable procedures as skills. When it solves a complex problem, discovers a workflow, or gets corrected, it can persist that knowledge as a skill document that loads into future sessions. Skills accumulate over time, making the agent better at your specific tasks and environment.
- **Persistent memory across sessions** — remembers who you are, your preferences, environment details, and lessons learned. Pluggable memory backends (built-in, Honcho, Mem0, and more) let you choose how memory works.
- **Multi-platform gateway** — the same agent runs on Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, and 10+ other platforms with full tool access, not just chat.
- **Provider-agnostic** — swap models and providers mid-workflow without changing anything else. Credential pools rotate across multiple API keys automatically.
- **Profiles** — run multiple independent Hermes instances with isolated configs, sessions, skills, and memory.
- **Extensible** — plugins, MCP servers, custom tools, webhook triggers, cron scheduling, and the full Python ecosystem.

People use Hermes for software development, research, system administration, data analysis, content creation, home automation, and anything else that benefits from an AI agent with persistent context and full system access.

**This skill helps you work with Hermes Agent effectively** — setting it up, configuring features, spawning additional agent instances, troubleshooting issues, finding the right commands and settings, and understanding how the system works when you need to extend or contribute to it.

**Docs:** https://hermes-agent.nousresearch.com/docs/

## Quick Start

When Jonathan asks for a setup/process he can share with someone else, answer as a paste-ready message for that person: simple headings, exact commands, no internal status output, no provider inventory, no profile list unless explicitly needed. Separate the three concepts plainly: Antigravity = IDE, Claude Code = coding agent in terminal, Hermes = assistant/orchestrator with memory/tools/reminders.

For non-technical personal onboarding (Antigravity/Homebrew/Codex/Hermes/Telegram, prompt `%` vs Hermes `❯`, BotFather privacy, pairing, voice/STT, and simple agents+skills mental model), use `references/nontechnical-personal-hermes-onboarding.md`.

For nontechnical Mac onboarding from Antigravity through Hermes/Codex/Telegram, use `references/nontechnical-mac-telegram-onboarding.md` and the Codex/Telegram troubleshooting runbook in `references/nontechnical-mac-telegram-codex-setup.md`: guide one click/command at a time, keep the first setup local, distinguish `❯` from `%`, never collect bot tokens in chat, and only introduce VPS/Tailscale after local Telegram/Hermes usage is proven.

For nontechnical Telegram multi-agent “agency” setups, use `references/nontechnical-telegram-multi-agent-agency.md`: distinguish group/topic/bot/profile/prompt, align profile names with bot usernames when helpful, create one specialist at a time, and co-design role prompts before finalizing them.

When guiding a non-technical person through macOS Antigravity → Claude Code → Hermes setup via Telegram/screenshots, use one-action-at-a-time “GPS mode” and the tested Homebrew/Command Line Tools sequence in `references/macos-antigravity-hermes-beginner-onboarding.md`.

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# Interactive chat (default)
hermes

# Single query
hermes chat -q "What is the capital of France?"

# Setup wizard
hermes setup

# Change model/provider
hermes model

# Check health
hermes doctor
```

---

## CLI Reference

### Global Flags

```
hermes [flags] [command]

  --version, -V             Show version
  --resume, -r SESSION      Resume session by ID or title
  --continue, -c [NAME]     Resume by name, or most recent session
  --worktree, -w            Isolated git worktree mode (parallel agents)
  --skills, -s SKILL        Preload skills (comma-separate or repeat)
  --profile, -p NAME        Use a named profile
  --yolo                    Skip dangerous command approval
  --pass-session-id         Include session ID in system prompt
```

No subcommand defaults to `chat`.

### Chat

```
hermes chat [flags]
  -q, --query TEXT          Single query, non-interactive
  -m, --model MODEL         Model (e.g. anthropic/claude-sonnet-4)
  -t, --toolsets LIST       Comma-separated toolsets
  --provider PROVIDER       Force provider (openrouter, anthropic, nous, etc.)
  -v, --verbose             Verbose output
  -Q, --quiet               Suppress banner, spinner, tool previews
  --checkpoints             Enable filesystem checkpoints (/rollback)
  --source TAG              Session source tag (default: cli)
```

### Configuration

```
hermes setup [section]      Interactive wizard (model|terminal|gateway|tools|agent)
hermes model                Interactive model/provider picker
hermes config               View current config
hermes config edit          Open config.yaml in $EDITOR
hermes config set KEY VAL   Set a config value
hermes config path          Print config.yaml path
hermes config env-path      Print .env path
hermes config check         Check for missing/outdated config
hermes config migrate       Update config with new options
hermes login [--provider P] OAuth login (nous, openai-codex)
hermes logout               Clear stored auth
hermes doctor [--fix]       Check dependencies and config
hermes status [--all]       Show component status
```

### Tools & Skills

When importing an external GitHub repo that already contains `SKILL.md` files, use the reusable importer in `scripts/import_external_skill_repo.py` and the access/retry workflow in `references/external-skill-repo-import.md`. If the importer reports `NO_TOKEN` even for a public repo, do not stop there: clone the public repo directly with `git clone --depth 1 https://github.com/<owner>/<repo>.git /tmp/<repo>` and manually inspect/copy `*/SKILL.md` files, while preserving category/naming to avoid duplicates. For private repos where access is not yet granted, verify permissions via the GitHub API, then schedule a quiet cron retry instead of repeatedly failing the clone.

```
hermes tools                Interactive tool enable/disable (curses UI)
hermes tools list           Show all tools and status
hermes tools enable NAME    Enable a toolset
hermes tools disable NAME   Disable a toolset

hermes skills list          List installed skills
hermes skills search QUERY  Search the skills hub
hermes skills install ID    Install a skill (ID can be a hub identifier OR a direct https://…/SKILL.md URL; pass --name to override when frontmatter has no name)
hermes skills inspect ID    Preview without installing
hermes skills config        Enable/disable skills per platform
hermes skills check         Check for updates
hermes skills update        Update outdated skills
hermes skills uninstall N   Remove a hub skill
hermes skills publish PATH  Publish to registry
hermes skills browse        Browse all available skills
hermes skills tap add REPO  Add a GitHub repo as skill source
```

### MCP Servers

```
hermes mcp serve            Run Hermes as an MCP server
hermes mcp add NAME         Add an MCP server (--url or --command)
hermes mcp remove NAME      Remove an MCP server
hermes mcp list             List configured servers
hermes mcp test NAME        Test connection
hermes mcp configure NAME   Toggle tool selection
```

### Gateway (Messaging Platforms)

```
hermes gateway run          Start gateway foreground
hermes gateway install      Install as background service
hermes gateway start/stop   Control the service
hermes gateway restart      Restart the service
hermes gateway status       Check status
hermes gateway setup        Configure platforms
```

Supported platforms: Telegram, Discord, Slack, WhatsApp, Signal, Email, SMS, Matrix, Mattermost, Home Assistant, DingTalk, Feishu, WeCom, BlueBubbles (iMessage), Weixin (WeChat), API Server, Webhooks. Open WebUI connects via the API Server adapter.

**Client cockpit + Slack ops pattern:** when designing Hermes for a client team, keep Telegram as the private executive cockpit and Slack as the operational workspace. Do not model Slack as “the agent system”: Slack is only a communication surface, like Telegram. The real system is Hermes profiles/agents + Data OS + memory/GBrain + tools. The cockpit agent receives strategy/voice/priority from the leader, then delegates into Slack channels or Slack-reachable specialist agents. Specialist agents should not answer in the executive Telegram cockpit unless explicitly mentioned; they execute and report back through Slack/dashboard, while the cockpit gives the leader a concise summary. This avoids Telegram topic noise for teams while preserving a fast private channel for the decision-maker.

**Human-like agent boundaries for agency teams:** when Jonathan describes bots/agents for VividFlow or a client agency, design them as métier experts with human-style roles, not “bots by tool.” Keep intelligence broad but access narrow: each agent gets role, mission, channels, tool rights, memory scopes, read/write permissions, and confidentiality level. Use the rule: freedom of reasoning, restricted access, traceable action. GBrain/memory acts as the deep knowledge base; Data OS is the visible source of truth/audit layer; Slack/Telegram are mouths, not brains.

**Automatic context loading before every reply:** do not make each agent ask the user what context to read. Insert a context-loader step before the agent responds: identify channel/thread, agent/profile, subject/project/client, load common workspace memory plus the agent’s allowed scope, inject only relevant snippets, then save durable validated information back to the right memory/Data OS area with audit metadata. The desired behavior: the agent does not search for context manually; the system serves the right context before it speaks.

Platform docs: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/

**Slack agentic workspace pattern:** Slack should stay a communication surface, not the brain. Build Hermes profiles as métier agents, use Slack app/DM/channel/thread surfaces for interaction, load scoped GBrain/Data OS context before responses, and enforce quick-by-default behavior. See `references/slack-agentic-workspace-pattern.md` for the Slack docs findings, memory mapping, guardrails, and setup sequence. When Slack next-gen/hosted agents are blocked, use the classic app + Socket Mode runbook in `references/slack-classic-app-socket-mode-setup.md`. For teams that need several visible business agents, create one classic Slack App per Hermes profile and use the multi-bot runbook in `references/slack-classic-multi-bot-workspace.md`. For VividFlow-specific executor bots (COO/CMO/CSM/Operations/R&D), use `references/vividflow-slack-executor-bots-runbook.md` for the exact profile names, role prompts, token/auth-copy steps, GBrain context injection, live-test pitfalls, Slack output standards, and CMO visual artifact handoff. For Jonathan’s visible Slack quality bar, use `references/vividflow-slack-quality-style.md`: COO does not copy-paste agent output, agents can escalate to COO with `<@U...>`, Slack never uses Telegram handles, natural replies beat diagnostic cards, natural missions beat “réponds humainement” reminders, and avoid decorative dash separators. For private VividFlow specialist channels and Slack scopes, use `references/vividflow-slack-private-channel-setup.md`: COO needs `groups:write` + `users:read`, channels are `cmo-visuels`, `csm-clients`, `ops-actions`, and `rd-signaux`. If CMO must create an image, use `references/vividflow-cmo-image-generation-loop.md`: CMO generates; COO retrieves/verifies/forwards. If agents should call COO for validation/blockers or asset handoff, use `references/vividflow-coo-quality-escalation.md`: agents mention `<@U0B7G67LM1T>`, COO audits/iterates, then remounts only the final/blocker to Telegram. If Slack specialist bots show `No home channel is set for Slack`, use `references/slack-specialist-home-channel-noise.md` before deciding whether to set a home channel. For live debugging after install (wrong `.env`, duplicate gateways, unauthorized Slack users, missing `files:read`/`groups:read`, DMs/events), use `references/slack-classic-app-socket-mode-troubleshooting.md`.

### Sessions

```
hermes sessions list        List recent sessions
hermes sessions browse      Interactive picker
hermes sessions export OUT  Export to JSONL
hermes sessions rename ID T Rename a session
hermes sessions delete ID   Delete a session
hermes sessions prune       Clean up old sessions (--older-than N days)
hermes sessions stats       Session store statistics
```

### Cron Jobs

```
hermes cron list            List jobs (--all for disabled)
hermes cron create SCHED    Create: '30m', 'every 2h', '0 9 * * *'
hermes cron edit ID         Edit schedule, prompt, delivery
hermes cron pause/resume ID Control job state
hermes cron run ID          Trigger on next tick
hermes cron remove ID       Delete a job
hermes cron status          Scheduler status
```

### Webhooks

```
hermes webhook subscribe N  Create route at /webhooks/<name>
hermes webhook list         List subscriptions
hermes webhook remove NAME  Remove a subscription
hermes webhook test NAME    Send a test POST
```

### Profiles

```
hermes profile list         List all profiles
hermes profile create NAME  Create (--clone, --clone-all, --clone-from)
hermes profile use NAME     Set sticky default
hermes profile delete NAME  Delete a profile
hermes profile show NAME    Show details
hermes profile alias NAME   Manage wrapper scripts
hermes profile rename A B   Rename a profile
hermes profile export NAME  Export to tar.gz
hermes profile import FILE  Import from archive
```

**Explaining profiles to users:** a profile is not a conversation and not a Telegram topic. It is a separate Hermes identity/config (own rules, tools, sessions, memory, model/timeouts, access). A conversation is just history; a Telegram topic is just a place to talk; a profile is the agent/persona that answers. Use the analogy: topic = room, conversation = what was said, profile = the specialist entering the room.

**Telegram routing guidance:** if a user says their Telegram topics are messy or everyone mixes contexts, do not recommend “just use more topics” as the main fix. Prefer `1 Telegram bot = 1 clear role = 1 Hermes profile` for strong boundaries (e.g. Cockpit bot for strategy/ops/mail/calendar/drive; Dev Fast bot for SaaS patching). Topics mapped to profiles are acceptable for lightweight separation, but separate bots are cleaner when mental/operational boundaries matter.

**Telegram bot ownership and group setup:** a bot's long-term owner is the Telegram account that creates it in BotFather. For principal/private bots, prefer the final owner creates the bot and shares the token securely; for dev/test bots, another operator can create a temporary bot and later swap tokens. Adding bots to a Telegram group/topic is not something another bot can do: a human group admin with “add members” rights must add them. For group reading beyond mentions/commands, tell the BotFather owner to run `/setprivacy` for each bot and choose `Disable`. Never paste bot tokens in a group; use DM/secure env only.

**Non-technical multi-agent onboarding sequence:** when guiding Rafaela or another beginner creating additional Telegram agents, configure the Hermes profile + Telegram token in the terminal before spending time adding/testing the bot in the group. Keep naming aligned to reduce confusion: if the Telegram username is `@rcf_flow_bot`, prefer a Hermes profile/alias like `rcf_flow_bot` instead of an abstract internal name like `life_flow`. Explain clearly: Telegram username = bot identity; Hermes profile = internal agent brain/config. One action per turn, and ask for screenshots rather than tokens.

### Credential Poolsowner creates the bot and shares the token securely; for dev/test bots, another operator can create a temporary bot and later swap tokens. Adding bots to a Telegram group/topic is not something another bot can do: a human group admin with “add members” rights must add them. For group reading beyond mentions/commands, tell the BotFather owner to run `/setprivacy` for each bot and choose `Disable`. Never paste bot tokens in a group; use DM/secure env only.

### Credential Pools

```
hermes auth add             Interactive credential wizard
hermes auth list [PROVIDER] List pooled credentials
hermes auth remove P INDEX  Remove by provider + index
hermes auth reset PROVIDER  Clear exhaustion status
```

### Other

```
hermes insights [--days N]  Usage analytics
hermes update               Update to latest version
hermes pairing list/approve/revoke  DM authorization
hermes plugins list/install/remove  Plugin management
hermes honcho setup/status  Honcho memory integration (requires honcho plugin)
hermes memory setup/status/off  Memory provider config
# Supermemory graph/UI/container details: see references/supermemory-graph-and-containers.md
# VividFlow Supermemory setup/doctrine: see references/vividflow-supermemory-setup.md
hermes completion bash|zsh  Shell completions
hermes acp                  ACP server (IDE integration)
hermes claw migrate         Migrate from OpenClaw
hermes uninstall            Uninstall Hermes
```

When auditing whether Hermes is causing provider billing spend, do not infer usage from keys alone. Check `hermes config`, raw provider/base_url/model, logs for `provider=...`, and cron jobs; see `references/provider-cost-attribution.md` for the exact cost-attribution checklist.

### Dashboard reuse / embedding

When another app must show the Hermes dashboard literally (same Sessions/Kanban/cards/icons/data), prefer a fullscreen iframe to the native Hermes web UI over porting JSX/CSS. Start/verify with `hermes dashboard` and `hermes dashboard --status`; see `references/dashboard-literal-embedding.md` for the wrapper pattern and verification checklist.

When Jonathan/Thomas asks to open Hermes WebUI from a VPS in a normal browser, use `references/hermes-webui-vps-exposure.md`: distinguish sandbox onboarding from the real profile, prefer the simplest reachable URL, avoid telling a user already inside `root@srv...#` to run the SSH tunnel there, avoid ad-hoc Python proxies that pass `/health` but break CSS/assets. For WebUI provider/API-key mismatches, first respect the requested provider: if the user is testing `openai-codex`, do not silently switch providers; use `references/hermes-webui-codex-oauth-provider.md` and `references/webui-openai-codex-oauth.md` to verify CLI OAuth, patch WebUI OAuth detection, test direct `AIAgent` initialization in core, force the freshest OAuth credential when stale tokens remain in `auth.json`, remove stale `.env` token injections, bypass token-consuming WebUI pre-chat paths (`api/streaming.py` resolver and `/api/models/live` Codex discovery), then test WebUI-only before considering a fallback provider.

### Hermes WebUI remote access support

When helping a non-technical user open Hermes WebUI from a remote VPS, keep the distinction strict: URLs open in a browser, SSH tunnel commands run on the user’s local machine, not inside the VPS shell. If the user sees a prompt like `root@server:~#`, they are on the VPS; typing `http://127.0.0.1:8789` there will fail because it is not a shell command, and running `ssh -N -L 8789:127.0.0.1:8789 root@server` there may conflict with the WebUI port already bound on the VPS. First verify WebUI locally with `curl http://127.0.0.1:8789/health` on the VPS, then tell Windows users to open PowerShell (`PS C:\Users\...>`) and run `ssh -N -L 8789:127.0.0.1:8789 root@<vps-ip>`. If the hostname (e.g. `srv1601285`) does not resolve from Windows, get the VPS public IP with `curl -4 ifconfig.me` on the VPS and use `root@<ip>`. If local Windows port 8789 is busy, map another local port: `ssh -N -L 8790:127.0.0.1:8789 root@<vps-ip>` then open `http://127.0.0.1:8790` in Chrome/Edge.

When a custom SaaS dashboard must show Hermes operational state — skills inventory, real crons/heartbeats, gateway activity/logs by Telegram topic — use sanitized runtime files instead of hardcoded placeholders. Read `$HERMES_HOME/skills`, `$HERMES_HOME/hermes-agent/skills`, `$HERMES_HOME/cron/jobs.json`, and `$HERMES_HOME/logs/gateway.log` from a dynamic Node/API route with a static snapshot fallback; see `references/runtime-dashboard-data.md`.

When Jonathan/Thomas needs quick browser access to Hermes WebUI from Windows/Mac and SSH tunneling is confusing or failing, use `references/hermes-webui-quick-browser-access.md`: verify local `/health`, prefer named Cloudflare Tunnel for stable protected access, use trycloudflare only as a temporary quick test, and if Windows hits `ERR_SSL_PROTOCOL_ERROR`, stop looping on random tunnel URLs and switch to named Cloudflare or a short-lived direct HTTP fallback with explicit risk.

When exposing the live dashboard through public tunnels and WebSockets are unstable, do not default to cross-domain iframe fallback. Prefer a local reverse proxy that keeps HTTP on the vanity tunnel and rewrites only WebSocket URLs to a stable fallback tunnel; see `references/tracker-public-tunnel-proxy.md` for the proxy pattern, branding hot-patches without forking Hermes, watchdog public-health checks, verification checklist, and pitfalls.

When Jonathan/Thomas needs quick browser access to Hermes WebUI from a VPS, prefer a Cloudflare quick tunnel over SSH forwarding if the operator is confused by Windows/PowerShell vs VPS shell boundaries. Verify `GET /health`, not `HEAD`, and if Windows Chrome reports `ERR_SSL_PROTOCOL_ERROR` on a `trycloudflare.com` URL while server-side checks pass, restart `cloudflared` with `--protocol http2`. See `references/hermes-webui-public-access.md`.

When Jonathan/Thomas asks to open Hermes WebUI from the internet, first verify the local WebUI health endpoint (`/health`) and active process, then expose that live VPS service rather than redeploying the app to Vercel. Hermes WebUI depends on the VPS runtime/state (`HERMES_HOME`, sessions, tools, gateway access), so Vercel is only appropriate as a static doorway/iframe/proxy, not as the real long-running WebUI backend. Prefer a named Cloudflare Tunnel + DNS hostname + Cloudflare Access/password for durable internet access; a temporary `cloudflared tunnel --url ...` URL is acceptable only if the public `trycloudflare.com` URL is captured and HTTP-verified. Do not leave an unverified quick tunnel running or hand over an unverified URL.

If WebUI chat says an OAuth provider such as `openai-codex` has no API key while the same provider works in CLI, do not silently switch provider/model. Re-authenticate if needed, then fix/check the WebUI OAuth readiness path so it accepts `$HERMES_HOME/auth.json` / credential-pool OAuth entries. See `references/hermes-webui-oauth-provider-check.md`.

### Hermes as a SaaS engineering OS

When configuring Hermes to build scalable SaaS products, treat it as an engineering operating system rather than a single code generator: repo governance files, specialized subagents, independent review, CI/CD gates, and reusable skills. See `references/saas-engineering-os.md` for the Next.js/Convex/Clerk/Vercel-oriented blueprint.

### Hermes Workspace tracker / control plane

When auditing or extending `outsourc-e/hermes-workspace` as a tracker, avoid treating it like a generic Trello clone. Model it as an agent execution control plane: task → assigned profile/session → checkpoint → artifacts/tests → review gate → PR/preview → done. See `references/hermes-workspace-tracker-control-plane.md` for repo paths, existing task surfaces, route pitfalls, and high-value feature priorities.

---

## Slash Commands (In-Session)

Type these during an interactive chat session. New commands land fairly
often; if something below looks stale, run `/help` in-session for the
authoritative list or see the [live slash commands reference](https://hermes-agent.nousresearch.com/docs/reference/slash-commands).
The registry of record is `hermes_cli/commands.py` — every consumer
(autocomplete, Telegram menu, Slack mapping, `/help`) derives from it.

### Session Control
```
/new (/reset)        Fresh session
/clear               Clear screen + new session (CLI)
/retry               Resend last message
/undo                Remove last exchange
/title [name]        Name the session
/compress            Manually compress context
/stop                Kill background processes
/rollback [N]        Restore filesystem checkpoint
/snapshot [sub]      Create or restore state snapshots of Hermes config/state (CLI)
/background <prompt> Run prompt in background
/queue <prompt>      Queue for next turn
/steer <prompt>      Inject a message after the next tool call without interrupting
/agents (/tasks)     Show active agents and running tasks
/resume [name]       Resume a named session
/goal [text|sub]     Set a standing goal Hermes works on across turns until achieved
                     (subcommands: status, pause, resume, clear)
/redraw              Force a full UI repaint (CLI)
```

### Configuration
```
/config              Show config (CLI)
/model [name]        Show or change model
/personality [name]  Set personality
/reasoning [level]   Set reasoning (none|minimal|low|medium|high|xhigh|show|hide)
/verbose             Cycle: off → new → all → verbose
/voice [on|off|tts]  Voice mode
/yolo                Toggle approval bypass
/busy [sub]          Control what Enter does while Hermes is working (CLI)
                     (subcommands: queue, steer, interrupt, status)
/indicator [style]   Pick the TUI busy-indicator style (CLI)
                     (styles: kaomoji, emoji, unicode, ascii)
/footer [on|off]     Toggle gateway runtime-metadata footer on final replies
/skin [name]         Change theme (CLI)
/statusbar           Toggle status bar (CLI)
```

### Tools & Skills
```
/tools               Manage tools (CLI)
/toolsets            List toolsets (CLI)
/skills              Search/install skills (CLI)
/skill <name>        Load a skill into session
/reload-skills       Re-scan ~/.hermes/skills/ for added/removed skills
/reload              Reload .env variables into the running session (CLI)
/reload-mcp          Reload MCP servers
/cron                Manage cron jobs (CLI)
/curator [sub]       Background skill maintenance (status, run, pin, archive, …)
/kanban [sub]        Multi-profile collaboration board (tasks, links, comments)
/plugins             List plugins (CLI)
```

### Gateway
```
/approve             Approve a pending command (gateway)
/deny                Deny a pending command (gateway)
/restart             Restart gateway (gateway)
/sethome             Set current chat as home channel (gateway)
/update              Update Hermes to latest (gateway)
/topic [sub]         Enable or inspect Telegram DM topic sessions (gateway)
/platforms (/gateway) Show platform connection status (gateway)
```

### Utility
```
/branch (/fork)      Branch the current session
/fast                Toggle priority/fast processing
/browser             Open CDP browser connection
/history             Show conversation history (CLI)
/save                Save conversation to file (CLI)
/copy [N]            Copy the last assistant response to clipboard (CLI)
/paste               Attach clipboard image (CLI)
/image               Attach local image file (CLI)
```

### Info
```
/help                Show commands
/commands [page]     Browse all commands (gateway)
/usage               Token usage
/insights [days]     Usage analytics
/gquota              Show Google Gemini Code Assist quota usage (CLI)
/status              Session info (gateway)
/profile             Active profile info
/debug               Upload debug report (system info + logs) and get shareable links
```

### Exit
```
/quit (/exit, /q)    Exit CLI
```

---

## Key Paths & Config

```
~/.hermes/config.yaml       Main configuration
~/.hermes/.env              API keys and secrets
$HERMES_HOME/skills/        Installed skills
~/.hermes/sessions/         Session transcripts
~/.hermes/logs/             Gateway and error logs
~/.hermes/auth.json         OAuth tokens and credential pools
~/.hermes/hermes-agent/     Source code (if git-installed)
```

Profiles use `~/.hermes/profiles/<name>/` with the same layout.

### Config Sections

Edit with `hermes config edit` or `hermes config set section.key value`.

| Section | Key options |
|---------|-------------|
| `model` | `default`, `provider`, `base_url`, `api_key`, `context_length` |
| `agent` | `max_turns` (90), `tool_use_enforcement` |
| `terminal` | `backend` (local/docker/ssh/modal), `cwd`, `timeout` (180) |
| `compression` | `enabled`, `threshold` (0.50), `target_ratio` (0.20) |
| `display` | `skin`, `tool_progress`, `show_reasoning`, `show_cost` |
| `stt` | `enabled`, `provider` (local/groq/openai/mistral) |
| `tts` | `provider` (edge/elevenlabs/openai/minimax/mistral/neutts) |
| `memory` | `memory_enabled`, `user_profile_enabled`, `provider` |
| `security` | `tirith_enabled`, `website_blocklist` |
| `delegation` | `model`, `provider`, `base_url`, `api_key`, `max_iterations` (50), `reasoning_effort` |
| `checkpoints` | `enabled`, `max_snapshots` (50) |

Full config reference: https://hermes-agent.nousresearch.com/docs/user-guide/configuration

### Providers

20+ providers supported. Set via `hermes model` or `hermes setup`.

| Provider | Auth | Key env var |
|----------|------|-------------|
| OpenRouter | API key | `OPENROUTER_API_KEY` |
| Anthropic | API key | `ANTHROPIC_API_KEY` |
| Nous Portal | OAuth | `hermes auth` |
| OpenAI Codex | OAuth | `hermes auth` |
| GitHub Copilot | Token | `COPILOT_GITHUB_TOKEN` |
| Google Gemini | API key | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |
| DeepSeek | API key | `DEEPSEEK_API_KEY` |
| xAI / Grok | API key | `XAI_API_KEY` |
| Hugging Face | Token | `HF_TOKEN` |
| Z.AI / GLM | API key | `GLM_API_KEY` |
| MiniMax | API key | `MINIMAX_API_KEY` |
| MiniMax CN | API key | `MINIMAX_CN_API_KEY` |
| Kimi / Moonshot | API key | `KIMI_API_KEY` |
| Alibaba / DashScope | API key | `DASHSCOPE_API_KEY` |
| Xiaomi MiMo | API key | `XIAOMI_API_KEY` |
| Kilo Code | API key | `KILOCODE_API_KEY` |
| AI Gateway (Vercel) | API key | `AI_GATEWAY_API_KEY` |
| OpenCode Zen | API key | `OPENCODE_ZEN_API_KEY` |
| OpenCode Go | API key | `OPENCODE_GO_API_KEY` |
| Qwen OAuth | OAuth | `hermes login --provider qwen-oauth` |
| Custom endpoint | Config | `model.base_url` + `model.api_key` in config.yaml |
| GitHub Copilot ACP | External | `COPILOT_CLI_PATH` or Copilot CLI |

Full provider docs: https://hermes-agent.nousresearch.com/docs/integrations/providers

### Nous / RMS key confusion

When a user has a Nous/RMS key but `hermes setup` never asks for it, do not assume setup is broken. Hermes may route Nous through OAuth (`hermes login --provider nous` or `hermes model`) rather than a pasted key prompt. For a manual API key, place it in the active profile's env file, not necessarily global `~/.hermes/.env`:

```bash
hermes config path
hermes config env-path
nano $(hermes config env-path)
# add:
NOUS_API_KEY=...
hermes gateway restart   # if configuring a messaging bot/profile
```

Always verify the active profile first; Telegram/Slack gateways often run under `~/.hermes/profiles/<profile>/`, so keys added to the global env may be invisible.

### Toolsets

Enable/disable via `hermes tools` (interactive) or `hermes tools enable/disable NAME`.

| Toolset | What it provides |
|---------|-----------------|
| `web` | Web search and content extraction |
| `search` | Web search only (subset of `web`) |
| `browser` | Browser automation (Browserbase, Camofox, or local Chromium) |
| `terminal` | Shell commands and process management |
| `file` | File read/write/search/patch |
| `code_execution` | Sandboxed Python execution |
| `vision` | Image analysis |
| `image_gen` | AI image generation |
| `video` | Video analysis and generation |
| `tts` | Text-to-speech |
| `skills` | Skill browsing and management |
| `memory` | Persistent cross-session memory |
| `session_search` | Search past conversations |
| `delegation` | Subagent task delegation |
| `cronjob` | Scheduled task management |
| `clarify` | Ask user clarifying questions |
| `messaging` | Cross-platform message sending |
| `todo` | In-session task planning and tracking |
| `kanban` | Multi-agent work-queue tools (gated to workers) |
| `debugging` | Extra introspection/debug tools (off by default) |
| `safe` | Minimal, low-risk toolset for locked-down sessions |
| `spotify` | Spotify playback and playlist control |
| `homeassistant` | Smart home control (off by default) |
| `discord` | Discord integration tools |
| `discord_admin` | Discord admin/moderation tools |
| `feishu_doc` | Feishu (Lark) document tools |
| `feishu_drive` | Feishu (Lark) drive tools |
| `yuanbao` | Yuanbao integration tools |
| `rl` | Reinforcement learning tools (off by default) |
| `moa` | Mixture of Agents (off by default) |

Full enumeration lives in `toolsets.py` as the `TOOLSETS` dict; `_HERMES_CORE_TOOLS` is the default bundle most platforms inherit from.

Tool changes take effect on `/reset` (new session). They do NOT apply mid-conversation to preserve prompt caching.

---

## Security & Privacy Toggles

Common "why is Hermes doing X to my output / tool calls / commands?" toggles — and the exact commands to change them. Most of these need a fresh session (`/reset` in chat, or start a new `hermes` invocation) because they're read once at startup.

### Secret redaction in tool output

Secret redaction is **off by default** — tool output (terminal stdout, `read_file`, web content, subagent summaries, etc.) passes through unmodified. If the user wants Hermes to auto-mask strings that look like API keys, tokens, and secrets before they enter the conversation context and logs:

```bash
hermes config set security.redact_secrets true       # enable globally
```

**Restart required.** `security.redact_secrets` is snapshotted at import time — toggling it mid-session (e.g. via `export HERMES_REDACT_SECRETS=true` from a tool call) will NOT take effect for the running process. Tell the user to run `hermes config set security.redact_secrets true` in a terminal, then start a new session. This is deliberate — it prevents an LLM from flipping the toggle on itself mid-task.

Disable again with:
```bash
hermes config set security.redact_secrets false
```

### PII redaction in gateway messages

Separate from secret redaction. When enabled, the gateway hashes user IDs and strips phone numbers from the session context before it reaches the model:

```bash
hermes config set privacy.redact_pii true    # enable
hermes config set privacy.redact_pii false   # disable (default)
```

### Command approval prompts

By default (`approvals.mode: manual`), Hermes prompts the user before running shell commands flagged as destructive (`rm -rf`, `git reset --hard`, etc.). The modes are:

- `manual` — always prompt (default)
- `smart` — use an auxiliary LLM to auto-approve low-risk commands, prompt on high-risk
- `off` — skip all approval prompts (equivalent to `--yolo`)

```bash
hermes config set approvals.mode smart       # recommended middle ground
hermes config set approvals.mode off         # bypass everything (not recommended)
```

Per-invocation bypass without changing config:
- `hermes --yolo …`
- `export HERMES_YOLO_MODE=1`

Note: YOLO / `approvals.mode: off` does NOT turn off secret redaction. They are independent.

### Shell hooks allowlist

Some shell-hook integrations require explicit allowlisting before they fire. Managed via `~/.hermes/shell-hooks-allowlist.json` — prompted interactively the first time a hook wants to run.

### Disabling the web/browser/image-gen tools

To keep the model away from network or media tools entirely, open `hermes tools` and toggle per-platform. Takes effect on next session (`/reset`). See the Tools & Skills section above.

---

## Voice & Transcription

### STT (Voice → Text)

Voice messages from messaging platforms are auto-transcribed.

Provider priority (auto-detected):
1. **Local faster-whisper** — free, no API key: `pip install faster-whisper`
2. **Groq Whisper** — free tier: set `GROQ_API_KEY`
3. **OpenAI Whisper** — paid: set `VOICE_TOOLS_OPENAI_KEY`
4. **Mistral Voxtral** — set `MISTRAL_API_KEY`

Config:
```yaml
stt:
  enabled: true
  provider: local        # local, groq, openai, mistral
  local:
    model: base          # tiny, base, small, medium, large-v3
    language: fr         # force French; leave blank/omit for auto-detect
```

Gateway note: after installing STT deps or changing `stt.*`, restart the gateway (`/restart` or `hermes gateway restart`) before expecting Telegram/voice messages to use the new config. If French voice notes are transcribed in English, set `stt.local.language fr` explicitly; auto-detection can misclassify short/noisy/technical French clips.

### TTS (Text → Voice)

| Provider | Env var | Free? |
|----------|---------|-------|
| Edge TTS | None | Yes (default) |
| ElevenLabs | `ELEVENLABS_API_KEY` | Free tier |
| OpenAI | `VOICE_TOOLS_OPENAI_KEY` | Paid |
| MiniMax | `MINIMAX_API_KEY` | Paid |
| Mistral (Voxtral) | `MISTRAL_API_KEY` | Paid |
| NeuTTS (local) | None (`pip install neutts[all]` + `espeak-ng`) | Free |

Voice commands: `/voice on` (voice-to-voice), `/voice tts` (always voice), `/voice off`.

---

## Spawning Additional Hermes Instances

Run additional Hermes processes as fully independent subprocesses — separate sessions, tools, and environments.

### When to Use This vs delegate_task

| | `delegate_task` | Spawning `hermes` process |
|-|-----------------|--------------------------|
| Isolation | Separate conversation, shared process | Fully independent process |
| Duration | Minutes (bounded by parent loop) | Hours/days |
| Tool access | Subset of parent's tools | Full tool access |
| Interactive | No | Yes (PTY mode) |
| Use case | Quick parallel subtasks | Long autonomous missions |

### One-Shot Mode

```
terminal(command="hermes chat -q 'Research GRPO papers and write summary to ~/research/grpo.md'", timeout=300)

# Background for long tasks:
terminal(command="hermes chat -q 'Set up CI/CD for ~/myapp'", background=true)
```

### Interactive PTY Mode (via tmux)

Hermes uses prompt_toolkit, which requires a real terminal. Use tmux for interactive spawning:

```
# Start
terminal(command="tmux new-session -d -s agent1 -x 120 -y 40 'hermes'", timeout=10)

# Wait for startup, then send a message
terminal(command="sleep 8 && tmux send-keys -t agent1 'Build a FastAPI auth service' Enter", timeout=15)

# Read output
terminal(command="sleep 20 && tmux capture-pane -t agent1 -p", timeout=5)

# Send follow-up
terminal(command="tmux send-keys -t agent1 'Add rate limiting middleware' Enter", timeout=5)

# Exit
terminal(command="tmux send-keys -t agent1 '/exit' Enter && sleep 2 && tmux kill-session -t agent1", timeout=10)
```

### Multi-Agent Coordination

```
# Agent A: backend
terminal(command="tmux new-session -d -s backend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t backend 'Build REST API for user management' Enter", timeout=15)

# Agent B: frontend
terminal(command="tmux new-session -d -s frontend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t frontend 'Build React dashboard for user management' Enter", timeout=15)

# Check progress, relay context between them
terminal(command="tmux capture-pane -t backend -p | tail -30", timeout=5)
terminal(command="tmux send-keys -t frontend 'Here is the API schema from the backend agent: ...' Enter", timeout=5)
```

### Session Resume

```
# Resume most recent session
terminal(command="tmux new-session -d -s resumed 'hermes --continue'", timeout=10)

# Resume specific session
terminal(command="tmux new-session -d -s resumed 'hermes --resume 20260225_143052_a1b2c3'", timeout=10)
```

### Tips

- **Prefer `delegate_task` for quick subtasks** — less overhead than spawning a full process
- **Use `-w` (worktree mode)** when spawning agents that edit code — prevents git conflicts
- **Set timeouts** for one-shot mode — complex tasks can take 5-10 minutes
- **Use `hermes chat -q` for fire-and-forget** — no PTY needed
- **Use tmux for interactive sessions** — raw PTY mode has `\r` vs `\n` issues with prompt_toolkit
- **For scheduled tasks**, use the `cronjob` tool instead of spawning — handles delivery and retry

---

## Durable & Background Systems

Four systems run alongside the main conversation loop. Quick reference
here; full developer notes live in `AGENTS.md`, user-facing docs under
`website/docs/user-guide/features/`.

### Delegation (`delegate_task`)

Synchronous subagent spawn — the parent waits for the child's summary
before continuing its own loop. Isolated context + terminal session.

- **Single:** `delegate_task(goal, context, toolsets)`.
- **Batch:** `delegate_task(tasks=[{goal, ...}, ...])` runs children in
  parallel, capped by `delegation.max_concurrent_children` (default 3).
- **Roles:** `leaf` (default; cannot re-delegate) vs `orchestrator`
  (can spawn its own workers, bounded by `delegation.max_spawn_depth`).
- **Not durable.** If the parent is interrupted, the child is
  cancelled. For work that must outlive the turn, use `cronjob` or
  `terminal(background=True, notify_on_complete=True)`.

Config: `delegation.*` in `config.yaml`.

### Cron (scheduled jobs)

Durable scheduler — `cron/jobs.py` + `cron/scheduler.py`. Drive it via
the `cronjob` tool, the `hermes cron` CLI (`list`, `add`, `edit`,
`pause`, `resume`, `run`, `remove`), or the `/cron` slash command.

- **Schedules:** duration (`"30m"`, `"2h"`), "every" phrase
  (`"every monday 9am"`), 5-field cron (`"0 9 * * *"`), or ISO timestamp.
- **Script paths:** for `script` / `no_agent=True`, place scripts in `~/.hermes/scripts/` and pass only the relative filename (e.g. `brvndlab_instagram_pilot.sh`), not an absolute or `~/...` path.
- **Script-only reminders/capture jobs:** for lightweight recurring actions that should stay silent when nothing is due (calendar reminders, watchdogs, message capture into raw files), prefer `no_agent=True` + `deliver=local`; the script should do its own idempotency/dedup logging instead of spawning an agent every tick. Do not make the script print `[SILENT]` and then route through an agent — cron may record that as a failure path. Instead, make the script produce empty/no-op output or a local log-only line when there is nothing new.
- **Per-job knobs:** `skills`, `model`/`provider` override, `script`
  (pre-run data collection; `no_agent=True` makes the script the whole
  job), `context_from` (chain job A's output into job B), `workdir`
  (run in a specific dir with its `AGENTS.md` / `CLAUDE.md` loaded),
  multi-platform delivery.
- **Invariants:** 3-minute hard interrupt per run, `.tick.lock` file
  prevents duplicate ticks across processes, cron sessions pass
  `skip_memory=True` by default, and cron deliveries are framed with a
  header/footer instead of being mirrored into the target gateway
  session (keeps role alternation intact).

User docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron

### Curator (skill lifecycle)

Background maintenance for agent-created skills. Tracks usage, marks
idle skills stale, archives stale ones, keeps a pre-run tar.gz backup
so nothing is lost.

- **CLI:** `hermes curator <verb>` — `status`, `run`, `pause`, `resume`,
  `pin`, `unpin`, `archive`, `restore`, `prune`, `backup`, `rollback`.
- **Slash:** `/curator <subcommand>` mirrors the CLI.
- **Scope:** only touches skills with `created_by: "agent"` provenance.
  Bundled + hub-installed skills are off-limits. **Never deletes** —
  max destructive action is archive. Pinned skills are exempt from
  every auto-transition and every LLM review pass.
- **Telemetry:** sidecar at `~/.hermes/skills/.usage.json` holds
  per-skill `use_count`, `view_count`, `patch_count`,
  `last_activity_at`, `state`, `pinned`.

Config: `curator.*` (`enabled`, `interval_hours`, `min_idle_hours`,
`stale_after_days`, `archive_after_days`, `backup.*`).
User docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/curator

### Kanban (multi-agent work queue)

Durable SQLite board for multi-profile / multi-worker collaboration.
Users drive it via `hermes kanban <verb>`; dispatcher-spawned workers
see a focused `kanban_*` toolset gated by `HERMES_KANBAN_TASK` so the
schema footprint is zero outside worker processes.

- **CLI verbs (common):** `init`, `create`, `list` (alias `ls`),
  `show`, `assign`, `link`, `unlink`, `comment`, `complete`, `block`,
  `unblock`, `archive`, `tail`. Less common: `watch`, `stats`, `runs`,
  `log`, `dispatch`, `daemon`, `gc`.
- **Worker toolset:** `kanban_show`, `kanban_complete`, `kanban_block`,
  `kanban_heartbeat`, `kanban_comment`, `kanban_create`, `kanban_link`.
- **Dispatcher** runs inside the gateway by default
  (`kanban.dispatch_in_gateway: true`) — reclaims stale claims,
  promotes ready tasks, atomically claims, spawns assigned profiles.
  Auto-blocks a task after ~5 consecutive spawn failures.
- **Isolation:** board is the hard boundary (workers get
  `HERMES_KANBAN_BOARD` pinned in env); tenant is a soft namespace
  within a board for workspace-path + memory-key isolation.

User docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban

---

## Windows-Specific Quirks

Hermes runs natively on Windows (PowerShell, cmd, Windows Terminal, git-bash
mintty, VS Code integrated terminal). Most of it just works, but a handful
of differences between Win32 and POSIX have bitten us — document new ones
here as you hit them so the next person (or the next session) doesn't
rediscover them from scratch.

### Input / Keybindings

**Alt+Enter doesn't insert a newline.** Windows Terminal intercepts Alt+Enter
at the terminal layer to toggle fullscreen — the keystroke never reaches
prompt_toolkit. Use **Ctrl+Enter** instead. Windows Terminal delivers
Ctrl+Enter as LF (`c-j`), distinct from plain Enter (`c-m` / CR), and the
CLI binds `c-j` to newline insertion on `win32` only (see
`_bind_prompt_submit_keys` + the Windows-only `c-j` binding in `cli.py`).
Side effect: the raw Ctrl+J keystroke also inserts a newline on Windows —
unavoidable, because Windows Terminal collapses Ctrl+Enter and Ctrl+J to
the same keycode at the Win32 console API layer. No conflicting binding
existed for Ctrl+J on Windows, so this is a harmless side effect.

mintty / git-bash behaves the same (fullscreen on Alt+Enter) unless you
disable Alt+Fn shortcuts in Options → Keys. Easier to just use Ctrl+Enter.

**Diagnosing keybindings.** Run `python scripts/keystroke_diagnostic.py`
(repo root) to see exactly how prompt_toolkit identifies each keystroke
in the current terminal. Answers questions like "does Shift+Enter come
through as a distinct key?" (almost never — most terminals collapse it
to plain Enter) or "what byte sequence is my terminal sending for
Ctrl+Enter?" This is how the Ctrl+Enter = c-j fact was established.

### Config / Files

**HTTP 400 "No models provided" on first run.** `config.yaml` was saved
with a UTF-8 BOM (common when Windows apps write it). Re-save as UTF-8
without BOM. `hermes config edit` writes without BOM; manual edits in
Notepad are the usual culprit.

### `execute_code` / Sandbox

**WinError 10106** ("The requested service provider could not be loaded
or initialized") from the sandbox child process — it can't create an
`AF_INET` socket, so the loopback-TCP RPC fallback fails before
`connect()`. Root cause is usually **not** a broken Winsock LSP; it's
Hermes's own env scrubber dropping `SYSTEMROOT` / `WINDIR` / `COMSPEC`
from the child env. Python's `socket` module needs `SYSTEMROOT` to locate
`mswsock.dll`. Fixed via the `_WINDOWS_ESSENTIAL_ENV_VARS` allowlist in
`tools/code_execution_tool.py`. If you still hit it, echo `os.environ`
inside an `execute_code` block to confirm `SYSTEMROOT` is set. Full
diagnostic recipe in `references/execute-code-sandbox-env-windows.md`.

### Testing / Contributing

**`scripts/run_tests.sh` doesn't work as-is on Windows** — it looks for
POSIX venv layouts (`.venv/bin/activate`). The Hermes-installed venv at
`venv/Scripts/` has no pip or pytest either (stripped for install size).
Workaround: install `pytest + pytest-xdist + pyyaml` into a system Python
3.11 user site, then invoke pytest directly with `PYTHONPATH` set:

```bash
"/c/Program Files/Python311/python" -m pip install --user pytest pytest-xdist pyyaml
export PYTHONPATH="$(pwd)"
"/c/Program Files/Python311/python" -m pytest tests/foo/test_bar.py -v --tb=short -n 0
```

Use `-n 0`, not `-n 4` — `pyproject.toml`'s default `addopts` already
includes `-n`, and the wrapper's CI-parity guarantees don't apply off POSIX.

**POSIX-only tests need skip guards.** Common markers already in the codebase:
- Symlinks — elevated privileges on Windows
- `0o600` file modes — POSIX mode bits not enforced on NTFS by default
- `signal.SIGALRM` — Unix-only (see `tests/conftest.py::_enforce_test_timeout`)
- Winsock / Windows-specific regressions — `@pytest.mark.skipif(sys.platform != "win32", ...)`

Use the existing skip-pattern style (`sys.platform == "win32"` or
`sys.platform.startswith("win")`) to stay consistent with the rest of the
suite.

### Path / Filesystem

**Line endings.** Git may warn `LF will be replaced by CRLF the next time
Git touches it`. Cosmetic — the repo's `.gitattributes` normalizes. Don't
let editors auto-convert committed POSIX-newline files to CRLF.

**Forward slashes work almost everywhere.** `C:/Users/...` is accepted by
every Hermes tool and most Windows APIs. Prefer forward slashes in code
and logs — avoids shell-escaping backslashes in bash.

---

## Troubleshooting

### Voice not working
1. Check `stt.enabled: true` in config.yaml
2. Verify provider: `pip install faster-whisper` or set API key
3. In gateway: `/restart`. In CLI: exit and relaunch.

### Tool not available
1. `hermes tools` — check if toolset is enabled for your platform
2. Some tools need env vars (check `.env`)
3. `/reset` after enabling tools

### Tool-calling iteration limit hit
If a gateway/Telegram turn stops with `You've reached the maximum number of tool-calling iterations allowed`, distinguish it from an app/browser failure. It is the agent loop limit for that turn. For the active profile, increase moderately and restart the gateway:

```bash
hermes --profile chief_of_staff config set agent.max_turns 150
hermes --profile chief_of_staff gateway restart
```

Prefer 150–200 max; for long browser audits, also split into focused passes (e.g. Tâches, Activités, Base de connaissance) instead of one oversized run.

### Model/provider issues
1. `hermes doctor` — check config and dependencies
2. `hermes login` — re-authenticate OAuth providers
3. Check `.env` has the right API key
4. **Copilot 403**: `gh auth login` tokens do NOT work for Copilot API. You must use the Copilot-specific OAuth device code flow via `hermes model` → GitHub Copilot.

### Changes not taking effect
- **Tools/skills:** `/reset` starts a new session with updated toolset
- **Config changes:** In gateway: `/restart`. In CLI: exit and relaunch.
- **Code changes:** Restart the CLI or gateway process

### Skills not showing
1. `hermes skills list` — verify installed
2. `hermes skills config` — check platform enablement
3. Load explicitly: `/skill name` or `hermes -s name`

If the user worries that Hermes/Codex/OpenRouter/Anthropic is charging unexpectedly, first separate active provider, configured keys, crons/subagents, and historical sessions before attributing spend. Use `references/provider-cost-attribution.md` for the audit sequence and response shape.

### Gateway issues
Check logs first:
```bash
grep -i "failed to send\|error" ~/.hermes/logs/gateway.log | tail -20
```

**WhatsApp outbound requests:** when Jonathan asks to send a WhatsApp message, do not just explain the setup. First check available messaging targets/status. If WhatsApp is not configured, set up the Baileys bridge immediately: install `scripts/whatsapp-bridge` deps if needed, start `node bridge.js --pair-only --session ~/.hermes/platforms/whatsapp/session` in a PTY/background process, surface the current QR, and poll until paired. After pairing, restart/verify the gateway, confirm the WhatsApp target exists, then send via the messaging tool. If content or recipient phone is missing, ask only for that missing item. Do not claim the message was sent until the send tool/bridge confirms delivery.

Common gateway problems:
- **New Telegram group silent even when BotFather privacy mode is disabled**: do not stop at `/setprivacy`. First list visible messaging targets, then inspect the active profile `config.yaml` for `telegram.allowed_chats`, `free_response_chats`, and `free_response_threads`. If `allowed_chats` contains only existing group IDs, the new group will be ignored until its chat ID is added. Ask the user to send `@<bot_handle> test` in the new group, then recover the group/chat ID from gateway logs and add it to `allowed_chats`; restart the gateway before retesting. Privacy disabled means Telegram can deliver group messages, not that Hermes will accept every group.
- **Lifecycle/debug status messages leaking into Telegram**: if users see messages like `⚠️ Empty response from model — retrying` or `Model returned empty after tool calls`, inspect `run_agent.py::_emit_status` and `gateway/run.py` status_callback plumbing. These are diagnostic lifecycle statuses and should stay in logs/CLI, not be posted to chat. Patch `_emit_status` to avoid gateway status callbacks for lifecycle noise; keep truly user-visible degraded-path notices on `_emit_warning` only.
- **Auto-resume system notes leaking into Telegram**: if users see raw `[System note: Your previous turn ... gateway shutdown/restart ...]`, keep the recovery instruction internal. Do not prepend it to the user message; pass it as `system_message` to `agent.run_conversation(...)` while preserving the clean user text. See `references/gateway-auto-resume-system-note-leak.md`.
- **Gateway cleanup / tunnel spam / stale helpers**: when Telegram gets repeated background-process watch notifications or gateway memory is inflated, inspect service + child processes first; kill stale `localtunnel`/`localhost.run`/`cloudflared` helpers, stale `tui_gateway.slash_worker` processes, and one-off tmux sessions; archive noisy logs before truncating; verify routes before restarting. See `references/gateway-cleanup-runbook.md`.
- **Telegram direct-message routing to group members**: `send_message(action='list')` may only show groups/topics, not every group member DM. If asked to message a member directly, inspect gateway logs for the member's Telegram user id (look for inbound lines and unauthorized warnings like `Unauthorized user: <id> (Name)`), then try `telegram:<user_id>`. If Telegram returns `Forbidden: bot can't initiate conversation with a user`, the bot cannot open a new DM; immediately fall back to mentioning the user in the relevant group/topic with `[Name](tg://user?id=<user_id>)` and keep the message minimal. Do not stop after listing targets if a viable fallback exists.
- **Telegram forum topic privacy**: Telegram Bot API cannot hide one forum topic from a specific group member. For visual privacy, use a DM/private group or change whole-group membership/permissions. Hermes can still enforce agent-level privacy with a hard allowlist keyed by `chat_id + message_thread_id + sender user_id`; make that check run before global allow-all/allowlists. See `references/telegram-thread-access-control.md`.
- **Deleting Telegram forum topics is destructive**: before `deleteForumTopic`, verify the exact `chat_id:message_thread_id` from logs/config/channel directory and confirm it is not another operational topic. Deleted topics may not be reopenable (`TOPIC_ID_INVALID`); recovery means creating a replacement topic, updating `channel_directory.json`/role prompts, and reconstructing context from session logs. See `references/telegram-topic-deletion-and-recovery.md`.
- **Telegram topic continuity / messages landing in General**: when a user says a topic lost history or a message sent “to a topic” appears in General, inspect gateway logs for `agent:<profile>:telegram:group:<chat_id>:<thread_id>` before answering. `thread_id=1` is Telegram forum General; non-General topics show their own IDs (e.g. `762`, `1021`). If logs show incoming messages now on `:1`, Hermes is receiving General already — likely the user navigated/replied from General, the topic was deleted/recreated, or the topic ID changed. Do not treat this as a normal session reset; recover project context with `session_search`, ask for/send a test message in the intended topic, then map/lock the new `chat_id:thread_id` explicitly. Avoid promising continuity without verifying the live thread ID.
- **Telegram multi-agent topic routing**: default to strict mention-only specialists. `free_response_threads` is an opt-in bypass that makes an agent answer normal messages in a topic; if the user says agents are “inside the conversation” or replying unexpectedly, audit/clear `free_response_threads` and `free_response_chats` across specialist profiles before tweaking prompts. Use exact handles/role names in `mention_patterns`; avoid broad words like `tout`, `tous`, `vous`, `l’équipe`, or “quelqu’un”. See `references/telegram-multi-agent-topic-routing.md`.
- **Hostinger VPS login shows warnings / Hermes not found as root**: distinguish successful SSH (`root@srv1601285:~#`) from MOTD health warnings. Audit apt/unattended-upgrades, failed units, memory, and reboot flags before changing anything; make Hermes available to `root` via `/usr/local/bin/hermes` wrappers if needed. See `references/vps-hostinger-login-health-and-cli.md`.
- **Hostinger CPU limitation while developing a SaaS**: if Hostinger shows CPU throttling and top processes are `next-server`, `next build/dev`, Chrome/Playwright, and Hermes gateway/agents, treat it as a CPU-capacity issue before assuming a bug. On 2 vCPU, active Next.js dev + Hermes + Playwright is expected to saturate; recommend KVM 4 minimum or KVM 8 for comfort, then remove Hostinger limits after verifying load. See `references/hostinger-vps-cpu-limits-and-dev-load.md`.
- **Gateway dies on SSH logout**: Enable linger: `sudo loginctl enable-linger $USER`
- **Gateway dies on WSL2 close**: WSL2 requires `systemd=true` in `/etc/wsl.conf` for systemd services to work. Without it, gateway falls back to `nohup` (dies when session closes).
- **Gateway crash loop**: Reset the failed state: `systemctl --user reset-failed hermes-gateway`
- **Deleting accidental Telegram messages**: use Telegram Bot API `deleteMessage` with the `chat_id`/`message_id` returned by Hermes send tools. See `references/telegram-message-cleanup.md` for the cleanup workflow and pitfalls.
- **Migrating a live gateway to a VPS**: keep exactly one Telegram gateway active. Stop the old local gateway before starting/validating the VPS gateway; keep local as backup cold. For the Hostinger-tested operational flow, see `references/vps-migration-hostinger.md`.
- **Updating Google Antigravity on Jonathan's local Mac via VPS/Tailscale**: If Antigravity is installed on `vividflow-local` rather than the VPS, use direct SSH from the VPS to the Mac and check Squirrel/ShipIt staged updates before attempting reinstall. See `references/local-mac-antigravity-update.md`.
- **Installing Google Antigravity directly on an Ubuntu VPS**: Use the official Google apt repository, verify with `dpkg-query` plus `antigravity --version`, and remember a headless VPS has no GUI display by default. See `references/antigravity-linux-vps-install.md`.
- **`hermes` / `Hermes` command not found after SSH as root**: First check whether Hermes is installed under `/home/hermes/.local/bin/hermes`; Linux command names are case-sensitive, and root may not have the hermes user's local bin in PATH. Prefer a small `/usr/local/bin` wrapper over reinstalling. See `references/hermes-root-cli-command.md`.
- **Tailscale local backup access**: Tailscale visibility (`100.x` peer online) does not grant SSH. If SSH to a Mac local backup returns permission denied, add the VPS public key to the Mac's `~/.ssh/authorized_keys` or enable Tailscale SSH via ACL/device settings.

### Platform-specific issues
- **Discord bot silent**: Must enable **Message Content Intent** in Bot → Privileged Gateway Intents.
- **Slack bot silent after app install**: verify the active profile, not just global config. Hermes Slack Socket Mode needs `SLACK_BOT_TOKEN` (`xoxb-...`) and `SLACK_APP_TOKEN` (`xapp-...`) in the `.env` used by the running gateway profile (e.g. `~/.hermes/profiles/chief_of_staff/.env`). Also verify App Home Messages/Chat tab is enabled for DMs, event subscriptions include `app_mention` + `message.im` (+ `message.channels` for public channels), then restart the gateway as the Hermes user/profile, not root. If it reacts/likes but does not answer, inspect authorization/pairing (`Unauthorized user`) before changing prompts. If Slack voice/audio attachments fail, add `files:read` and reinstall. Full runbook: `references/slack-classic-app-socket-mode-troubleshooting.md`.
- **Slack bot only works in DMs**: Must subscribe to `message.channels` event. Without it, the bot ignores public channels.
- **Windows-specific issues** (`Alt+Enter` newline, WinError 10106, UTF-8 BOM config, test suite, line endings): see the dedicated **Windows-Specific Quirks** section above.

### Auxiliary models not working
If `auxiliary` tasks (vision, compression, session_search) fail silently, the `auto` provider can't find a backend. Either set `OPENROUTER_API_KEY` or `GOOGLE_API_KEY`, or explicitly configure each auxiliary task's provider:
```bash
hermes config set auxiliary.vision.provider <your_provider>
hermes config set auxiliary.vision.model <model_name>
```

---

## Where to Find Things

| Looking for... | Location |
|----------------|----------|
| Config options | `hermes config edit` or [Configuration docs](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) |
| Available tools | `hermes tools list` or [Tools reference](https://hermes-agent.nousresearch.com/docs/reference/tools-reference) |
| Slash commands | `/help` in session or [Slash commands reference](https://hermes-agent.nousresearch.com/docs/reference/slash-commands) |
| Skills catalog | `hermes skills browse` or [Skills catalog](https://hermes-agent.nousresearch.com/docs/reference/skills-catalog) |
| Provider setup | `hermes model` or [Providers guide](https://hermes-agent.nousresearch.com/docs/integrations/providers) |
| Platform setup | `hermes gateway setup` or [Messaging docs](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/) |
| MCP servers | `hermes mcp list` or [MCP guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) |
| Profiles | `hermes profile list` or [Profiles docs](https://hermes-agent.nousresearch.com/docs/user-guide/profiles) |
| Cron jobs | `hermes cron list` or [Cron docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) |
| Memory | `hermes memory status` or [Memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) |
| Env variables | `hermes config env-path` or [Env vars reference](https://hermes-agent.nousresearch.com/docs/reference/environment-variables) |
| CLI commands | `hermes --help` or [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) |
| Gateway logs | `~/.hermes/logs/gateway.log` |
| Session files | `~/.hermes/sessions/` or `hermes sessions browse` |
| Source code | `~/.hermes/hermes-agent/` |

---

## Contributor Quick Reference

For occasional contributors and PR authors. Full developer docs: https://hermes-agent.nousresearch.com/docs/developer-guide/

### Project Layout

```
hermes-agent/
├── run_agent.py          # AIAgent — core conversation loop
├── model_tools.py        # Tool discovery and dispatch
├── toolsets.py           # Toolset definitions
├── cli.py                # Interactive CLI (HermesCLI)
├── hermes_state.py       # SQLite session store
├── agent/                # Prompt builder, context compression, memory, model routing, credential pooling, skill dispatch
├── hermes_cli/           # CLI subcommands, config, setup, commands
│   ├── commands.py       # Slash command registry (CommandDef)
│   ├── config.py         # DEFAULT_CONFIG, env var definitions
│   └── main.py           # CLI entry point and argparse
├── tools/                # One file per tool
│   └── registry.py       # Central tool registry
├── gateway/              # Messaging gateway
│   └── platforms/        # Platform adapters (telegram, discord, etc.)
├── cron/                 # Job scheduler
├── tests/                # ~3000 pytest tests
└── website/              # Docusaurus docs site
```

Config: `~/.hermes/config.yaml` (settings), `~/.hermes/.env` (API keys).

### Adding a Tool (3 files)

**1. Create `tools/your_tool.py`:**
```python
import json, os
from tools.registry import registry

def check_requirements() -> bool:
    return bool(os.getenv("EXAMPLE_API_KEY"))

def example_tool(param: str, task_id: str = None) -> str:
    return json.dumps({"success": True, "data": "..."})

registry.register(
    name="example_tool",
    toolset="example",
    schema={"name": "example_tool", "description": "...", "parameters": {...}},
    handler=lambda args, **kw: example_tool(
        param=args.get("param", ""), task_id=kw.get("task_id")),
    check_fn=check_requirements,
    requires_env=["EXAMPLE_API_KEY"],
)
```

**2. Add to `toolsets.py`** → `_HERMES_CORE_TOOLS` list.

Auto-discovery: any `tools/*.py` file with a top-level `registry.register()` call is imported automatically — no manual list needed.

All handlers must return JSON strings. Use `get_hermes_home()` for paths, never hardcode `~/.hermes`.

### Adding a Slash Command

1. Add `CommandDef` to `COMMAND_REGISTRY` in `hermes_cli/commands.py`
2. Add handler in `cli.py` → `process_command()`
3. (Optional) Add gateway handler in `gateway/run.py`

All consumers (help text, autocomplete, Telegram menu, Slack mapping) derive from the central registry automatically.

### Agent Loop (High Level)

```
run_conversation():
  1. Build system prompt
  2. Loop while iterations < max:
     a. Call LLM (OpenAI-format messages + tool schemas)
     b. If tool_calls → dispatch each via handle_function_call() → append results → continue
     c. If text response → return
  3. Context compression triggers automatically near token limit
```

### Testing

```bash
python -m pytest tests/ -o 'addopts=' -q   # Full suite
python -m pytest tests/tools/ -q            # Specific area
```

- Tests auto-redirect `HERMES_HOME` to temp dirs — never touch real `~/.hermes/`
- Run full suite before pushing any change
- Use `-o 'addopts='` to clear any baked-in pytest flags

**Windows contributors:** `scripts/run_tests.sh` currently looks for POSIX venvs (`.venv/bin/activate` / `venv/bin/activate`) and will error out on Windows where the layout is `venv/Scripts/activate` + `python.exe`. The Hermes-installed venv at `venv/Scripts/` also has no `pip` or `pytest` — it's stripped for end-user install size. Workaround: install pytest + pytest-xdist + pyyaml into a system Python 3.11 user site (`/c/Program Files/Python311/python -m pip install --user pytest pytest-xdist pyyaml`), then run tests directly:

```bash
export PYTHONPATH="$(pwd)"
"/c/Program Files/Python311/python" -m pytest tests/tools/test_foo.py -v --tb=short -n 0
```

Use `-n 0` (not `-n 4`) because `pyproject.toml`'s default `addopts` already includes `-n`, and the wrapper's CI-parity story doesn't apply off-POSIX.

**Cross-platform test guards:** tests that use POSIX-only syscalls need a skip marker. Common ones already in the codebase:
- Symlink creation → `@pytest.mark.skipif(sys.platform == "win32", reason="Symlinks require elevated privileges on Windows")` (see `tests/cron/test_cron_script.py`)
- POSIX file modes (0o600, etc.) → `@pytest.mark.skipif(sys.platform.startswith("win"), reason="POSIX mode bits not enforced on Windows")` (see `tests/hermes_cli/test_auth_toctou_file_modes.py`)
- `signal.SIGALRM` → Unix-only (see `tests/conftest.py::_enforce_test_timeout`)
- Live Winsock / Windows-specific regression tests → `@pytest.mark.skipif(sys.platform != "win32", reason="Windows-specific regression")`

**Monkeypatching `sys.platform` is not enough** when the code under test also calls `platform.system()` / `platform.release()` / `platform.mac_ver()`. Those functions re-read the real OS independently, so a test that sets `sys.platform = "linux"` on a Windows runner will still see `platform.system() == "Windows"` and route through the Windows branch. Patch all three together:

```python
monkeypatch.setattr(sys, "platform", "linux")
monkeypatch.setattr(platform, "system", lambda: "Linux")
monkeypatch.setattr(platform, "release", lambda: "6.8.0-generic")
```

See `tests/agent/test_prompt_builder.py::TestEnvironmentHints` for a worked example.

### Extending the system prompt's execution-environment block

Factual guidance about the host OS, user home, cwd, terminal backend, and shell (bash vs. PowerShell on Windows) is emitted from `agent/prompt_builder.py::build_environment_hints()`. This is also where the WSL hint and per-backend probe logic live. The convention:

- **Local terminal backend** → emit host info (OS, `$HOME`, cwd) + Windows-specific notes (hostname ≠ username, `terminal` uses bash not PowerShell).
- **Remote terminal backend** (anything in `_REMOTE_TERMINAL_BACKENDS`: `docker, singularity, modal, daytona, ssh, vercel_sandbox, managed_modal`) → **suppress** host info entirely and describe only the backend. A live `uname`/`whoami`/`pwd` probe runs inside the backend via `tools.environments.get_environment(...).execute(...)`, cached per process in `_BACKEND_PROBE_CACHE`, with a static fallback if the probe times out.
- **Key fact for prompt authoring:** when `TERMINAL_ENV != "local"`, *every* file tool (`read_file`, `write_file`, `patch`, `search_files`) runs inside the backend container, not on the host. The system prompt must never describe the host in that case — the agent can't touch it.

Full design notes, the exact emitted strings, and testing pitfalls:
`references/prompt-builder-environment-hints.md`.

**Refactor-safety pattern (POSIX-equivalence guard):** when you extract inline logic into a helper that adds Windows/platform-specific behavior, keep a `_legacy_<name>` oracle function in the test file that's a verbatim copy of the old code, then parametrize-diff against it. Example: `tests/tools/test_code_execution_windows_env.py::TestPosixEquivalence`. This locks in the invariant that POSIX behavior is bit-for-bit identical and makes any future drift fail loudly with a clear diff.

### Commit Conventions

```
type: concise subject line

Optional body.
```

Types: `fix:`, `feat:`, `refactor:`, `docs:`, `chore:`

### Key Rules

- **Never break prompt caching** — don't change context, tools, or system prompt mid-conversation
- **Message role alternation** — never two assistant or two user messages in a row
- Use `get_hermes_home()` from `hermes_constants` for all paths (profile-safe)
- Config values go in `config.yaml`, secrets go in `.env`
- New tools need a `check_fn` so they only appear when requirements are met
