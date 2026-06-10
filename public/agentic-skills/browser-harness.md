---
name: browser-harness
description: Direct browser control via CDP. Use when the user wants to automate, scrape, test, or interact with web pages through a real Chrome/Chromium browser or Browser Use Cloud.
version: 0.1.0
source: https://github.com/browser-use/browser-harness
---

# browser-harness

Direct browser control via CDP. For task-specific edits, use `~/.hermes/vendor/browser-harness/agent-workspace/agent_helpers.py`. For setup, install, or connection problems, read `references/install.md`.

If the task is about building with Browser Use Cloud SDK v3, Browser Use Open Source SDK/CLI, Cloud browsers, profiles, structured output, or production Browser Use integrations, load the separate `browser-use` skill first. Use this `browser-harness` skill when I need to directly operate a browser via the installed `browser-harness` CLI.

Domain skills from the upstream repo are off by default. Set `BH_DOMAIN_SKILLS=1` to enable them; see the bottom section.

**If `BH_DOMAIN_SKILLS=1` and the task is site-specific, read every file in the matching `~/.hermes/vendor/browser-harness/agent-workspace/domain-skills/<site>/` directory before inventing an approach.**

## Usage

```bash
browser-harness <<'PY'
new_tab("https://docs.browser-use.com")
wait_for_load()
print(page_info())
PY
```

- Invoke as `browser-harness` — it is installed on `$PATH` via `uv tool install -e ~/.hermes/vendor/browser-harness`.
- Use the heredoc form for every multi-line command. It prevents shell quote mangling inside Python strings and JavaScript snippets.
- First navigation is `new_tab(url)`, not `goto_url(url)` — `goto_url` runs in the user's active tab and can clobber their work.

## Tool call shape

```bash
browser-harness <<'PY'
# any python. helpers pre-imported. daemon auto-starts.
PY
```

`run.py` calls `ensure_daemon()` before exec — you never start/stop manually unless you want to.

## Remote browsers

Use remote for parallel sub-agents, isolated browsers via distinct `BU_NAME`, or headless servers. `BROWSER_USE_API_KEY` must be set. `start_remote_daemon`, `list_cloud_profiles`, `list_local_profiles`, and `sync_local_profile` are pre-imported.

For sites that block VPS/datacenter IPs, a practical alternative is **CDP over SSH to a trusted local Chrome**: launch Chrome on the local machine with `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9222` and a dedicated `--user-data-dir`, then tunnel `ssh -N -L 9222:127.0.0.1:9222 user@host`. Keep CDP bound to localhost; never expose it publicly.

```bash
browser-harness <<'PY'
start_remote_daemon("work")
PY

BU_NAME=work browser-harness <<'PY'
new_tab("https://example.com")
print(page_info())
PY
```

`start_remote_daemon` prints `liveUrl`. The daemon PATCHes the cloud browser to stop on shutdown, preserving profile state. Running remote daemons bill until timeout.

Profiles/cookies sync: see `references/interaction-skills/profile-sync.md`.

## Interaction skills

If you struggle with a specific browser mechanic, check `references/interaction-skills/` first. Available topics:

- connection
- cookies
- cross-origin-iframes
- dialogs
- downloads
- drag-and-drop
- dropdowns
- iframes
- network-requests
- print-as-pdf
- profile-sync
- screenshots
- scrolling
- shadow-dom
- tabs
- uploads
- viewport

## What actually works

- Screenshots first: use `capture_screenshot()` to understand the current page quickly, find visible targets, and decide whether you need a click, selector, or more navigation.
- Clicking: `capture_screenshot()` → read the pixel off the image → `click_at_xy(x, y)` → `capture_screenshot()` to verify. Suppress the Playwright reflex of “locate first, then click”. Drop to DOM only when the target has no visible geometry.
- Bulk HTTP: `http_get(url)` + `ThreadPoolExecutor`. No browser for static pages.
- After goto: `wait_for_load()`.
- Wrong/stale tab: `ensure_real_tab()`.
- Verification: `print(page_info())` is the simplest alive check; screenshots are the default way to verify visible actions.
- DOM reads: use `js(...)` for inspection/extraction when coordinates are the wrong tool.
- Iframe sites: coordinate clicks pass through; only drop to iframe DOM work when coordinate clicks are the wrong tool.
- Auth wall: redirected to login → stop and ask the user. Don’t type credentials from screenshots.
- Raw CDP for anything helpers don’t cover: `cdp("Domain.method", params)`.

## Design constraints

- Coordinate clicks by default. `Input.dispatchMouseEvent` goes through iframes/shadow/cross-origin at the compositor level.
- Connect to the user's running Chrome. Don’t launch your own browser unless using the documented isolated profile path or cloud path.
- `cdp-use` is only for `CDPClient.send_raw`. Prefer raw CDP strings over typed wrappers.
- Keep core helpers short. Put task-specific helper additions in `~/.hermes/vendor/browser-harness/agent-workspace/agent_helpers.py`.
- Don’t add manager layers, retries frameworks, session managers, daemon supervisors, config systems, or logging frameworks.

## Gotchas

- Omnibox popups are fake page targets. Filter `chrome://omnibox-popup...` and other internals when you need a real tab.
- CDP target order != Chrome’s visible tab-strip order.
- Default daemon sessions can go stale. `ensure_real_tab()` re-attaches to a real page.
- Browser Use API is camelCase on the wire: `cdpUrl`, `proxyCountryCode`, etc.
- Remote `cdpUrl` is HTTPS, not WS. Resolve the websocket URL via `/json/version`.
- Stop cloud browsers with `PATCH /browsers/{id}` + `{ "action": "stop" }`.
- After every meaningful action, re-screenshot before assuming it worked.
- Prefer compositor-level actions over framework hacks.
- If you need framework-specific DOM tricks, check `references/interaction-skills/` first.

## Domain skills

Only applies when `BH_DOMAIN_SKILLS=1`. Otherwise ignore.

When enabled, search `~/.hermes/vendor/browser-harness/agent-workspace/domain-skills/<host>/` before inventing an approach. `goto_url` returns up to 10 skill filenames for the navigated host.

If you learn anything non-obvious — private API, stable selector, framework quirk, URL pattern, hidden wait, site-specific trap — open a PR to `agent-workspace/domain-skills/<site>/`. Capture durable site shape, not task diaries. Don’t write pixel coordinates or secrets.
