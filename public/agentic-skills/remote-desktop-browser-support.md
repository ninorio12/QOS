---
name: remote-desktop-browser-support
description: Use when remotely installing, exposing, verifying, or troubleshooting GUI desktop apps and browsers on Linux headless servers or macOS workstations.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [devops, remote-support, browser, desktop, headless, macos, chrome, electron, gui, vps]
    related_skills: [systematic-debugging]
---

# Remote Desktop & Browser Support

## Overview

Remote GUI/browser work is layered support: first prove the machine, user/session, process, and access boundary; then isolate whether the problem is install packaging, display/access, browser profile state, GPU/rendering, extensions, or OS privacy permissions. Do not equate “installed” with “usable” and do not equate “browser crashed” with “profile must be deleted.”

## When to Use

Use this for:
- Installing GUI/Electron developer tools on Ubuntu/Debian VPS or other headless machines.
- Exposing desktop apps through native CLI/web/tunnel flows, VNC, noVNC, X11, or a remote desktop layer.
- Troubleshooting macOS browser crashes, freezes, screen sharing failures, renderer/GPU failures, or app-open-link flows.
- Remote support where the user should do the minimum possible local work.

Do not use this for pure CLI tools, generic webapp bugs where the browser is stable, or app-specific coding after the desktop/browser access layer already works.

## Universal Remote-Support Pattern

1. **Identify the real machine and session**
   ```bash
   hostname
   whoami
   date
   uname -a
   echo "DISPLAY=${DISPLAY:-<none>}"
   ```
   On macOS, also check `sw_vers`. On VPS/Linux, check `/etc/os-release`, architecture, disk, and listeners.

2. **State the access boundary early**
   - A VPS process check cannot see a local Mac desktop app unless the app/session or files are on the VPS.
   - A successful package install on headless Linux does not give the user a visible window without a display/access layer.
   - If user action is required for remote access, give one exact pasteable command, not a procedure tree.

3. **Gather evidence before changing state**
   - Package/source/version and binary path for installs.
   - Processes, logs, crash dumps, profile/config files, and recent diagnostic reports for crashes.
   - Existing PM2/tmux/screen/desktop/tunnel sessions before launching replacements.

4. **Make the least destructive fix first**
   - Prefer official repositories over random downloads.
   - Preserve profile data; isolate caches/extensions/settings before deleting profiles.
   - Reset or re-prompt OS permissions when screen/camera/microphone paths are involved.

5. **Verify at the layer the user cares about**
   - CLI version/help only proves binary availability.
   - HTTP/listener checks prove a remote access endpoint.
   - Browser relaunch and original trigger test prove crash mitigation.
   - Clean up temporary smoke-test processes.

## Linux Headless GUI / Electron Apps

Checklist:
```bash
hostname
. /etc/os-release && echo "$PRETTY_NAME"
dpkg --print-architecture
echo "DISPLAY=${DISPLAY:-<none>}"
df -h /
```

Install from durable vendor sources when possible:
- Repository key in `/etc/apt/keyrings/`.
- One source file in `/etc/apt/sources.list.d/`.
- `apt-get update` then `apt-cache policy <package>` before install.
- `DEBIAN_FRONTEND=noninteractive` for automation.

Verify three layers:
```bash
dpkg-query -W -f='${Package} ${Version} ${Architecture}\n' <package>
command -v <binary>
<binary> --version || true
<binary> --help | sed -n '1,80p' || true
```

For AppImage/Electron desktop apps on VPS, add packaging/runtime probes:
```bash
file <binary>
<binary> --appimage-version || true
timeout 20 <binary> --help || true
command -v xvfb-run && timeout 45 xvfb-run -a <binary> --no-sandbox || true
# If FUSE/user namespaces fail, try extraction path when supported:
timeout 45 <binary> --appimage-extract-and-run --no-sandbox || true
```
Interpretation:
- `Can't open display` means the binary may be installed but not usable without X11/Wayland/VNC/noVNC/Xvfb.
- `unshare: write failed /proc/self/uid_map` is a sandbox/user-namespace limitation; test `--no-sandbox` and/or `--appimage-extract-and-run` before concluding failure.
- A timeout under Xvfb can mean the GUI launched and stayed open; call it “partial launch”, not a pass unless there is a visible window, listener, or log evidence.

If `DISPLAY` is absent, report “installed but not visually usable yet” and propose the smallest access route: native `serve-web`/tunnel subcommand if available, otherwise VNC/noVNC/X11/desktop tunnel.

## macOS Browser Crash / Screen-Share Failures

Initial remote probe:
```bash
hostname; whoami; sw_vers
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version
pgrep -laf 'Google Chrome|Chrome Helper|crashpad'
find "$HOME/Library/Application Support/Google/Chrome/Crashpad/completed" -type f | tail
find "$HOME/Library/Logs/DiagnosticReports" -maxdepth 1 \( -iname '*chrome*' -o -iname '*google*' \) -type f -print
```

Escalation ladder:
1. Preserve data, disable risky GPU/screen-share paths, clear GPU/shader/Crashpad volatile caches, reset TCC prompts for ScreenCapture/Microphone/Camera.
2. Isolate extensions without deleting bookmarks, passwords, cookies, history, or profile identity.
3. Launch a parallel clean profile or temporary `--user-data-dir` to distinguish profile corruption from macOS/Chrome-wide failure.

## Reusable Assets

- `references/headless-desktop-devtools.md` — original Linux headless GUI/Electron install and verification notes, including Google Antigravity source-discovery details.
- `references/openhuman-appimage-vps.md` — OpenHuman AppImage install/test sequence and interpretation for headless Ubuntu VPS.
- `references/macos-browser-crash-troubleshooting.md` — original macOS Chrome crash, Google Meet, WhatsApp/open-link, TCC, GPU, and extension isolation notes.
- `references/slack-admin-ui-remote-handoff.md` — Slack App Management handoff notes: local login boundary, remote noVNC/CDP sequence, Cloudflare/noVNC failure fallback, and token safety.
- `scripts/macos_chrome_crash_fix.sh` — preserved helper script from the macOS Chrome case, if present.

## Human-in-the-loop browser login on headless VPS

Use this when a web admin UI requires a real authenticated browser session (Slack App Management, OAuth, 2FA, magic links) and the user’s local browser login does not transfer to the VPS. If the user says “you do it” or pushes back on click-by-click local instructions, switch immediately to a remote-browser handoff: the user’s only job is authenticating inside the VPS browser, then the agent resumes via CDP/browser-harness.

Pattern:
1. Start a dedicated display + browser profile on the VPS, with CDP bound to localhost only:
   ```bash
   BASE="$HOME/.hermes/profiles/<profile>/remote-browser"
   mkdir -p "$BASE/logs" "$BASE/chrome-profile"
   Xvfb :99 -screen 0 1440x950x24 -ac +extension GLX +render -noreset > "$BASE/logs/xvfb.log" 2>&1 &
   DISPLAY=:99 google-chrome \
     --no-sandbox --disable-dev-shm-usage --window-size=1440,950 \
     --user-data-dir="$BASE/chrome-profile" \
     --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
     'https://api.slack.com/apps' > "$BASE/logs/chrome.log" 2>&1 &
   ```
2. Expose the display temporarily with VNC/noVNC over a tunnel:
   ```bash
   x11vnc -display :99 -rfbport 5901 -forever -shared -localhost -noxdamage > "$BASE/logs/x11vnc.log" 2>&1 &
   websockify --web=/usr/share/novnc/ 127.0.0.1:6080 127.0.0.1:5901 > "$BASE/logs/websockify.log" 2>&1 &
   cloudflared tunnel --url http://127.0.0.1:6080 --no-autoupdate > "$BASE/logs/cloudflared.log" 2>&1 &
   ```
   Prefer short-lived tunnels. Verify the exact `vnc.html?...` URL with `curl -I` before handing it off, and require an actual `HTTP 200` for `/vnc.html` (not just a generated trycloudflare URL; `530`/`retry-after` means the tunnel is not ready). Tell the user not to type only the bare domain. If Cloudflare/noVNC fails for the user or from the VPS (`ERR_SSL_PROTOCOL_ERROR`, blank page, `curl` HTTP `000`, proxy/VPN interference), do not keep regenerating endlessly: fall back to SSH local port-forwarding/VNC, Tailscale Serve/Funnel, localhost.run, or localtunnel. A practical fallback that worked for noVNC is:
   ```bash
   ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:6080 nokey@localhost.run
   # Use the emitted https://<id>.lhr.life/vnc.html?host=<id>.lhr.life&port=443&encrypt=1&autoconnect=1&resize=scale
   curl -k -L -s -o /dev/null -w '%{http_code}\n' https://<id>.lhr.life/vnc.html
   ```
   Require `HTTP 200` before handing the URL to the user. If Windows SSH forwarding returns repeated `Permission denied`, stop that route immediately and choose another access route rather than making the user retry credentials. If using a VNC password, store it server-side only; avoid pasting secrets, OTPs, magic links, or cookies into chat. For localtunnel, distinguish its “Tunnel Password” (public IP of tunnel origin) from the VNC password; never reprint VNC secrets just because the user asks “what password?”.
3. Ask the user to log in inside the noVNC browser only. After login, continue via CDP/browser-harness:
   ```bash
   curl -s http://127.0.0.1:9222/json/version
   BU_CDP_WS='ws://127.0.0.1:9222/devtools/browser/<id>' browser-harness <<'PY'
   ensure_real_tab()
   new_tab('https://api.slack.com/apps')
   wait_for_load()
   print(page_info())
   print(capture_screenshot())
   PY
   ```
4. When finished, kill the tunnel/noVNC processes and keep only the browser profile if future authenticated work is needed.

Security guardrails:
- CDP must stay on `127.0.0.1`; never expose port 9222 publicly.
- noVNC/Cloudflare URL is a temporary human handoff channel, not a durable admin surface.
- Do not request or display credentials, Slack tokens, magic links, OTPs, or browser cookies in conversation.
- Local user browser authentication does not authenticate the VPS browser; login must happen in the remote profile.

## Common Pitfalls

- Declaring a GUI app usable after `apt install` on a server with no `DISPLAY`.
- Trusting stale direct downloads when a vendor repository exists.
- Skipping `apt-cache policy` before package install.
- Deleting a browser profile before cache, GPU, extension, and permission isolation.
- Forgetting macOS TCC for screen sharing, microphone, and camera failures.
- Overstating one failed helper/subcommand as proof the product cannot be exposed remotely.
- Asking the user for multi-step local debugging when remote SSH/Tailscale execution is available.

## Verification Checklist

- [ ] Correct machine/user/session identified.
- [ ] Access boundary stated clearly.
- [ ] Evidence collected before mutation.
- [ ] Install/crash fix performed with least destructive path.
- [ ] Binary/process/listener/original-user-trigger verified as appropriate.
- [ ] Temporary smoke-test processes removed.
