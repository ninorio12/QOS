---
name: calendly-api
description: Operate Calendly API integrations — PAT/OAuth setup, API verification, event type discovery, scheduled event + invitee retrieval, webhooks, and Cloudflare 1010 workaround.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [calendly, calendar, scheduling, bookings, api, integration]
    related_skills: [ghl-api, typeform-api, wasender-api]
---

# Calendly API

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this skill when connecting Calendly, auditing booking sources, listing upcoming meetings, fetching invitee details, or wiring Calendly into a CRM/Data OS/agent workflow.

## Core rule

Do not stop at `/scheduled_events`: it gives event shells. For names, emails, phone numbers, and Q&A, fetch invitees for each event via `/scheduled_events/{uuid}/invitees`.

## Setup / token handling

1. Store secrets in env, never in wiki/output/chat:
   ```bash
   CALENDLY_API_TOKEN=...
   ```
2. Prefer project/user env path already in use, e.g. `~/.hermes/.env` for Hermes operations.
3. Set file permissions after writing secrets:
   ```bash
   chmod 600 ~/.hermes/.env
   ```
4. Verify identity first:
   ```bash
   curl -sS -f <url> \
     -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
     -H "Accept: application/json" \
     -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
   ```

## Cloudflare 1010 pitfall

Calendly API may reject Python `urllib`/default clients with Cloudflare **Error 1010: browser_signature_banned**, even when the token is valid.

Fix: use `curl` or an HTTP client with a browser-like `User-Agent`:

```text
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36
```

If `users/me` returns 403 with `error_code: 1010`, do **not** assume the token is invalid. Retry with the UA above.

## Common API calls

### Create a one-off event type via API

Calendly's API can create event types, but it is picky:
- `POST /event_types` **requires** `owner` (the current user URI from `/users/me`). If omitted, API returns `400 {"parameter":"owner","message":"is missing"}`.
- A newly created event type may return `active: false`; patch it active afterward.
- To use Google Meet, patch `locations: [{"kind":"google_conference"}]`.

Minimal flow:
```python
import requests, os
headers = {
  "Authorization": f"Bearer {os.environ['CALENDLY_API_TOKEN']}",
  "Accept": "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0",
}
me = requests.get("<url>", headers=headers, timeout=30).json()["resource"]
payload = {
  "name": "AIOS — Audit IA Entreprise",
  "duration": 45,
  "owner": me["uri"],
  "kind": "solo",
  "slug": "audit-ia-entreprise",
  "description": "Audit gratuit pour identifier les fonctions de l’entreprise à agentiser.",
}
et = requests.post("<url>", headers=headers, json=payload, timeout=30).json()["resource"]
uuid = et["uri"].rstrip("/").split("/")[-1]
requests.patch(
  f"<url>}",
  headers=headers,
  json={"active": True, "locations": [{"kind": "google_conference"}]},
  timeout=30,
)
```

Verify with `GET /event_types/{uuid}` and check `active`, `duration`, `scheduling_url`, and `locations`.

### Current user

```bash
curl -sS -f <url> \
  -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
  -H "Accept: application/json" \
  -H "User-Agent: $BROWSER_UA"
```

Important returned fields:
- `resource.uri` — user URI for user-scoped event types.
- `resource.current_organization` — organization URI for scheduled events.
- `resource.scheduling_url` — public Calendly base URL.

### Event types

```bash
curl -sS -f "<url>" \
  -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
  -H "Accept: application/json" \
  -H "User-Agent: $BROWSER_UA"
```

Report: name, active status, duration, scheduling URL.

### Upcoming scheduled events

```bash
curl -sS -f "<url>" \
  -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
  -H "Accept: application/json" \
  -H "User-Agent: $BROWSER_UA"
```

Filter by `status == active` unless the user explicitly asks for canceled events too.

### Invitee details for each event

```bash
curl -sS -f "<url>" \
  -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
  -H "Accept: application/json" \
  -H "User-Agent: $BROWSER_UA"
```

Extract:
- `name`
- `email`
- `text_reminder_number` (often the phone number)
- `questions_and_answers[]`
- `status`

## Output format for upcoming RDV

For Telegram, avoid tables. Use grouped bullets:

```md
## Aujourd’hui — Mar. 5 mai
- **16:00–16:45** — ClientOps - Candidature
  Prospect : **Name**
  Email : `<email@example.com>`
  Tél : `+33 ...` / non renseigné
  Host : Host Name
```

Always state timezone, usually “heure France”, after converting UTC to `Europe/Paris`.

## Minimal Python pattern

Use `subprocess.run(curl...)` or `requests` with browser UA. Avoid `urllib` defaults.

Pseudo-flow:

1. Load `CALENDLY_API_TOKEN`.
2. `GET /users/me`.
3. Use `current_organization` to query `/scheduled_events` for the target date window.
4. Keep active events.
5. For each event, parse UUID from `event.uri` and call `/scheduled_events/{uuid}/invitees`.
6. Convert times from UTC to `Europe/Paris`.
7. Present grouped by date, with prospect/contact/host.

## Verification checklist

- `users/me` returns 200.
- Event types count matches expected public booking pages.
- Upcoming events count includes active/canceled distinction.
- Invitee fetch succeeds for each event.
- Phone numbers are checked in `text_reminder_number` and Q&A answers, not guessed.
- No token appears in output, logs, wiki, or memory.

## ClientOps / Data OS integration pitfall

For ClientOps dashboard, Calendly bookings must not stop at `setterLeads`/setter pipe. The post-call debrief UI (`/sales/debrief`) is RDV-first and reads the Convex `rdv` table via `callDebriefs:listPendingWithRdv`. If Calendly only marks a setter lead as booked, the booking disappears from post-call debriefs. Create/upsert a first-class `rdv` row with `source: "calendly"`, guest fields, event times, `calendlyInviteeUri` dedupe index, and `linkPrefix: "calendly"`; then backfill existing self-booked setter leads. See `references/clientops-calendly-rdv-dataos-2026-05.md`.

## ClientOps note

Session-specific details and a known-good helper pattern are captured in `references/clientops-calendly-2026-05.md`.

### Updating event type settings pitfall

Calendly Public API `PATCH /event_types/{uuid}` cannot update round-robin / non-solo event types. It returns `400 {"message":"Cannot update a non solo event type"}` even for harmless scheduling fields. For ClientOps `ClientOps - Candidature` (`d249b493-da9c-4282-aab8-32d798cefff1`, round_robin), start-time increment / slot interval must be changed in Calendly UI unless valid browser session automation is available.

UI path: Calendly → Event Types → `ClientOps - Candidature` → Scheduling settings / Availability → **Start time increments** = `60 minutes`. Keep meeting duration separate unless the user explicitly wants calls to last 60 minutes.

### Troubleshooting Discord booking alerts not visible in calendar

When operator/Mino says a Discord “nouvel appel / appel de clarté réservé” alert is missing from the agenda, do not assume Calendly is wrong. Verify in this order:
1. Calendly `/scheduled_events` for the target day, including invitees; search active and canceled by name/email.
2. ClientOps Data OS `rdv:listRdvByDateRange` for the same Europe/Paris day.
3. iClosed live if the alert could come from iClosed: `<url> with `eventType=UPCOMING` then `ALL`.
4. Discord alert channel messages only as evidence of the notification, not source of truth.

If the person exists in old sales/payment records but not in the live booking sources, call out likely bot/source desync instead of inventing a calendar explanation.
