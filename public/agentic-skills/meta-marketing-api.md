---
name: meta-marketing-api
description: Operate Meta Marketing API integrations safely — store app credentials, verify permissions/assets, inspect ad accounts/pages/Instagram, and create campaigns/adsets/ads only in PAUSED status pending human review.
---

# Meta Marketing API

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this when connecting, auditing, or operating Meta/Facebook Ads via Graph API: access tokens, app id/secret, ad accounts, Pages, Instagram accounts, pixels, campaigns, adsets, ads, or Meta Business Manager permissions.

## Non-negotiable safety rule

**Never create or update campaigns/adsets/ads into ACTIVE unless the human explicitly approves that exact activation.**

Default creation statuses:

- Campaign: `status=PAUSED`
- Ad set: `status=PAUSED`
- Ad: `status=PAUSED`

If credentials are stored in env, add a guard like:

```env
META_CAMPAIGN_DEFAULT_STATUS=PAUSED
META_AD_CREATION_SAFETY_RULE=NEVER_CREATE_ACTIVE_ALWAYS_PAUSED_PENDING_HUMAN_REVIEW
```

Activation is a spend-risk action. Treat it like wiring money, not like clicking save.

## Credential handling

1. Store secrets in a locked env file, usually `~/.hermes/.env` unless the repo already has a narrower secret file.
2. Use stable names:
   - `META_ACCESS_TOKEN`
   - `META_APP_ID`
   - `META_APP_SECRET`
   - optional: `META_CAMPAIGN_DEFAULT_STATUS=PAUSED`
3. `chmod 600` the file.
4. Never paste tokens or app secrets in chat, logs, skill files, commits, or summaries.
5. When reporting, say which keys exist, not their values.

## Baseline verification workflow

Run read-only checks first. Use Graph API version pinned to a current version (the session reference uses `v20.0`; update deliberately when needed).

1. Load env without printing values.
2. Verify token identity:
   - `GET /me?fields=id,name`
3. Verify permissions:
   - `GET /me/permissions`
   - minimum for ads operations: `ads_read`, `ads_management`
   - often needed: `business_management`, `pages_show_list`, `pages_read_engagement`, `pages_manage_ads`
4. List ad accounts:
   - `GET /me/adaccounts?fields=id,name,account_status,currency,timezone_name,business{id,name},amount_spent,balance,disable_reason`
5. For every accessible ad account, test read access:
   - `GET /{act_id}/campaigns?fields=id,name,status,effective_status,objective&limit=5`
   - `GET /{act_id}/adspixels?fields=id,name&limit=20`
6. List Pages and Instagram linkage:
   - `GET /me/accounts?fields=id,name,category,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count},connected_instagram_account{id,username}`

## Python probe template

Use this pattern for safe read-only checks; do not print tokens.

```python
import os, json, urllib.parse, urllib.request, urllib.error
from pathlib import Path

for line in Path('~/.hermes/.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        os.environ[k] = v

TOKEN = os.environ['META_ACCESS_TOKEN']
BASE = '<url>'

def get(path, params=None):
    params = dict(params or {})
    params['access_token'] = TOKEN
    url = BASE + path + '?' + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=25) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {'_error': True, 'http': e.code, 'body': e.read().decode(errors='replace')[:1000]}

print(json.dumps({
    'me': get('/me', {'fields': 'id,name'}),
    'permissions': get('/me/permissions', {'limit': '100'}),
    'adaccounts': get('/me/adaccounts', {'fields': 'id,name,account_status,currency,timezone_name,business{id,name}', 'limit': '100'}),
    'pages': get('/me/accounts', {'fields': 'id,name,category,instagram_business_account{id,username,name},connected_instagram_account{id,username}', 'limit': '100'}),
}, ensure_ascii=False, indent=2))
```

## Interpreting common states

### Ads Manager custom columns vs Graph API insights

When auditing Meta Ads KPIs, do **not** assume every column visible in Ads Manager is exposed by Graph API `/{object}/insights`.

Known ClientOps Follow Ads case:

- Ads Manager showed custom columns for `Followers sur Instagram` and `Coût par follower IG` on ad sets.
- Graph API on the same ad set + same period returned the matching `spend`, clicks, engagements, video views, etc., but did **not** include a follower action in `actions` or `cost_per_action_type`.
- `Coût par follower IG` in Ads Manager may be a UI/custom-column formula: `spend / followers_ig`. The API must first expose the raw follower count; if it does not, recalculate only after ingesting followers via another route.

Verification pattern before concluding a metric is missing:

1. Match the exact level (`campaign`/`adset`/`ad`) the UI is showing.
2. Match the exact date range from Ads Manager.
3. Confirm `spend` matches the UI. If spend matches but the KPI is absent, this is likely a metric mapping/API exposure issue, not wrong object selection.
4. Dump `actions`, `unique_actions`, `cost_per_action_type`, and `cost_per_unique_action_type` without over-interpreting labels.
5. If follower count remains absent, use a fallback: Ads Manager CSV export ingestion, browser extraction, or daily IG `followers_count` snapshots attributed by test design.

### Messaging metrics naming pitfall

Do **not** label `onsite_conversion.messaging_block` as “conversations” without validation against Ads Manager. Report it as `messaging_block` or “signal messaging” until the UI/API mapping is confirmed. In the ClientOps Ads 30 vs Ads 32 check, this action appeared as 22 vs 1 over 30 days, but it was not proven to equal conversations started.

### URL tags / UTM update pitfall

When fixing Meta → Typeform/landing attribution, update tracking parameters on the **Ad object**, not the Creative object:

```python
# Correct
POST /{ad_id} params {"url_tags": "utm_source=meta&utm_medium=paid&..."}

# Wrong for URL tags in this context
POST /{creative_id} params {"url_tags": "..."}
```

Validated ClientOps case: `POST /{creative_id}` returned `Invalid parameter ... specify name/status/labels`, while `POST /{ad_id}` with `url_tags` returned `{"success": true}`. Updating URL tags on active ads is a live tracking change: only do it when the user explicitly asks to correct tracking or approves the change; never change destination/activation status incidentally.

### ClientOps Typeform attribution pattern

For ClientOps Incubateur paid ads, route ad traffic through the public redirect endpoint rather than linking directly to Typeform:

```text
<url>>/go/clientops?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&creative_id={{creative.id}}&source_guess=meta_paid
```

Known implementation details:
- `/go/clientops` redirects to Typeform `sBg0c1Vu` and preserves hidden fields/UTMs.
- The dashboard middleware must allow `/go/clientops` publicly; otherwise Meta traffic hits login and attribution dies.
- Typeform hidden fields can arrive with multiple names. Parser should accept `campaign_id`/`campaignid`/`campaign.id`, same for `adset_id`, `ad_id`, `creative_id`, and fallback `creative_id` to `utm_content` or `ad_id` when needed.
- Verify with a real deployed URL and a parser regression test after changing tracking.

### Lead-quality KPI for ClientOps ads

Do not optimize ClientOps on leads or booked calls alone. The operational KPI is **coût par RDV validé** and then **coût par pitch / vente**. Recommended chain:

`Spend Meta → Typeform completed → Typeform qualification score → RDV booked → RDV validé by team → show-up → pitch → sale`

If the team reports low-quality prospects, first audit Typeform answers by source and budget/revenue fields before changing creative volume. The common failure mode is ads generating attention and Typeform bookings while attracting beginners with low budget; solve with stricter Typeform qualification + team quality tags + fixed UTM/ad IDs.

### Token valid but no ad accounts

Symptoms:

- `/me` works.
- `/me/permissions` shows ads permissions.
- `/me/adaccounts` returns `data: []`.

Meaning: the app/user/token has permissions in theory but no Business Manager asset access.

Ask the human to grant access in Business Manager:

- Business settings → Accounts → Ad accounts → select account.
- Add the app/system user/person tied to the token.
- Grant campaign management and performance read access.
- Repeat for Pages/Instagram if ads need social identity.

### `/me/businesses` empty but ad accounts show a business

Not necessarily blocking. Meta may return no businesses for the token while `/me/adaccounts` includes `business{id,name}`. Trust the asset-level checks over `/me/businesses` for operational readiness.

### Instagram not visible

Symptoms:

- Page appears in `/me/accounts`.
- `instagram_business_account` is `null`.
- `connected_instagram_account` is `null`.

Meaning: Meta Ads access can be OK while Instagram is not linked/exposed to the token.

Checklist:

1. Instagram account is Business or Creator, not personal.
2. Instagram is connected to the correct Facebook Page.
3. Instagram account is added under Business Manager → Accounts → Instagram accounts.
4. Instagram is assigned to the same business/app/system user/person.
5. Required Page permissions are granted (`pages_show_list`, `pages_read_engagement`, `pages_manage_ads`).
6. Wait a couple minutes and re-run the probe; Meta propagation lag is real.

## Delayed verification / follow-up pattern

When the user says they just added access, schedule a one-shot recheck instead of nagging:

- Use a cron one-shot for `2m`.
- Re-run the read-only Page/Instagram probe.
- Report status to the origin chat.
- If still missing and the user asked, send a concise HITL-safe message to the relevant internal person explaining what is already OK and what still needs to be connected.

Do not send external/client-facing messages without explicit validation. Internal Client Delivery teammate nudges are okay when requested by the user.

## Creation workflow guardrail

Before creating anything:

1. Confirm target `act_...` account and currency.
2. Confirm Page/Instagram identity to use.
3. Confirm objective, campaign budget strategy, daily/lifetime budget, geo, age, placements, creatives, destination URL/form.
4. Construct payload with `status=PAUSED` at every level.
5. After creation, read the created objects back and report IDs + statuses.
6. Explicitly state: “Created paused; human must review/activate manually.”

If the user asks to “launch” ambiguously, interpret as **create paused draft**, not active delivery.

## Reporting format

Keep reports short and operational:

- What is accessible ✅
- What is missing ❌
- IDs needed for future operations
- Next action for the human
- Safety status: `PAUSED only`

Avoid dumping raw API JSON unless debugging.

## References

- `references/clientops-meta-ads-2026-05.md` — session-specific ClientOps setup details and known asset IDs.