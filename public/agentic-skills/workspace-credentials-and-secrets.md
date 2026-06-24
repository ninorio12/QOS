---
name: workspace-credentials-and-secrets
description: Use when setting up, auditing, verifying, or troubleshooting user-delegated workspace credentials, OAuth access, API keys, tokens, and secret-like configuration without exposing values.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [credentials, secrets, oauth, microsoft-graph, workspace, api-keys, audit, redaction, tokens]
---

# Workspace Credentials & Secrets

## Overview

Credential work has two connected responsibilities: enable the right access with least privilege, and inventory/verify existing secrets without leaking them. Treat OAuth setup, API keys, refresh tokens, webhook secrets, and local config as one operational class: scoped access, safe verification, secure persistence, and redacted reporting.

## When to Use

Use this for:
- Setting up delegated OAuth for Microsoft Graph, Outlook, Calendar, OneDrive, Contacts, or similar workspace APIs.
- Auditing local/VPS/project secrets, API keys, OAuth tokens, webhook secrets, or `.env*` config.
- Verifying whether tokens are configured, active, expired, scoped incorrectly, or only placeholders.
- Explaining limits of local scans vs external dashboards.

Do not use this for destructive key rotation, revocation, or permission expansion without explicit user confirmation.

## Core Rules

- **Never print secrets in chat.** Show key names, storage locations, scopes/status, and redacted fingerprints only when useful.
- Treat screenshots, pasted chat messages, logs, and screen shares containing tokens as exposed secret-transfer channels: configure locally without echoing values, then recommend rotation/regeneration after verification.
- Prefer least-privilege delegated scopes for user-workspace access.
- Use read-only verification endpoints where possible.
- Separate “present/configured” from “active verified.”
- Do not claim “all keys” unless dashboards and external stores were also enumerated.

## Delegated OAuth Setup Pattern

Use authorization-code + PKCE for CLI/agent/public-client flows:

1. Create or identify app registration.
2. Choose account type intentionally: tenant-only vs multi-tenant/personal accounts.
3. Use public/native redirect URI such as `http://localhost`.
4. Add only the scopes required for the workflow, plus `openid profile email offline_access` when refresh is needed.
5. Enable public client flows when the provider requires it.
6. Generate and persist PKCE verifier + state before sending the auth URL.
7. After the user pastes the redirect URL, verify `state`, exchange the code, then store token metadata securely.

### Expired/revoked refresh-token recovery

When a verification command returns `invalid_grant`, `REFRESH_FAILED`, “token expired or revoked,” or equivalent, assume the provider rejected the refresh token. Do not keep retrying API calls or report a service outage. Start a fresh authorization-code/PKCE flow immediately, send the auth URL, explain that a localhost redirect error is expected, exchange the full returned redirect URL/code, then verify with a small read operation before claiming the integration is fixed.

Microsoft Graph specifics are preserved in `references/microsoft-graph-workspace.md`.

## Domain/DNS Access Verification Pattern

When asked whether the agent has DNS access for a brand/domain, do not infer from memory or from a deployed site. Verify where control actually lives:

1. Check the deployment platform domain registry if relevant, e.g. Vercel:
   ```bash
   XDG_DATA_HOME=/home/hermes/.local/share npx vercel domains ls
   ```
2. Distinguish platform domain attachment from DNS authority:
   - domain listed in Vercel = the platform account can attach/use the domain;
   - Registrar/Nameservers shown as `Third Party` = DNS records must be changed at the external registrar/DNS provider;
   - do not claim direct DNS control unless the provider/API/account for the authoritative nameservers is verified.
3. Report only access level: “Vercel domain visible”, “DNS authority not verified”, “registrar/nameservers third-party”. Never expose tokens or provider secrets.

## Screenshot / Chat-Provided Secret Pattern

When the user provides credentials through a screenshot, chat, or image:

1. Acknowledge that the values will not be repeated and should be considered exposed.
2. If extraction is required, use local OCR/vision only for configuration; never transcribe values into the response, summary, skill, or memory.
3. Write the credentials directly into the intended secret store or `.env` with an idempotent update script that preserves unrelated variables.
4. Verify presence by key name only, e.g. `TOKEN present`, not by value.
5. Run the smallest safe connectivity probe.
6. Recommend rotating/regenerating the tokens after successful configuration.

## Secrets Inventory Pattern

1. **Define scope**
   - Environment variables.
   - Known project `.env*`, config, Hermes credential/config files.
   - External dashboards only if authenticated API/dashboard access exists.

2. **Scan in two passes**
   - Broad pass for secret-like names and patterns.
   - Focused pass for actual assignments/config values.
   - Exclude docs, examples, dependencies, caches, build outputs, and placeholders.

3. **Classify status**
   - `active verified`: read-only verification succeeded.
   - `configured`: present but not safely verified.
   - `broken/expired`: safe verification failed.
   - `placeholder`: template/example value.
   - `internal`: framework/session/security flag, not a business API token.

4. **Report safely**
   Group by service/business when known. Include source path/line, verification method, risk, and recommended action. Never include raw values.

## Safe Verification Examples

- Microsoft Graph: `/me` or minimal mail/calendar/list call depending on requested scopes.
- Telegram: `getMe`.
- Vercel: `/v2/user`.
- GitHub: `/user` with User-Agent.
- OpenRouter: `/api/v1/auth/key`.
- ElevenLabs: `/v1/user` with `xi-api-key`.
- Gmail/Calendar: profile or `calendarList().list(maxResults=1)`.
- Framer Server API: project/site-scoped API keys are generated from the project's **Site Settings → General**; see `references/framer-server-api.md`.

## OpenRouter Cost Attribution Pattern

When a user reports unexpected OpenRouter spend, do not assume the SaaS/product is responsible just because OpenRouter is billed.

1. Check OpenRouter dashboard first: usage by **API key**, **model/provider** (e.g. Anthropic 100%), app/site metadata if available, and auto top-up/spend caps.
2. Locally scan only for presence and routing, never print raw keys:
   - env vars: `OPENROUTER_API_KEY`, provider-specific aliases;
   - Hermes configs/profiles: `model.provider`, `base_url`, `auxiliary.*.provider`, fallback providers;
   - project code: `openrouter.ai`, `OPENROUTER`, direct provider SDKs, LLM gateway calls.
3. Distinguish sources:
   - product routes may use Anthropic direct while OpenRouter usage comes from agents;
   - Hermes auxiliary tasks in `auto` can fallback to OpenRouter;
   - old profiles/sub-agents can still be configured on OpenRouter even if the main cockpit is not;
   - Claude Code/dev agents may use a separate key.
4. Immediate containment: disable auto top-up, set spend limits per key, rotate unknown global keys, create separate keys per environment/agent/product.
5. Report attribution as `verified`, `configured`, or `suspected`; never claim total causality without dashboard key-level evidence.

## Output Template

```md
## Scope scanned / access requested
- Environment: ...
- Files/projects: ...
- Dashboards: not scanned / scanned via ...

## Active verified
- Service — KEY_NAME / OAuth scope set
  - Business: ...
  - Source: ENV + path/to/file:line
  - Verification: OK via read-only endpoint
  - Risk/action: ...

## Configured, not verified
...

## Broken/expired candidates
...

## Placeholders / ignored
...

## Limits
...
```

## Reusable Assets

- `references/microsoft-graph-workspace.md` — detailed Microsoft Entra app registration, delegated Graph scopes, PKCE authorization URL, and token exchange notes.
- `references/secrets-inventory-audit.md` — detailed redacted inventory workflow and provider verification examples.
- `references/framer-server-api.md` — Framer project-scoped API key location, official docs links, and known 404 token/CLI URLs.
- `references/vividflow-subagent-workspace-access.md` — VividFlow pattern for rolling out Gmail/Drive/Data OS/Browser Use access to multiple Hermes sub-agents with centralized credentials, per-agent verification, and explicit Gmail-vs-Drive OAuth limits.

## Pitfalls

- Using web/SPA OAuth app type for a CLI/public agent flow when a public/native client is required.
- Forgetting `offline_access` when refresh tokens are needed.
- Adding permissions after consent but not forcing re-consent.
- Treating broad regex matches in docs/dependencies as real secrets.
- Writing persistent raw-secret reports.
- Revoking, rotating, deleting, or expanding credentials without explicit confirmation.
- Guessing dashboard token URLs from memory. For SaaS API keys, verify the URL/doc path first; if a guessed direct token page is 404, retract it and switch to official docs + in-app settings path.
