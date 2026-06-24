---
name: vividflow-slack-extension-gateway
description: Créer, configurer, tester et installer le gateway Slack Hermes VividFlow sur VPS avec profil dédié, Codex OAuth et service systemd 24/24.
---

# VividFlow Slack Extension Gateway

Use this when Jonathan/Thomas wants to create, repair, test, or install the dedicated Hermes Slack gateway/profile for VividFlow.

Also use it when they ask to rebuild the other VividFlow Slack bots after the Coordinator is done. In that case, do not stop at `vividflow-slack-extension` / `@coordinateur`; follow `references/vividflow-slack-executor-bots-rebuild.md` for the executor bots.

## Goal

Run a dedicated Hermes profile `vividflow-slack-extension` connected to Slack as `@coordinateur`, with OpenAI Codex OAuth / `gpt-5.5`, restricted to allowed Slack users, then install it as a 24/24 systemd user service after manual validation.

For the wider Slack bot rebuild, bring the active executor profiles back online as Slack Socket Mode gateways: Agent KB, Agent CSM, Agent Operations, and Data Analyst; keep obsolete/unused profiles neutralized unless explicitly requested.

## Critical context

- The working VPS context may be root.
- The actual profile path can be `/root/.hermes/profiles/vividflow-slack-extension`, not `/home/hermes/.hermes/profiles/...`.
- Do not confuse profile names:
  - root source profile observed: `chief-of-staff`
  - user `hermes` source profile may be `chief_of_staff`
- Never expose Slack, Telegram, OpenRouter, API, or OAuth tokens. Redact as `[REDACTED]`.
- Do not install systemd before manual Slack response is validated.
- Slack allowed user IDs used during setup:
  - Thomas/Jonathan active tester may be `U0BALTG244U`
  - Jonathan Slack ID observed in later debugging may be `U0BALTLGWP6`
  - legacy/known Thomas ID may be `U0BA8LKAH5H`
  - include all active human testers if needed: `SLACK_ALLOWED_USERS=U0BA8LKAH5H,U0BALTG244U,U0BALTLGWP6`
- Be careful with near-identical Slack IDs: `U0BALTG244U` and `U0BALTLGWP6` are different users. If Thomas says bots answer him but not Jonathan, suspect an allowlist mismatch before debugging Slack scopes.
- Current Slack executor bot rollout may run as **root user systemd**, not the `hermes` user. Active root profile names can be hyphenated: `vividflow-slack-extension`, `agent-kb-slack`, `agent-csm-slack`, `agent-operations-slack`, `data-analyst-slack`, `agent-debug-slack`, `media-buyer-slack`. Do not waste time patching legacy `*_executor` profiles if the live processes point to these root profiles.
- For the root user systemd manager, use `sudo -n env XDG_RUNTIME_DIR=/run/user/0 systemctl --user ...`. Regular `systemctl --user` checks the current Unix user and can miss the live root Slack services.

## Fast allowlist repair for Jonathan/Thomas

Use this when Slack bots answer Thomas but ignore Jonathan, or when logs show `Unauthorized user: U... on slack`.

1. Identify live Slack gateway processes and profiles:

```bash
ps -eo pid,user,cmd | grep -E 'gateway run|hermes.*--profile' | grep -v grep
```

2. If live Slack profiles run as root, patch `/root/.hermes/profiles/<profile>/.env`, not `/home/hermes/.hermes/profiles/...`.

3. Ensure each active Slack profile has the full human allowlist. Default tested set:

```bash
SLACK_ALLOWED_USERS=U0BA8LKAH5H,U0BALTG244U,U0BALTLGWP6
```

4. Restart the matching root user services:

```bash
sudo -n env XDG_RUNTIME_DIR=/run/user/0 systemctl --user restart \
  hermes-gateway-vividflow-slack-extension.service \
  hermes-gateway-agent-kb-slack.service \
  hermes-gateway-agent-csm-slack.service \
  hermes-gateway-agent-operations-slack.service \
  hermes-gateway-data-analyst-slack.service \
  hermes-gateway-agent-debug-slack.service \
  hermes-gateway-media-buyer-slack.service
```

5. Verify status and logs, then ask Jonathan to test a real Slack mention/DM. Do not report success from `.env` patch alone.

More detail: `references/root-slack-allowlist-repair.md`.

## Creation

List profiles in the same user context that will run the gateway:

```bash
/home/hermes/.local/bin/hermes profile list
```

If running as root and source profile is `chief-of-staff`:

```bash
/home/hermes/.local/bin/hermes profile create vividflow-slack-extension --clone-from chief-of-staff
```

Important: `--clone` alone does not take a source profile value. Use `--clone-from`.

## Slack setup

Run:

```bash
/home/hermes/.local/bin/hermes --profile vividflow-slack-extension gateway setup
```

Recommended interactive choices:

- configure Slack
- set Slack bot/app tokens from Slack API, without exposing them in chat/logs
- `Allowed user IDs`: use a comma-separated allowlist, e.g. `U0BA8LKAH5H,U0BALTG244U`
- `Home channel ID`: leave blank initially; set later via `/set-home` if needed
- `Install the gateway as a systemd service?`: answer `n` until manual Slack response works

Slack App settings to verify if messages are not received:

- Socket Mode: ON
- Event Subscriptions: ON
- Bot User Events:
  - `app_mention`
  - `message.im`
  - optionally `message.channels` if channel mentions are needed
- OAuth scopes:
  - `chat:write`
  - `app_mentions:read`
  - `im:history`
  - `im:read`
  - `im:write`
  - `channels:history`
  - `channels:read`
- App Home:
  - Messages Tab enabled
  - allow users to send messages from the messages tab
- Reinstall the Slack app to workspace after changing scopes/events.

## Configure provider like current assistant

If the bot returns OpenRouter credit errors or should match the main assistant, use OpenAI Codex OAuth.

First verify Codex works in root context:

```bash
/home/hermes/.local/bin/hermes --provider openai-codex -m gpt-5.5 -z "Réponds exactement: OK_CODEX"
```

Expected:

```text
OK_CODEX
```

Then edit `/root/.hermes/profiles/vividflow-slack-extension/config.yaml`:

```yaml
model:
  default: "gpt-5.5"
  provider: "openai-codex"
  # base_url: "https://openrouter.ai/api/v1"
  max_tokens: 4096
```

Notes:

- OpenRouter 402 can happen if the cloned profile uses `provider: openrouter` and requests too many output tokens.
- `max_tokens: 4096` is a safe cap for Slack replies.
- Remove/comment OpenRouter `base_url` when using `openai-codex` to avoid confusion.

## Disable unrelated platforms for Slack-only profile

If the cloned profile has broken Telegram/WhatsApp credentials, neutralize them so Slack startup is clean.

Safe Python patch pattern:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('/root/.hermes/profiles/vividflow-slack-extension/.env')
lines = p.read_text().splitlines()
out = []
seen_tg = seen_wa = False
for line in lines:
    if line.startswith('TELEGRAM_BOT_TOKEN='):
        out.append('TELEGRAM_BOT_TOKEN=')
        seen_tg = True
    elif line.startswith('WHATSAPP_ENABLED='):
        out.append('WHATSAPP_ENABLED=false')
        seen_wa = True
    else:
        out.append(line)
if not seen_tg:
    out.append('TELEGRAM_BOT_TOKEN=')
if not seen_wa:
    out.append('WHATSAPP_ENABLED=false')
p.write_text('\n'.join(out) + '\n')
PY
```

Do not paste actual token values in commands or chat.

## Manual test

Run manually first:

```bash
/home/hermes/.local/bin/hermes --profile vividflow-slack-extension gateway run
```

Expected logs:

```text
[Slack] Authenticated as @coordinateur in workspace VividFlow
[Slack] Socket Mode connected
✓ slack connected
Gateway running with 1 platform(s)
Press Ctrl+C to stop
```

Then test from Slack:

- DM the bot: `test`
- Mention in a channel where bot is invited: `@coordinateur test`

If Slack only reacts/likes or no response appears, inspect logs:

```bash
tail -f /root/.hermes/profiles/vividflow-slack-extension/logs/gateway.log
```

Useful patterns:

- `Unauthorized user: U... on slack` → add that Slack user ID to `SLACK_ALLOWED_USERS` in `.env`, then restart.
- Bots answer Thomas but not Jonathan → compare the exact Slack user ID in the logs/message with `SLACK_ALLOWED_USERS` across every active executor profile. Jonathan has been seen as `U0BALTLGWP6`; do not confuse it with `U0BALTG244U`. Check both profile `.env` history and live process/systemd environment, then restart and test from Jonathan's account.
- no `message.im`/`app_mention`/incoming event at all → Slack App Event Subscriptions/scopes/reinstall issue.
- bot-to-bot Coordinator tests can be filtered even when human mentions work. For receiving executor profiles, set `SLACK_ALLOW_BOTS=mentions` and include the Coordinator Slack user ID in `SLACK_ALLOWED_USERS`; see `references/slack-bot-to-bot-agent-verification.md`.
- a bot reaction/like without a visible text reply is not enough validation. Check receiving gateway logs for `inbound message`, `response ready`, `Sending response`, and `Unauthorized user` before reporting success.
- `No auxiliary LLM provider configured` → warning only; not primary failure.
- `HTTP 402` from OpenRouter → switch provider to `openai-codex` or add OpenRouter credits.
- **Agent « tourne en rond »** : vérifier `max_turns` dans `config.yaml` avant toute autre chose (logs, permissions, erreurs). Si la mission nécessite ~26+ tours (deck 8 slides + email) et que `max_turns` est à 18, l'agent va boucler sur redémarrage sans jamais finir. Fix : `max_turns: 150`.
- **Gateway routing blind spot** : les réponses des agents Slack dans les threads ne remontent PAS vers le gateway Telegram du Coordinateur. Le Coordinateur doit activement poller les logs des agents ou le thread Slack pour voir leurs réponses.

## Direct Slack DM/channel test from server

If the current assistant profile lacks Slack platform tools, or if a cron shows `last_status: ok` but Jonathan did not see the Slack message, use Slack Web API with the profile root env. For cron/order delivery pitfalls, channel IDs, and the leads outbound test sequence, see `references/slack-cron-delivery-and-manual-order-tests.md`.

Important env pitfall: plain `source .env` does not export variables to child processes if lines are written as `SLACK_APP_TOKEN=...` without `export`. For Python/curl diagnostics, use `set -a; source ...; set +a` or add `export` in the `.env`. See `references/slack-env-token-diagnostics.md`.

Open DM with a user ID:

```bash
set -a; . /root/.hermes/profiles/vividflow-slack-extension/.env; set +a
curl -sS -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"users":"U0BALTG244U"}' \
  https://slack.com/api/conversations.open
```

Send message to returned channel ID:

```bash
curl -sS -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"D...","text":"Bonjour"}' \
  https://slack.com/api/chat.postMessage
```

Verify response JSON has `"ok": true`.

Never print tokens; when showing outputs, redact secrets.

## Google Workspace credential rollout for Slack agent profiles

When a VividFlow Slack agent (Data Analyst, CSM, Ops, KB) needs Google Sheets, Gmail, Drive, or Calendar access, each profile needs its own `google_token.json` with the right scopes and a `HERMES_HOME` env pointing to its profile directory.

The Data Analyst in particular needs spreadsheets+drive scopes to read/write leads/outbound data.

Use the full diagnostic and fix guide:

```text
references/google-workspace-slack-profile-rollout.md
```

Key signals: agent says "je n'ai pas accès", returns auth errors on sheets operations, or a profile has `google_token.json` but no `.env`.

## Browser Use key rollout for selected Slack profiles

When VividFlow agents need Browser Use Cloud, do not give it to every profile by default. Configure only the useful execution profiles, restart services, and verify Cloud auth without printing the key. Use:

```text
references/browser-use-profile-rollout.md
```

Default scope after approval: Coordinateur, Data Analyst, Agent Operations, Agent Debug.

## CSM Clara Workspace memory

When repairing or configuring Agent CSM, make sure its profile memory distinguishes Clara's email identity from WhatsApp channels. Clara for CSM is the Workspace email identity `clara.bernasconi@vividflow.co`, accessed via the CSM profile wrapper; there is no Clara personal WhatsApp to look up in Data OS. Use:

```text
references/csm-clara-workspace-memory.md
```

Key pitfall: if CSM says “Je n’ai pas le WhatsApp de Clara dans le Data OS”, fix the CSM memory/channel rule instead of creating a fake WhatsApp contact or blocking email execution.

## Data OS token and MCP diagnostics

When VividFlow Slack agents need Data OS access, distinguish **local file access** from **API/MCP access**. A report that the repo or `.data/data-os.json` is readable only proves filesystem access.

Use the support references for the exact prompts and fixes:

```text
references/dataos-token-mcp-diagnostics.md
references/dataos-slack-profile-token-rollout.md
```

Key pitfalls:

- `.env` lines starting with `# export DATAOS_TOKEN=...` are comments and will not load.
- Prefer `export DATAOS_TOKEN=...` in profile `.env` files; plain assignments may not propagate in shell-based diagnostics unless `set -a` is used.
- Never keep placeholder brackets around a token (`DATAOS_TOKEN=[...]`): the brackets are sent as part of the Bearer token and can trigger `-32001 Unauthorized: token agent requis`.
- The global `mcp_servers.dataos` block can be correct while a Slack executor still fails: each profile must load its own `DATAOS_TOKEN` for clean Data OS identity/audit.
- Do not copy a fallback COO/global token into CSM/Ops/Data Analyst just to make MCP pass; leave unchanged and report `missing own token` until the dedicated Data OS agent token exists.
- If shell verification says `DATAOS_TOKEN OK` but Slack says no API/MCP tool is available, stop debugging the token; the profile is missing Data OS/MCP tool registration.
- A global `mcp_servers.dataos` is not enough if per-profile `config.yaml` overrides/masks tool registration. Patch each Slack profile explicitly with `mcp_servers.dataos` and expose `dataos`/`mcp-dataos` in the Slack platform toolsets, then YAML-parse, reload gateways, cleanup duplicate processes, and test `dataos_state` per profile. See `references/dataos-slack-mcp-profile-exposure.md`.
- After editing a profile `.env` or `config.yaml`, restart/reload that gateway and test an actual MCP tool (`dataos_state`), not just file access or service status.
- If a token is pasted into chat/Slack, treat it as exposed and rotate it after stabilization.

## Install 24/24 after validation

Only after a manual Slack reply works:

```bash
Ctrl+C
/home/hermes/.local/bin/hermes --profile vividflow-slack-extension gateway install
/home/hermes/.local/bin/hermes --profile vividflow-slack-extension gateway start
/home/hermes/.local/bin/hermes --profile vividflow-slack-extension gateway status
```

Expected:

```text
User service installed and enabled
Systemd linger is enabled
User gateway service is running
Active: active (running)
```

Logs:

```bash
journalctl --user -u hermes-gateway-vividflow-slack-extension -f
```

If running as root, the service file is usually under:

```text
/root/.config/systemd/user/hermes-gateway-vividflow-slack-extension.service
```

## Executor bots rebuild

When Jonathan/Thomas says the Coordinator on Slack is already done and asks to “refaire les autres bots”, switch scope to the executor bots immediately. Use the support file:

```text
references/vividflow-slack-executor-bots-rebuild.md
```

Operational default:

- activate: `agent_kb_executor`, `csm_executor`, `operations_executor`, `data_analyst_executor`
- verify each with Slack `auth.test` and gateway logs
- keep `cmo_executor`, `gbrain_executor`, and old/unused R&D/debug profiles stopped or Slack-disabled unless explicitly requested
- do not report success until logs show `Authenticated as`, `Socket Mode connected`, and `✓ slack connected` for each active executor

## Verification checklist

- `hermes profile list` shows `vividflow-slack-extension` gateway running in the correct user context.
- Slack logs show authentication as `@coordinateur` in workspace `VividFlow`.
- DM test returns an actual text response, e.g. `test reçu`.
- Direct Slack API DM can send `Bonjour` with `ok: true` if needed.
- systemd status is `active (running)`.
- No persistent Telegram invalid-token or WhatsApp timeout spam remains for the Slack-only profile.
