---
name: google-workspace
description: "Gmail, Calendar, Drive, Docs, Sheets via gws CLI or Python."
version: 1.0.0
author: Nous Research
license: MIT
metadata:
  hermes:
    tags: [Google, Gmail, Calendar, Drive, Sheets, Docs, Contacts, Email, OAuth]
    homepage: <url>
    related_skills: [himalaya]
---

# Google Workspace

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Gmail, Calendar, Drive, Contacts, Sheets, and Docs — through Hermes-managed OAuth and a thin CLI wrapper. When `gws` is installed, the skill uses it as the execution backend for broader Google Workspace coverage; otherwise it falls back to the bundled Python client implementation.

## References

- `references/gmail-search-syntax.md` — Gmail search operators (is:unread, from:, newer_than:, etc.)
- `references/gmail-draft-fallbacks.md` — Gmail draft failure playbook: API disabled diagnostics, Calendar attendee recovery, and portable `.eml` generation with attachments.
- `references/public-sheets-export.md` — read-only export of public/shared Google Sheets via `gviz` CSV or XLSX without OAuth.
- `references/public-xlsx-stdlib-parse.md` — parse exported Google Sheet XLSX with Python stdlib when `openpyxl`/`pip` are unavailable.
- `references/aios-warmap-may-2026.md` — concrete example of finding and filling an existing roadmap/war-map Google Sheet, including backup and formula-title pitfall.
- `references/calendar-recurring-meetings.md` — Python Calendar API recipe for recurring meetings with attendees, Google Meet links, attendee notifications, idempotency checks, and the AIOS Mon→Thu/Fri rhythm.

## Scripts

- `scripts/setup.py` — OAuth2 setup (run once to authorize)
- `scripts/google_api.py` — compatibility wrapper CLI. It prefers `gws` for operations when available, while preserving Hermes' existing JSON output contract.

## First-Time Setup

The setup is fully non-interactive — you drive it step by step so it works
on CLI, Telegram, Discord, or any platform.

Define a shorthand first:

```bash
GSETUP="python ${HERMES_HOME:-$HOME/.hermes}/skills/productivity/google-workspace/scripts/setup.py"
```

### Step 0: Check if already set up

```bash
$GSETUP --check
```

If it prints `AUTHENTICATED`, skip to Usage — setup is already done.

### Step 1: Triage — ask the user what they need

Before starting OAuth setup, ask the user TWO questions:

**Question 1: "What Google services do you need? Just email, or also
Calendar/Drive/Sheets/Docs?"**

- **Email only** → They don't need this skill at all. Use the `himalaya` skill
  instead — it works with a Gmail App Password (Settings → Security → App
  Passwords) and takes 2 minutes to set up. No Google Cloud project needed.
  Load the himalaya skill and follow its setup instructions.

- **Email + Calendar** → Continue with this skill, but use
  `--services email,calendar` during auth so the consent screen only asks for
  the scopes they actually need.

- **Calendar/Drive/Sheets/Docs only** → Continue with this skill and use a
  narrower `--services` set like `calendar,drive,sheets,docs`.

- **Full Workspace access** → Continue with this skill and use the default
  `all` service set.

**Question 2: "Does your Google account use Advanced Protection (hardware
security keys required to sign in)? If you're not sure, you probably don't
— it's something you would have explicitly enrolled in."**

- **No / Not sure** → Normal setup. Continue below.
- **Yes** → Their Workspace admin must add the OAuth client ID to the org's
  allowed apps list before Step 4 will work. Let them know upfront.

### Step 2: Create OAuth credentials (one-time, ~5 minutes)

Tell the user:

> You need a Google Cloud OAuth client. This is a one-time setup:
>
> 1. Create or select a project:
>    <url>
> 2. Enable the required APIs from the API Library:
>    <url>
>    Enable: Gmail API, Google Calendar API, Google Drive API,
>    Google Sheets API, Google Docs API, People API
> 3. Create the OAuth client here:
>    <url>
>    Credentials → Create Credentials → OAuth 2.0 Client ID
> 4. Application type: "Desktop app" → Create
> 5. If the app is still in Testing, add the user's Google account as a test user here:
>    <url>
>    Audience → Test users → Add users
> 6. Download the JSON file and tell me the file path
>
> Important Hermes CLI note: if the file path starts with `/`, do NOT send only the bare path as its own message in the CLI, because it can be mistaken for a slash command. Send it in a sentence instead, like:
> `The JSON file path is: /home/user/Downloads/client_secret_....json`

Once they provide the path:

```bash
$GSETUP --client-secret /path/to/client_secret.json
```

If they paste the raw client ID / client secret values instead of a file path,
write a valid Desktop OAuth JSON file for them yourself, save it somewhere
explicit (for example `~/Downloads/hermes-google-client-secret.json`), then run
`--client-secret` against that file.

### Step 3: Get authorization URL

Use the service set chosen in Step 1 **only if the installed setup script supports it**. First check:

```bash
$GSETUP --help
```

Current bundled `setup.py` may **not** support `--services` or `--format` despite older notes/examples. Check first:

```bash
$GSETUP --help
```

If `--services` / `--format` are unavailable, use the plain command:

```bash
$GSETUP --auth-url
```

This prints the OAuth URL directly (not JSON) and may request the default broad scope set (Gmail, Calendar, Drive readonly, Contacts, Sheets, Docs readonly). If narrower scopes are required, update the script first rather than inventing flags.

Agent rules for this step:
- Send the exact printed OAuth URL to the user as a single line.

That prints the raw authorization URL directly and may request the default broad scope bundle (Gmail, Calendar, Drive readonly, Contacts readonly, Sheets, Docs readonly). Do not invent flags; check `--help` and use the actual script interface.

This returns JSON with an `auth_url` field in newer versions, or a raw URL in older versions, and also saves the exact URL to
`~/.hermes/google_oauth_last_url.txt` when supported.
```bash
$GSETUP --auth-url
```

It prints the authorization URL directly (not JSON) and may request the default broad Workspace scopes.

This returns either JSON with an `auth_url` field (newer script) or the raw URL (older script), and may save the exact URL to `~/.hermes/google_oauth_last_url.txt`.

$GSETUP --auth-url
```

Depending on version, this either returns JSON with an `auth_url` field or prints the URL directly, and may save the exact URL to `~/.hermes/google_oauth_last_url.txt`.

Agent rules for this step:
- If JSON is returned, extract the `auth_url` field; if a raw URL is printed, send that exact URL to the user as a single line.
- Tell the user that the browser will likely fail on `<url> after approval, and that this is expected.
- Tell them to copy the ENTIRE redirected URL from the browser address bar.
- If the user gets `Error 403: access_denied`, send them directly to `<url> to add themselves as a test user.

### Step 4: Exchange the code

The user will paste back either a URL like `<url>
or just the code string. Either works. The `--auth-url` step stores a temporary
pending OAuth session locally so `--auth-code` can complete the PKCE exchange
later, even on headless systems:

```bash
$GSETUP --auth-code "THE_URL_OR_CODE_THE_USER_PASTED" --format json
```

If `--auth-code` fails because the code expired, was already used, or came from
an older browser tab, it now returns a fresh `fresh_auth_url`. In that case,
immediately send the new URL to the user and have them retry with the newest
browser redirect only.

### Step 5: Verify

```bash
$GSETUP --check
```

Should print `AUTHENTICATED`. Setup is complete — token refreshes automatically from now on.

### Notes

- Token is stored at `~/.hermes/google_token.json` and auto-refreshes.
- Pending OAuth session state/verifier are stored temporarily at `~/.hermes/google_oauth_pending.json` until exchange completes.
- If `gws` is installed, `google_api.py` points it at the same `~/.hermes/google_token.json` credentials file. Users do not need to run a separate `gws auth login` flow.
- To revoke: `$GSETUP --revoke`

## Usage

All commands go through the API script. Set `GAPI` as a shorthand:

```bash
GAPI="python ${HERMES_HOME:-$HOME/.hermes}/skills/productivity/google-workspace/scripts/google_api.py"
```

### Gmail

```bash
# Search (returns JSON array with id, from, subject, date, snippet)
$GAPI gmail search "is:unread" --max 10
$GAPI gmail search "from:<email@example.com> newer_than:1d"
$GAPI gmail search "has:attachment filename:pdf newer_than:7d"

# Read full message (returns JSON with body text)
$GAPI gmail get MESSAGE_ID

# Send
$GAPI gmail send --to <email@example.com> --subject "Hello" --body "Message text"
$GAPI gmail send --to <email@example.com> --subject "Report" --body "<h1>Q4</h1><p>Details...</p>" --html
$GAPI gmail send --to <email@example.com> --subject "Hello" --from '"Research Agent" <user@example.com>' --body "Message text"

# Reply (automatically threads and sets In-Reply-To)
$GAPI gmail reply MESSAGE_ID --body "Thanks, that works for me."
$GAPI gmail reply MESSAGE_ID --from '"Support Bot" <user@example.com>' --body "Thanks"

# Labels
$GAPI gmail labels
$GAPI gmail modify MESSAGE_ID --add-labels LABEL_ID
$GAPI gmail modify MESSAGE_ID --remove-labels UNREAD
```

#### Gmail drafts and blocked API fallback

If the user asks for a Gmail draft, first attempt the real Gmail draft/send/search operation through the API. If Gmail returns `403` / `Gmail API has not been used... or it is disabled`, scopes are not the issue — the API is disabled on the OAuth project. Do not claim the draft exists. Give the activation URL from the error and produce a portable `.eml` fallback with all attachments so the user still has a send-ready email.

When the recipient is supposed to come from a call/event, search Calendar attendees through Calendar API before giving up; Calendar often works even when Gmail and People API are disabled. See `references/gmail-draft-fallbacks.md` for the exact `.eml` generator and Calendar recovery snippet.

### Calendar

```bash
# List events (defaults to next 7 days)
$GAPI calendar list
$GAPI calendar list --start 2026-03-01T00:00:00Z --end 2026-03-07T23:59:59Z

# Create event (ISO 8601 with timezone required)
$GAPI calendar create --summary "Team Standup" --start 2026-03-01T10:00:00-06:00 --end 2026-03-01T10:30:00-06:00
$GAPI calendar create --summary "Lunch" --start 2026-03-01T12:00:00Z --end 2026-03-01T13:00:00Z --location "Cafe"
$GAPI calendar create --summary "Review" --start 2026-03-01T14:00:00Z --end 2026-03-01T15:00:00Z --attendees "<email@example.com>,<email@example.com>"

# Delete event
$GAPI calendar delete EVENT_ID
```

### Drive

```bash
$GAPI drive search "quarterly report" --max 10
$GAPI drive search "mimeType='application/pdf'" --raw-query --max 5
```

For read-only public/shared Drive folders, use the public access check first. A shared folder can return a Google login page if not actually link-accessible; verify with a browser-like request and check whether the final URL is `accounts.google.com`.

If the folder is link-accessible but Drive API auth is not available yet, `gdown --folder` can ingest/download files. If API writes are needed (e.g. maintaining a content calendar Sheet), complete OAuth setup and enable the needed APIs first.

```bash
python3 - <<'PY'
import urllib.request
url='DRIVE_FOLDER_URL'
r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20)
print('final', r.geturl())
print('login' if 'accounts.google.com' in r.geturl() else 'not-login')
PY
```

### Public/shared Drive folders — large file intake

If the user shares a public Google Drive folder and OAuth is not needed, use `gdown --folder` instead of dragging them through Workspace auth. On systems with externally-managed Python, create a temp venv:

```bash
python3 -m venv /tmp/gdown-venv
/tmp/gdown-venv/bin/pip install --quiet gdown
/tmp/gdown-venv/bin/gdown --folder '<url>' -O /tmp/drive-ingest
```

For huge zip exports, inspect contents before full extraction and extract only text manifests first (`_chat.txt`, `.csv`, `.md`) to avoid wasting disk on videos/images.

### Contacts

```bash
$GAPI contacts list --max 20
```

### Sheets

For private Sheets or writes, use authenticated API commands. **A Google API key (`AIza...`) is not enough to write to private Sheets**; use OAuth or a service account shared on the Sheet/Drive.

```bash
# Read
$GAPI sheets get SHEET_ID "Sheet1!A1:D10"

# Write
$GAPI sheets update SHEET_ID "Sheet1!A1:B2" --values '[["Name","Score"],["Alice","95"]]'

# Append rows
$GAPI sheets append SHEET_ID "Sheet1!A:C" --values '[["new","row","data"]]'
```

#### Roadmap / War Map Sheets

When the user asks to fill an existing planning Sheet (e.g. “Plan d'attaque”, “Warmap”, monthly roadmap):

1. Search Drive first, not Gmail, unless explicitly told the file came by email. Use broad terms without apostrophes first because raw Drive queries can break on quoted apostrophes:
   ```bash
   $GAPI drive search "plan attaque" --max 20
   $GAPI drive search "warmap" --max 20
   ```
2. If multiple candidates exist, prefer the most recently modified spreadsheet that already contains the relevant month/tab structure.
3. Inspect spreadsheet metadata and target tabs before writing:
   ```python
   meta = svc.spreadsheets().get(spreadsheetId=sid).execute()
   print([s['properties']['title'] for s in meta['sheets']])
   ```
4. Read the target ranges (`Tâches`, month tab, etc.) and preserve the sheet's existing layout/formulas. Back up edited ranges to `/workspace/outputs/.../*.json` before writes.
5. Use `values.batchUpdate` for multi-range edits, but be careful with formula-driven calendar templates: editing title cells like `MAI!A1` may feed formulas below. If date rows show `#VALUE!`, restore the expected raw title format (e.g. `May 2026`, not a long descriptive title).
6. For the user's personal war maps, write **concrete daily to-do lists**, not theoretical strategy blocks. Start from the real current date, avoid putting the user's name in cells, and granularize only the next 48-72h. Put bigger paliers/objectives in the bottom notes/objectives area, not in each day cell.
7. If the morning brief/reminder uses a War Map, the first block must be `## Tâches importantes du matin` with the concrete morning bullets from today's column before any recap/slogan/context. See `references/aios-warmap-may-2026.md` for the exact pattern, swap-today/tomorrow workflow, and end-of-day feedback adjustment pattern.
8. When the user sends a voice/text feedback asking to “modifier le remap/warmap”, update the existing day columns immediately: mark the actual day honestly, move the real priority to tomorrow, demote secondary/rebranding work, back up edited ranges, verify by reading back, and save the feedback as a raw Second Brain source if it contains durable business signal.
9. Separate founder inputs from delegated work: founder daily cells should emphasize content, traffic, public speaking, podcast/network sourcing, validation, process/tracking; scripts/VSL/decks/outbound setup/delivery checklists are prep/delegation tasks.
10. Verify after writing by reading the changed ranges back. If formula cells broke or the plan starts on the wrong date, fix before replying.
11. Final response should include: Sheet name/link, tabs edited, high-level changes, backup path, and any caveat. Keep it short.

For read-only public/shared Sheets, OAuth is not always needed. First try the public export patterns in `references/public-sheets-export.md`:

```bash
curl -L '<url>'
curl -L '<url>' -o sheet.xlsx
```

If `openpyxl` is unavailable and the runtime cannot install packages, do **not** stop or ask the user to export manually. Use `references/public-xlsx-stdlib-parse.md` to parse workbook XML with Python stdlib (`zipfile` + `xml.etree.ElementTree`) and extract sheet names/rows.

If `export?format=csv&gid=0` returns HTTP 400, use the `gviz/tq?tqx=out:csv` endpoint instead.

### Docs

```bash
$GAPI docs get DOC_ID
```

## Output Format

All commands return JSON. Parse with `jq` or read directly. Key fields:

- **Gmail search**: `[{id, threadId, from, to, subject, date, snippet, labels}]`
- **Gmail get**: `{id, threadId, from, to, subject, date, labels, body}`
- **Gmail send/reply**: `{status: "sent", id, threadId}`
- **Calendar list**: `[{id, summary, start, end, location, description, htmlLink}]`
- **Calendar create**: `{status: "created", id, summary, htmlLink}`
- **Drive search**: `[{id, name, mimeType, modifiedTime, webViewLink}]`
- **Contacts list**: `[{name, emails: [...], phones: [...]}]`
- **Sheets get**: `[[cell, cell, ...], ...]`

## Rules

1. **Never send email or delete events without confirming with the user first.** For calendar creation, if the user explicitly says “ajoute/crée dans mon agenda/calendrier”, treat that as approval and create the events immediately; do not waste a turn asking for confirmation. If the instruction is only exploratory (“propose-moi un planning”), draft first.
2. **Check auth before first use** — run `setup.py --check` for private data or any write operation. For read-only public/shared Sheets, try the public export path first (`references/public-sheets-export.md`) before sending the user through OAuth ceremony.
3. **Use the Gmail search syntax reference** for complex queries — load it with `skill_view("google-workspace", file_path="references/gmail-search-syntax.md")`.
4. **Calendar times must include timezone** — always use ISO 8601 with offset (e.g., `2026-03-01T10:00:00-06:00`) or UTC (`Z`). For travel days, use the local timezone of where the user will physically be during the block: pre-flight blocks in departure timezone, post-arrival blocks in destination timezone.
5. **Respect rate limits** — avoid rapid-fire sequential API calls. Batch reads when possible.

### Calendar planning from Telegram voice notes

When a user sends a voice note asking to plan tasks and add blocks:
1. Transcription may be imperfect (“D-Pork” = usually “deep work”, “soutages” = “sous-tâches”, “calvie” = AIOS). Infer obvious business intent instead of asking.
2. Read the existing calendar for the relevant days before creating blocks so you avoid hard conflicts and respect fixed travel/events.
3. If the task is business-specific, ground the block content in the relevant operational system/skill (e.g. AIOS Data OS process/SOP names) rather than generic productivity filler.
4. Create focused blocks with detailed descriptions: objective, sous-tâches, “comment faire avec AIOS/Data OS”, and expected output.
5. After creation, summarize only the created blocks and key times; no long prose.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `NOT_AUTHENTICATED` | Run setup Steps 2-5 above |
| `REFRESH_FAILED` | Token revoked or expired — redo Steps 3-5 |
| `HttpError 403: Insufficient Permission` | Missing API scope — `$GSETUP --revoke` then redo Steps 3-5 |
| `HttpError 403: Access Not Configured` / `SERVICE_DISABLED` | API not enabled in the OAuth project — open the activation URL from the error, e.g. `<url>>`, click Enable, wait 1-2 minutes, then retry. For Gmail draft/send/search failures, do not fake success: create a `.eml` fallback with attachments and point the user to `references/gmail-draft-fallbacks.md`. For Drive+Sheets workflows, enable both Google Sheets API and Google Drive API. |
| `Google Sheets API has not been used... or it is disabled` | Enable Sheets API on the OAuth project: `<url>>`; wait 1-2 minutes, retry. For Drive reads, also enable `<url>>`. |
| `HttpError 403: SERVICE_DISABLED` / “Google Sheets API has not been used…” | Enable the exact API in the OAuth project, e.g. `<url> also enable Drive API for Drive reads. Wait 1-2 minutes, then retry. |
| `ModuleNotFoundError` | Run `$GSETUP --install-deps` |
| Advanced Protection blocks auth | Workspace admin must allowlist the OAuth client ID |

## Revoking Access

```bash
$GSETUP --revoke
```
