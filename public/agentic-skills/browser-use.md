---
name: browser-use
description: Use when building, configuring, debugging, or operating Browser Use Cloud SDK v3, Browser Use Open Source SDK/CLI, Browser Use Cloud browsers, profiles, CDP, agents, structured extraction, browser automation, web scraping, or production browser workflows.
version: 2026.05.15
source: https://browser-use.com/llms.txt
---

# Browser Use — operational playbook

Use this before any Browser Use task. Browser Use has two distinct layers:

1. **Cloud SDK v3** (`browser-use-sdk`) — managed agent + stealth browser infra. Best for production, anti-bot, CAPTCHA, proxies, structured extraction, live preview, recordings, async monitoring.
2. **Open Source SDK/CLI** (`browser-use`) — self-hosted Python/browser automation. Best for local dev, custom tools, real Chrome profiles, direct Playwright/CDP integration, MCP, OSS debugging.
3. **Browser Harness** (`browser-harness`) — ultra-thin CDP harness for an existing browser. Best when *I* need direct browser control from Hermes/Codex/Claude with screenshot-first coordinate interactions.

## Always check docs indexes first

- Global index: `https://browser-use.com/llms.txt`
- Cloud index: `https://docs.browser-use.com/llms.txt`
- Cloud full docs: `https://docs.browser-use.com/llms-full.txt`
- OSS index: `https://docs.browser-use.com/open-source/llms.txt`
- OSS full docs: `https://docs.browser-use.com/open-source/llms-full.txt`

Local cached refs may exist under this skill’s `references/` directory.

## Decision matrix

Use **Cloud Agent v3** when:
- User wants a natural-language task completed end-to-end.
- Need stealth, CAPTCHA solving, residential proxies, recording/live preview, or scalable headless infra.
- Need typed/validated extraction with Pydantic/Zod.
- Need follow-up tasks in the same browser state.
- Need async/webhooks/UI streaming.

Use **Cloud Browser** when:
- User wants raw browser access via CDP with Browser Use’s stealth infrastructure.
- Existing Playwright/Puppeteer/Selenium code should run on a stealth browser.
- Need specific screen size, timeout, proxy, profile, recording.

Use **OSS SDK** when:
- User wants self-hosted Python code, custom LLMs, custom tools, or local browser control.
- Need to connect to a real existing Chrome profile with saved cookies/extensions.
- Need low-level Playwright-like operations or MCP integration.

Use **browser-harness** when:
- Task is interactive from this agent and browser-harness CLI is available.
- I need screenshot-first direct CDP control rather than writing an app.

## Cloud SDK v3 — must-use rules

- Use v3 only. v2 is legacy.
- Install/update:
  - Python: `pip install --upgrade browser-use-sdk`
  - TypeScript: `npm install browser-use-sdk@latest`
- API key env var: `BROWSER_USE_API_KEY`; API keys start with `bu_`.
- Python import: `from browser_use_sdk.v3 import AsyncBrowserUse`
- TypeScript import: `import { BrowserUse } from "browser-use-sdk/v3"`
- Auth header for raw REST: `X-Browser-Use-API-Key`.
- Base API: `https://api.browser-use.com/api/v3`
- Low-cost auth smoke test: `GET https://api.browser-use.com/api/v3/billing/account` with the API key header. Expect HTTP `200`; print only project/plan metadata and redact the key.

### Minimal Cloud agent

```python
import asyncio
from browser_use_sdk.v3 import AsyncBrowserUse

async def main():
    client = AsyncBrowserUse()
    result = await client.run("List the top 20 posts on Hacker News today with their points")
    print(result.output)

asyncio.run(main())
```

`client.run()` creates a session, polls every 2 seconds until completion, and can run up to 4 hours. It returns a Session object; use `result.output`.

### Model choice

Default recommendation from docs: `claude-sonnet-4.6` for Cloud agent tasks.

```python
result = await client.run(
    "List the top 20 posts on Hacker News today with their points",
    model="claude-sonnet-4.6",
)
```

## Structured extraction

For anything that must be reliable or machine-readable, define schema first.

Python: pass a Pydantic model via `output_schema=`.
TypeScript: pass a Zod v4 schema via `schema:`. Zod v3 is incompatible.

```python
from pydantic import BaseModel
from browser_use_sdk.v3 import AsyncBrowserUse

class Post(BaseModel):
    name: str
    points: int
    comments: int

class HNPosts(BaseModel):
    posts: list[Post]

client = AsyncBrowserUse()
result = await client.run(
    "List the top 20 posts on Hacker News today with their points",
    output_schema=HNPosts,
)
for post in result.output.posts:
    print(post)
```

## Follow-up tasks / session continuity

If a task needs multiple turns but same browser state, create/reuse a `session_id`.

Important: every follow-up creates a new agent. Agent context does **not** carry over; browser state does: page, cookies, tabs, login, forms.

Operational rule: include enough task context in every follow-up prompt, but rely on same `session_id` for page/session state.

## Streaming / monitoring

Use streaming when the user needs visibility, debug, or UI.
Messages include role, type, summary, data, and `screenshot_url`.

```python
run = client.run("Find the top story on Hacker News")
async for msg in run:
    print(f"[{msg.role}] {msg.summary}")
print(run.result.output)
```

Cancel current task without killing the session:

```python
await client.sessions.stop(run.session_id, strategy="task")
```

## Workspaces and files

Use workspaces when:
- The agent must read uploaded files.
- The agent creates files to download.
- You need durable file organization across automation tasks.

Patterns:
1. Create workspace.
2. Upload files to workspace.
3. Run session with `workspace_id`.
4. Download outputs or all files.
5. Use prefixes/subdirectories for organization.

## Deterministic rerun / cached scripts

Use Cloud deterministic rerun when the same workflow will run repeatedly with different parameters.

Pattern from docs:
- First run: agent explores and creates script (~paid LLM, slower).
- Later runs: cached script with params (`$0` LLM, much faster).

Prompt convention: parameterize with bracketed variables, e.g. `[keyword]`, `[country]`, `[city]`. Use for recurring scraping/research/monitoring workflows.

Operational rule: If a workflow is likely to repeat, design the first task with explicit parameters and stable output schema.

## Cloud Browser via CDP

Use Cloud Browser when the code needs raw CDP/Playwright/Puppeteer/Selenium access with stealth infra.

Options:
- Create browser via SDK (`client.browsers.create()`), get CDP/websocket URL.
- Or use Browser Use browser with direct Playwright/Puppeteer/Selenium connection.

Remember:
- Agent sessions and Browser sessions are different. Agent runs a task; Browser gives raw CDP.
- Stop browser/session when done to persist profile state and avoid billing leaks.

## Stealth / proxies

Cloud Browser includes Browser Use stealth Chromium, CAPTCHA-solving-oriented infra, and residential proxies.

Proxy behavior:
- Residential proxies available in 195+ countries.
- Proxies are on by default in Cloud docs.
- To target a country: `proxy_country_code="de"` etc.
- To disable proxy for local/private hosts: `proxy_country_code=None`.
- Custom proxies are supported.

Rule: For `localhost`, internal dashboards, staging over private tunnels, or local dev, explicitly disable cloud proxy if routing breaks.

## Profiles, auth, 2FA

Use profiles for persistent browser state: cookies, localStorage, saved passwords. Login once, reuse.

Auth hierarchy:
1. **Cloud/OSS profile reuse** — preferred. Human logs in once, stop session to persist state.
2. **Human in the loop** — for approval/payment/2FA. Let human use `live_url`, then agent continues.
3. **Agent Mail / external email / 1Password / TOTP secret** — only if explicitly configured.

Critical safety:
- Never ask for or type raw credentials from screenshots.
- Don’t store plaintext passwords in skills/memory.
- For TOTP, docs use the TOTP secret, not the six-digit temporary code; only use if user explicitly provides/configures it securely.
- Stop session after login to persist profile state.

## Webhooks

Use webhooks for async task completion instead of polling loops when integrating production apps.
Verify webhook signatures and reject old requests (>5 minutes) per docs.

## OSS SDK — setup

```bash
pip install uv
uv venv --python 3.12
source .venv/bin/activate
uv pip install browser-use
uvx browser-use install
```

Recommended LLM for OSS docs: `ChatBrowserUse()` for speed/cost/accuracy. Alternatives include `ChatGoogle`, `ChatOpenAI`, `ChatAnthropic`, Azure OpenAI, Bedrock, Groq, Ollama, Vercel AI Gateway, etc.

```python
from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def main():
    llm = ChatBrowserUse()
    task = "Find the number 1 post on Show HN"
    agent = Agent(task=task, llm=llm)
    await agent.run()

asyncio.run(main())
```

## OSS prompting rules

From docs, prompt reliability improves when:
- Be specific, numbered, and explicit.
- Name actions directly when known: `search`, `click`, `scroll`, `extract`, `send_keys`, `write_file`.
- For problematic clicks, add keyboard fallback: `Tab`, `ArrowDown`, `Enter`.
- Include error recovery branches: anti-bot fallback, timeout fallback, alternate source.
- For custom tools, explicitly instruct when to use them and when not to improvise.

Bad: “Go to web and make money.”
Good: list URL, exact extraction, file output, fallback path, verification.

## OSS custom tools

Use `Tools()` and `@tools.action(description=...)` for deterministic actions, APIs, file handling, 2FA, human-in-loop, or Playwright integration.

Critical pitfall: special objects are injected by **parameter name**. Use `browser_session: BrowserSession`, not `browser: Browser`.

```python
from browser_use import Tools, Agent, ActionResult, BrowserSession

tools = Tools()

@tools.action(description="Click the submit button using CSS selector")
async def click_submit_button(browser_session: BrowserSession):
    page = await browser_session.must_get_current_page()
    elements = await page.get_elements_by_css_selector('button[type="submit"]')
    if not elements:
        return ActionResult(extracted_content="No submit button found")
    await elements[0].click()
    return ActionResult(extracted_content="Submit button clicked")
```

Available injected objects include:
- `browser_session: BrowserSession`
- `cdp_client`
- `page_extraction_llm`
- `file_system`
- `available_file_paths`
- `has_sensitive_data`

Use `allowed_domains` to restrict sensitive tools.

## OSS browser configuration

```python
from browser_use import Agent, Browser, ChatBrowserUse

browser = Browser(
    headless=False,
    window_size={"width": 1000, "height": 700},
)

agent = Agent(
    task="Search for Browser Use",
    browser=browser,
    llm=ChatBrowserUse(),
)
```

Use real browser profiles when logged-in state matters. Use remote/CDP when connecting to Browser Use Cloud Browser, Browserbase, or another remote Chrome.

## Sensitive data rules

- Prefer domain-scoped sensitive data.
- Disable vision on sensitive pages when screenshots could leak PII/secrets.
- Restrict tools with `allowed_domains`.
- Do not put secrets into prompts unless the docs pattern explicitly requires secure secret handling and the user approved it.

## Production checklist

Before shipping:
- Pick Cloud v3 if anti-bot/scale/reliability matters.
- Use structured output schemas.
- Use profiles for auth and stop sessions to persist.
- Use webhooks for async completion.
- Use deterministic rerun for repeated workflows.
- Add timeout/cancel paths.
- Turn recurring site quirks into domain skills or custom tools.
- Record/live-preview critical flows for debugging.
- Track cost/token usage if OSS.

## Relationship with browser-harness

If I am asked to directly operate a browser from Hermes, load `browser-harness`. If I am asked to build code around Browser Use Cloud/OSS, use this skill first, then `browser-harness` only if I need manual CDP exploration.

## Hermes native browser vs Browser Use vs browser-harness

When explaining capabilities to Jonathan or choosing an approach, separate the three layers clearly:

- **Hermes native browser toolset**: quick page checks, simple navigation, screenshots, lightweight interaction. Good for verification and simple websites; not the default for logged-in social platforms or anti-bot-heavy workflows.
- **Browser Use Cloud/OSS**: agentic web workflows, structured extraction, profiles/sessions, cloud browsers, proxies, recordings, and repeated scraping/monitoring flows. Best default for production-like social/funnel intelligence when a dedicated browser profile can be used.
- **browser-harness**: direct CDP control of a real Chrome/Chromium session. Best for screenshot-first debug, precise clicks, DOM/network inspection, iframes/shadow DOM, and validating complex UI behavior. It is a surgical control layer, not the main autonomous scraping engine.

For social/funnel market intelligence such as Instagram/YouTube/X infopreneur monitoring:

1. Start with public sources and clean APIs/extractors where possible, especially YouTube transcripts, descriptions, links, sites, landing pages, and public funnels.
2. Use Browser Use with a **dedicated agent-owned profile/account** for authenticated Instagram/X work; never use Jonathan’s personal accounts and never ask for passwords or 2FA codes in chat.
3. Keep early runs targeted: named list, shallow extraction, slow cadence, read-only behavior, no automated follows/comments/DMs.
4. Use browser-harness only when Browser Use/native browser needs precise CDP-level debugging or visual verification.
