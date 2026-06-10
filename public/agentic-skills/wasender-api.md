---
name: wasender-api
description: Python integration for Wasender WhatsApp API — group creation, messaging, auth, and iClosed webhook automation pattern.
category: integration
tags: [whatsapp, wasender, api, webhook, iclosed]
---

# Wasender API Integration

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Overview
Python integration for Wasender WhatsApp API (`wasenderapi.com`). Covers auth, group creation, messaging, and gotchas discovered through trial and error.

## Auth
- **Header**: `Authorization: Bearer <token>`
- **NOT** `Token <token>` (that returns 401)
- **Base URL**: `<url> (no `www.`)

## Key Endpoints

### Create Group
```
POST <url>
{
  "name": "Groupe Name",
  "participants": ["<email@example.com>", "<email@example.com>"]
}
```
Response:
```json
{"success": true, "data": {"id": "<email@example.com>", "subject": "Groupe Name", "size": 3, ...}}
```

### Send Message (to group or individual)
```
POST <url>
{
  "to": "<email@example.com>",
  "text": "Hello"
}
```
- `to`: Group JID (`<email@example.com>`) or phone JID (`<email@example.com>`)
- Response: `{"success": true, "data": {"msgId": 42859050, "status": "in_progress"}}`

## Phone → JID
```python
import re
def phone_to_jid(phone: str) -> str:
    digits = re.sub(r"[^\d]", "", phone)
    if digits.startswith("0"):
        digits = digits[1:]  # Remove leading 0 (French local format)
    return f"{digits}@s.whatsapp.net"
```

## Verification
```bash
curl -s -X POST "<url>" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "+33*********", "text": "test"}'
# Expected: {"success": true, "data": {"msgId": ..., "status": "in_progress"}}
```

## iClosed Integration Pattern

iClosed webhooks do NOT include phone numbers for team members (setter/closer), only names and emails. Resolution strategy:

1. Fetch team members via iClosed API: `GET /v1/users` with Bearer auth
2. Build a static phone mapping in config (since phone numbers aren't in iClosed)
3. Match by name (partial/first name) or email

```python
# iClosed users endpoint response shape:
{
  "data": {
    "users": [
      {"id": 20451, "firstName": "Team Member", "lastName": "Arribert",
       "email": "<email@example.com>", "phoneNumber": None, "role": "Setter"},
      {"id": 31751, "firstName": "Team Member", "lastName": "Pinasco",
       "email": "<email@example.com>", "phoneNumber": None, "role": "Closer"}
    ]
  }
}
```
Phone numbers are almost always `None` in iClosed API — use a manual team mapping.

## Idempotency Pattern
Webhook handlers must be idempotent. Use a local state file:

```python
STATE_PATH = Path("state.json")

def load_state() -> dict:
    return json.load(open(STATE_PATH)) if STATE_PATH.exists() else {"processed": {}}

def is_processed(call_id: str) -> bool:
    return call_id in load_state()["processed"]

def mark_processed(call_id: str, group_jid: str):
    state = load_state()
    state["processed"][call_id] = {"group_jid": group_jid, "ts": datetime.utcnow().isoformat()}
    json.dump(state, open(STATE_PATH, "w"))
```

## Production Webhook Service (iClosed → WhatsApp Groups)

Full architecture: Flask webhook → Wasender group creation → welcome message.

### HTTPS Requirement
iClosed webhooks REJECT plain HTTP. Use self-signed cert (server-to-server, no browser validation needed):

```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certs/key.pem -out certs/cert.pem \
  -days 3650 -subj "/CN=iclosed-wa"
```

Gunicorn with TLS:
```bash
gunicorn -b 0.0.0.0:8787 \
  --certfile=certs/cert.pem --keyfile=certs/key.pem \
  -w 1 app:app
```

**⚠️ Self-signed certs may be silently rejected by iClosed.** If webhooks arrive when testing locally but not from iClosed, the cert is likely the culprit. Check `journalctl` — absence of incoming requests = silent rejection.

### Cloudflare Tunnel (Quick ephemeral HTTPS)
If iClosed rejects your self-signed cert, use `cloudflared` for instant valid HTTPS without a domain:

```bash
# Install cloudflared
curl -L --output cloudflared.deb <url>
dpkg -x cloudflared.deb /tmp/cf && cp /tmp/cf/usr/bin/cloudflared /usr/local/bin/

# Run the service on HTTP (no TLS needed)
gunicorn -b 0.0.0.0:8788 -w 1 app:app

# Expose via tunnel (valid HTTPS automatically)
cloudflared tunnel --url <url>
# → Outputs: <url>
```

Use this URL in iClosed. The tunnel is ephemeral (changes on restart) — for production, create a named tunnel via Cloudflare dashboard.

### Railway Deployment (Recommended for production)
Railway gives you a persistent HTTPS URL with zero cert management. The user explicitly preferred this over Cloudflare Tunnel.

**⚠️ Railway logs are lost on every redeploy.** The ephemeral disk is wiped when a new container starts. To preserve webhook payloads for debugging:
- Mount a **Railway Volume** and write captures there, OR
- Add a `/captures` endpoint that persists JSON files, but understand they vanish on `railway up`
- For production debugging, use an external log drain (Datadog, Logtail) or forward webhooks to a secondary store

**Prerequisites:**
```bash
# Install Railway CLI
curl -fsSL <url> | sh
```

**Login (headless server):**
```bash
# On the server:
railway login --browserless
# Copy the auth code, paste it into railway.app/verify in your browser

# OR use an Account Token:
export RAILWAY_TOKEN=<SECRET>
railway whoami
```

**Project setup (Flask/Gunicorn):**
```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["gunicorn", "-b", "0.0.0.0:8080", "-w", "1", "app:app"]
```

```json
// railway.json
{
  "$schema": "<url>",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "gunicorn -b 0.0.0.0:8080 -w 1 app:app",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Deploy:**
```bash
cd /path/to/project
railway init --name iclosed-whatsapp-groups
# Creates project on Railway

# If project exists but no service:
railway add --service iclosed-wa-groups

# Deploy
railway up

# Get HTTPS domain
railway domain
# → <url>
```

**Railway CLI gotchas in non-interactive mode:**
- `railway login` blocks without a TTY — use `--browserless` or Account Token
- `RAILWAY_TOKEN` env var does NOT work for CLI auth (use `RAILWAY_API_TOKEN` or rely on `~/.railway/config.json`)
- `railway service` requires `--service <name>` in scripts (no interactive picker)
- The first `railway up` may create only a project without a service — run `railway add --service <name>` then `railway up` again

### Polling Fallback
If webhooks aren't enabled (beta, Business/Enterprise only), add a cron:
```
*/5 * * * * python poll_bookings.py >> cron.log 2>&1
```
Calls `GET /v1/eventCalls/searchEventCall` and processes any new calls not in state.json.

### Service Deployment
```bash
# systemd service file at /etc/systemd/system/iclosed-wa-groups.service
# Type=simple, ExecStart=gunicorn with --certfile
sudo systemctl enable --now iclosed-wa-groups
```

**Important: This microservice handles WhatsApp group creation AND forwards to Convex.** The Convex webhook handler (`/iclosed/webhook/{secret}`) only stores RDV data in the Data OS — it does NOT create WhatsApp groups. Both services must coexist.

### Team + CEO Mapping Pattern

**Option A: Hardcoded (Recommended for reliability)**
When dynamic resolution fails repeatedly in production, hardcode the team directly in the webhook handler. This is what the user explicitly preferred after dynamic name-to-phone resolution proved unreliable with iClosed's inconsistent payload structure:

```python
team_phones = {
    "Team Member":    "+33*********",
    "Team Member":   "+33*********",
    "operator":  "+33*********",
}
# Always added to every group; only the lead is dynamic
```

**Option B: Dynamic resolution via config (only if iClosed payload is stable)**
Store team phone numbers in config.json and match by name/email. iClosed API returns `null` for phone numbers, so you MUST maintain a static mapping:
```json
{
  "team": {
    "setters": {"Team Member": {"phone": "+337...", "email": "<email@example.com>"}},
    "closers": {"Team Member Pinasco": {"phone": "+336...", "email": "<email@example.com>"}}
  },
  "ceo": {"operator": {"phone": "+336..."}}
}
```

If using Option B, implement 4 matching strategies (exact, partial, email, reverse partial) and always have a default closer fallback. See previous section for full `resolve_team_phone()` implementation.

### iClosed Webhook "Call booked" Payload — ACTUAL STRUCTURE (Production Verified)

**⚠️ The real webhook payload does NOT match iClosed's documentation.** Always log the full payload before trusting any field path.

**Real payload structure (observed in production):**
```json
{
  "event_type": {"uuid": 22084, "kind": "Round Robin", "slug": "s1ig", "name": "Découverte ClientOps Consulting", "duration": 45, "owner": {"type": "closer"}},
  "event": {
    "uuid": 1809761,
    "closerId": 31751,
    "closerName": "Team Member Pinasco",
    "closerEmail": "<email@example.com>",
    "closerTimezone": "Europe/Paris",
    "assigned_to": {"1": "Team Member Pinasco"},
    "extended_assigned_to": {"1": {"name": "Team Member Pinasco", "email": "<email@example.com>", "primary": true}},
    "start_time": "2026-05-03T10:00:00+02:00",
    ...
  }
}
```

**Key fields (use `event.` prefix, NOT `event_data.`):**
- `event.uuid` — the real call ID (integer, use this for API fallbacks)
- `event.closerName` / `event.closerEmail` — closer info
- `event.assigned_to` — often `{"1": "Team Member Pinasco"}` (dict with numeric string keys)
- `event.extended_assigned_to` — richer dict: `{"1": {"name": "...", "email": "...", "primary": true}}`
- `event.start_time` — call datetime

**What's NOT reliably present:**
- `event_data` — may be empty or missing entirely
- `setter_data` — does NOT exist in the real payload. Setter info is at `event.setter` and is often all empty strings.
- `invitee_data` — may be missing or empty; the real field is `invitee` (snake_case: `first_name`, `last_name`, `text_reminder_number`)
- `invitee.text_reminder_number` — frequently null or masked (`+33*********`)
- `phoneNumber` anywhere in the payload — iClosed masks it for privacy (`****`)

**Setter info in "Call booked" (from `event.setter`):**
```json
"setter": {
  "email": "",
  "firstName": "",
  "lastName": "",
  "name": " ",
  "setBy": {
    "email": "",
    "firstName": "",
    "lastName": ""
  }
}
```
When no setter is assigned, all fields are empty. When a setter IS assigned, `firstName` and `email` may be populated. Do NOT rely on this — hardcode the setter if you need them in the WhatsApp group.

**Setter inference:**
iClosed "Call booked" webhooks do NOT include setter information. You must either:
- Hardcode the setter (recommended — user preference after dynamic resolution failed)
- Infer from `event_type.owner.type` which is `"closer"` or `"setter"` but contains no name
- Use a static `team_phones` dict and always add the same setter to every group

**Lead data extraction (aggressive fallbacks required):**
```python
lead_first = (
    payload.get("invitee_data", {}).get("firstName")
    or payload.get("inviteeFirstName")
    or payload.get("inviteeName")
    or event.get("inviteeFirstName")
    or event.get("inviteeName")
    or "Client"
)
lead_phone = (
    payload.get("invitee_data", {}).get("text_reminder_number")
    or payload.get("invitee_data", {}).get("phoneNumber")
    or payload.get("phoneNumber")
    or payload.get("inviteePhone")
    or event.get("inviteePhone")
)
```

**Call ID for API fallback:**
```python
call_id = event.get("uuid") or event_data.get("uuid")  # prefer event.uuid
```

**Webhook URL to configure in iClosed:**
- Self-hosted: `<url>>:8787/webhook/iclosed`
- Railway: `<url>>.up.railway.app/webhook/iclosed`

Trigger: **Call booked**

### ⚠️ Critical Runtime Data Extraction Pitfalls

**1. `assigned_to` format is inconsistent**
iClosed sends `assigned_to` as EITHER a string `"Team Member Pinasco"` OR a dict `{"firstName": "Team Member", "lastName": "Pinasco", "email": "..."}`. Handle both:
```python
assigned_to = event_data.get("assigned_to")
if isinstance(assigned_to, dict):
    closer_name = assigned_to.get("name") or f"{assigned_to.get('firstName', '')} {assigned_to.get('lastName', '')}".strip()
    closer_email = assigned_to.get("email", "")
elif isinstance(assigned_to, str):
    closer_name = assigned_to
    closer_email = event_data.get("email", "")
else:
    closer_name = event_data.get("name", "")
    closer_email = event_data.get("email", "")
```

**2. Lead phone is OFTEN missing from the webhook**
`invitee_data.text_reminder_number` is frequently `null` in production webhooks. Always implement a **fallback to the iClosed API**:
```python
def fetch_call_details(call_id: str) -> dict | None:
    r = requests.get(
        f"{ICLOSED_URL}/eventCalls/searchEventCall",
        headers={"Authorization": f"Bearer {ICLOSED_KEY}", "Content-Type": "application/json"},
        params={"callId": call_id},
        timeout=15,
    )
    return r.json() if r.status_code == 200 else None

# In your webhook handler:
lead_phone = invitee_data.get("text_reminder_number") or invitee_data.get("phoneNumber")
if not lead_phone:
    call_details = fetch_call_details(call_id)
    if call_details:
        data = call_details.get("data", call_details)
        if isinstance(data, list): data = data[0]
        lead_phone = (
            data.get("inviteePhone")
            or data.get("phoneNumber")
            or data.get("text_reminder_number")
            or (data.get("invitee_data", {}) or {}).get("phoneNumber")
        )
```
If the lead has no phone anywhere, the group cannot include them — log loudly.

**Critical: iClosed API masks phone numbers (`+33*********`)**
The `/contacts` and `/eventCalls` endpoints both mask digits for privacy. **The webhook is the ONLY source for the complete phone number.** Do not rely on the iClosed API as a phone fallback — it will only give you a masked number. Always extract from the webhook payload first.

**3. iClosed API: correct endpoint for recent calls**
```
GET /v1/eventCalls?limit=20
```
Returns recent calls. `searchEventCall?callId=...` returns `{}` in production even for valid IDs. Use `/eventCalls` and filter client-side:
```python
r = requests.get(f"{ICLOSED_URL}/eventCalls", headers=headers, params={"limit": 20}, timeout=15)
calls = r.json().get("data", {}).get("eventCalls", [])
for call in calls:
    if str(call.get("callId")) == str(call_id):
        # call has: inviteeName, inviteeEmail, phoneNumber (MASKED), contactId, ...
        break
```

**4. Team phone resolution must be bulletproof**
iClosed only gives names/emails, not phone numbers. Your config maps names→phones. Use **4 matching strategies** in order:
```python
def resolve_team_phone(name: str, email: str, role: str) -> str | None:
    team_key = "setters" if role == "setter" else "closers"
    team_map = CFG.get("team", {}).get(team_key, {})
    name_norm = (name or "").strip()
    email_norm = (email or "").strip().lower()

    # 1. Exact name match (case-insensitive)
    for key, val in team_map.items():
        if key.lower() == name_norm.lower():
            return val["phone"]

    # 2. Config key starts with provided first name
    first_name = name_norm.split()[0] if name_norm else ""
    for key, val in team_map.items():
        if key.lower().startswith(first_name.lower()) and first_name:
            return val["phone"]

    # 3. Email match
    if email_norm:
        for key, val in team_map.items():
            if val.get("email", "").strip().lower() == email_norm:
                return val["phone"]

    # 4. Provided name starts with config key (reverse partial)
    for key, val in team_map.items():
        if name_norm.lower().startswith(key.lower()) and key:
            return val["phone"]

    return None
```

**4. Always have a default closer**
If no closer can be resolved from the webhook (empty `assigned_to`, missing mapping), fall back to the first configured closer so the group still gets created:
```python
if not closer_name:
    closers = CFG.get("team", {}).get("closers", {})
    if closers:
        closer_name = list(closers.keys())[0]
```

### ⚠️ NEW: "Call booked" trigger does NOT include lead phone number

**Production-verified finding (April 2026):** The iClosed "Call booked" webhook trigger sends a payload focused on the *event/call* data, not the *contact* data. **The lead's `phoneNumber` is NOT present in this payload.**

**Real "Call booked" payload structure:**
```json
{
  "event_type": {"uuid": 22084, "kind": "Round Robin", "slug": "s1ig", "name": "Découverte ClientOps Consulting", "duration": 45, "owner": {"type": "closer"}},
  "event": {
    "uuid": 1809761,
    "closerId": 31751,
    "closerName": "Team Member Pinasco",
    "closerEmail": "<email@example.com>",
    "closerTimezone": "Europe/Paris",
    "assigned_to": {"1": "Team Member Pinasco"},
    "extended_assigned_to": {"1": {"name": "Team Member Pinasco", "email": "<email@example.com>", "primary": true}},
    "start_time": "2026-05-03T10:00:00+02:00"
  }
}
```

**What's MISSING from "Call booked":**
- `phoneNumber` of the lead
- `invitee_data` (may be empty or missing)
- `setter_data` (setter info is NEVER sent)
- `text_reminder_number`

**What IS present:**
- `event.uuid` — real call ID (integer)
- `event.closerName` / `event.closerEmail`
- `event.assigned_to` = `{"1": "Team Member Pinasco"}` (dict with numeric string keys)
- `event.extended_assigned_to` = richer dict with `name`, `email`, `primary`

**The setter is NEVER in the "Call booked" payload.** If you need the setter in the WhatsApp group, you MUST hardcode them (user preference after dynamic resolution repeatedly failed).

**Solution: Use "Contact by status" trigger instead**
If you need the lead's phone number in the webhook, configure iClosed with:
- Trigger: **"Contact by status"**
- Status: **"Discovery call booked"** (or "Strategy call booked")
- Send last active status: **ON**
- Delay: **300 seconds**

The "Contact by status" payload is a *contact* payload that includes `phoneNumber` at the root level, per iClosed's own documentation. This is the ONLY reliable way to get the lead's unmasked phone number via webhook.

**CRITICAL (Production-verified April 2026): Even Q&A fields in "Call booked" are masked**

When iClosed DOES send lead data in the "Call booked" webhook, it uses these structures:

```json
{
  "invitee": {
    "first_name": "operator",
    "last_name": "TEST",
    "name": "operator TEST",
    "email": "<email@example.com>",
    "text_reminder_number": "+33*********",
    "uuid": 3301936,
    "previewUrl": "<url>"
  },
  "questions_and_answers": [
    {"question": "Email Address", "answer": "<email@example.com>"},
    {"question": "Phone Number", "answer": "+33*********"},
    {"question": "First Name", "answer": "operator"},
    {"question": "Last Name", "answer": "TEST"}
  ],
  "questions_and_responses": {
    "1_question": "Email Address",
    "1_response": "<email@example.com>",
    "2_question": "Phone Number",
    "2_response": "+33*********",
    "3_question": "First Name",
    "3_response": "operator",
    "Phone Number": "+33*********",
    "First Name": "operator"
  }
}
```

**Key observations:**
- **Use `invitee` (snake_case), NOT `invitee_data` (camelCase)** — the real payload has `invitee.first_name`, `invitee.last_name`, `invitee.text_reminder_number`
- `invitee_data` may exist in some payloads but is unreliable — always check `invitee` first
- `event.setter` (not `setter_data`) contains setter info, but fields are often empty strings when no setter is assigned
- `questions_and_answers` is an array of `{question, answer}` objects
- `questions_and_responses` is a flat dict with BOTH numbered keys (`1_question`, `1_response`) AND label keys (`"Phone Number": "..."`)
- **The question order varies by form configuration** — "Phone Number" might be `1_response` or `2_response`. Do NOT hardcode the number.
- **iClosed masks the phone number everywhere**: `+33*********` — even in the webhook Q&A fields

**Phone extraction (handles both formats and variable ordering):**
```python
def extract_lead_phone(payload: dict) -> str | None:
    invitee = payload.get("invitee", {})
    # Direct field on invitee
    phone = invitee.get("text_reminder_number") or invitee.get("phoneNumber")
    if phone and "****" not in phone:
        return phone

    # Questions & Answers array format
    for qa in payload.get("questions_and_answers", []):
        if "phone" in qa.get("question", "").lower():
            ans = qa.get("answer", "")
            if ans and "****" not in ans:
                return ans

    # Questions & Responses dict format (label keys)
    qnr = payload.get("questions_and_responses", {})
    for key, val in qnr.items():
        if "phone" in key.lower() and "_question" not in key:
            if val and "****" not in val:
                return val

    return None
```

**The iClosed API also masks phone numbers**
```python
# ALL of these endpoints return masked numbers:
GET /v1/contacts          → "phoneNumber": "+33*********"
GET /v1/eventCalls        → "phoneNumber": "+33*********"
GET /v1/eventCalls/searchEventCall  → returns {} in production (unreliable)
```

**Conclusion:** There is NO way to get an unmasked lead phone number from iClosed's "Call booked" trigger or from their REST API. The number is masked by design for privacy compliance.

**If stuck with "Call booked":**
You can only create groups with:
- The fixed team (CEO + closer + setter, all hardcoded)
- The lead CANNOT be added by phone because the number is masked/unavailable

In this case, the group should still be created with the team members, and the lead must be added manually or via a separate workflow that uses the "Contact by status" trigger (the only trigger documented to include an unmasked `phoneNumber` at the contact root level).

### Webhook Capture for Debugging

Railway wipes logs and disk files on every redeploy. The only reliable capture during a deploy session is an **in-memory buffer**.

**Pattern: In-Memory Buffer + HTML Inspector**
```python
from flask import render_template_string

webhook_buffer: list[dict] = []
MAX_BUFFER = 50

def capture_webhook(payload: dict, source: str = "iclosed"):
    """Store in memory (survives redeploys as long as container runs)."""
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "payload": payload,
    }
    webhook_buffer.insert(0, entry)
    if len(webhook_buffer) > MAX_BUFFER:
        webhook_buffer.pop()

# Endpoints
@app.route("/inspect", methods=["GET"])
def inspect_webhooks():
    """Dark-themed HTML page to browse webhooks visually."""
    items = [{
        "ts": e["ts"],
        "source": e["source"],
        "payload_json": json.dumps(e["payload"], indent=2, ensure_ascii=False),
    } for e in webhook_buffer]
    return render_template_string(INSPECT_HTML, items=items, count=len(webhook_buffer))

@app.route("/inspect/json", methods=["GET"])
def inspect_webhooks_json():
    return jsonify({"count": len(webhook_buffer), "webhooks": webhook_buffer})

@app.route("/inspect/latest", methods=["GET"])
def inspect_latest_json():
    if not webhook_buffer:
        return jsonify({"error": "No webhooks in buffer"}), 404
    return jsonify(webhook_buffer[0])
```

**HTML template (`INSPECT_HTML`)**: Dark GitHub-style theme with monospace font, scrollable `<pre>` blocks, timestamp badges. The user can open `/inspect` in a browser and see every webhook received since the last deploy — formatted, colored, and timestamped.

**Why this works on Railway:**
- Railway's filesystem is ephemeral (wiped on every `railway up` or container restart)
- In-memory data persists as long as the container is running
- 50 webhooks is usually enough for a debug session
- Zero external dependencies (no DB, no volume mount)

**Fallback to disk (best-effort):**
You can ALSO write to disk as a secondary capture — files survive container crashes but disappear on redeploy:
```python
def capture_webhook(payload: dict, source: str = "iclosed"):
    # 1. Memory (primary, always works)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), "source": source, "payload": payload}
    webhook_buffer.insert(0, entry)
    # ... trim buffer ...

    # 2. Disk (secondary, ephemeral on Railway)
    try:
        CAPTURE_PATH.mkdir(exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
        with open(CAPTURE_PATH / f"{source}_{ts}.json", "w") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
    except Exception:
        pass  # non-fatal
```

**Endpoint summary:**
| URL | Purpose |
|-----|---------|
| `/inspect` | HTML visual inspector (dark theme, human-readable) |
| `/inspect/json` | All buffered webhooks as JSON |
| `/inspect/latest` | Single most recent webhook as JSON |
| `/captures` | Disk-based captures list (ephemeral) |
| `/captures/latest` | Most recent disk capture (falls back to memory) |

**Pro tip:** Open `/inspect` on your phone while testing iClosed bookings. You'll see the webhook appear within 2 seconds of the booking — no need to tail logs or SSH into the server.

## Health Check & Troubleshooting

When groups stop being created, test Wasender directly:

```bash
curl -s -X POST "<url>" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "<email@example.com>", "text": "ping"}'
```

**Expected:** `{"success": true, ...}`  
**Subscription expired:** `{"success": false, "message": "Your trial has expired..."}` → renew on wasenderapi.com  
**Session disconnected:** `{"success": false, "message": "Your Whatsapp Session is not connected..."}` → reconnect WhatsApp in Wasender dashboard (scan QR code)

> Do NOT use `/api/sessions` or `/api/me` as health checks — both return 404 HTML.

## Architecture: Local Service vs Convex (Critical Distinction)

**These are NOT interchangeable.** They serve completely different purposes:

| Component | Creates WhatsApp Group? | Stores RDV in Data OS? | Purpose |
|---|---|---|---|
| **Local microservice** (`app.py`) | ✅ Yes — calls Wasender API | ✅ Yes — forwards raw payload to Convex | **Primary webhook receiver** from iClosed |
| **Convex** (`iclosedWebhook.ts`) | ❌ No — only stores data | ✅ Yes — upserts RDV, runs KPI logic | **Data OS / analytics layer** |

**Correct flow:**
```
iClosed webhook → Local microservice (port 8787)
    ├─→ Wasender API → WhatsApp group created
    └─→ Forward raw payload → Convex /iclosed/webhook/{secret}
        └─→ Data OS: RDV stored, KPIs updated
```

**iClosed only supports ONE webhook URL.** Therefore:
- The local microservice MUST remain the primary receiver
- It creates the WhatsApp group FIRST, then forwards to Convex
- You CANNOT point iClosed directly at Convex if you need WhatsApp groups

**Config for dual-forwarding:**
```json
{
  "convex": {
    "webhook_url": "<url>>.convex.site/iclosed/webhook",
    "webhook_secret": "<64-char-hex>"
  }
}
```
The local service appends `/{secret}` to `webhook_url` when forwarding.

### Why NOT point iClosed directly at Convex?
Convex's `iclosedWebhook.ts` normalizes and stores the payload for Data OS analytics. It has **zero Wasender integration** and will never create a WhatsApp group. If you need both Data OS tracking AND group creation, the local service must sit in front.

## Migrating Webhook Endpoints

If you need to change where iClosed sends webhooks:

1. **Keep the local service running** if you need WhatsApp groups
2. Update the webhook URL in iClosed dashboard:
   - **For group creation + Data OS:** `<url>>:8787/webhook/iclosed` (local service)
   - **For Data OS only:** `<url>>.convex.site/iclosed/webhook/<secret>` (Convex directly — no groups)
3. If switching TO local service: make sure `config.json` has the Convex forward config
4. If switching TO Convex directly: understand that **WhatsApp groups will stop being created**
5. Test with a simulated payload before asking the user to book a real call

## Known Issues
- **Session disconnects silently**: Wasender requires the WhatsApp phone to stay online. Restarting the phone, WhatsApp app updates, or multi-device changes can drop the session without notice. Re-scan the QR code on wasenderapi.com.
- **Subscription vs session are separate errors**: renewing the plan does NOT auto-reconnect the WhatsApp session. Check both.
- Rate limits: check `X-RateLimit-*` headers in response
- Wasender may return HTML (404 page) for wrong URL format — always check `r.status_code` and `r.headers["content-type"]`
- `/api/sessions` on wasenderapi.com returns 404 (not a valid endpoint)
- Self-signed cert warning: if iClosed future updates reject self-signed certs, switch to Cloudflare Tunnel or a proper domain + Let's Encrypt
