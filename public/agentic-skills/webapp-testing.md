---
name: webapp-testing
description: Tester une webapp locale ou distante avec navigateur/Playwright-like workflow. À utiliser pour QA frontend, vérification de parcours, bugs UI, logs navigateur et captures d'écran.
version: 1.0.0
author: Hermes (adapté depuis anthropics)
license: MIT
metadata:
  hermes:
    tags: [QA, Frontend, Browser, Testing, Playwright]
    related_skills: [dogfood, verification-before-completion, web-design-guidelines]
---

# Webapp Testing

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Tester une webapp avec une approche reconnaissance → action → preuve.

## Règle de base

Ne clique pas au hasard. Observe d'abord l'état rendu, puis agis.

## Workflow recommandé

### Cas 1 — App accessible en URL
Utilise les browser tools Hermes :
1. `browser_navigate`
2. `browser_snapshot` ou `browser_vision`
3. inspection DOM / console via `browser_console`
4. actions (`browser_click`, `browser_type`, `browser_press`)
5. capture de preuve si besoin

### Cas 2 — App locale qui nécessite un serveur
1. Démarrer le serveur avec `terminal`
2. si c'est long, lancer en background puis suivre avec `process`
3. naviguer sur l'URL locale avec les browser tools
4. appliquer le même flow reconnaissance → action

## Checklist minimale

- page charge sans erreur console bloquante
- états loading / error / success visibles
- formulaires soumis correctement
- interactions critiques testées
- responsive au moins grossièrement si demandé
- screenshot ou preuve textuelle quand tu annonces que c'est OK
- pour une correction d'identité/prénom/genre dans un hub client : vérifier toutes les routes publiques, le HTML source, les assets images générés, puis redéployer et re-vérifier l'URL prod — les screenshots peuvent contenir l'ancien texte même si le HTML est corrigé

## Reconnaissance avant action

Avant de manipuler une interface dynamique :
- attendre que la page soit stable
- lire le snapshot
- inspecter la console
- si l'arbre texte est insuffisant, utiliser `browser_vision`

### Text corrections in generated client hubs

When fixing client-facing wording (identity, name spelling, pronouns, role, sensitive facts):
1. Search the local source files for the wrong and right variants (`Valérie|Valery|dirigeante|elle`, etc.).
2. Patch all rendered routes, not just the landing page.
3. If route cards use static screenshots/assets generated from HTML, regenerate those assets after the text patch.
4. Use OCR (`tesseract image.png stdout -l fra+eng | grep ...`) or equivalent visual text extraction to verify images do not preserve stale wording.
5. Deploy to production, then fetch the production routes and assets and repeat the grep/OCR checks against the live URL.
6. If the correction is durable business knowledge, update the Second Brain entity page + log so future deliverables inherit the fact.

## Outils Hermes recommandés

- `browser_navigate`
- `browser_snapshot`
- `browser_console`
- `browser_click`
- `browser_type`
- `browser_press`
- `browser_vision`
- `terminal` / `process` pour lancer les serveurs

### Headless screenshot sanity checks

When a deployed Next/React page looks wrong in a raw Chrome screenshot, distinguish initial loading capture from hydrated UI:
1. Prefer Puppeteer/DevTools with `waitUntil: "networkidle2"` plus a short explicit wait over one-shot `google-chrome --screenshot`.
2. Capture DOM metrics alongside the screenshot: `innerWidth`, `document.documentElement.scrollWidth`, `document.body.getBoundingClientRect()`, `document.querySelector('main')?.getBoundingClientRect()`, and the computed body/main backgrounds.
3. Verify desktop and mobile overflow explicitly: `scrollWidth === innerWidth`.
4. If the project's preferred browser tool path is missing, say so and fall back to installed Chrome/Puppeteer rather than skipping visual QA.

## Restitution attendue

Toujours rendre :
- scénario testé
- résultat
- bug(s) observé(s)
- preuve (console, screenshot, comportement réel)
- sévérité

## Patterns utiles

### Audit de tableaux filtrables / fiches éditables

Pour une app dashboard avec plusieurs tableaux filtrables, ne vérifie pas seulement la présence d’un input. Utilise un mini-script navigateur déterministe :

1. ouvrir chaque module/page concerné ;
2. cibler le placeholder ou l’aria-label du filtre ;
3. taper une requête qui doit garder une ligne/carte précise ;
4. vérifier qu’un item attendu est présent ET qu’un autre item attendu est absent ;
5. vider le filtre ;
6. pour une fiche éditable, cliquer une ligne, modifier un champ non critique, vérifier que la table reflète le changement, puis remettre la valeur d’origine si le stockage est local/UI.

Retour attendu : objet structuré par page, ex. `{ inputExists: true, filteringWorks: true }`, plus console errors/warnings.

### Custom drag/drop previews

For dashboards with custom kanban/pipeline/workflow drag-and-drop, do not validate only by seeing a card move. Use a deterministic browser probe during the drag:

1. Start pointer drag from a real card using viewport coordinates.
2. Move the mouse with several steps and pause briefly while the drag is active.
3. Inspect the live preview element (`.live-drag-preview`, `.drag-ghost-preview`, or project equivalent).
4. Measure `getBoundingClientRect()` against the intended pointer coordinates.
5. Verify whether a fixed-position preview is rendered under `document.body`; if it is inside a transformed parent, the preview can look offset even when inline `left/top` are correct.
6. If the board scrolls horizontally and the target column is off-screen, scroll the board so both source and target have visible `getBoundingClientRect()` values before mouse actions. Hidden/off-screen targets can create false negatives where the preview disappears or the wrong card is tested.
7. Release the mouse and verify the preview is removed.
8. Check console on a fresh navigation, not a polluted console history from previous tabs/pages.

A good report includes the measured pointer delta, e.g. `deltaFromPointer: { dx: 13, dy: -18 }`, plus whether the preview was portaled to `document.body`, and for scrollable boards the board `scrollLeft` used during the drag.

## Pitfalls

- annoncer “ça marche” sans avoir interagi pour de vrai
- ignorer la console JS
- tester avant que la page ait fini son rendu
- confondre DOM initial et DOM réellement hydraté
- pour les parcours signup/login tiers, ne pas confondre “compte créé/connecté” avec “app pleinement accessible” : vérifier les gates post-auth (email confirmation, onboarding profil, workspace creation) et dire explicitement ce qui bloque encore
- après un signup avec email jetable puis un signup réel demandé par l’utilisateur, repartir proprement depuis la page login/signup et revérifier l’email affiché dans l’app avant d’annoncer l’état de connexion
- quand l’utilisateur demande une action browser précise (ex: se connecter, créer un compte test), ne pas dériver vers un debug annexe même si le contexte précédent mentionne une intégration liée ; exécuter le parcours demandé, puis seulement signaler les blocages réels
- pour créer un faux compte sur une app tierce, utiliser un email jetable déterministe (`<email@example.com>`) + mot de passe test non réutilisé, vérifier l’état connecté via URL/body/console, et noter clairement si une confirmation email bloque la suite
