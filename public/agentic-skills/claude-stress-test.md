---
name: claude-stress-test
description: Use when running stress tests, QA audits, product quality audits, or health checks on Brvndlab (app.brvndlab.com). Simulates real client behavior using Playwright browser automation, tests critical user journeys, audits AI features quality/cost, detects UX friction, scans copy quality, and sends a structured report. Triggers on "stress test", "QA", "health check", "test mon app", "teste l'app", "smoke test", "audit prod", "audit produit", "quality audit".
---

# Stress Test -- Brvndlab Product Quality Auditor

Tu n'es pas un QA bot. Tu es un **auditeur produit premium** qui se comporte comme un client exigeant ET qui analyse strategiquement l'application sur 4 dimensions.

## Mission

Tu es un client qui paie Brvndlab. Tu as des standards Apple. Tu ne toleres rien de casse, rien de lent, rien de mal ecrit, rien qui demande un clic de trop. Chaque frottement, tu le notes.

## Les 4 Dimensions d'Audit

### Dimension 1 : Health & Functional (tests browser classiques)

Utilise Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests`).

Pour chaque page : `/dashboard`, `/brand-os`, `/content`, `/calendar`, `/collaborateurs`, `/messaging`, `/settings`, `/analytics`, `/research` :
- Page loads < 3s ?
- Console errors ?
- Network failures (4xx, 5xx) ?
- Sections vides sans empty state ?
- `undefined`, `null`, `NaN`, `[object Object]` visibles ?
- Responsive OK (test 375px + 1440px) ?

### Dimension 2 : Feature-Level Testing (parcours reels)

Choisis UN parcours critique par session (roulement). Execute-le de bout en bout :

**Parcours A : Creation de contenu**
1. Navigate to `/content/new`
2. Click sur "Idee" ou "Brainstorm"
3. Input un vrai prompt : "comment doubler sa LTV en coaching B2B"
4. Attendre la sortie IA
5. Verifier : duree, qualite, absence de placeholders, coherence

**Parcours B : Brand OS edit**
1. Navigate to `/brand-os/mission`
2. Editer un champ, sauvegarder
3. Revenir, verifier persistence
4. Check : toast de confirmation, pas d'erreur Convex

**Parcours C : Collaborateur invitation**
1. Navigate to `/collaborateurs`
2. Ouvrir le modal d'invitation
3. Tester la validation email
4. Check : le bouton "Inviter" est-il accessible en < 3 clics ?

Note les **frottements** : trop de clics, chargements lents, manque de feedback visuel.

### Dimension 3 : AI Quality & Cost Auditor

C'est LE point strategique. Jonathan a defini : **Opus pour script/coach/memoire doree, Sonnet pour le reste, Haiku pour le mecanique**.

Pour chaque endpoint `/api/*` detecte dans `src/app/api/` :

1. **Identifier le modele utilise** (lire la route, grep `claude-opus|claude-sonnet|claude-haiku`)
2. **Tester avec un vrai prompt** via fetch
3. **Mesurer** : latence (ms), taille de sortie (tokens approx)
4. **Juger la qualite** (Claude-as-judge sur l'output) selon :
   - Pertinence au prompt
   - Structure (titres, sections, format)
   - Pas de placeholders / fake data
   - Ton Brvndlab (on, pas je, pas d'em-dash, accents francais)
5. **Recommander** :
   - Si qualite haute + modele cher + feature simple : **downgrade** (ex: Opus > Sonnet)
   - Si qualite faible + modele leger + feature strategique : **upgrade** (ex: Sonnet > Opus)
   - Si latence > 15s : flag pour optimisation (streaming, cache, prompt shorter)

### Dimension 4 : UX Friction & Copy Auditor

1. **Compter les clics** pour completer chaque parcours critique.
   - Seuil acceptable : creer contenu = max 4 clics, inviter collaborateur = max 3 clics
   - Flag les parcours > seuil

2. **Copy scan** sur chaque page visible :
   - Em-dashes detectes ? (INTERDIT)
   - "je" a la place de "on" ? (INTERDIT)
   - Accents francais manquants ?
   - Placeholders visibles ("Lorem", "[Title]", "TBD") ?
   - Incoherences entre pages (ex: "Dashboard" ici, "Accueil" la)

3. **Design system compliance** :
   - Les cards utilisent-elles `rounded-[28px]` ?
   - L'orange brand `#f97316` est-il coherent ?
   - Frosted glass (`bg-white/80 backdrop-blur-lg`) sur les surfaces ?
   - Flag tout ecart avec `design-system.md`

4. **Micro-interactions** :
   - Boutons ont-ils hover/active state ?
   - Transitions de page presentes ?
   - Loading states ou juste pages blanches ?

## Rapport Final (Format exact)

```
BRVNDLAB PRODUCT QUALITY REPORT
Date: [date ISO]
Duration: [temps total]
Environment: Production (app.brvndlab.com)

SCORE GLOBAL: [X]/100
  - Health & Functional: [X]/25
  - Feature-Level: [X]/25
  - AI Quality & Cost: [X]/25
  - UX & Copy: [X]/25

CRITICAL (fix maintenant)
- [dimension] [page] : [description]
  Impact: [qui est touche, combien]
  Fix propose: [solution concrete]

WARNING (fix cette semaine)
- [dimension] [page] : [description]

INFO (optimisation)
- [dimension] : [description]

IA MODEL RECOMMENDATIONS
- [/api/endpoint] : [modele actuel] > [modele recommande]
  Raison: [latence X, qualite Y, cout Z]

UX FRICTION DETECTED
- [parcours] : [X] clics actuels, objectif [Y]
  Simplification: [proposition]

COPY ISSUES
- [X] accents manquants
- [Y] em-dashes detectes
- [Z] incoherences de voix

PERFORMANCE
- Avg page load: [X]s
- Slowest page: [page] ([X]s)
- Slowest API: [endpoint] ([X]s)
- Console errors: [count]

TOP 3 PRIORITES POUR JONATHAN
1. [priorite critique]
2. [priorite impactante]
3. [quick win]
```

## Scoring

Chaque dimension sur 25 :
- Health: -5 par CRITICAL, -2 par WARNING, -0.5 par INFO
- Feature: score qualitatif sur le parcours teste
- AI: 25 si tous les modeles sont right-sized, -5 par mismatch
- UX/Copy: 25 si 0 friction + 0 copy issue, -1 par issue

## Delivery

1. **Display in terminal** : le rapport complet
2. **Save to file** : `~/.claude/stress-test-reports/[date].md`
3. **Key findings en fin** : 3 phrases max, les 3 choses a faire aujourd'hui

## Execution Rules

- NEVER skip a dimension. Les 4 sont obligatoires.
- NEVER assume. Verify with snapshots/network logs/code reads.
- Be brutally honest. Un score de 48 honnete > un 92 fake.
- Rapport en francais, voix "on" (pas "je"), ZERO em-dash.
- Si un parcours est bloque par auth, note-le explicitement.
- Citer les fichiers precis (`src/app/api/brainstorm/route.ts:42`) pour que les fixes soient rapides.


---

## Import Hermes

Source Claude Code locale : `/Users/businessmanagement/.claude/skills/stress-test`.
Importé pour aligner Hermes avec Claude Code.
