---
name: heartbeat-system
description: Lessons learned on heartbeats/crons for AIOS. Hermes has NO native heartbeat — only crons. Keep crons minimal, silent, and avoid LLM calls for simple health checks.
keywords: [heartbeat, cron, monitoring, dream, clientops, lessons-learned]
---

# Heartbeat & Cron Design — Lessons Learned

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Key Insight
Hermes has NO native heartbeat framework. "Heartbeats" are just crons that call scripts and pass output to an LLM agent. This means:
- Every "heartbeat" consumes LLM tokens (expensive!)
- Even "✅ RAS" requires a full API call
- Frequent crons = spam + cost

## Principles (from experience)

## Pitfall: Cron jobs with explicit `deliver=` already send the final response

In Hermes cron runs, the final assistant message is auto-delivered to the job target (`deliver`).
Do **not** manually post to Discord/Telegram via raw API or `send_message` inside the cron task unless explicitly required for multi-target fanout.

Why this matters:
- Manual API posting can fail (Cloudflare/network/auth edge cases) even when gateway delivery would succeed
- It creates duplicate messages if both manual post + cron delivery fire
- It leaks complexity into prompts that should stay simple

**Correct pattern for report crons:**
1. Read/interpret pre-run script JSON
2. Return exactly the message content to send
3. If there is truly nothing new, return exactly `[SILENT]`

Example for mapping guard:
- Alert case: `⚠️ Cohorte Cohort System mapping ALERTE — slugs impactés: ...`
- OK case: `mapping Cohorte Cohort System OK — count=<n> — <timestamp>`

### Script failure handling in cron runs (important)
If the pre-run script fails (non-zero exit, traceback, HTTP 401/403/500, etc.), **do not** try to "recover delivery" by posting manually to Discord/Telegram APIs from the cron task.

Correct behavior:
1. Treat the script error as the primary signal.
2. Return a concise failure report in the final assistant response (the cron `deliver` target handles delivery).
3. Never reveal tokens/secrets; include only error class, endpoint, and likely cause.
4. Skip downstream JSON interpretation logic if no valid JSON was produced.

Why:
- Manual posting often fails due to missing runtime creds in cron sandboxes.
- It adds noise and can create duplicate alerts when gateway delivery already works.
- It hides the real root cause (upstream auth/data failure).

### Pitfall: "Channel-specific alert" requests during cron failures
Sometimes the task text says "send to #channel-X". If the refresh script failed and the cron already has a `deliver` target, **do not pivot to raw Discord API posting** as a fallback.

Observed failure mode (2026-04-14):
- Upstream refresh failed with `HTTP 401 Unauthorized` (source API)
- Raw Discord POST fallback returned `HTTP 403 Forbidden` (bot permissions/scope)
- Local relay fallback (`<url>) returned `connection refused`

Robust handling order:
1. Report the upstream failure in final response (this is the guaranteed delivery path).
2. If channel delivery is business-critical, state explicitly that channel posting failed and why (`403` / relay down).
3. Ask for infra fix outside the cron run: bot channel permissions + stable relay (if used).
4. Never print token values or auth headers.


1. **If an agent already monitors something, don't add a cron for it.**
   Example: CSM Discord agent monitors students → no need for CSM Monitor cron on Telegram.

2. **deliver=local for background tasks.** Only use telegram/discord delivery for things humans need to act on.

3. **No LLM for health checks.** A simple script that curls a URL doesn't need Claude Opus to say "✅". Use `deliver=local` or don't create a cron at all.

4. **Max 2-3 crons that message the user per week.** Everything else should be silent.

5. **Dream is the only "heartbeat" worth keeping.** It consolidates memory at night, runs locally, no notifications.

## Recommended Cron Architecture

```
SILENT (deliver=local, no notifications)
  Discord Sync       every 1h      fetch student messages
  Batch LightRAG     2h nuit       enrich semantic memory  
  Dream              3h30 nuit     consolidate memory, cleanup

WEEKLY REPORTS (deliver=telegram, actionable)
  Data Analyst       lundi 9h      KPI report
  CFO                lun+jeu 9h    financial report
```

## What NOT to do
- Heartbeat Infra every 2h → spam "✅" messages, wastes tokens
- Heartbeat Business 2x/day → duplicates what CSM agent does
- CSM Monitor daily → redundant with CSM Discord agent
- CSM Orchestrateur every 15min → sends identical escalation report repeatedly
- Any cron with `smart_model_routing` pointing to a non-existent model → 404 errors on every run

## Pitfall: Cron scheduler exécute TOUT avec Python
`cron/scheduler.py` `_run_job_script()` utilisait `[sys.executable, str(path)]` pour TOUS les
scripts — y compris les `.sh`. Les scripts bash échouaient avec `SyntaxError: invalid syntax`.
**Fixé** (2026-04-07): ajout détection `.sh` → `/bin/bash` dans `_run_job_script()`.
Si on ajoute d'autres types de scripts (Ruby, Node…), il faudra étendre la logique.

## Pitfall: Gateway self-destruct (agent restarts its own gateway)
If an agent running inside a gateway session executes `hermes gateway run --replace`,
`systemctl restart hermes-gateway`, `pkill hermes`, or any variant, it kills its own
process mid-response. The user gets silence — no error, no reply, nothing.

**Hard block added** (2026-04-07) in `tools/approval.py`:
- `_is_gateway_self_destruct()` detects restart/stop/kill commands when `HERMES_GATEWAY_SESSION` is set
- Returns a non-approvable BLOCK (even `/approve` can't bypass it)
- Read-only commands (`grep`, `cat`, `tail`, `echo`) with "gateway" in them are excluded
- Both SOUL.md files (default + CSM profile) have an explicit rule forbidding self-restart
- If a fix genuinely requires a gateway restart, the agent must tell the user to do it
  manually, or schedule a one-shot cron with a delay

**Diagnosis pattern:** If an agent stops responding mid-conversation:
1. Check `gateway.log` for "Stopping gateway" timestamps near the conversation
2. Check if there's a "response ready" line for the last inbound message (if missing → killed mid-response)
3. Check `agent.log` for terminal calls containing "gateway run", "restart", "pkill"

**Recovery procedure (from CLI, NEVER from the dead gateway's own session):**

1. Check what's still running:
```bash
ps aux | grep -E "openclaw|hermes.*gateway" | grep -v grep
```

2. Kill stale processes (the Go wrapper `openclaw-gateway` may still be alive but the Python gateway is dead):
```bash
kill <PID_of_openclaw-gateway>
sleep 2
```

3. Restart — two options:

   **Option A: Let openclaw-gateway manage it (preferred)**
   ```bash
   nohup openclaw-gateway >> ~/.hermes/logs/gateway.log 2>&1 &
   ```
   Wait ~10s, then check `tail -20 ~/.hermes/logs/gateway.log` for "✓ telegram connected".
   NOTE: This may NOT restart the Python gateway automatically — if no new log lines appear after 15s, use Option B.

   **Option B: Start the Python gateway directly**
   ```bash
   cd ~/.hermes/hermes-agent && source venv/bin/activate
   nohup python3 -c "
   import os, sys, logging
   sys.path.insert(0, '~/.hermes/hermes-agent')
   logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s: %(message)s', stream=sys.stderr, force=True)
   from hermes_cli.env_loader import load_hermes_dotenv
   load_hermes_dotenv(project_env='~/.hermes/hermes-agent/.env')
   import asyncio, pathlib
   pathlib.Path('~/.hermes/gateway.pid').unlink(missing_ok=True)
   from gateway.run import start_gateway
   success = asyncio.run(start_gateway(replace=False, verbosity=1))
   sys.exit(0 if success else 1)
   " >> ~/.hermes/logs/gateway.log 2>&1 &
   ```

4. Verify (wait 10-15s):
```bash
tail -20 ~/.hermes/logs/gateway.log
# Must see: "✓ telegram connected" and "Gateway running with 1 platform(s)"
```

5. For profile gateways (e.g., CSM/Discord), use the profile's start script:
```bash
nohup bash ~/.hermes/profiles/<name>/start-gateway.sh >> ~/.hermes/profiles/<name>/logs/gateway.log 2>&1 &
```

**Key lesson:** `openclaw-gateway` (Go binary) and the Python gateway are separate processes.
The Go wrapper does NOT always auto-restart the Python gateway when it dies. Always verify
with log output, not just `ps aux`.

## Pitfall: Delta tracking — NE PAS faire confiance au LLM

Les crons fréquents DOIVENT tracker l'état précédent, sinon ils renvoient la même alerte en boucle.

**Ce qui NE MARCHE PAS :** Demander au LLM dans le prompt de calculer un hash MD5 et comparer.
Le LLM ignore l'instruction et envoie quand même. Testé 3 fois, échoué 3 fois.

**Ce qui MARCHE :** Un script bash pré-exécution (champ `script` du cron) qui fait le delta
AVANT que le LLM ne tourne. Si rien n'a changé, le script ne produit rien → le LLM reçoit
un input vide → il répond "[SILENT]" → l'utilisateur ne reçoit rien.

### Pattern : delta-wrapper.sh

Créer `~/.hermes/scripts/delta-wrapper.sh` :
```bash
#!/bin/bash
HASH_NAME="$1"; shift
HASH_FILE="~/.hermes/scripts/.last-hash-${HASH_NAME}"
OUTPUT=$("$@" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ] || [ -z "$OUTPUT" ]; then exit 0; fi
NEW_HASH=$(echo "$OUTPUT" | md5sum | cut -d' ' -f1)
if [ -f "$HASH_FILE" ]; then
    OLD_HASH=$(cat "$HASH_FILE")
    if [ "$NEW_HASH" = "$OLD_HASH" ]; then exit 0; fi
fi
echo "$NEW_HASH" > "$HASH_FILE"
echo "$OUTPUT"
```

**IMPORTANT :** Le champ `script` du cron ne supporte qu'un nom de fichier simple
(résolu depuis `~/.hermes/scripts/`), PAS une commande avec arguments.

**IMPORTANT 2 :** Après modification de `cron/scheduler.py`, le gateway doit être
redémarré pour charger le nouveau code. Le process en mémoire garde l'ancien code.
Ne JAMAIS restart le gateway depuis une session gateway (voir pitfall ci-dessus).
Donc créer un wrapper individuel par job :
```bash
#!/bin/bash
# delta-escalations.sh
exec ~/.hermes/scripts/delta-wrapper.sh escalations cat ~/.hermes/scripts/csm-escalations.jsonl
```

Le prompt du cron devient alors simplement :
> "Analyse les données ci-dessous. Si aucun input → [SILENT]."

### Résumé des 3 tentatives qui ont échoué
1. **Prompt-only hash** → LLM ignore les instructions, envoie quand même
2. **Script field avec arguments** (`delta-wrapper.sh escalations cat ...`) → cron engine traite le tout comme un filename, ne trouve pas le fichier
3. **Wrapper .sh appelant le main wrapper** → marchait localement mais le gateway avait du code stale qui lançait les .sh avec Python au lieu de bash. Fix: restart gateway après modification de scheduler.py

## Pitfall: Discord sync silencieux quand le token est révoqué

Le script `heartbeat-discord-sync.py` retourne `{channels_synced: 0, new_messages: 0}` **sans erreur**
quand le `DISCORD_BOT_TOKEN` est invalide/révoqué. L'API Discord retourne HTTP 403 (error 1010),
mais `fetch_json()` avale le `None` silencieusement → `channels` est `None` → le script exit avec
`"Impossible de récupérer les canaux"` ... sauf qu'il ne sort même pas en erreur, il passe dans le
`if not channels` et sort en `sys.exit(1)` avec un JSON d'erreur. Mais en pratique, le cron wrapper
peut masquer ce exit code.

**Diagnostic quand le heartbeat retourne 0/0/0 :**
1. Vérifier le token : `python3 -c "from dotenv import load_dotenv; load_dotenv('~/.hermes/profiles/csm/.env'); import os; print(os.getenv('DISCORD_BOT_TOKEN','')[:8])"`
2. Tester l'auth : `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bot $DISCORD_BOT_TOKEN" <url>
   - 200 = token OK, problème ailleurs
   - 403 error 1010 = token révoqué → mettre à jour dans `~/.hermes/profiles/csm/.env`
3. Vérifier les offsets : `cat /workspace/wiki/sync/discord-offsets.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} channels')"` — si les offsets existent mais 0 messages, le problème est l'auth

**Diagnostic avancé : distinguer "token mort" de "rien de nouveau"**

Quand le heartbeat retourne 0/0/0 sans erreur, deux causes possibles :
1. Token révoqué → aucune donnée fetchée (voir diagnostic curl ci-dessus)
2. Tout est à jour → les offsets correspondent déjà aux derniers messages

**Comment différencier rapidement :**
```bash
# Vérifier la fraîcheur des fichiers bruts (si modifiés récemment, le sync fonctionne)
ls -lt /workspace/wiki/sync/raw-messages/ | head -5
# Si les fichiers ont été modifiés dans les dernières heures → sync OK, juste pas de nouveaux msgs
```

**Pour un rapport utile même quand 0 nouveaux messages :**
Lancer une analyse indépendante des messages stockés dans les dernières 24h :
```python
# Scan les .jsonl dans /workspace/wiki/sync/raw-messages/
# Filtre par timestamp > now - 24h
# Détecte signaux faibles (questions sans réponse, urgence, négatif)
# Signale l'activité récente par channel même si déjà syncée
```
Cela permet de produire un rapport actionnable (signaux, inactivité) plutôt qu'un simple "0 messages" silencieux.

**Pitfall : env var name mismatch (DISCORD_TOKEN vs DISCORD_BOT_TOKEN)**

Le script utilisait `os.getenv("DISCORD_TOKEN")` mais le .env profile définit `DISCORD_BOT_TOKEN`.
Résultat : token = None → `fetch_json` retourne None → `channels` = None → exit silencieux,
MAIS le cron wrapper peut masquer l'exit code et le heartbeat retourne simplement `{channels_synced: 0}`.

**Fix :** Toujours chercher les deux noms :
```python
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_TOKEN")
```

**Diagnostic :** Si `0 channels_synced, 0 errors` (pas même le message d'erreur "Impossible de récupérer les canaux"),
vérifier que le token est bien résolu :
```bash
python3 -c "from dotenv import load_dotenv; load_dotenv('~/.hermes/profiles/csm/.env'); import os; t=os.getenv('DISCORD_BOT_TOKEN') or os.getenv('DISCORD_TOKEN'); print(f'resolved={bool(t)} len={len(t) if t else 0}')"
```

**Pitfall : Token absent de l'environnement (pas juste mal nommé)**

Le script `heartbeat-discord-sync.py` fait `os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_TOKEN")`
mais NE source PAS automatiquement le `.env` du profil. Si le cron ne passe pas par le gateway
(qui source l'env au démarrage), le token n'existe tout simplement pas dans l'environnement.

Résultat : `DISCORD_TOKEN = None` → `if not DISCORD_TOKEN:` → le script sort silencieusement
avec `{channels_synced: 0, new_messages: 0, signals_detected: 0, errors: []}`.
**AUCUNE erreur n'est rapportée** car le script a un `if not DISCORD_TOKEN: print(error); sys.exit(1)`
mais le cron wrapper peut masquer l'exit code.

**Diagnostic rapide :**
```bash
# 1. Vérifier si le token est dans l'environnement courant
env | grep DISCORD_BOT_TOKEN
# 2. Vérifier s'il est dans le .env du profil
grep DISCORD_BOT_TOKEN ~/.hermes/profiles/csm/.env
# 3. Vérifier s'il est dans le .env global
grep DISCORD_BOT_TOKEN ~/.hermes/.env
```

**Fix :** Le script doit sourcer le `.env` explicitement :
```python
from dotenv import load_dotenv
# Essayer le profil CSM d'abord, puis le global
load_dotenv("~/.hermes/profiles/csm/.env", override=False)
load_dotenv("~/.hermes/.env", override=False)
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_TOKEN")
```

Ou, dans le cron, utiliser un script wrapper qui source l'env avant d'appeler le script Python.

**Fix recommandé pour le script :** Ajouter un check d'auth explicite avant la boucle de sync :
```python
# Avant la boucle principale, vérifier l'auth
me = await fetch_json(session, f"{API_BASE}/users/@me")
if not me:
    results["errors"].append("Auth échouée — DISCORD_BOT_TOKEN invalide ou révoqué (HTTP 403)")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    sys.exit(1)
```

**Fix recommandé pour le cron prompt :** Demander à l'agent d'analyser les messages des dernières 24h dans les fichiers bruts même quand le sync retourne 0 nouveaux — les signaux faibles sont dans les messages déjà stockés, pas seulement dans les nouveaux.

### Pattern : Inactivité + questions sans réponse (quand sync = 0/0/0)

Quand le sync retourne 0 nouveaux messages (offsets à jour), le rapport est quand même actionnable
en scannant l'API Discord pour l'inactivité et les questions sans réponse :

**Étape 1 — Inactivité par channel :**
```python
# Pour chaque channel étudiant, fetch les 1 derniers message
# Calculer l'âge (now - timestamp) en heures
# Catégoriser : actif (<48h), inactif (48h-7j), mort (>7j)
```
Produit un tableau clair : X/54 actifs, Y morts, avec les noms.

**Étape 2 — Questions sans réponse dans les channels actifs :**
```python
# Pour les channels actifs (<48h), fetch les 10 derniers messages
# Identifier les messages étudiant (non-bot) contenant "?" ou mots-clés question
# Vérifier si un message suivant (plus récent) d'un non-bot existe → pas de réponse
# Signaler les questions orphelines avec auteur, channel, extrait, timestamp
```

**Exemple de sortie actionnable (9 avril 2026) :**
```
🚨 INACTIVITY: 37/54 channels morts (>7j), 11/54 actifs
❓ QUESTIONS SANS RÉPONSE:
  - Séverine (#séverine-coralie): "risque de perdre des clients si R1/R2?" 
  - Zayane (#zayane-khodabocus): "serait il possible d'avoir un petit appel?" (41h sans réponse)
```

**Pourquoi c'est important :** Un cron "silencieux si RAS" qui ne signale QUE les nouveaux messages
rate l'essentiel — l'inactivité et les questions orphelines sont les vrais signaux faibles.
Le delta de sync ne les capture pas car ils se trouvent dans des messages DÉJÀ synchronisés.
