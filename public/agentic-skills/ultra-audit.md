---
name: ultra-audit
description: "Audit ULTRA-puissant d'un SaaS sur 3 piliers — Vision/business, Sécurité (OWASP Top 10:2025 + gray-box + conformité), et Scalabilité full-stack — validé par un TRIBUNAL de 3 agents juges à l'unanimité. À utiliser quand l'utilisateur demande : 'audit du saas', 'audit ultra', 'audite mon saas', 'audit sécurité / scalabilité / vision', 'mon saas est-il production-ready', 'is my saas scalable', 'audit complet', 'revue d'architecture', 'audit avant levée / due diligence'. Stack-agnostique (auto-détecte le framework)."
---

# Ultra Audit

Audit de niveau due-diligence d'un SaaS, sur **3 piliers**, dont **aucune conclusion n'est publiée sans le verdict UNANIME d'un tribunal de 3 agents juges**. Objectif : un rapport sur lequel on peut décider d'investir, de scaler ou de refondre — pas un dump de findings plausibles mais faux.

## Quand l'utiliser

- « audite mon saas », « audit ultra », « audit complet du SaaS »
- « mon SaaS est-il prêt pour la prod / pour scaler / pour une levée »
- audit avant due diligence, audit de sécurité, revue d'architecture/scalabilité
- « est-ce que mon archi tient la charge », « où sont les risques »

## Les 3 piliers

L'audit couvre TOUJOURS les 3 piliers (sauf mode `focus:`). Chaque pilier a sa checklist détaillée :

1. **Vision & Business** → `references/01-vision-business.md`
   Problème/solution, ICP, moat, pricing, unit economics (CAC/LTV/payback/marge), GTM, activation, rétention/NRR, North Star, risques business.
2. **Sécurité** → `references/02-security.md`
   OWASP Top 10:2025 (A01–A10), 20 catégories d'attaque, gray-box probing (RBAC, IDOR, isolation multi-tenant, rate-limit, error differentials), secrets, supply chain, menaces IA/LLM, mapping conformité (CWE, ASVS, NIST CSF, SOC 2, ISO 27001, GDPR, pack SaaS multi-tenant).
   Complément chasse-aux-bugs cloud vérifiée → `references/05-ultrareview.md` (`/code-review ultra`, déclenché par l'utilisateur, facturé — je ne le lance pas moi-même).
3. **Scalabilité full-stack** → `references/03-scalability-fullstack.md`
   Architecture & couplage, data layer (schéma/index/N+1/hot partitions/migrations), caching, perf (Core Web Vitals, bundle, cold starts), concurrence/queues/backpressure, modèle de scaling, résilience (idempotence, retries, circuit breakers, failover), observabilité/SLO, coût à l'échelle, CI/CD & zero-downtime.

## Convention de sévérité (commune aux 3 piliers)

🔴 **CRITICAL** — exploitable / bloquant maintenant · 🟠 **HIGH** — risque sérieux à court terme · 🟡 **MEDIUM** — à corriger · 🟢 **LOW** — amélioration · 🔵 **INFO** — observation.
Chaque finding sécurité est tagué OWASP + CWE quand pertinent (voir `references/02-security.md`).

## Workflow (phases)

> Ordre déterministe. Ne JAMAIS livrer le rapport avant la phase 4 (verdict tribunal).

### Phase 0 — Cadrage & détection
- Détecter la stack (package.json, lockfiles, infra, framework) — voir « Auto-détection » plus bas. Ne suppose rien : lis le repo.
- Délimiter le périmètre (`diff:`, `focus:`, exclusions). Annoncer le mode et l'estimation de coût.
- Identifier les zones sensibles : auth, paiement, multi-tenant, upload, webhooks, IA.

### Phase 1 — Collecte de preuves (fan-out)
- Pour chaque pilier, parcourir le code/config réels. **Toute affirmation = une preuve** (`fichier:ligne`, extrait, ou commande). Pas de preuve → ce n'est pas un finding, c'est une hypothèse (à marquer comme telle).
- Recommandé : un sous-agent `Explore` par pilier (ou par zone) en parallèle pour ratisser large sans polluer le contexte.

### Phase 2 — Analyse & findings
- Classer chaque finding : pilier, sévérité, preuve, impact, effort de remédiation, recommandation concrète.
- Sécurité : exécuter les gray-box probes (cf. référence). Distinguer findings confirmés vs hotspots à revoir.
- Sur un changement substantiel avant merge : recommander à l'utilisateur de lancer `/code-review ultra` (cf. `references/05-ultrareview.md`) pour des bugs cloud-vérifiés, et intégrer ses résultats aux findings sécurité.

### Phase 3 — Rédaction du rapport (draft)
- Remplir `templates/audit-report.md`. Le draft n'est PAS final : c'est la pièce soumise au tribunal.

### Phase 4 — TRIBUNAL (obligatoire) → voir `references/04-tribunal.md`
- Convoquer **3 agents juges indépendants** (en parallèle, sans se voir), chacun avec une lentille distincte.
- **Unanimité requise (3/3 VALIDÉ)** pour publier. Tout juge dans le doute vote **REJETÉ**.
- Si rejeté → **auto-correction** : traiter chaque objection bloquante, régénérer les sections touchées, re-soumettre. **Max 2 tours.** Si toujours rejeté après le tour 2 → publier avec une section « ⚠️ Objections non résolues » explicite.

### Phase 5 — Livraison
- Rapport final + verdict du tribunal + scorecard + roadmap de remédiation priorisée (Impact × Effort).

## Orchestration

Deux chemins selon l'ampleur :

- **Léger (inline)** : lancer les finders et les 3 juges via l'outil **Agent** (plusieurs appels Agent dans un seul message = parallèle). Les juges = 3 agents `general-purpose` indépendants. Suffisant pour un audit ciblé.
- **Lourd (déterministe)** : utiliser le script Workflow fourni `scripts/audit-workflow.js` (fan-out par pilier → draft → tribunal unanime → boucle correction ≤2 tours). À lancer via l'outil **Workflow** (`scriptPath`). C'est le mode « ultra » : couverture maximale + boucle de correction garantie. Le script est commenté pour être édité.

## Auto-détection de stack (générique)

Lire, dans l'ordre : `package.json`/`requirements.txt`/`go.mod`/`composer.json`/`Gemfile` → framework ; lockfiles → versions exactes ; `next.config.*`, `vercel.json`, `Dockerfile`, `*.tf`, `serverless.yml` → infra ; `.env*`/secrets managers → gestion des secrets ; ORM/schema (`schema.prisma`, `convex/schema.ts`, migrations) → data layer. Charger les checks framework-spécifiques pertinents depuis la référence sécurité/scalabilité. Si la stack est inconnue, auditer sur les principes (les 3 références sont écrites en principes, pas en API).

## Modes

- `full` (défaut) — 3 piliers, profondeur max.
- `quick` — CRITICAL/HIGH uniquement, draft + tribunal allégé (1 tour).
- `diff:<ref>` — seulement les fichiers changés.
- `focus:<pilier>` — `vision` | `security` | `scalability`.
- `--fix` — inclure les patchs de remédiation.

## Règles fortes

- **Preuve avant assertion.** Un finding sans `fichier:ligne` ou repro = hypothèse, étiquetée comme telle, jamais en CRITICAL/HIGH.
- **Le tribunal n'est pas cosmétique.** Pas de publication sans 3/3. Les juges sont adversariaux et indépendants.
- **Pas d'altitude floue.** Vision = stratégie, pas features. Sécurité = exploitabilité réelle. Scalabilité = chiffres/charge, pas opinions.
- **Priorisation actionnable.** Chaque finding a un effort estimé et un owner-type. La roadmap est triée par ROI.

## Pitfalls

- Findings « best-practice » sans impact réel → bruit ; le tribunal les rejettera. Quantifier l'impact.
- Faux positifs sécurité (le piège classique) → toujours vérifier l'exploitabilité avant CRITICAL.
- Juges qui « valident pour valider » → le prompt juge impose le doute = rejet (cf. référence tribunal).
- Confondre coût et scalabilité, ou features et vision → garder les piliers séparés.
- Lancer le tribunal sur un draft incomplet → corriger d'abord les trous évidents.
