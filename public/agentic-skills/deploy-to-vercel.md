---
name: deploy-to-vercel
description: Déployer un projet sur Vercel proprement. À utiliser quand l'utilisateur demande un déploiement preview/prod, un lien Vercel, ou la séparation correcte de projets Vercel.
version: 1.0.0
author: Hermes (adapté depuis vercel-labs)
license: MIT
metadata:
  hermes:
    tags: [Vercel, Deploy, Preview, Production, Git, Frontend]
    related_skills: [vercel-cli-with-tokens, github-pr-workflow]
---

# Deploy to Vercel

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Déploie sur Vercel sans faire n'importe quoi.

## Onboarding client Hermes / VividFlow

Quand tu aides un client VividFlow/Hermes à préparer Vercel, ne présente pas Vercel comme obligatoire pour installer Hermes. Hermes tourne d'abord sur le VPS; Vercel sert aux interfaces web: dashboard, portail client, Data OS ou page connectée.

Ne demande pas une “API Vercel” par défaut. Les chemins propres sont, dans l’ordre:
1. GitHub connecté à Vercel: VividFlow travaille sur GitHub et Vercel déploie automatiquement.
2. Login CLI Vercel guidé dans le VPS/container: `vercel login`, validation par lien côté client.
3. Token Vercel ajouté plus tard en coffre/env sécurisé pour usage non-interactif; jamais dans un formulaire ou chat.
4. Ajout de VividFlow comme membre Vercel seulement si déjà inclus/sans frais.

Attention au plan Pro: il n’est généralement nécessaire que pour ajouter un membre d’équipe. Si Vercel demande de payer juste pour ajouter `hey@vividflow.co`, dire au client de ne pas valider et de l’indiquer dans le formulaire. Proposer GitHub, login CLI, token sécurisé ou transfert/config guidée comme alternatives.

## Règles fortes

- Déploie en `preview` par défaut.
- Ne fais du `--prod` que si l'utilisateur le demande explicitement.
- Si le projet est déjà lié à Vercel et connecté à git, privilégie le flux git.
- Si une action implique `git push`, demande l'accord de l'utilisateur avant de pousser.
- Vérifie toujours si le dossier pointe déjà vers un projet `.vercel/` avant de relinker.

## Live visual mockup iteration on an existing Vercel project

When the user corrects “we are working on Vercel”, says “c’est toujours le même”, or asks for another section/mock-up of the same visual project, recover the existing project before creating anything new. Search recent sessions and local output folders, then inspect `.vercel/project.json` and `vercel whoami`. Patch the actual files and redeploy the same project/alias; do not generate a standalone image or a new unrelated Vercel project unless explicitly requested.

Fast pattern:
```bash
# from the recovered project folder
cat .vercel/project.json 2>/dev/null
XDG_DATA_HOME=/home/hermes/.local/share vercel whoami 2>/dev/null
python3 -m http.server 8765  # optional local static check
XDG_DATA_HOME=/home/hermes/.local/share vercel deploy --prod --yes --public
python3 - <<'PY'
import urllib.request
url='https://<alias>.vercel.app/'
r=urllib.request.urlopen(url, timeout=15)
html=r.read().decode('utf-8','ignore')
print(r.status, 'expected snippet' in html)
PY
```

For visual DA mockups, if the user asks for a centered image/video section, make the page itself show the variants with a center-stack layout; avoid default left/right marketing sections.

## One-off public static document deploy

When the user asks to publish a generated document/deck/war-room for sharing:

**If a previous Vercel document already exists for the same recipient/topic**, reuse that static folder/project instead of creating a new URL. Patch `index.html` to add the new section at the top or in the right narrative position, keep the old strategic content below unless stale, and redeploy so the canonical alias stays unchanged. This is better than link sprawl.

For internal strategy war rooms (Client Delivery), publish a static mini-site rather than a PDF-only artifact when the user asks for organization/execution. Include `vercel.json` with `X-Robots-Tag: noindex`, copy attached decks/assets into the static folder, implement team task boards with checkbox state + validation date in `localStorage` when requested, and verify both the canonical alias and asset URLs. Warn mentally that localStorage checkboxes are browser-local, not shared team state; if shared completion is required, use a real backend/sheet instead. When converting Markdown docs to static HTML, never render line-numbered `read_file` output; strip `N|` prefixes, render semantic headings/lists/quotes, clean the downloadable `.md`, and verify absence of visible `1|` prefixes. See `references/static-markdown-document-rendering.md`. 

For internal strategy pages with task boards, static HTML is fine: use localStorage-backed checkboxes and completion dates if there is no backend. Copy attached PDFs/assets into the static folder, add `noindex`, deploy with `--public`, then verify both the page snippets and asset URLs. For Client Delivery mini-sites, pair this deploy workflow with `claude-design` reference `references/aios-internal-strategy-minisites.md`.

For static documents generated from Markdown, never dump raw `read_file` output into HTML: Hermes file reads may include visual line prefixes like `1|`, and a source file may already be polluted by copied prefixes. Strip repeated `^\s*\d+\|\s?` prefixes from every line before saving the downloadable `.md` and before rendering HTML, then verify the live DOM has no `>\s*\d+\|` snippets. Raw numbered Markdown rendered as paragraphs is a product bug, not a styling issue.

For VSL/YouTube script reading pages, create a Vercel-hosted static teleprompter instead of a Markdown/PDF when operator needs to film: large text, auto-scroll, speed controls, A+/A-, fullscreen/mirror mode when useful, jump anchors for `Intro / Points / Fin`, compact mobile cards when the script is an outline rather than a full teleprompter, and `noindex`. For face-cam videos where the editor later adds scrolls/schema b-roll, the teleprompter must include the **detailed bullet-point outline**, not only the opening script; operator records in one continuous take and the visual passages are added in post-production. If adding a fullscreen schema page for filming, reuse the exact same schema/canvas as the main document and preserve navigation (`overflow:auto`, scroll/trackpad, optional drag-to-pan, zoom controls). Do **not** force-fit/redesign the diagram into a non-scrollable viewport: operator expects the same document, just filmable fullscreen. For AIOS agent-architecture videos, prefer this visual grammar: cockpit separate above the Agent COO, Agent COO central, sub-agents below with per-agent tool tags, source-of-truth/database separate at the bottom, founder on the right with one-way “reads cockpit” arrow and bidirectional “communicates with COO” arrow. After deploying, take a headless screenshot of `/schema.html` and visually verify the entire intended hierarchy is visible in the initial filming viewport; if key layers are cut off, compress/reposition and redeploy before claiming PASS. See `references/static-vsl-teleprompter-pages.md`.

For one-off script pages, avoid deploying from a generic folder named only `vercel-doc/` under many different parent slugs if the CLI is likely to link them all to the same Vercel project. Use a unique project folder such as `/workspace/outputs/<canonical-slug>/` (containing `index.html` + `vercel.json`) or explicitly `vercel link --project <unique-name>`. Otherwise Vercel may alias the artifact to a stale generic project like `vercel-doc-two.vercel.app`.

1. Create a clean static folder (not a dirty app repo), or reuse the existing `vercel-doc/` folder when updating an already-shared document:
   ```bash
   WORK=/workspace/outputs/<slug>/vercel-doc
   rm -rf "$WORK" && mkdir -p "$WORK"
   cp document.html "$WORK/index.html"
   cp document.md "$WORK/document.md"  # optional downloadable source
   cat > "$WORK/vercel.json" <<'JSON'
   {"cleanUrls": true, "headers": [{"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex"}]}]}
   JSON
   ```
2. Deploy public prod if the artifact must be shareable without auth:
   ```bash
   cd "$WORK"
   npx vercel deploy --prod --yes --public
   ```
   Prefer the aliased project URL printed as `Aliased:`; raw deployment URLs may remain protected.
3. When updating an already-shared document, run a **content consistency audit**, not just a top-section patch. Search the full rendered HTML/source for stale strategic claims that contradict the new catalogue (old offer names, old dates, old price logic, old "included" scope). If the new section says `Data OS + Léa` but the preserved context still says `Data OS + Léa + Iris`, the document is still wrong — rebuild or replace the stale section before redeploying.
4. Verify HTTP 200 + expected snippet + no login + absence of stale contradictory snippet. If you claim `noindex`, inspect the actual response headers — do **not** print a literal like `print('noindex', 'X-Robots-Tag')`, that proves nothing:
   ```python
   import urllib.request
   url='<url>>.vercel.app'
   req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
   with urllib.request.urlopen(req, timeout=30) as r:
       html=r.read().decode('utf-8','ignore')
       headers=dict(r.headers.items())
       status=r.status
   print('status', status)
   print('expected_present', 'expected snippet' in html)
   print('stale_absent', 'old contradictory snippet' not in html)
   print('login_absent', '/login' not in html[:2000].lower() and 'vercel authentication' not in html.lower())
   print('noindex_header', headers.get('X-Robots-Tag'))
   ```

## Check initial

Toujours commencer par vérifier :

```bash
git remote get-url origin 2>/dev/null
cat .vercel/project.json 2>/dev/null || cat .vercel/repo.json 2>/dev/null
vercel whoami 2>/dev/null
vercel teams list --format json 2>/dev/null
```

## VividFlow official-domain convention

For VividFlow shareable Vercel links, prefer official `vividflow.co` subdomains over scattered `.vercel.app` links whenever possible. Use `.vercel.app` for previews/proofs only, then alias production/shareable deploys to a clear subdomain such as `start.vividflow.co`, `onboarding.vividflow.co`, `clients.vividflow.co`, `ops.vividflow.co`, `demo.vividflow.co`, or `preview.vividflow.co`.

Known pattern from the existing VividFlow setup:
```bash
npx vercel deploy --prod --yes --public
npx vercel alias set <deployment-url> onboarding.vividflow.co
npx vercel inspect onboarding.vividflow.co
```
If Vercel shows the alias but public DNS does not resolve, create/verify this DNS record at the external DNS provider:
- type: `CNAME`
- name: subdomain label, e.g. `onboarding`
- value: `cname.vercel-dns.com`

Do not claim the official subdomain is live until HTTP/DNS verification passes.

## Vercel project inventory

When a dashboard/page must show **all accessible Vercel projects**, do not use `vercel projects ls` text output or only the first page. Use JSON pagination and loop until `pagination.next` is null:

```bash
npx vercel project ls --format json
npx vercel project ls --format json --next <pagination.next>
```

Keep non-secret fields only: `name`, `latestProductionUrl`, `updatedAt`, `nodeVersion`, and source scope/team. If this inventory is shipped into a UI, verify production DOM counts against the collected total.

## Remote VPS / Docker Hermes setup

Quand Vercel doit être disponible **dans le container Hermes d’un client** plutôt que sur l’hôte :

1. Vérifier host + container + Node/npm avant installation :
   ```bash
   ssh CLIENT_ALIAS 'docker ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}"; docker exec CONTAINER sh -lc "whoami; pwd; command -v node; node -v; command -v npm; npm -v; command -v vercel || true"'
   ```

### Non-root global CLI upgrade on VPS

Si `npm install -g vercel@latest` échoue avec `EACCES` sur `/usr/lib/node_modules` dans un environnement agent non-root, ne bloque pas et ne demande pas root par défaut. Installer dans un prefix utilisateur, vérifier que le PATH le prend, puis refaire l'action Vercel avec `--scope` explicite :
```bash
npm config set prefix "$HOME/.npm-global"
mkdir -p "$HOME/.npm-global/bin"
npm install -g vercel@latest
export PATH="$HOME/.npm-global/bin:$PATH"
vercel --version
vercel whoami
vercel teams list --format json
```
Après correction d'un alias custom domain, vérifier l'alias canonique, pas seulement le déploiement brut :
```bash
vercel alias set <deployment-url> <custom-domain> --scope <team-slug>
vercel inspect https://<custom-domain> --scope <team-slug>
python3 - <<'PY'
import urllib.request
url='https://<custom-domain>/'
with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'HermesSmoke/1.0','Cache-Control':'no-cache'}), timeout=20) as r:
    print(r.status, r.geturl())
PY
```
2. Installer globalement dans le container :
   ```bash
   ssh CLIENT_ALIAS 'docker exec CONTAINER sh -lc "npm install -g vercel@latest"'
   ```
3. Vérifier le binaire :
   ```bash
   ssh CLIENT_ALIAS 'docker exec CONTAINER sh -lc "command -v vercel; vercel --version; vercel whoami 2>&1 || true"'
   ```
4. Si `vercel login` doit être fait par le client, ne laisse pas un foreground SSH bloquer jusqu’au timeout. Lance-le détaché avec log, puis lis le device URL :
   ```bash
   ssh CLIENT_ALIAS 'docker exec -d CONTAINER sh -lc "vercel login > /tmp/vercel-login.log 2>&1" && sleep 2 && docker exec CONTAINER sh -lc "sed -n '\''1,20p'\'' /tmp/vercel-login.log"'
   ```
   Transmettre au client le lien `<url> puis vérifier après validation :
   ```bash
   ssh CLIENT_ALIAS 'docker exec CONTAINER sh -lc "vercel whoami && vercel teams list --format json 2>/dev/null || true"'
   ```
5. Si plusieurs `vercel login` ont été lancés par erreur, nettoyer avant de relancer :
   ```bash
   ssh CLIENT_ALIAS 'docker exec CONTAINER sh -lc "pkill -f '\''node /usr/local/bin/vercel login'\'' 2>/dev/null || true; pkill -f '\''sh -lc vercel login'\'' 2>/dev/null || true"'
   ```
6. Mettre à jour la note d’accès non-secrète (`~/.hermes/access/<client>-vps.md`) avec version, chemin binaire, et statut auth. Ne jamais stocker token Vercel brut dans memory/wiki.


## Convex-backed Next.js apps

If a Next.js app deploys `Ready` but the canonical alias returns Vercel `404 NOT_FOUND`, inspect the project Framework Preset before chasing app code. Projects created as static/mockup artifacts may be set to `Other`; force the Next builder or set the preset to Next.js. See `references/next-project-preset-404.md`.

If the app uses Convex functions/schema and frontend changes depend on Convex APIs or generated bindings, run a Convex deploy before Vercel so production functions match the shipped UI:
```bash
export CONVEX_DEPLOY_KEY="$(grep CONVEX_DEPLOY_KEY .env.local | cut -d'"' -f2)"
npx convex deploy --cmd "echo skip" --typecheck=disable
npx vercel deploy --prod --yes --force
```
Still run `npx next build` locally first. After deployment, verify the canonical alias (`<client-dashboard-domain>` etc.) rather than the raw deployment URL; raw URLs may be protected even when the alias is public.

## Logique de décision

### Cas 1 — Projet déjà lié + git remote présent
C'est le meilleur cas.

1. Demander au user si tu peux commit/push.
2. Si oui :
```bash
git add .
git commit -m "deploy: <description>"
git push
```
3. Puis récupérer l'URL :
```bash
sleep 5
vercel ls --format json
```

### Cas 2 — Projet déjà lié + pas de git remote
Déployer avec le CLI :
```bash
vercel deploy -y --no-wait
```
Production seulement si demandé :
```bash
vercel deploy --prod -y --no-wait
```
Puis vérifier :
```bash
vercel inspect <deployment-url>
```

### Cas 3 — Pas lié + CLI auth OK
Lier d'abord, proprement.

- Si git remote présent :
```bash
vercel link --repo --scope <team-slug>
```
- Sinon :
```bash
vercel link --scope <team-slug>
```

Ensuite :
- si git remote → proposer le flux git push
- sinon → `vercel deploy -y --no-wait`

### Cas 4 — Pas auth
Basculer vers le skill `vercel-cli-with-tokens` si un token peut être fourni.

## Team selection

Si plusieurs teams existent, présente les slugs et demande lequel utiliser.
Ensuite, garde `--scope <team-slug>` sur les commandes Vercel suivantes.

## Cas important : plusieurs projets locaux qui s'écrasent

Quand deux dossiers se marchent dessus sur le même projet Vercel :
1. inspecter `.vercel/project.json`
2. lister les projets Vercel existants
3. créer un projet dédié si nécessaire
4. relinker le bon dossier vers le bon projet
5. redéployer chaque dossier séparément

Commandes utiles :
```bash
vercel projects list
vercel project add <project-name>
vercel link --project <project-name> --scope <team-slug>
vercel deploy -y
```

## Restitution attendue

Toujours rendre :
- type de déploiement (preview/prod)
- projet Vercel ciblé
- URL finale
- si relink effectué ou non
- vérification HTTP/visuelle effectuée
- prochain geste recommandé

## Rollback visuel demandé par le user

Quand le user rejette une UI qui vient d’être mise en prod et demande de revenir comme avant, applique `references/prod-visual-rollback-hygiene.md` : rollback/alias canonique, vérification navigateur de l’absence de la nouvelle UI rejetée, puis restauration du code local pour éviter qu’un futur deploy remette la mauvaise version.

## Vérification post-deploy

Après un `--prod`, ne te contente pas de l'URL Vercel. Vérifie l'alias canonique livré au user:
```bash
npx vercel inspect <url>> | sed -n '1,80p'
python3 - <<'PY'
import urllib.request
url='<url>>/<path>?utm_source=test&utm_medium=qa&utm_campaign=deploy_check'
req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=30) as r:
    html=r.read().decode('utf-8','ignore')
print('status_ok', 'expected snippet' in html)
print('login_absent', '/login' not in html)
PY
```

If `curl`, `urllib`, or headless Chrome hang from the agent environment, switch after one failed attempt to the raw TLS socket verification recipe in `references/vercel-http-verification-fallbacks.md`. Do not loop on the same stuck command. For protected API routes, a `401 Unauthorized` without bearer token is often the expected success condition; verify public pages separately.
Pour une page publique ou sales/capture, prendre aussi un screenshot headless et/ou dumper le DOM:
```bash
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=7000 \
  --window-size=1440,1600 --screenshot=/tmp/page.png '<url>>/<path>?utm_source=qa'
google-chrome --headless=new --no-sandbox --disable-gpu --dump-dom '<url>>/<path>?utm_source=qa' > /tmp/page.html
```
Vérifier explicitement: pas de login, pas de modal/sidebar interne, CTA attendu visible, liens/iframes avec UTM préservés.

Pour QA mobile, `--window-size=390,1400` seul peut être trompeur: Chrome headless peut garder un layout viewport large (~980px), donc les media queries mobiles ne s'appliquent pas vraiment. Pour une vraie vérification mobile, utiliser CDP `Emulation.setDeviceMetricsOverride` (`width:390`, `mobile:true`) ou vérifier dans le DOM `innerWidth`, `documentElement.scrollWidth`, et la liste des éléments dont `getBoundingClientRect().right > innerWidth`. Corriger tout overflow avant de livrer.

## Pitfalls

- **User asks to revert a disliked production UI**: do not only redeploy or only edit source. First restore the canonical alias to a known-good deployment (use `vercel rollback` for the previous prod; use `vercel alias set <known-good> <canonical>` when rollback cannot target that far back), then verify the canonical browser UI lacks the rejected selectors/copy. After prod is safe, restore local source to the accepted UI so the next `--prod` does not reintroduce the rejected change. If any deploy runs after the alias rollback, inspect the canonical alias again because Vercel can auto-realias it to the newest production deployment. See `references/prod-visual-rollback-hygiene.md`.
- **Interrupted Vercel CLI does not always mean failed deploy**: if `vercel deploy --prod` is interrupted after build/output deployment has started, do not assume failure or immediately redeploy blindly. First verify the canonical alias and latest deployment state: `npx vercel ls <project>`, `npx vercel inspect <canonical-alias>`, and an HTTP smoke check against the alias. If the alias is already `Ready` and serves the expected app, report that; only redeploy when the alias is stale, protected, or not ready.
- **Next.js app Ready but canonical URL returns 404**: if `vercel deploy` and `vercel inspect` show `Ready`/aliased, but the live alias returns `404_NOT_FOUND` and `/api/*` also 404, inspect `vercel project inspect`.
- **Local Next build/dev cache corruption**: if local Next build/dev reports missing `.next/*manifest.json`, missing generated `.next/types/*`, or hangs after interrupted commands, do not loop the same local build. Stop stale local Next build/dev processes, remove `.next`, run `npx tsc --noEmit --incremental false --pretty false` as a cheap code-level gate, then let Vercel remote build be the deployment gate and verify the production alias. Durable lesson: avoid concurrent local Next processes and separate typecheck/prod verification from local cache noise.
- **Dirty repo / unrelated work in progress**: if the working tree has unrelated changes (especially backend/schema/CRM work) and the user asks for a small prod fix, do not deploy from the dirty directory. Create a clean detached worktree from `HEAD`, copy only the intended changed files plus `.vercel/project.json` and `.env.local`, symlink or install dependencies, build there, then deploy from that clean worktree. Example:
  ```bash
  rm -rf /tmp/project-clean-fix
  git worktree add --detach /tmp/project-clean-fix HEAD
  mkdir -p /tmp/project-clean-fix/.vercel
  cp .vercel/project.json /tmp/project-clean-fix/.vercel/project.json
  cp .env.local /tmp/project-clean-fix/.env.local
  cp app/page.tsx /tmp/project-clean-fix/app/page.tsx
  ln -s /workspace/projects/client-dashboard/node_modules /tmp/project-clean-fix/node_modules  # optional speed-up
  (cd /tmp/project-clean-fix && npx next build && npx vercel deploy --yes --force --prod)
  git worktree remove /tmp/project-clean-fix --force
  ```
  This prevents a quick dashboard fix from accidentally shipping 1,300 lines of unrelated CRM/schema changes. Surgical deployment beats hero deployment, every time.
- **Vercel deployment returns 401 Unauthorized even after deploy**: project/deployment protection may be inherited. If the deliverable is meant to be publicly shareable (sales deck, static client artifact), redeploy with `vercel deploy --prod --yes --public`, then verify the canonical alias with HTTP 200 and expected text snippets. Do not hand over the protected preview URL. Exception: protected application API routes should return `401` without the agent/admin bearer token; treat that as an auth guard smoke test, not as public-page failure.
- **Custom alias can be protected while the generated project alias is public**: after `vercel deploy --prod --yes --public`, verify every alias independently. In one static client hub case, `vercel-hub-khaki.vercel.app` returned 200/noindex while a manually assigned vanity alias `upstream-digital-planet.vercel.app` returned 401. Do not keep re-aliasing blindly; deliver the verified public alias, note the vanity alias is protected/stale, and only use it after HTTP 200 + expected snippet passes.
- **Requested `.vercel.app` alias already in use by another project/account**: if `vercel alias set <new-deployment> <alias>.vercel.app` returns `The chosen alias ... is already in use`, and `vercel alias rm/ls` cannot find it under the current team, stop. The canonical alias is owned elsewhere. Verify the newly deployed project alias with HTTP/snippets/headless DOM, deliver that verified URL, and state that updating the exact old alias requires access to the owning Vercel project/account. Do not claim the old URL is updated just because the new deployment works.
- **Vanity `.vercel.app` alias stuck behind Vercel auth**: if a clean alias like `lp-clientops.vercel.app` returns 401 after being manually assigned to another project's deployment, remove the alias and create/link a dedicated project with that exact project name, then deploy `--prod --yes --public`. The natural project alias is often public where the manual alias stayed protected. See `references/vercel-vanity-project-alias-recovery.md`.
- **Raw deployment URL can stay 401 while the alias is public**: after `vercel deploy --prod --yes --public`, Vercel may print both a deployment URL like `<url>>-<team>.vercel.app` and `Aliased: <url>>.vercel.app`. The raw deployment URL can still return 401, while the aliased project URL returns 200. For public static artifacts, verify and deliver the alias, not the raw deployment URL. This is not a failure if the alias passes HTTP/snippet/login checks.
- **Custom aliases NOT auto-updated on `--prod` deploy**: `vercel deploy --prod` auto-aliases the primary domain (e.g. `<client-dashboard-domain>`) but does NOT update other custom aliases (e.g. `<client-dashboard-url>`). After deploy, manually re-alias: `npx vercel alias set <new-deployment-url> <alias-name>`. Check existing aliases with `npx vercel alias ls`. This caused a 10-day stale deployment being served at a user-facing URL.
- **VividFlow outbound deck alias stale after deploy**: When deploying `vividflow-outbound`, the `.vividflow.co` aliases (transgate, staffelbach-partner, etc.) are auto-updated by `vercel --prod` (because they alias the primary project URL, not secondary domains). BUT a subagent can create a new deployment that doesn't update aliases if it deploys to a different project or without `--prod`. Always verify LIVE after deploy:
  ```bash
  curl -s https://<deck>.vividflow.co/deck.js | grep -c "data-deck-next"
  # Must return 1 — if 0, the old deployment is still live
  ```
  If the handler is missing, redeploy from the project root with `vercel --prod` and re-verify the alias.
- **Custom domain access mismatch**: a domain can resolve to Vercel while the current CLI team cannot alias it. If `vercel alias set <deployment> <domain>` returns `403 You don't have access to the domain`, stop claiming prod is fixed. Verify with `vercel teams ls`, `vercel inspect <url>>`, DNS/headers, and tell the user you need access to the owning Vercel team/project or a DNS/domain transfer. A patched `.vercel.app` URL is only a staging/proof URL until the canonical domain is repointed.
- **GitHub push ≠ canonical domain updated**: when the source repo is found and patched, push the commit, then poll the canonical domain asset/HTML for the expected snippet. If it stays stale, check GitHub Actions/statuses and Vercel project ownership. The repo may deploy from a different Vercel account, a nested root directory, or no Git integration at all. In that case, deploy a proof `.vercel.app` URL from the nested app folder, but report the canonical domain as still stale until the owner promotes/redeploys from the owning account.
- **Nested static LP folders**: marketing LP repos often store the deployable app below a nested path like `ClientOps/Marketing/lp-vercel/` with its own `vercel.json`. Run Vercel commands from that folder, not the repo root, and inspect `.vercel/project.json` there before linking. If absent, `vercel deploy` may create a new project under the current CLI account; useful for proof deploys, dangerous if you claim it fixes the production domain.
- **Small CTA/link replacement on a live static marketing site**: when Jonathan asks to “just update the site” with a URL, do not pause to over-explain. Act surgically: fetch the live HTML, count old/new URL occurrences, locate the source by exact title/copy/assets if normal content search fails (e.g. search for unique assets like `vividflow-icon.png`), patch every occurrence, deploy, then verify the canonical domain has `old_count=0` and `new_count>0`.
- **Static SPA title/terminology fixes from a live deployment**: if source is not available and the fix is tiny (title/meta/rendered copy), mirror `index.html` + `/assets/*`, patch HTML and JS bundles, redeploy to the existing Vercel project, then verify canonical alias HTML + JS snippets. See `references/static-lp-domain-rescue.md`.
- **Cross-account static LP recovery with owner token**: if the canonical domain is owned by another Vercel account, a project ID alone is not enough. Use an owner token safely, deploy from a clean copy of the nested static folder with `.vercel/project.json` pointed to the owner project, then verify the canonical domain's JS asset for the fixed snippet. See `references/cross-account-static-lp-domain-recovery.md`.
- **Tracking pixel installs on static marketing funnels**: for LP/VSL + thank-you pages, patch every public HTML page before `</head>`, include the noscript fallback, deploy from the nested static app folder, and verify the canonical domain HTML for pixel ID + `fbevents.js` + PageView snippets. See `references/static-marketing-pixel-install.md`.
- **Static VSL / thank-you video swaps**: when replacing Wistia/YouTube embeds on static funnels, search all old provider IDs, patch from the nested deploy folder, add a cache-bust when scripts/assets may be cached, and verify alias HTML for new ID present + old provider absent. Headless Chrome can hang on YouTube embeds; after one timeout, switch to fast HTML verification. See `references/static-vsl-video-swap.md`.
- `static-document-consistency-audit.md`.
- **Markdown rendered with visible `1|` line numbers**: this usually means the source Markdown was built from tool-rendered `read_file` output, not raw file contents. Clean the `.md`, rebuild semantic HTML, redeploy, then verify `not re.search(r'>\\s*\\d+\\|', html)` on the live alias. See `references/static-markdown-document-rendering.md`.
- **Funnel-hack/source clone project names can leak the source brand**: when cloning a competitor/reference funnel for VividFlow, do not name the workspace/Vercel project with the source brand if the URL will be shared. Use a neutral VividFlow slug (`vividflow-audit-confirmation`, `vividflow-thank-you`) and grep not only visible HTML but also `package.json`, lockfile, `.vercel/project.json`, and final alias for old-brand leakage before delivering.
- `vercel link --yes` peut lier silencieusement au mauvais projet
- ne pas supposer qu'un dossier = un projet Vercel dédié
- ne pas pousser sur git sans accord explicite
- ne pas écraser une prod par accident avec `--prod`
- **Preview vs Production env vars**: `vercel deploy` (sans `--prod`) crée un déploiement **Preview**. Les env vars configurées uniquement en "Production" sur le dashboard Vercel ne seront PAS disponibles. Règle: si le projet utilise des `NEXT_PUBLIC_*` vars (ex: Convex), déployer avec `--prod` OU ajouter les vars aussi à l'environnement Preview.
- **Vercel ne voit pas le filesystem du VPS**: si une app Next/Vercel demande des variables comme `HERMES_HOME`, `DATA_OS_STORAGE_DIR` ou `EDITOR_FEEDBACK_DIR` pointant vers `/home/hermes/...`, ne les configure pas comme si Vercel pouvait lire le VPS. Pour une première prod de test, `/tmp/...` peut débloquer le build mais c'est non durable et effacé entre exécutions. Pour une vraie prod, rediriger ces routes vers Convex/Vercel Blob/S3-R2 ou une API VPS sécurisée; documenter les routes dégradées plutôt que masquer le problème.
- **Convex + Next.js SSR**: `new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)` au niveau module crash pendant le prerender SSG si l'env var est absente. Le fix est de déployer en Production (`--prod`) où les vars sont dispo, ou de rendre le client lazy dans un `useMemo` avec fallback null.
- `vercel.json` → champ `env` est ignoré au build time par Next.js — ne résout PAS les problèmes d'env vars manquantes. Utiliser le dashboard Vercel ou `vercel env add`.
- `vercel.json` → champ `name` est déprécié. Pour un nouveau projet statique one-off, évite de mettre `"name"` dans `vercel.json`; laisse `vercel link`/le nom du dossier créer le projet, ou passe par `vercel project add` si le nom doit être verrouillé.


## Consolidated reference: token-based CLI auth

The previous `vercel-cli-with-tokens` skill is now a reference under this umbrella. Use it for non-interactive deploys, linking, environment variables, and project management from an agent context.
