---
name: client-vps-access
description: "Securely set up, verify, and persist operational SSH access to client VPS machines. Use when the user asks to enter a client's VPS, test SSH access, add an SSH key, or save VPS access details."
version: 1.0.0
author: Hermes
metadata:
  hermes:
    tags: [devops, ssh, vps, client-access, security]
---

# Client VPS Access

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Use this skill when a client/server access workflow appears: `ssh user@host`, SSH keys, `Permission denied (publickey)`, adding our key to `authorized_keys`, or "enregistre l'accès".

## Core rule

Do **not** ask the user to share a private key unless there is no viable alternative. The clean default is: generate/use a local Hermes SSH key, give the **public** key to the client, and have them add it to the VPS `authorized_keys`.

Private keys are secrets. Do not paste them into chat, wiki, memory, or skill references. Ever.

## Infomaniak VPS onboarding for Hermes clients

If the client is on a Windows PC, do **not** tell them to install Linux locally. Clarify the model: their local PC can stay Windows; the remote VPS should be Ubuntu Linux for Hermes. Recommended flow: `Windows PC + VS Code Remote SSH -> Infomaniak VPS Ubuntu 24.04 LTS`.

If the Infomaniak Manager shows `Windows 11 Pro Eval`, `Connexion RDP`, user `Infomaniak`, or port `3389`, this is a Windows/RDP server. PuTTY/SSH/VS Code Remote SSH are not the right primary tools. For first Windows login, Infomaniak requires `Ouvrir la console VNC` to change the Windows password, then RDP with the displayed IPv4 and user (`Infomaniak` for Windows 10/11 Pro, `Administrator` for Windows Server). For Hermes, recommend reinitializing the VPS to `Ubuntu 24.04 LTS` unless the user explicitly needs Windows.

For Infomaniak Ubuntu setup from Windows:
1. In Manager: `Réinitialiser le serveur` -> `Ubuntu 24.04 LTS` (or 22.04 LTS if needed).
2. Generate a Windows OpenSSH key in PowerShell:
   ```powershell
   ssh-keygen -t ed25519 -C "vividflow-infomaniak-test" -f $env:USERPROFILE\.ssh\vividflow_infomaniak_test
   type $env:USERPROFILE\.ssh\vividflow_infomaniak_test.pub
   ```
3. Paste only the public key (`.pub`, line starting `ssh-ed25519`) into Infomaniak; never paste the private key.
4. Connect from VS Code Remote SSH using:
   ```sshconfig
   Host vividflow-vps-test
     HostName <INFOMANIAK_IPV4>
     User ubuntu
     IdentityFile C:\Users\<WINDOWS_USER>\.ssh\vividflow_infomaniak_test
     IdentitiesOnly yes
   ```
5. Verify `whoami` -> `ubuntu`, then `sudo -i` -> `root`.

## Workflow

### 1. Test the obvious access first

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new user@host 'echo ACCESS_OK && hostname && whoami && uname -a'
```

If it returns `Permission denied (publickey)`, the server is reachable but the local agent/key is not authorized.

### 2. Check local identities

```bash
ssh-add -l 2>/dev/null || true
find ~/.ssh -maxdepth 1 -type f \( -name '*client*' -o -name '*clientops*' -o -name 'id_ed25519*' \) -printf '%f\n' 2>/dev/null || true
```

Do not pretend a public key can be used to connect. A public key only authorizes; the matching private key must exist locally.

### 3. Prefer generating a local access key

Use a descriptive local key. For one shared operational key:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "clientops-hermes-client-access" -f ~/.ssh/clientops_client_access -N ''
chmod 600 ~/.ssh/clientops_client_access
chmod 644 ~/.ssh/clientops_client_access.pub
cat ~/.ssh/clientops_client_access.pub
ssh-keygen -lf ~/.ssh/clientops_client_access.pub
```

For higher hygiene, prefer a per-client key:

```bash
ssh-keygen -t ed25519 -C "clientops-hermes-CLIENT-access" -f ~/.ssh/clientops_CLIENT_access -N ''
```

### 3b. If the user gives a root password, bootstrap key access immediately

Do not keep using password SSH. Use it once to install the Hermes public key, then verify key-only access and persist an alias.

```bash
# Install sshpass locally if absent (Debian/Ubuntu)
command -v sshpass >/dev/null || apt-get update -qq && apt-get install -y -qq sshpass

KEY="$HOME/.ssh/clientops_CLIENT_access"
HOST="HOST_IP"
USER="root"
PUB="$(cat "$KEY.pub")"

# Put the password in an env var for the single command, not in files/log notes.
SSHPASS="$VPS_PASSWORD" sshpass -e ssh \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=12 \
  "$USER@$HOST" \
  "mkdir -p /root/.ssh && chmod 700 /root/.ssh && grep -qxF '$PUB' /root/.ssh/authorized_keys 2>/dev/null || echo '$PUB' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && echo KEY_INSTALLED && hostname && whoami"

ssh -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes "$USER@$HOST" \
  'echo ACCESS_OK && hostname && whoami'
```

Then discard the password from command history/context as much as practical; local operational notes should say "access via SSH key" only.

### 4. Give the user the public key + exact server-side command

For user `ubuntu`:

```bash
mkdir -p /home/ubuntu/.ssh
echo 'PUBLIC_KEY_HERE' >> /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys
```

If the user is `root`, adjust paths and ownership:

```bash
mkdir -p /root/.ssh
echo 'PUBLIC_KEY_HERE' >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

### 5. Retest with explicit identity

```bash
ssh -i ~/.ssh/clientops_client_access \
  -o BatchMode=yes \
  -o ConnectTimeout=10 \
  -o StrictHostKeyChecking=accept-new \
  -o IdentitiesOnly=yes \
  user@host 'echo ACCESS_OK && hostname && whoami && uname -a'
```

### 6. Persist the access locally after verification

Create an SSH alias so future sessions do not need raw host/user/key details repeated:

```sshconfig
Host client-vps
  HostName HOST_IP_OR_DOMAIN
  User USER
  IdentityFile ~/.ssh/clientops_client_access
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
```

Also create a local non-secret note:

```bash
mkdir -p ~/.hermes/access
chmod 700 ~/.hermes/access
cat > ~/.hermes/access/client-vps.md <<'EOF'
# CLIENT — VPS access

- Client: CLIENT
- SSH alias: `client-vps`
- Command: `ssh client-vps`
- Host: `HOST`
- User: `USER`
- Remote hostname verified: `REMOTE_HOSTNAME`
- Key used locally: `~/.ssh/clientops_client_access`
- Public key comment: `clientops-hermes-client-access`
- Verified: YYYY-MM-DD

Note: do not paste or duplicate private keys in memory/wiki. Keep access via SSH config + local key file only.
EOF
chmod 600 ~/.hermes/access/client-vps.md
```

Then verify the alias:

```bash
ssh client-vps 'echo ACCESS_OK && hostname && whoami'
```

### 7. If this access was a client-delivery blocker, update the Second Brain immediately

When VPS access was previously missing/blocking implementation, do not stop at SSH success. Find the client/entity page(s) in `/root/wiki`, update the operational status from blocked to unblocked, and append to `wiki/log.md`. Keep it non-secret: alias, verified hostname, user, and capabilities discovered are OK; IPs/passwords/private keys are not.

Minimum check/update pattern:

```bash
cd /root
rg -i "CLIENT|PROJECT|vps|bloqu" wiki/entities wiki/concepts wiki/index.md
# edit the relevant page(s), then update wiki/index.md and append wiki/log.md
```

Useful facts to record: SSH alias, remote hostname, verified Linux user, whether Docker exists, and high-level existing directories such as `.hermes`, `.claude`, app repos, or `data/`. If the VPS is not empty, perform a read-only audit before any bootstrap/update so we do not smash a live client environment like a caffeinated intern. For Hermes-specific live-stack audits, use the `hermes-agent` reference `references/client-vps-pre-update-audit.md`: classify host/container Hermes installs, canonical gateway ownership, dirty git state, Docker/ports/services, model-provider log failures, and backup requirements before running `hermes update`.

## Negative access audit — when the user asks “do we have access?” / “are you sure we never accessed it?”

If no obvious SSH alias exists, do not stop at `~/.ssh/config`. Run a **negative access audit** before giving a confident answer. Check, in this order:

1. Local SSH inventory: `~/.ssh/config`, `~/.ssh/config.d`, `~/.hermes/access/*.md`, key filenames, shell history, and known client aliases.
2. Operational sources: `/root/wiki`, `/root/raw`, `/root/outputs`, Data OS/client files, and `~/.hermes/sessions` for client name, contact, domain, Hostinger/VPS/SSH/root/IP terms.
3. Past conversation memory: use `session_search` and/or `supermemory_search` for `client + VPS + SSH + Hostinger + root@ + likely IP`.
4. Evidence of prior access: `ACCESS_OK`, audited hostname, saved access note, `root@IP`, `ssh client-alias`, `known_hosts` entries tied to the client, VPS audit report, or remote hostname.
5. If the user mentions a possible Linux user only (e.g. “Calvi/AIOS”), explain that user ≠ host. You still need the IP/hostname. Test only known plausible hosts non-interactively with `BatchMode=yes` and short timeouts; do not brute-force the internet.

Answer with confidence levels:
- **Operationally no access** = no alias/note/IP/proof found in current infra.
- **No proof we ever accessed it** = sessions/wiki/logs show project work but no `ACCESS_OK`, audit, SSH command, or saved host.
- **Cannot prove never globally** = maybe someone accessed it outside this machine and never recorded it.

Pitfall: a signed client, CDC/deck, Data OS entry, Notion/tl;dv/audit docs, or public DNS/email domain does **not** mean VPS access exists. Domain DNS/email often points to web/email hosting (Infomaniak/Cloudflare/Outlook) and is not an SSH inventory.

For the detailed checklist and sample commands, see `references/negative-vps-access-audit.md`.

## Infomaniak VPS onboarding from Windows

When guiding a non-technical user from Windows to an Infomaniak VPS for Hermes, separate three contexts early:

- The user's laptop can stay Windows.
- The VPS should be Linux/Ubuntu for Hermes.
- Windows VPS images use RDP/VNC and are not the normal SSH path for Hermes.

Recommended language: "Ton PC reste Windows. Ton serveur passe en Ubuntu. VS Code Remote SSH fait le pont."

### Infomaniak Windows vs Ubuntu decision

If the Infomaniak dashboard shows `Distribution / Version: Windows ...`, do not continue with PuTTY/SSH as if it were Linux. For Windows:

- First connection may require `Ouvrir la console VNC` to change the Windows password.
- RDP uses port `3389`, username often `Infomaniak` for Windows 10/11 Pro.
- This is only for Windows testing; for Hermes, recommend reinitializing the VPS as `Ubuntu 24.04 LTS` or `Ubuntu 22.04 LTS`.

If the goal is Hermes, guide the user to:

1. Infomaniak VPS page → `Réinitialiser le serveur`.
2. Choose `Ubuntu 24.04 LTS` when available.
3. Add/select an SSH public key during the reinitialization flow, not only as a detached key in the account if the provider UI distinguishes those.
4. Use default user `ubuntu`.

### Public/private key explanation for users

Be explicit and repetitive; users confuse these constantly:

- Public key: starts with `ssh-rsa ...` or `ssh-ed25519 ...`; goes into Infomaniak; keep the whole single line including the prefix and trailing comment such as `phpseclib-generated-key`.
- Private key: starts with `-----BEGIN RSA PRIVATE KEY-----` or `-----BEGIN OPENSSH PRIVATE KEY-----`; stays only on the user's PC; never paste it into chat/forms; keep the begin/end lines in the private key file.
- VS Code/SSH `IdentityFile` points to the private key file, not the public key.
- If SSH asks for `password:` after key setup, the key was not accepted or not used; do not tell the user to paste the private key as a password.

On Windows, if the private key was saved as `.txt`, SSH can still read it if the path is exact, but a no-extension filename is cleaner. Always first verify file existence:

```powershell
dir "$env:USERPROFILE\.ssh"
```

Then use the exact visible filename:

```powershell
ssh -i "C:\Users\USERNAME\.ssh\vividflow_infomaniak_rsa.txt" ubuntu@HOST_IP
```

If the error is `Warning: Identity file ... not accessible: No such file or directory`, stop debugging keys and fix the path/filename first.

### Infomaniak Permission denied(publickey) triage

If the user reaches:

```text
Permission denied (publickey).
```

and the identity file exists, the server is reachable but the key is not authorized. Run/ask for these checks:

```powershell
ssh-keygen -y -f "C:\Users\USERNAME\.ssh\PRIVATE_KEY_FILE"
type "C:\Users\USERNAME\.ssh\PUBLIC_KEY_FILE"
```

The public key derived from the private key must match the one added/selected in Infomaniak. If not, generate a new clean pair and reinitialize/select it:

```powershell
ssh-keygen -t ed25519 -C "vividflow-infomaniak-test" -f "$env:USERPROFILE\.ssh\vividflow_infomaniak_test"
type "$env:USERPROFILE\.ssh\vividflow_infomaniak_test.pub"
```

Then in Infomaniak, add/select the full `ssh-ed25519 ...` public key during Ubuntu reinitialization, and connect with:

```powershell
ssh -i "$env:USERPROFILE\.ssh\vividflow_infomaniak_test" ubuntu@HOST_IP
```

### VS Code Remote SSH config on Windows

After PowerShell SSH works, configure VS Code Remote SSH:

```sshconfig
Host vividflow-vps-test
  HostName HOST_IP
  User ubuntu
  IdentityFile C:\Users\USERNAME\.ssh\PRIVATE_KEY_FILE
  IdentitiesOnly yes
```

Connect via `Ctrl+Shift+P` → `Remote-SSH: Connect to Host` → select host → choose `Linux`. Verify remotely:

```bash
whoami
sudo -i
whoami
```

Do not ask the user to run `sudo -i` in local Windows PowerShell; it only applies after SSH succeeds and the prompt is on Ubuntu.

## Tailscale private VPS access

When the user wants local/private access to VPS files or SSH via Tailscale, treat it as VPS access hardening, not just “install an app”. Default recommendation: Tailscale + Remote SSH/Cursor for development; SSHFS only for Finder/file-manager workflows because it gets flaky on large repos and `node_modules`.

On Ubuntu/Debian VPS:

```bash
# Discover OS first if unknown
uname -a && cat /etc/os-release 2>/dev/null || true

# Install if missing
if command -v tailscale >/dev/null 2>&1; then
  tailscale version || true
else
  curl -fsSL <url> | sh
fi

systemctl is-active --quiet tailscaled || systemctl enable --now tailscaled
```

Then start authentication and send the user the generated link:

```bash
tailscale up --hostname=CLIENT-or-hermes-vps
```

If the command times out or the first link is lost, do **not** rerun blindly forever; check state and retrieve a fresh link:

```bash
tailscale status || true
tailscale ip -4 || true
```

When state is `NeedsLogin`, `tailscale status` usually prints `Log in at: <url> Send that URL to the user and ask them to validate it from their Mac/browser. After they say it is done, verify:

```bash
tailscale status
tailscale ip -4
```

Then give the Mac/Cursor SSH config using the 100.x Tailscale IP:

```sshconfig
Host hermes-vps
  HostName 100.x.y.z
  User root
```

Pitfalls:
- `tailscale up` blocks waiting for browser auth; use a short timeout or background process if operating inside chat so the turn does not hang.
- The first auth URL can become stale after timeout/cancel; `tailscale status` can emit a fresh `Log in at:` URL.
- Installing via `curl | sh` may trigger security approval; if blocked, use the distro package instructions or a vetted installer path.
- Do **not** restart/stop/kill the current Hermes gateway while doing this. Tailscale install/service start is fine; gateway restarts are not.
- After Tailscale is verified, suggest restricting public SSH to reduce exposure, but do not lock firewall rules until Tailscale SSH access is confirmed from the user’s machine.

## Private VPS access via Tailscale

When the user wants local access to a VPS through Tailscale, treat Tailscale as the private network layer, not as a filesystem mount. On Ubuntu VPSs:

```bash
command -v tailscale >/dev/null || curl -fsSL <url> | sh
systemctl is-active --quiet tailscaled || sudo systemctl enable --now tailscaled
sudo tailscale up --hostname=CLIENT-vps
sudo tailscale status
sudo tailscale ip -4
```

Send the user only the `<url> auth URL. After they approve it, verify `tailscale status`, the `100.x.y.z` IP, and that SSH is still listening (`ss -ltnp | grep ':22'`).

For local file access, be explicit:
- Tailscale alone does **not** make Finder show VPS files; a local `~/hermes-vps` folder is empty until mounted.
- Best dev workflow: Cursor/VS Code Remote SSH to `root@100.x.y.z` or an SSH alias.
- Finder workflow: install SSHFS/macFUSE and mount, e.g. `sshfs root@100.x.y.z:/root ~/hermes-vps`; unmount with `umount ~/hermes-vps`.

Only recommend closing public SSH after the user confirms SSH via Tailscale works from their own machine. Do not lock everyone out for style points.

## Remote skill/library audit after access exists

When the user asks whether a client VPS has Hermes/Claude skills about a tool or workflow, use the persisted SSH alias, search remote skill roots, and redact before quoting anything. See `references/remote-skill-audit.md` for the safe search/redacted-reader pattern. Prefer summarizing capabilities and maturity level over dumping raw skill contents.

## Client Hermes container verification

If the access command includes `docker exec -it ... sh`, verify both the host and the named container before claiming success:

```bash
ssh CLIENT_ALIAS 'echo HOST_OK && hostname && whoami && docker ps --format "{{.Names}}" | grep -F "CONTAINER_NAME" && docker exec CONTAINER_NAME sh -lc "echo CONTAINER_OK && hostname && whoami && pwd && command -v hermes || true"'
```

Use `docker exec` without `-it` for non-interactive verification. Keep `-it` only for the human-facing interactive command, e.g.:

```bash
ssh -t CLIENT_ALIAS 'docker exec -it CONTAINER_NAME sh'
```

When Hermes is packaged in a container, also check `/opt/hermes/.venv/bin/hermes` and run through `zsh -lc` if plain `sh` does not load PATH correctly:

```bash
ssh CLIENT_ALIAS 'docker exec CONTAINER_NAME zsh -lc "cd /opt/hermes && (hermes --version || .venv/bin/hermes --version)"'
```

If `hermes update` fails with `Not a git repository`, this may be a provider image that copied source without `.git` (observed on Hostinger `ghcr.io/hostinger/hvps-hermes-agent:latest`). Back up `/opt/hermes`, initialize/reset it from `NousResearch/hermes-agent`, reinstall with `uv pip install -e ".[all]"`, migrate config, then verify. See the `hermes-agent` skill section “Updating Hermes inside Docker / Hostinger containers” for the exact sequence.

If Telegram stops replying after a container update/restart, do **not** stop at `docker ps`. Verify the gateway process and status inside the container:

```bash
ssh CLIENT_ALIAS 'docker exec CONTAINER_NAME zsh -lc "ps aux | grep -E '\''hermes gateway|gateway run'\'' | grep -v grep || true; cd /opt/hermes && HERMES_HOME=/opt/data HOME=/opt/data hermes status --all | grep -A10 '\''Gateway Service'\''"'
```

On Hostinger-style Hermes containers, the container can be up with only ttyd running. The durable fix is a host systemd service that runs `docker exec -u hermes -e HOME=/opt/data -e HERMES_HOME=/opt/data CONTAINER zsh -lc 'cd /opt/hermes && exec hermes gateway run --replace'`, after `chown -R hermes:hermes /opt/data`. See `hermes-agent` reference `references/hostinger-docker-gateway.md`.

## What to save where

- `~/.ssh/config`: SSH alias and key path.
- `~/.hermes/access/<client>-vps.md`: non-secret operational metadata.
- Long-term memory: only a tiny pointer such as "client VPS access is configured locally via alias X" if memory capacity/security allows.
- Wiki/Second Brain: only business-facing infrastructure facts if useful; never secrets/private keys.

## Pitfalls

- **Public key confusion**: users often paste a public key and ask you to "try it". You cannot authenticate with only a public key.
- **Memory secret filters**: storing raw SSH/IP/key details in injected memory may be blocked or unsafe. Use local files for access metadata.
- **Dotfile writes require care**: modifying `~/.ssh/config` is a side effect. Back it up first and preserve existing entries.
- **Markdown heredoc backticks execute**: when writing an access note with `cat <<EOF`, unescaped backticks inside Markdown command snippets are shell command substitution. Use `cat <<'EOF'` and replace placeholders afterwards, or escape every backtick. Otherwise the note write can accidentally run `ssh ...` / `docker exec -it` and produce weird TTY errors.
- **Wrong Linux user**: `ubuntu`, `root`, `debian`, `admin` differ by provider image. If `ubuntu` fails after key install, test/ask for the correct user.
- **Do not restart the current Hermes gateway** while connected through it. If gateway restart is required on a remote server, schedule it or ask the user to trigger manually.

## Reference patterns

- See `references/ssh-publickey-onboarding.md` for a condensed example of the public-key onboarding sequence and exact failure modes observed.
