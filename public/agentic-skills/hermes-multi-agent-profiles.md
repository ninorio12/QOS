---
name: hermes-multi-agent-profiles
description: Set up multiple independent Hermes agents with separate gateways (e.g., Telegram + Discord) using the native profile system. Covers critical pitfalls discovered through trial and error.
keywords: [hermes, multi-agent, profiles, discord, gateway, systemd, csm]
---

# Hermes Multi-Agent Profiles

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Run multiple independent Hermes agents on the same VPS, each with its own gateway, personality (SOUL.md), memory, and platform.

## When to Use
- You need separate agents on different platforms (Telegram + Discord)
- Each agent needs its own personality, memory, and behavior
- Agents share the same Anthropic/OpenRouter subscription

## Steps

### 0. Confirm the Layer You Are Building
If the platform bots/apps already exist, do not re-explain bot creation. Move to the Hermes profile layer: R&R contract → `SOUL.md` → profile `.env` token binding → gateway → QA. A bot/app is the mouth; the Hermes profile is the brain. For VividFlow-style agent R&R fields, see `vividflow-agent-runtime` reference `references/agent-rr-template-before-profile-build.md`.

### 1. Create the Profile
```bash
hermes profile create <name> --clone
# e.g.: hermes profile create csm --clone
```
This creates `~/.hermes/profiles/<name>/` with config.yaml, .env, SOUL.md, skills, etc.
A wrapper script is created at `~/.local/bin/<name>` (use `csm` instead of `hermes`).

### 2. Configure the Profile

**SOUL.md** — Set the agent's personality:
```bash
nano ~/.hermes/profiles/<name>/SOUL.md
```

**CRITICAL: .env Setup** — The profile .env is a COPY of the main one. You MUST:

1. Put platform tokens AT THE TOP of the .env file (not the bottom). The file is ~370 lines and tokens at the bottom may not load correctly.

2. OVERRIDE the platform you DON'T want with an empty value:
```bash
# At the TOP of ~/.hermes/profiles/csm/.env:
TELEGRAM_BOT_TOKEN=
<SECRET>
GATEWAY_ALLOW_ALL_USERS=true
```
Without `TELEGRAM_BOT_TOKEN=` (empty), the gateway inherits the main .env's Telegram token and tries to connect to both platforms.

3. Copy auth.json for LLM access:
```bash
cp ~/.hermes/auth.json ~/.hermes/profiles/<name>/auth.json
```

4. Copy/set the ANTHROPIC_TOKEN (not just ANTHROPIC_API_KEY — check which one your install uses):
```bash
grep "^ANTHROPIC_TOKEN=" ~/.hermes/.env >> ~/.hermes/profiles/<name>/.env
```

**config.yaml** — Fix known issues:
```bash
# Disable smart_model_routing if the cheap model doesn't exist
sed -i '/smart_model_routing:/{n;s/enabled: true/enabled: false/}' ~/.hermes/profiles/<name>/config.yaml

# Set approvals to auto
sed -i 's/mode: manual/mode: auto/' ~/.hermes/profiles/<name>/config.yaml

# Add fallback model
# (append or uncomment the fallback_model section)
```

### 3. Start the Gateway — CRITICAL PITFALL

**DO NOT use the standard systemd service.** `hermes gateway install` + `hermes gateway start` creates a service that calls `python -m hermes_cli.main gateway run --replace`. This DOES NOT WORK for profiles because `hermes_cli.main` has an `_apply_profile_override()` function that interferes with env loading.

**Instead, create a custom start script:**

```bash
cat > ~/.hermes/profiles/<name>/start-gateway.sh << 'SCRIPT'
#!/bin/bash
export HERMES_HOME=$HOME/.hermes/profiles/<name>
export PYTHONUNBUFFERED=1
source $HOME/.hermes/hermes-agent/venv/bin/activate

exec python3 -c "
import os, sys, logging
os.environ['HERMES_HOME'] = '$HOME/.hermes/profiles/<name>'
sys.path.insert(0, '$HOME/.hermes/hermes-agent')

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s: %(message)s', stream=sys.stderr, force=True)

from hermes_cli.env_loader import load_hermes_dotenv
load_hermes_dotenv(project_env='$HOME/.hermes/profiles/<name>/.env')

import asyncio, pathlib
pathlib.Path('$HOME/.hermes/profiles/<name>/gateway.pid').unlink(missing_ok=True)

from gateway.run import start_gateway
success = asyncio.run(start_gateway(replace=False, verbosity=1))
sys.exit(0 if success else 1)
"
SCRIPT
chmod +x ~/.hermes/profiles/<name>/start-gateway.sh
```

**Create the systemd service manually:**

```bash
cat > ~/.config/systemd/user/hermes-gateway-<name>.service << 'EOF'
[Unit]
Description=Hermes <Name> Agent Gateway
After=network.target
StartLimitIntervalSec=600
StartLimitBurst=5

[Service]
Type=simple
ExecStart=~/.hermes/profiles/<name>/start-gateway.sh
WorkingDirectory=~/.hermes/hermes-agent
Restart=on-failure
RestartSec=30
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=60
TimeoutStartSec=180
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable hermes-gateway-<name>
systemctl --user start hermes-gateway-<name>
```

**WARNING:** Never run `csm gateway start` after this — it will overwrite the service file with the broken default one.

### 4. Verify
```bash
# Check status
systemctl --user status hermes-gateway-<name>

# Check logs
journalctl --user -u hermes-gateway-<name> -f

# Telegram token sanity check without logging the secret
python3 - <<'PY'
import urllib.request, json, os
TOKEN=os.environ['TELEGRAM_BOT_TOKEN']
print(json.load(urllib.request.urlopen(f'https://api.telegram.org/bot{TOKEN}/getMe', timeout=20))['result'])
PY

# Should see: "✓ telegram connected" / "✓ discord connected" / "Gateway running with 1 platform(s)"
```

For a brand-new Telegram bot, outbound DMs to a user will fail with `Bad Request: chat not found` until that user opens the bot and presses **Start**. Treat this as normal Telegram behavior, not a broken gateway. Ask the user to start the bot, then test with an inbound `ping`.

### 5. Kill Conflicting Processes

If you previously had a custom discord.py bot running, kill it:
```bash
pkill -f "csm-discord-bot.py"
rm /etc/systemd/system/csm-discord-bot.service
systemctl daemon-reload
```
Two bots using the same Discord token = only the first one receives messages.

## Pitfalls (all discovered the hard way)

1. **Token position in .env**: Tokens at line 300+ may not load. Put them at the TOP.
2. **Platform override**: Without `TELEGRAM_BOT_TOKEN=` (empty), the CSM gateway tries Telegram AND Discord, fails on Telegram lock, and sometimes fails Discord too.
3. **`csm gateway start` overwrites service**: It regenerates the systemd service file without `-p csm`, breaking profile isolation.
4. **`_apply_profile_override()` + systemd**: The CLI entry point's profile detection via `-p` flag works differently than setting HERMES_HOME directly. The custom start script bypasses this entirely.
5. **Discord connection timeout**: Default is 30s. On slow connections or large guilds, increase to 120s in `gateway/platforms/discord.py` line ~650.
6. **`smart_model_routing` with invalid model**: If `cheap_model` references a non-existent model (e.g., `claude-haiku-4-20250414`), EVERY request fails with 404. Disable it or set a valid model.
7. **ANTHROPIC_TOKEN vs ANTHROPIC_API_KEY**: Check which env var your install actually uses. An empty `ANTHROPIC_API_KEY=` in the cloned .env means no LLM access.
8. **DISCORD_ALLOWED_USERS**: Don't confuse Telegram user IDs with Discord user IDs. Or just use `GATEWAY_ALLOW_ALL_USERS=true`.
9. **`/model` picker confusion on Telegram/Discord**: The UI only lists providers detected as authenticated by the running gateway process (from that profile's `auth.json` / credential pool). If you expect "Nous Portal" and don't see it: use provider slug `nous` (not `nousportal`), re-run `hermes -p <profile> model`, then restart that profile gateway from manual SSH.
10. **`load_hermes_dotenv(project_env)` must point to the PROFILE's .env, not the main one**: If the start script loads `$HOME/.hermes/hermes-agent/.env` (or `$HOME/.hermes/.env`) instead of `$HOME/.hermes/profiles/<name>/.env`, the profile inherits the main gateway's tokens (e.g. TELEGRAM_BOT_TOKEN). Two gateways polling with the same token = Telegram "terminated by other getUpdates request" conflicts, random message delivery to the wrong bot, and split conversation state. Always point `project_env` to the profile's own `.env`.
11. **systemd auto-respawn masks token fixes**: If you `kill -9` a bot and it keeps coming back, check `systemctl --user list-units` for `hermes-gateway-<name>.service`. The running process may have been started BEFORE you fixed the script. systemd will respawn it with the OLD broken config. Fix: `systemctl --user stop hermes-gateway-<name>` then `systemctl --user disable hermes-gateway-<name>` (to prevent respawn), fix the script, then re-enable and start. Do NOT rely on `kill` alone.
12. **Confirm token isolation via network**: After fixing a token conflict, verify with `ss -tp | grep 149.154` — you should see exactly ONE connection per bot token. If you see 2+ connections from different PIDs with the same token, one is still using the wrong env.
13. **Session contamination after token fix**: If a bot still answers with the wrong personality after the token is fixed, the active conversation state may be cached. Restart the main gateway cleanly (`systemctl --user restart hermes-gateway.service` from SSH, never from Telegram) to flush stale sessions.
14. **New Telegram bot cannot DM first**: Telegram returns `Bad Request: chat not found` if you try to send the first message from a fresh bot to a user. The user must open the bot and press **Start** before outbound sends work. Gateway `telegram connected` + `getMe` success is enough to mark setup complete pending the user's `/start`.
15. **Temporary setup scripts may contain bot tokens**: If you generate a one-off installer script with Telegram tokens or OAuth material, delete it immediately after successful execution (or rewrite it with placeholders) before finalizing. Keep the token only in the profile `.env` with restrictive permissions and never echo it in the final answer.
16. **Custom profile units need enough drain time**: If logs warn `TimeoutStopSec=60s but drain_timeout=180s`, patch the custom systemd unit to `TimeoutStopSec=240` (or at least `drain_timeout + 30`) and `systemctl --user daemon-reload && systemctl --user restart hermes-gateway-<name>`. Do not run the default `gateway service install --replace` for a profile if it would overwrite the custom launcher.
