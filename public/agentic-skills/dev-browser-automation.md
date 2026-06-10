---
name: dev-browser-automation
description: Local browser automation avec dev-browser (Playwright) — 3x plus rapide que Browserbase. Scripts JavaScript atomiques en mode headless.
keywords: [browser, automation, playwright, dev-browser, headless, scraping]
---

# dev-browser — Browser Automation Local

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Installation
```bash
npm install -g dev-browser
```

## Usage
```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("main");
await page.goto("<url>");
const title = await page.title();
console.log("Title: " + title);
EOF
```

## Avantages vs Browserbase
- 3x plus rapide (pas d'overhead réseau)
- 1 script atomique au lieu de 15 appels séquentiels
- Debugging direct (erreurs JavaScript réelles)
- Gratuit (local)

## LinkedIn / login-heavy sites: visible noVNC fallback

For sites like LinkedIn that reject headless datacenter logins or keep bouncing back to `/login` after a valid SMS code, do **not** keep brute-forcing checkpoints. Switch to a visible browser session via Xvfb + x11vnc + noVNC + temporary Cloudflare tunnel, let the user complete login/2FA, then automate against the persistent Chrome profile/CDP session. See `references/linkedin-visible-browser-novnc.md` for the proven recipe.

## Mode headless par défaut (VPS sans X11)
Toujours utiliser `--headless` pour scripts simples et pages sans login sensible. Exception: login-heavy sites (LinkedIn, Google, banks, captcha/2FA) where a visible noVNC session is often required; see above.

## Pitfalls
- Pas de flag --version (exit 2 normal)
- Google peut bloquer (captcha) — utiliser pour des sites simples
- QuickJS sandbox WASM — pas d'accès filesystem host
- Pour LinkedIn/login/2FA/captcha, `dev-browser --headless` peut ouvrir la page mais l'utilisateur ne voit rien : préférer une session browser persistante ou `browser-use` + Playwright, avec validation 2FA live.

## Browser-use fallback pour sites complexes (LinkedIn, planners sociaux)
Quand l'automatisation headless simple est insuffisante :

```bash
python3 -m venv /root/.venvs/browser-use
/root/.venvs/browser-use/bin/pip install -q --upgrade pip
/root/.venvs/browser-use/bin/pip install -q browser-use playwright
/root/.venvs/browser-use/bin/python -m playwright install chromium
```

Stocker la clé cloud/API dans `~/.hermes/.env` :

```bash
BROWSER_USE_API_KEY=bu_...
```

Vérifier :

```bash
/root/.venvs/browser-use/bin/python - <<'PY'
import browser_use
print('browser_use_import_ok')
PY
/root/.venvs/browser-use/bin/browser-use --help
```

Pour LinkedIn, utiliser un profil persistant, par ex. `/root/.browser-profiles/linkedin-operator`. Si LinkedIn redirige vers `/checkpoint/challenge/`, demander le code SMS/2FA à l'utilisateur et cocher/laisser cochée la reconnaissance de l'appareil. Ne jamais publier/programmer sans validation HITL explicite.
- `dev-browser --headless` ouvre un navigateur côté VPS, invisible pour l'utilisateur. Pour LinkedIn/login/2FA/captcha, ne dis pas “j’ouvre le browser” comme si l'utilisateur pouvait le voir : c'est headless serveur. Utiliser plutôt une session browser interactive/VNC, un profil Chrome déjà authentifié, Vaultwarden + validation 2FA live, ou installer `browser-use` avec profil persistant si nécessaire.
