---
name: whatsapp-openwa-bridge-ops
description: "Operate, debug, and extend the VividFlow WhatsApp Clara stack using OpenWA and the Hermes bridge: persistent services, QR/session state, typing indicator, voice transcription, health checks, logs, and safe verification."
---

# WhatsApp OpenWA Bridge Ops

Use this when Jonathan asks about the VividFlow WhatsApp/Clara bot, OpenWA, WhatsApp QR/session state, voice notes, “typing…” bubble, bridge restarts, or why WhatsApp is not responding.

## Operating principles

1. Act first when the ask is operational. Jonathan expects the fix, not a plan.
2. Never expose secrets: QR raw payloads, tokens, API keys, `.env` values, phone numbers, session strings, `clientHello.ephemeral`, or auth logs must be redacted as `[REDACTED]`.
3. Health is necessary but not sufficient. A real validation is an incoming WhatsApp message reaching the bridge and a reply being sent.
4. Do not force QR rescan unless OpenWA/session state shows disconnected/QR required. If OpenWA and bridge are healthy, tell Jonathan no rescan is normally needed.
5. Keep Clara’s external voice intact: Responsable Relation Client, feminine, human, calm, mirrors tutoiement/vouvoiement, no chatbot phrasing, no generic support language.
6. For tutoiement/vouvoiement, do not rely on prompt wording alone. Add deterministic bridge-side detection per incoming message (`tu/toi/ton/t’es…` vs `vous/votre/pouvez-vous…`) and inject a hard relation rule into the Hermes prompt. If the user says Clara vouvoie after being tutoyée, patch the bridge logic and restart the service.

## Key paths

Reference: `references/openwa-webhook-docker-gateway.md` captures the session-ready-but-silent incident where the webhook was missing/unreachable from Docker and had to use the Docker gateway IP.
Reference: `references/clara-voice-typing-session.md` captures the voice-note interpreter fix and deterministic tutoiement/vouvoiement mirroring pattern.
Reference: `references/openwa-systemd-root-docker-permissions.md` captures the durable fix when the user OpenWA service cannot access Docker because systemd has stale group membership.

- OpenWA project: `/home/hermes/openwa-stack/OpenWA`
- Bridge: `/home/hermes/openwa-stack/whatsapp-hermes-bridge.py`
- Bridge env: `/home/hermes/openwa-stack/whatsapp-bridge.env`
- Bridge service: `whatsapp-hermes-bridge.service` user service
- OpenWA container: `openwa-api`
- OpenWA health: `http://127.0.0.1:2785/api/health`
- Bridge health: `http://127.0.0.1:8791/health`

## Standard check sequence

```bash
curl -fsS -o /dev/null -w 'openwa=%{http_code}\n' http://127.0.0.1:2785/api/health || true
curl -fsS -o /dev/null -w 'bridge=%{http_code}\n' http://127.0.0.1:8791/health || true
sudo -n docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' openwa-api 2>/dev/null || true
systemctl --user is-active whatsapp-hermes-bridge.service || true
journalctl --user -u whatsapp-hermes-bridge.service -n 80 --no-pager | sed -E 's/[0-9]{10,}/[REDACTED]/g'
```

If OpenWA is `200`, bridge is `200`, and container is `running healthy`, do not tell Jonathan to rescan by default.

## Rebuild / restart sequence after OpenWA TypeScript changes

```bash
cd /home/hermes/openwa-stack/OpenWA
npm install
npm run build
sudo -n docker compose build openwa-api
sudo -n docker compose up -d openwa-api
systemctl --user restart whatsapp-hermes-bridge.service
```

Then rerun the standard check sequence. If the command is long-running, run it in the background and wait for completion before declaring done.

## Typing indicator pattern

Preferred implementation:

1. Add an OpenWA/Nest endpoint like `POST /sessions/:sessionId/messages/typing`.
2. In the WhatsApp engine/adapter, resolve the chat and call WhatsApp Web JS methods:
   - `chat.sendStateTyping()`
   - `chat.clearState()` after a short timeout or when message is sent.
3. In the Python bridge, call this endpoint before the human delay / LLM call.
4. Verify by sending a real WhatsApp text message and observing the phone UI.

Do not claim the bubble is visually confirmed unless Jonathan or a real UI check confirms it.

## Voice note transcription pattern

Bridge-side approach:

1. Detect incoming messages with audio/vocal fields: `type`, `mimetype`, `hasMedia`, `media`, `body`, `ptt`, etc.
2. Retrieve audio bytes from webhook payload if present, or call the OpenWA media/download endpoint if required.
3. Store audio in a temporary secure file.
4. Convert to WAV/mono/16k with `ffmpeg`.
5. Transcribe with `faster_whisper` if available.
6. Pass to Clara as contextual text, e.g. `[Message vocal transcrit] ...`.
7. Clean temporary files, cap duration/size, and send a graceful message if transcription fails.

Known useful dependency checks:

```bash
command -v ffmpeg
python3 - <<'PY'
import importlib.util
for m in ['faster_whisper','openai','whisper']:
    print(m, 'yes' if importlib.util.find_spec(m) else 'no')
PY
```

Important: run the dependency check with the exact Python interpreter used by `whatsapp-hermes-bridge.service`, not just the shell default. If `faster_whisper` is installed in the Hermes venv but the service runs `/usr/bin/python3`, voice notes will be received but transcription will fail with `ModuleNotFoundError: No module named 'faster_whisper'`. Fix by overriding `ExecStart` to the Hermes venv Python, then `systemctl --user daemon-reload && systemctl --user restart whatsapp-hermes-bridge.service`.

Do not rely on `OPENAI_API_KEY` for transcription unless it is explicitly configured; local `faster_whisper` is acceptable for this stack.

## QR/session handling

- If session is ready/healthy, no rescan should be needed.
- If state is `qr_ready`, disconnected, or unauthorized, generate a QR image, never expose raw QR text.
- Watchdog must not restart OpenWA aggressively while waiting for QR scan; that can invalidate the flow.

## Systemd persistence pattern

OpenWA Docker Compose may need to run as a root system service while the Hermes bridge remains a user service. Use this when the user service cannot access `/var/run/docker.sock` even after `hermes` was added to the `docker` group; the active user manager may have stale group membership. Details: `references/openwa-systemd-root-docker-permissions.md`.

Quick checks:

```bash
id
getent group docker
sudo systemctl is-active openwa-stack.service
systemctl --user is-active whatsapp-hermes-bridge.service
```

If the root service is active and the old user OpenWA unit is failed/noisy, disable and reset the user unit rather than treating it as the source of truth.

## Verification ladder

1. OpenWA health returns `200`.
2. Bridge health returns `200`.
3. `openwa-api` is `running healthy`.
4. OpenWA session is `ready` for the expected bot number/profile.
5. A webhook exists on the active session for `message.received` and OpenWA’s webhook test returns `success: true` / `statusCode: 200`.
6. Bridge logs show incoming WhatsApp webhook and reply.
7. Real text message gets response.
8. Real voice note gets transcribed response.
9. Typing bubble is visually observed.

Stop only when the highest possible verification is done. If a human-side observation is required, say exactly what Jonathan should send/check, but do not overstate completion.

## Webhook reachability checks

If WhatsApp session is `ready` but Clara does not answer, do not focus on QR first: verify OpenWA can deliver webhooks to the bridge.

1. List sessions and webhooks using the API key from `/home/hermes/openwa-stack/whatsapp-bridge.env` without printing the key.
2. If `/api/sessions` returns `[]`, health is misleading: OpenWA is alive but no WhatsApp session exists. Create/start the bot session, update `OPENWA_SESSION_ID`, then restart the bridge.
3. If the env `OPENWA_SESSION_ID` 404s, treat it as stale and reconcile it with the actual ready session before debugging Hermes.
4. If the active session has no webhook, create one for `message.received`.
5. The Python bridge route is `/webhook/openwa` (not `/webhook`). A webhook test returning `success:false` with `statusCode:404` usually means the URL path is wrong even if the bridge health endpoint is 200.
6. From the `openwa-api` container, test bridge reachability with Node/http, e.g. `http://172.18.0.1:8791/health` when Docker gateway is `172.18.0.1`.
7. Prefer the Docker bridge gateway IP for the webhook URL if `host.docker.internal` fails from Linux containers.
8. OpenWA webhook update uses `PUT /api/sessions/:sessionId/webhooks/:id`, not PATCH.
9. Run `POST /api/sessions/:sessionId/webhooks/:id/test`; only treat webhook routing as fixed when it returns `success: true` and `statusCode: 200`.

Useful commands/patterns:

```bash
sudo -n docker inspect openwa-api --format '{{range .NetworkSettings.Networks}}{{.Gateway}} {{.IPAddress}}{{end}}'
sudo -n docker exec openwa-api node -e "require('http').get('http://172.18.0.1:8791/health',r=>{console.log('status',r.statusCode);r.pipe(process.stdout)}).on('error',e=>{console.log('ERR',e.message);process.exit(0)})"
```

## Pitfalls

- `npm run build` can fail with `nest: not found` if `node_modules` is absent; fix with `npm install`, then build. Capture the fix, not the failure.
- Docker rebuild can be long-running; use background execution and wait.
- Logs may contain phone-like IDs; redact before sharing.
- A webhook `200` only proves receipt, not that a human saw the typing bubble or that audio transcription succeeded.
- OpenWA/bridge health can both be green while Clara still does not answer if `/api/sessions` is empty, the env session ID is stale/404, or the session webhook is missing/points to an address unreachable from the container.
- A webhook `statusCode:404` during test can be the bridge URL path, not bridge downtime: use `/webhook/openwa` for `whatsapp-hermes-bridge.py`.
- A watchdog alert like `session=unknown` can be caused by stale/mismatched `OPENWA_SESSION_ID`; reconcile it with the actual ready session before asking Jonathan to rescan.
- Chromium profile locks (`SingletonLock`, `SingletonSocket`, `SingletonCookie`) can block session start after container/process churn. If no Chromium process is actually running for that profile, remove only the lock files for the intended bot session, restart `openwa-api`, then start the session again. Do not remove locks for Jonathan’s personal-number session.
