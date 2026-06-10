---
name: ghl-api
description: GoHighLevel API integration for ClientOps — appointments, contacts, opportunities, pipelines. Includes known pitfalls and workarounds.
tags: [ghl, gohighlevel, crm, clientops, api]
---

# GoHighLevel API — ClientOps

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Authentication

- Token format: `<PRIVATE_TOKEN>`
- Header: `Authorization: Bearer <token>`
- Version header required: `Version: 2021-07-28`
- Base URL: `<url>
- Tokens stored in Hermes memory — check memory for current tokens
- **Multi-account**: each sub-account has its own token + locationId (see Multi-Sub-Account Setup below)

## Quick Test

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" \
  "<url>"
```
- 200 = OK, 401 = token expired/revoked
- 403 can mean TWO different things:
  - Body contains `error code: 1010` → Cloudflare/IP blocked (network egress issue)
  - JSON body `The token does not have access to this location.` → token valid but wrong location scope/permission

## 403 Troubleshooting Playbook (important)

1. Test from terminal and from browser egress (if available).
2. If terminal returns `1010` but browser returns JSON 403, trust browser result for auth diagnosis.
3. If message is `token does not have access to this location`:
   - token is valid,
   - target `locationId` is wrong for that token OR token lacks location grant.
4. Do not keep retrying random endpoints — ask for either:
   - correct locationId for that token, or
   - new token with access to the expected location.
5. For API v2 (`services.leadconnectorhq.com`), ignore old v1 fallback (`rest.gohighlevel.com`) with private integration tokens; it will return 401 and adds noise.

## Agency Token Scope Test

When a new agency-level `pit-*` token is provided, do not assume it covers all sub-accounts. Test scope explicitly:

1. Use a browser-like `User-Agent`; terminal curl without one can hit Cloudflare `error code: 1010`, which is a false network/egress negative rather than an auth result.
2. Call `GET /locations/search?limit=100` with headers:
   - `Authorization: Bearer <token>`
   - `Version: 2021-07-28`
   - `User-Agent: Mozilla/5.0`
3. Count visible locations.
4. Sample `GET /locations/{locationId}` for the first 10-25 returned locations to confirm read access.
5. Report counts and sampled success only; never dump full location payloads or tokens.

Success signal: `/locations/search` returns `200` with many locations and sampled location reads return `200`. If search returns `403` body `error code: 1010`, retry with the browser-like UA before declaring the token bad.

## Key Endpoints

### Contacts
```
GET /contacts/?locationId={loc}&limit=100&sortBy=date_added&order=desc
GET /contacts/{contactId}
GET /contacts/{contactId}/appointments
```

### Calendars
```
GET /calendars/?locationId={loc}
GET /calendars/events?locationId={loc}&calendarId={id}&startTime={iso}&endTime={iso}
```

### Opportunities (Pipelines)
```
GET /opportunities/search?location_id={loc}&pipeline_id={id}&limit=100
GET /opportunities/pipelines?locationId={loc}
```

### Location
```
GET /locations/{locationId}
```

## ⚠️ CRITICAL PITFALL: Calendar Events Endpoint Often Returns Empty

The `/calendars/events` endpoint requires `calendars.readonly` scope on the API token. Even with valid auth (200 response), it returns `{"events": []}` if the scope is missing. No error is thrown — it silently returns empty.

**Workaround: Use the Opportunities/Pipeline approach instead.**

The **Closing pipeline** (`pkjQcuQnJa5CScdDne7Q`) tracks all booked appointments with stages:
- `RDV Booké (non-trié)` — new bookings
- `RDV Qualifié (trié)` — qualified bookings  
- `Replanifié` — rescheduled
- `No-Show` — no-shows
- `Annulé` — cancelled
- `R2` — second round
- `Closé` / `Non-Closé` — outcome
- `Acompte` — deposit paid

Filter by `createdAt` date to get bookings for a specific period.

## Pipeline IDs (ClientOps)

| Pipeline | ID | Purpose |
|----------|-----|---------|
| Closing | `pkjQcuQnJa5CScdDne7Q` | Sales appointments |
| Clients | `jK8Dn5BBV9h9316Rs8NN` | Client lifecycle |
| Mastermind IAO | `JrRT2VDxPMyFkmN9t2i3` | IAO program |
| Triage Skool | `aws310JeJiani6XZgZcV` | Skool lead triage |
| Webinar | `jVqzMBO9Gb6mXYYsEIzZ` | Webinar funnel |
| Sous-traitance commerciale | `DH5qCQAIO0euRXf7DCBF` | Commercial subcontracting |
| Sous-traitance technique | `ynZLFjppwpumlz28v0f6` | Technical subcontracting |

## Calendar IDs (ClientOps)

| Calendar | ID | Type |
|----------|-----|------|
| Appel Commercial | `C2T87NBRviKdxNObtv3l` | Round Robin |
| (B) Relance Annulation | `HHkzNh3ig8fNDLuqUB0n` | Round Robin |
| Webinar | `J04US4kKKQ7jd5UW3W2I` | Event |
| Coaching Scaling VIP | `t9I28jvCYjt4WhaZ7UWr` | Round Robin |
| (LP) Appel stratégique | `uRoyEgm38nrWomq1oq7G` | Round Robin |
| (GH) Appel stratégique | `xCW157e6aED6ZlIRdbFu` | Round Robin (inactive) |
| Clarté Mastermind IAO | `yIeCW33Fv3KThNWYMBHl` | Round Robin |

## Calendar slot interval fix

When ClientOps asks why booked calls start at `:30` and block two commercial slots, the GHL calendar setting is `slotInterval`.

- Endpoint: `PUT <url>}`
- Headers: `Authorization: Bearer <token>`, `Version: 2023-02-21`, `Content-Type: application/json`
- Body fields: set `slotInterval: 60`, `slotIntervalUnit: "mins"` to show only hourly start slots. Keep `slotDuration` as the meeting length unless explicitly changing call duration.
- For Clarté Mastermind IAO: calendar ID `yIeCW33Fv3KThNWYMBHl`.
- Required token scope: `calendars.readonly` to inspect and `calendars.write`/calendar update permission to modify. A contact/opportunity-only private integration token returns `401 {"message":"The token is not authorized for this scope."}` for both `GET /calendars/{id}` and `PUT /calendars/{id}` — do not keep retrying; ask for a new GHL private integration token with Calendars read/write or have the user change it in UI.

## User IDs
- operator (primary): `B3IFjfniSTGppMD14rRT`
- operator: `d9kEQUvO8CU7p99DD5oJ` (on Clarté IAO calendar)

## JSON Parsing Pitfall

GHL API responses can contain control characters that break `json.loads()`. Always use `strict=False`:
```python
data = json.loads(response, strict=False)
```
Or save to file first and parse separately — large responses (170KB+) for opportunity searches are common.

## Multi-Sub-Account Setup

GHL has multiple sub-accounts (locations), each with its own token/locationId pair:
- **ClientOps main / ClientOps Consulting Group**: locationId `htXufAduMQ4zeIZZ8SqT` (verified with token `<PRIVATE_TOKEN>` during 2026-05 YouTube promo send)
- **Sculpt My Body / old event-form token**: locationId `AGy9k1exsQqImudJoHgg` — do not assume this is ClientOps; it is a client sub-account despite old memory/scripts naming it ClientOps.
- **AIOS**: token `<PRIVATE_TOKEN>`, locationId `TU7igZY4tymlVSJQ6B29`

Always verify which sub-account the user means before making API calls. The location name is returned by `GET /locations/{locationId}`.

### Sending individual emails through Conversations API

GHL marketing campaign/broadcast endpoints are not reliably available via private integration tokens. For an approved send to a known contact set, the working endpoint is:

```bash
POST <url>
Authorization: Bearer <token>
Version: 2021-07-28
Content-Type: application/json

{
  "type": "Email",
  "contactId": "<contactId>",
  "subject": "...",
  "html": "<p>...</p>",
  "message": "plain-text fallback"
}
```

Success returns `201` with `"msg":"Email queued successfully."` plus `messageId`/`conversationId`.

Bulk-send discipline:
1. Confirm the token's location with `GET /locations/{id}` before sending; do not trust old stored IDs.
2. Fetch contacts paginated from `/contacts/?locationId=<loc>&limit=100`; use `meta.nextPageUrl` until empty.
3. Filter out missing/invalid emails, duplicates, and email DND contacts before sending.
4. Log recipients and send responses to `/workspace/outputs/.../*.jsonl` before/while sending.
5. Rate-limit requests (about 0.3-0.5s between sends) and retry only transient 429/5xx errors.
6. This is a real outbound blast: require explicit user confirmation of audience + subject + body before execution.

## ⚠️ CRITICAL PITFALL: Pipeline & Lost Reason Management is UI-ONLY

**GHL API v2 does NOT have POST/PUT/DELETE endpoints for pipelines or lost reasons.** This is confirmed in the official docs (marketplace.gohighlevel.com/docs) — the Pipelines section only contains `GET /opportunities/pipelines` and Lost Reason section only contains `GET /opportunities/lost-reason`.

This means:
- You CANNOT create, update, or delete pipelines via API — no matter what scopes the token has
- You CANNOT create or manage lost reasons via API
- The 401 "not authorized for this scope" error on `POST /opportunities/pipelines` is misleading — the endpoint doesn't exist, not just a scope issue

**What you CAN do via API:**
- Create/update/delete individual **opportunities** (`POST /opportunities/`, `PUT /opportunities/{id}`)
- Move opportunities between stages (by updating `pipelineStageId`)
- Read pipeline structure and lost reasons

**Workflow for new pipelines:**
1. Design the pipeline structure (stages, order, lost reasons) before touching GHL
2. Give user the exact structure — they create it manually in UI (<5 min)
3. Once created, use API to manage opportunities within the pipeline

## Scope Diagnostics — What the Token Can/Cannot Do

**Always scope-test on first use of a new token** — don't assume write operations work:

**Verified scope matrix (AIOS token, 2026-04-21):**

| Operation | Result | Notes |
|-----------|:------:|-------|
| `GET /contacts/` | ✅ 200 | |
| `POST /contacts/` | ✅ 201 | Creates contacts OK |
| `GET /calendars/` | ✅ 200 | |
| `GET /opportunities/search` | ✅ 200 | |
| `GET /opportunities/pipelines` | ✅ 200 | |
| `POST /opportunities/` | ✅ 422 | Auth OK, validation error (needs contactId) |
| **`POST /opportunities/pipelines`** | ❌ 401 | Endpoint doesn't exist in API v2 |
| **`PUT /opportunities/pipelines/{id}`** | ❌ 401 | Endpoint doesn't exist in API v2 |
| **`POST /forms/`** | ❌ 401 | IAM Service — UI-only |
| **`POST /custom-fields/`** | ✅ 422 | Auth OK, validation error |
```bash
# Quick scope audit
for ep in "GET /contacts/?locationId=LOC&limit=1" "GET /calendars/?locationId=LOC" "GET /opportunities/pipelines?locationId=LOC" "POST /opportunities/pipelines"; do
  method=$(echo $ep | cut -d' ' -f1)
  path=$(echo $ep | cut -d' ' -f2)
  echo -n "$method $path → "
  if [ "$method" = "POST" ]; then
    curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Version: 2021-07-28" -H "Content-Type: application/json" -d "{\"locationId\":\"$LOC\",\"name\":\"scope_test\"}" "$BASE$path"
  else
    curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" -H "Version: 2021-07-28" "$BASE$path"
  fi
  echo
done
```

## Pipeline IDs (AIOS)

| Pipeline | ID | Purpose |
|----------|-----|---------|
| Acquistion CRM | `lAHEw35WQKAXSLLM8XcN` | Sales pipeline — stages below |

### AIOS Acquisition Pipeline Stages (pipeline `lAHEw35WQKAXSLLM8XcN`)

```
ACTIFS :
  1. Nouveau Lead
  2. Qualification
  3. Audit R1          ← R1 fait, book R2 pendant l'appel, maquette préparée entre les deux
  4. Closing R2
  5. En attente paiement
  6. Closé              ← WON

PARKING (vivants mais bloqués — pas des lost) :
  7. Non qualifié       ← peut revenir plus tard
  8. No Show            ← workflow auto replanification
  9. Relance            ← tags: post-r1, post-r2, no-show-failed
```

**Lost reasons (2 uniquement — lead a dit NON catégoriquement):**
- Pas intéressé après R1
- Pas intéressé après R2

**Design rationale:**
- No Show est un STAGE séparé de Relance car ils déclenchent des workflows différents (No Show = SMS auto + tâche Team Member; Relance = email de suivi + tâche Team Member)
- "Maquette" n'est PAS un stage — quand R2 est booké dans R1, la maquette est une tâche interne, pas une colonne du pipe
- "Non qualifié" est un stage (pas un lost reason) car un lead non qualifié aujourd'hui peut l'être dans 3 mois
- On ne passe en Lost QUE quand le lead dit un non catégorique

**Workflows par stage parking:**
- **No Show** → SMS auto "désolé de vous avoir manqué" + email + tâche Team Member rappel sous 2h → rebook → Audit R1 / 3 tentatives → Relance
- **Relance** → email de suivi adapté (post-r1/post-r2) + tâche Team Member à J+3, J+7, J+14 → revient → Audit R1 ou Closing R2 / muet 30j → Lost
- **Non qualifié** → cron mensuel ressort les leads, Team Member refait un tour

**Custom fields for Data OS tracking:**
- `source_lead` (dropdown: linkedin_setting, cold_call, cold_email, apporteur_affaires, organique, sites_freelance)
- `situation_actuelle`, `blocages`, `objectif` (text — contexte qualif)
- `budget`, `ca_actuel`, `deal_value` (number — revenue tracking)
- `ok_proposition` (checkbox — R1→R2 conversion)
- `date_qualification`, `date_r1`, `date_r2`, `date_closing` (date — velocity)

**Conversion tracking by stage:**
```
Taux qualification = Qualification / Nouveau Lead
Show-up rate       = Audit R1 / (Audit R1 + No Show)
Taux proposition   = Closing R2 / Audit R1
Taux closing       = (En attente paiement + Closé) / Closing R2
Taux paiement      = Closé / En attente paiement
No-show recovery   = Audit R1 depuis No Show / Total No Show
```

## Pipeline Design — Sales Funnel Pattern

When creating a sales pipeline in GHL for an agency, follow this structure:

**Stage rules:**
- R1 and R2 should be SEPARATE stages (audit ≠ closing, different conversion metrics)
- No Show should be its own stage (triggers different workflow than Relance)
- "En attente paiement" should be its own stage (separates "said yes" from "paid")
- Lost reasons are UI-only — API doesn't support create/update

**What's a stage vs a tag:**
- If it's a distinct CONVERSION POINT (audit→proposition, proposition→close) → STAGE
- If it's a REPEAT ACTION (follow-up attempt, R3, R4) → TAG within a stage
- If it triggers a DIFFERENT WORKFLOW → separate STAGE (even if similar)
- If it's just metadata → TAG

**Lost vs Parking philosophy:**
- Lead says NON catégorique → Lost reason (the only way to truly close)
- Lead didn't qualify, no-showed, or went silent → Parking stage (alive, can come back)
- Don't use Lost for "abandoned" or "no-show" — those are recovery opportunities

**Dashboard-friendly custom fields:**
- Source tracking as dropdown (not text) — enables grouping in reports
- Dates at each stage transition — enables velocity calculations
- Deal value as currency — enables revenue dashboards
- Boolean checkboxes at conversion points — enables rate calculations

**Pipeline creation workflow (UI-only):**
1. Design on paper first (stages, lost reasons, workflows per stage)
2. Give user exact structure: stage names in order + lost reasons
3. User creates in GHL UI (<5 min)
4. Verify via API: `GET /opportunities/pipelines?locationId={loc}`
5. Manage opportunities via API from that point on

## Forms vs Contacts API Permissions (critical)

Private integration tokens (`pit-*`) can CREATE contacts (`POST /contacts/`) but CANNOT create forms (`POST /forms/` → 401 "IAM Service").
**Workaround**: Build a standalone HTML form with a serverless backend that calls `POST /contacts/` to create contacts with tags. See `ghl-standalone-form` skill.

## Counting Appointments for a Period

Since calendar events endpoint is unreliable, use this approach:

1. Fetch opportunities from Closing pipeline: `GET /opportunities/search?location_id={loc}&pipeline_id=pkjQcuQnJa5CScdDne7Q&limit=100`
2. Save response to file (can be 170KB+): `curl ... > /tmp/ghl_data.json`
3. Parse and filter by `createdAt` date range
4. Group by `pipelineStageId` for status breakdown
5. Note: `limit=100` is max per page — paginate with `startAfterId` if needed


## Consolidated reference: standalone forms

The previous `ghl-standalone-form` skill is now a reference under this umbrella. Use it when GHL form API scopes are unavailable and an event RSVP or lead form must submit through a small serverless backend into GHL contacts/opportunities.
