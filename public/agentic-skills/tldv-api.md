---
name: tldv-api
description: "tl;dv API integration — fetch meetings, transcripts, and notes. Correct endpoint, auth, and Cloudflare workaround."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [tldv, transcriptions, meetings, API, clientops]
    related_skills: [generate-cdc, aios-blueprint]
---

# tl;dv API Integration

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Fetch meetings and transcripts from tl;dv's REST API. Hard-won knowledge — the API is undocumented and required reverse-engineering from the `tldv-mcp` npm package.

## API Details

| Field | Value |
|-------|-------|
| **Base URL** | `<url> |
| **Auth header** | `x-api-key: <TLDV_API_KEY>` |
| **Env var** | `TLDV_API_KEY` (in `~/.hermes/.env`) |
| **API docs** | `<url> (requires Business plan) |
| **MCP server** | `tldv-mcp` npm package (source of truth for endpoints) |

## Critical Pitfalls

See also `references/public-link-auth-triage.md` for the fast triage when a user shares a tl;dv record URL and asks for transcript/requests extraction.

1. **Domain is `pasta.tldv.io` NOT `pasta.tldv.tech`** — `.tech` returns AuthorizationRequired on every request. This is the #1 gotcha.
2. **User-Agent header is REQUIRED** — Cloudflare returns 403 without it. Use `User-Agent: Mozilla/5.0 (compatible; Hermes/1.0)` or similar.
3. **Don't send Authorization header** — only `x-api-key` works. Sending both causes issues.
4. **Transcript format** is `{id, meetingId, data: [{speaker, text, startTime, endTime}]}` — the segments are nested in `.data`, not at root level.
5. **Meetings list** returns `{results: [...], total: N}` — paginate with `limit` and `offset` params. De-dupe IDs when paginating; offsets can return repeated recent meetings.
6. **Meeting detail may omit explicit timestamps** — recent API objects can lack `startedAt/createdAt`. tl;dv meeting IDs are ObjectId-like; the first 8 hex chars decode to a UTC creation timestamp. Use it only as a fallback and label it as inferred.
7. **For “yesterday at 19h” checks** — convert Europe/Paris ↔ UTC explicitly, query multiple pages, then cross-check local `/workspace/raw/transcriptions/` and Convex `transcriptions:listTranscriptions` before saying “not found”.
8. **For “latest call today” / “call from earlier” checks** — do not trust title search alone. List recent meetings, infer timestamps from ObjectId when explicit times are missing, filter by Europe/Paris date, then check transcripts and speaker samples. If the expected call is absent but likely recent, say it has not appeared yet and schedule a one-shot recheck in 30–60 minutes; tl;dv uploads/syncs can lag.
9. **For collaborator-name lookups (e.g. “call with Wilfried”)** — the meeting title may be generic (`Claude - hermes`) and title/participant search can miss it. After searching by name, inspect the latest meetings' transcripts for the speaker name or topic snippets before concluding not found.
10. **Video previews are not guaranteed** — the meetings list can sync correctly while returning zero thumbnails. For UI previews, try detail fallback + candidate thumbnail fields + OG scraping, then measure hit-rate before investing more. See `references/video-previews.md`.

## Endpoints

```
GET /meetings?limit=50&offset=0           → List meetings
GET /meetings/{meetingId}                  → Meeting details
GET /meetings/{meetingId}/transcript       → Full transcript
GET /meetings/{meetingId}/highlights       → AI highlights
```

## Python Example (urllib — no deps)

```python
from urllib.request import Request, urlopen
import json, os

TLDV_KEY = os.getenv("TLDV_API_KEY")
API_BASE = "<url>"

def tldv_get(endpoint, params=None):
    url = f"{API_BASE}/{endpoint}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = Request(url, headers={
        "x-api-key": TLDV_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Hermes/1.0)",
    })
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

# List meetings
data = tldv_get("meetings", {"limit": "50", "offset": "0"})
meetings = data["results"]  # total in data["total"]

# Get transcript
transcript = tldv_get(f"meetings/{meeting_id}/transcript")
for seg in transcript["data"]:  # NOT transcript directly
    print(f"{seg['speaker']}: {seg['text']}")
```

## Browser Extraction (alternative)

When API isn't available, extract notes from tldv web app. Public share links can expose Smart Topics and transcript text without an API key after the app loads:
```javascript
// Navigate to /app/meetings/{id}?transcript=true&video=true or /app/external-meetings/{id}/
const panel = document.querySelector('[role="tabpanel"]');
const notes = panel?.innerText;  // Smart topics formatted text
const allVisibleText = document.body.innerText; // often includes notes + transcript + timestamps
```

If the first snapshot is sparse, wait/reload once, then read `document.body.innerText` before giving up. Use the extracted text as public-link notes/transcript, but label it as visible tl;dv app text rather than API-verified transcript.

## Video Preview / Thumbnail Extraction

- **Reference workflow**: `references/video-previews.md` — defensive extraction for real recording thumbnails in product UIs: list payload fields, meeting detail fallback, public OG scraping, image URL normalization, lazy image overlay, and ROI stop rule when tl;dv returns no previews.

## Sales Call Analysis

- **Reference workflow**: `references/sales-call-analysis.md` — how to identify Team Member's true prospect calls among recent tl;dv meetings, extract transcripts, and produce Head-of-Sales analysis of objections, tension, closing prep, and R2 qualification.
- **AIOS R1 Audit IA TPE/PME**: `references/aios-r1-audit-ia-tpe-pme.md` — process pattern from Bouquet Suprême for selling AI to non-AI-aware small businesses: heat check, macro belief deck, structural business audit, founder vision, AI-applied growth positioning, and R2 decision framing.

## Existing Scripts

- **Import script**: `~/.hermes/scripts/tldv-import.py` — fetches meetings, transcripts, auto-detects AIOS clients, creates/updates client folders
- **Check script**: `~/.hermes/scripts/tldv-check.py` — scans for new tldv URLs in Discord/wiki
- **State file**: `~/.hermes/scripts/tldv-sync-state.json` — tracks already-imported meeting IDs
- **Cron**: "Agent Transcriptions" runs at 1h daily

## ClientOps Coaching / CPO Audits

When operator/operator asks to review recent coachings for Incubateur/Mastermind product improvements, use the tl;dv API to fetch recent meetings, de-dupe by `id`, filter coaching-related titles, save transcripts under `/workspace/outputs/cpo-coaching-audit-YYYY-MM-DD/`, then produce a CPO audit focused on recurring student blockers, missing modules, product backlog priorities, and Incubateur vs Mastermind differences — not a generic meeting summary. Full playbook: `references/clientops-coaching-cpo-audit.md`.

## AIOS Client Auto-Detection

The import script auto-detects AIOS clients/prospects from meetings:
- Matches meeting titles against known client folders (`/workspace/outputs/clients/`)
- Keywords: "audit", "cdc", "r1", "r2", "closing", "aios"
- Extracts client name from non-team participants
- Creates new client folder with CONTEXT.md + STATUS.md from template
- Updates existing STATUS.md with latest interaction
- Saves transcript in client folder

## Client Folder Structure

```
/workspace/outputs/clients/
├── _template/           ← CONTEXT.md + STATUS.md templates
├── example-client/
│   ├── CONTEXT.md       ← "SOUL" du client — identité, business, stack, pain points
│   ├── STATUS.md        ← État vivant — phase, dernière interaction, blocages
│   ├── CDC-Example Client-*.md    ← CDC versions
│   ├── notes-r1-*.md    ← Notes brutes (immutable)
│   └── transcript-*.md  ← Transcripts tldv (auto-importés)
└── selva-nanda/
    └── ...
```
