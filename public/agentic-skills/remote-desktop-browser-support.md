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
- `scripts/macos_chrome_crash_fix.sh` — preserved helper script from the macOS Chrome case, if present.

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
