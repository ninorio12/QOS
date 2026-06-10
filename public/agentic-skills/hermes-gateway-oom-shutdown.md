---
name: hermes-gateway-oom-shutdown
description: Use when Hermes Telegram/Discord gateway shows “Gateway shutting down”, “Your current task will be interrupted”, systemd restarts, oom-kill, SIGTERM, SIGKILL, stale child processes, runaway Next/Chrome/MCP tools, or unexplained gateway interruptions.
---

# Hermes Gateway OOM Shutdown Runbook

## Core Principle

“⚠️ Gateway shutting down — Your current task will be interrupted” is a symptom, not the root cause. In Hermes it is emitted by `gateway/run.py::_notify_active_sessions_of_shutdown()` when the gateway receives shutdown/restart handling. First prove who killed/restarted the gateway, then fix resource pressure or lifecycle isolation.

## Known VividFlow/Cockpit Finding

On the Hostinger VPS, the confirmed incident pattern was:
- `systemd --user` restarted `hermes-gateway.service`.
- Journal showed: `A process of this unit has been killed by the OOM killer` and `Failed with result 'oom-kill'`.
- Peak gateway cgroup memory reached ~5.9G on an 8G VPS with no swap.
- Heavy descendants existed inside the gateway cgroup: MCP servers, Playwright/Chrome, Next build/server, tracker proxy.
- Some child processes survived restart: `Unit process ... remains running after unit stopped`, causing stale helpers and future memory pressure.

## Triage Commands

Run from the `hermes` user unless root is explicitly needed:

```bash
hermes gateway status || true
systemctl --user status hermes-gateway --no-pager -l || true
journalctl --user -u hermes-gateway --since '24 hours ago' --no-pager -n 250 || true

# Root/system evidence, if available
journalctl -k --since '24 hours ago' --no-pager | grep -Ei 'oom|killed|out of memory|memory' || true

# Current pressure
/usr/sbin/swapon --show || true
free -h
df -h / /home
ps -eo pid,ppid,rss,pmem,etime,cmd --sort=-rss | head -40

# Gateway-owned descendants
systemctl --user status hermes-gateway --no-pager -l | sed -n '/CGroup:/,$p'
```

## Diagnosis Rules

- If journal says `oom-kill`: treat memory exhaustion as root cause. Do not chase Telegram/provider errors first.
- If `Shutdown context: signal=SIGTERM under_systemd=yes parent_name=systemd`: systemd initiated the stop/restart, often after OOM or explicit `/restart`.
- If `Main process exited, status=9/KILL`: kernel/systemd killed it hard; normal cleanup may not run.
- If `Found left-over process` or `Unit process ... remains running`: stale child processes survived and must be classified before killing.
- If no OOM/systemd evidence: inspect manual restarts, deploy/update hooks, config changes, provider crashes, and Python tracebacks in `~/.hermes/logs/errors.log` / `gateway-exit-diag.log`.

## Repair / Prevention

### 1. Add swap if missing

On small VPSes, no swap makes OOM kills abrupt. Add 4G swap once:

```bash
if ! /usr/sbin/swapon --show=NAME --noheadings | grep -qx '/swapfile'; then
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
  sudo chmod 600 /swapfile
  sudo mkswap -f /swapfile
  sudo /usr/sbin/swapon /swapfile
fi
if ! grep -qE '^/swapfile\s+none\s+swap\s+' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
sudo sysctl vm.swappiness=20
```

Verify:

```bash
/usr/sbin/swapon --show
free -h
```

### 2. Keep heavy work out of the gateway cgroup

Commands launched by the gateway can appear inside `hermes-gateway.service` and die with it. For heavy/long-lived jobs, prefer one of these:

```bash
# One-off heavy build/test in separate transient scope
systemd-run --user --scope -p MemoryMax=5G -p MemorySwapMax=2G bash -lc 'cd /path/to/app && npm run build'

# Long-lived app: real service or PM2, not a raw child under the gateway
pm2 start npm --name vividflow-next -- run dev -- -H 0.0.0.0 -p 3000
pm2 save
```

Avoid leaving Playwright/Chrome, Next dev/build, tunnels, or tracker proxies as untracked gateway descendants.

### 3. Clean stale descendants carefully

Before killing anything, classify it:
- Operational/intentional: tracker proxy, public tunnel, live Next preview.
- Stale/no longer needed: old Chrome, old `npm run build`, dead MCP helper, orphaned slash worker.

Then stop the correct owner first: PM2/systemd/tmux/process tool. Use `kill` only after identifying the command and parent. For VividFlow/Hermes destructive operations, get confirmation if impact is unclear.

### 4. Restart cleanly after cleanup

```bash
systemctl --user reset-failed hermes-gateway || true
hermes gateway restart
sleep 5
hermes gateway status
systemctl --user status hermes-gateway --no-pager -l
```

## Quick Root-Cause Summary Template

Use this when reporting back:

```text
Cause confirmée: <OOM/systemd/manual restart/traceback/etc.>
Evidence: <journal/log line exact>
Pressure: <peak RSS/mem/swap/cgroup descendants>
Action taken: <swap/cleanup/service isolation/restart>
Remaining risk: <heavy process still running / no root journal access / needs service split>
Next prevention: <run heavy jobs in systemd-run scope, add MemoryMax, create PM2 service, etc.>
```

## Common Mistakes

- Treating the Telegram warning as a Telegram bug. It is usually gateway process lifecycle.
- Restarting repeatedly without reading `journalctl --user -u hermes-gateway`.
- Killing leftover processes blindly; some are legitimate live services.
- Running `npm build`, Playwright/Chrome, or dev servers directly under the gateway during active Telegram sessions.
- Assuming `swapon` is in PATH. On Ubuntu user services, call `/usr/sbin/swapon` explicitly.
