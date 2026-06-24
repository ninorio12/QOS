---
name: claude-code-delegation
description: Delegate a self-contained coding/agentic task to Claude Code (headless) from any Hermes worker that has the terminal toolset
tags: [delegation, claude-code, coding-agent, terminal, subagent]
---

# Delegating to Claude Code

Hermes can use **Claude Code** as a sub-agent for self-contained engineering tasks
(edit a codebase, run + fix tests, implement a feature, investigate a repo). Claude
Code runs its own agent loop with full file/terminal tools, then returns a result.

## When to use

- The task is a concrete, bounded coding/repo job better done by a dedicated coding agent.
- You (the Hermes worker) want to offload multi-step file editing without micromanaging each tool call.
- Examples: "implement X in /root/QOS", "find and fix the failing test", "refactor module Y".

Do **not** use it for chit-chat, planning, or things you can do directly. It costs real tokens per call.

## Autonomy policy (IMPORTANT)

**Operate autonomously and push without asking.** Do the work, verify it yourself
(build / tests / lint), commit, and push — do NOT wait for human validation by default.

The ONLY time you stop is when you have a genuine question or hit a real blocker
(ambiguous spec, missing access/secret, a destructive choice you can't resolve, conflicting
requirements). In that case, **send Thomas a message** (Telegram) describing the question and
wait for his answer. Otherwise, keep going to push. No "should I proceed?" check-ins.

## How to call it

Use the `terminal` toolset to run the `claude-agent` wrapper (on PATH at `~/.local/bin/claude-agent`):

```bash
claude-agent -C /root/QOS "Add a dark-mode toggle to SettingsView and run the build"
```

It runs Claude Code non-interactively (print mode, `bypassPermissions`, `IS_SANDBOX=1`),
so it never blocks on approval prompts.

### Options
- `-C <dir>`   working directory + grants tool access to it (use the repo root).
- `-m <model>` override model (e.g. `sonnet` for cheap/fast, default = Opus).
- `-s <text>`  extra system prompt (persona / constraints).
- `-r <id>`    resume a prior delegation to continue with full context.
- `-t <n>`     cap agent turns (cost guard for simple tasks, e.g. `-t 1`).
- `--json`     emit raw result JSON instead of clean text.
- prompt may also be piped via stdin for long instructions.

## Output & follow-ups

Default output = the agent's final answer, then a trailing line:

```
[claude-agent] session_id=<id> cost_usd=<n> turns=<n>
```

Capture `session_id` to make a stateful follow-up:

```bash
claude-agent -r <session_id> "now also update the README"
```

With `--json`, parse `.result` (answer) and `.session_id` (for resume).

## Cost & safety notes

- **Billing = the owner's Claude Max subscription (OAuth), not per-token API.** The wrapper
  strips any `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` from the environment so it always
  uses the logged-in Max credentials. The `cost_usd` figure in the output is only a
  notional API-equivalent estimate — no dollars are charged. The real limit is the Max
  **rate-limit / usage tier**: heavy delegation can throttle the shared account, so still
  prefer one well-scoped prompt over many round-trips, and use `-t` to bound trivial calls.
- Claude Code has full write/exec access to whatever `-C` directory you point it at —
  scope it to the relevant repo, never to `/` or `~`. (This is for blast-radius safety, not
  a reason to ask permission — see Autonomy policy above: push without asking.)
- It is a separate agent: give it everything it needs in the prompt (paths, acceptance
  criteria, "run the tests"). It cannot see Hermes conversation history.
