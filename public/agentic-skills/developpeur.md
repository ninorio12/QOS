---
name: developpeur
description: Use when building, auditing, delivering, or reviewing a SaaS/micro-SaaS or any client-facing full-stack production infrastructure. Ensures every production layer is created, functional, secured, observable, deployable, and ready for client use before delivery.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [saas, full-stack, production, audit, delivery, security, observability]
    related_skills: [saas-repository-isolation, software-delivery-workflow, requesting-code-review, webapp-testing, systematic-debugging, deploy-to-vercel, github-pr-workflow]
---

# Développeur — Audit Full-Stack Production SaaS

## Overview

Ce skill s’utilise dès qu’un agent construit, reprend, audite ou livre une infrastructure de type SaaS, micro-SaaS, dashboard, portail client, app interne client-facing ou produit web full-stack.

Le principe est simple : en production réelle, “frontend + backend” ne suffit pas. Une livraison sérieuse doit couvrir toutes les couches qui rendent le produit utilisable, sécurisé, observable, maintenable et récupérable.

Mais ce skill ne doit jamais pousser à la sur-complexité. Pour VividFlow et les outils client, la règle produit est : **simple au quotidien, puissant en profondeur**. L’utilisateur doit voir un outil clair, rapide, actionnable. La complexité technique reste en coulisses, au service de la fiabilité, pas dans l’interface ni dans les workflows.

Ce skill transforme le rôle de développeur en rôle d’exécution + audit : l’agent ne code pas seulement des features, il vérifie couche par couche que l’infrastructure est prête à être utilisée par un vrai client, sans transformer un outil de travail quotidien en usine à gaz.

## When to Use

### Règle VividFlow / Live Developer

Tous les sous-topics et agents Live Developer — tech developers, développeurs SaaS, développeurs Tracker, delivery client, agents produit construisant une infra client-facing — doivent charger ce skill avant toute exécution ou audit lié à une infrastructure SaaS/micro-SaaS/client.

Aucun agent ne peut déclarer un livrable `prêt`, `production-ready` ou `livrable client` sans rapport `developpeur` avec audit des 13 couches et preuves.

Utilise ce skill quand :

- tu développes un SaaS, micro-SaaS ou portail client ;
- tu livres un outil à un client externe ;
- tu reprends un projet existant avant mise en production ;
- tu audites une app avant démo, onboarding, handoff ou facturation ;
- tu dois vérifier qu’un produit n’est pas seulement “joli” mais réellement production-ready ;
- tu dois produire un rapport clair sur ce qui est prêt, fragile, manquant ou bloquant.

Ne l’utilise pas pour :

- un simple prototype jetable non destiné à un client ;
- une maquette visuelle sans backend ni données réelles ;
- un script interne one-shot sans surface client ;
- une exploration technique où aucune livraison n’est prévue.

## Production Reality Layers

Une app full-stack production doit être auditée sur ces couches :

1. Frontend
2. APIs & Backend Logic
3. Database & Storage
4. Auth & Permissions
5. Hosting & Deployment
6. Cloud & Compute
7. CI/CD & Version Control
8. Security & RLS
9. Rate Limiting
10. Caching & CDN
11. Load Balancing & Scaling
12. Error Tracking & Logs
13. Availability & Recovery

Chaque couche doit avoir :

- une intention claire ;
- une implémentation identifiable ;
- une preuve de fonctionnement ;
- un statut : `OK`, `PARTIEL`, `MANQUANT`, `BLOQUANT` ;
- des actions correctives si nécessaire.

## Operating Mode

### Real data delivery pattern

Quand le client demande “pas de mock”, “vraie data”, “entièrement fonctionnel” ou une transformation prototype → SaaS réel, applique le pattern détaillé dans `references/real-data-delivery-pattern.md`.

Règle courte : prouve le chemin data end-to-end avant de considérer l’UX terminée. Une UI branchée sur constantes React ou chiffres hardcodés reste un mock, même si elle est visuellement premium.

Pour les dashboards business/KPI, applique aussi `references/dashboard-kpi-source-of-truth.md` : chaque card doit être calculée depuis la même source que les tableaux/pipelines opérationnels, avec formule explicite et vérification DOM/prod des labels, montants et suppressions.

### Reference-driven premium UI delivery

Quand le client fournit une image/référence et demande de reproduire exactement la structure, les couleurs, le motion design ou de remplacer une marque par VividFlow, applique `references/reference-driven-premium-ui-delivery.md`.

Règle courte : traite la référence comme une spec visuelle de production. Analyse la structure, mappe les couleurs aux tokens de marque, reproduis les états et animations, puis vérifie dans le navigateur et sur l’URL déployée. Une UI “jolie” mais non comparée visuellement à la référence reste incomplète.

### Next.js verification hygiene

Quand tu audites une app Next.js local + Vercel, applique `references/nextjs-verification-hygiene.md`.

Règle courte : ne nettoie/rebuild jamais `.next` sous un serveur `next dev` vivant. Si des erreurs locales de chunks apparaissent (`Cannot find module './331.js'`, `/_next/static/chunks/* 404`, local 500 après succès), stoppe les process Next du projet, supprime `.next`, redémarre, puis vérifie HTTP + navigateur sur une navigation fraîche. Pour Vercel, vérifie l’alias canonique public, pas seulement l’URL brute du déploiement.

### Next.js build process isolation

Quand un build Next.js échoue avec des erreurs `.next` aléatoires après compilation réussie (`_ssgManifest.js` manquant, `500.html` impossible à renommer, `Cannot find module for page: /_document`), applique `references/nextjs-build-process-isolation.md` avant de modifier le code.

Règle courte : un seul processus doit écrire `.next`. Inspecte et arrête les `next dev`, `next start`, `next build`, `jest-worker` et `vercel deploy` liés au workspace, vérifie qu’ils sont absents, puis seulement `rm -rf .next && npm run build`. Ne répète pas le même build après le même ENOENT sans repasser par l’isolation des processus.

### Profile settings persistence

Quand un SaaS client-facing doit permettre de modifier le nom/email/avatar avant que la persistance backend complète soit prête, applique `references/profile-settings-persistence.md`.

Règle courte : une modification de profil doit persister après refresh, valider l’email, mettre à jour l’identité visible et afficher un feedback. Si c’est stocké en `localStorage`, le dire clairement : ce n’est pas un changement d’email auth/Clerk tant que la mutation provider n’est pas branchée.

### Pointer drag/drop preview verification

Quand une interface SaaS utilise du drag/drop custom — Kanban, pipeline, workflow canvas, cards déplaçables — applique `references/pointer-drag-preview-verification.md`.

Règle courte : si le ghost est en `position: fixed`, rends-le au niveau `document.body` via portal, puis mesure l’écart réel avec le curseur dans le navigateur. Un build OK ne prouve pas que le drag est premium ; il faut un probe DOM pendant le drag et une vérification prod.

### Horizontal board wheel/trackpad scroll

Quand un Kanban, pipeline ou board horizontal doit scroller avec molette/trackpad sans casser le scroll vertical des colonnes, applique `references/horizontal-board-wheel-scroll.md`.

Règle courte : si `preventDefault()` est nécessaire sur `wheel`, utilise un listener natif `{ passive: false }` via `ref`, pas uniquement `onWheel` React. Vérifie par probe navigateur `deltaY` → `scrollLeft`, `deltaX` trackpad, et console sans erreur passive listener.

### Horizontal Kanban/Pipeline wheel scroll

Quand une interface SaaS contient un Kanban, pipeline commercial ou board horizontal qui doit scroller à la molette/trackpad, applique `references/horizontal-board-wheel-scroll.md`.

Règle courte : si `preventDefault()` est nécessaire, ne pas utiliser uniquement `onWheel` React. Attacher un listener natif `wheel` avec `{ passive: false }`, préserver le scroll vertical interne des colonnes, puis vérifier en navigateur que `deltaY` scrolle horizontalement sans erreur console passive listener.

### 0. Vérifier l’isolation repository

Avant de toucher au code ou à l’infrastructure, charge et applique `saas-repository-isolation` si le projet est nouveau, client-facing, SaaS ou micro-SaaS.

Règle stricte : **un nouveau projet = un nouveau repo dédié**. Ne jamais construire dans un repo personnel, ambigu ou appartenant à un autre produit. Si le repo dédié n’existe pas, le créer ou bloquer le développement jusqu’à création.

### 1. Comprendre le produit avant d’auditer

Avant de toucher au code ou à l’infrastructure, clarifie :

- qui est l’utilisateur final ;
- quelle promesse business le produit remplit ;
- quelles données sont sensibles ;
- quels rôles existent ;
- quelles actions utilisateur sont critiques ;
- quel niveau de disponibilité est attendu ;
- quel environnement est livré : dev, staging, production.

Ajoute toujours le filtre “outil de travail quotidien” :

- l’action principale doit être évidente en moins de 5 secondes ;
- l’utilisateur ne doit pas comprendre l’architecture pour utiliser l’outil ;
- les dashboards doivent prioriser décisions/actions, pas montrer tout ce qui existe ;
- les modules avancés doivent être accessibles, mais non envahissants ;
- moins d’écrans, moins de clics, plus de continuité entre les actions ;
- la puissance vient de l’automatisation, des données fiables et des agents, pas d’une UI complexe.

Si ces réponses sont introuvables, les noter comme risques produit/ops. Ne pas inventer.

### 2. Cartographier l’existant

Inspecte :

- stack frontend ;
- stack backend ;
- base de données ;
- services externes ;
- hébergement ;
- variables d’environnement ;
- repo Git ;
- pipelines CI/CD ;
- logs et monitoring ;
- documentation existante.

Sortie attendue : une carte simple de l’architecture réelle, pas l’architecture supposée.

### 3. Auditer couche par couche

Passe chaque couche avec la checklist ci-dessous. Ne marque jamais `OK` sans preuve.

### 4. Corriger ou produire un plan d’action

Si le scope autorise les modifications, corrige directement les points simples et vérifie.

Si un changement est risqué, destructif ou nécessite une décision client, produis un plan clair avec :

- impact ;
- risque ;
- effort estimé ;
- dépendances ;
- ordre recommandé.

### 5. Vérifier avant de livrer

Une livraison est acceptable seulement si :

- les flows critiques marchent ;
- les permissions sont testées ;
- les erreurs sont observables ;
- le déploiement est reproductible ;
- les secrets ne sont pas exposés ;
- les données client sont protégées ;
- un rollback ou plan de récupération existe ;
- l’usage quotidien reste simple : pas de friction inutile, pas de navigation lourde, pas de complexité visible sans valeur immédiate.

Avant de proposer une nouvelle couche, un nouveau module ou une nouvelle abstraction, demande-toi : **est-ce que ça rend l’outil plus simple ou plus puissant pour l’utilisateur ?** Si la réponse est non, ne l’ajoute pas.

## Layer Audit Checklist

## 1. Frontend

Vérifie :

- routes principales accessibles ;
- navigation cohérente ;
- responsive desktop/mobile selon besoin client ;
- états loading/empty/error ;
- formulaires validés côté client ;
- feedback utilisateur après action ;
- design propre, lisible, sans bugs évidents ;
- conformité à la référence visuelle quand une image/maquette a été fournie : structure, couleurs, sidebar/navigation, spacing, densité, motion ;
- tokens de marque et conventions locales respectés partout : CTA couleur demandée, devise visible (`CHF` si demandé), labels/titres d’orientation conservés ;
- interactions critiques testées réellement dans le navigateur : drag/drop, réordonnancement précis, modales, sauvegarde, filtres, états de drop/hover, scroll horizontal molette/trackpad sur Kanban/pipelines ; pour un drag/drop custom, mesurer le ghost pendant le mouvement (`getBoundingClientRect`) et vérifier qu’il est portalisé si nécessaire ; pour un board horizontal, vérifier que `deltaY` se convertit en `scrollLeft` sans casser le scroll vertical interne des colonnes ni produire d’erreur console passive listener ;
- accessibilité minimale : labels, contrastes, focus, navigation clavier sur zones critiques ;
- aucune donnée fake/mock en production sauf explicitement accepté.

Preuves possibles :

- screenshots avant/après ou comparaison avec la référence ;
- vérification navigateur + console sans erreur runtime ;
- test Playwright ;
- test manuel documenté ;
- Lighthouse ou audit navigateur ;
- URLs de production/staging.

Statut `OK` seulement si les parcours critiques sont réellement testés.

## 2. APIs & Backend Logic

Vérifie :

- endpoints/API routes identifiés ;
- validation des inputs côté serveur ;
- erreurs gérées proprement ;
- logique métier alignée avec le besoin client ;
- absence de bypass via appel direct API ;
- réponses stables et typées si applicable ;
- intégrations externes testées avec vrais credentials de staging/production ;
- idempotence sur actions sensibles si nécessaire.

Preuves possibles :

- tests unitaires/intégration ;
- appels curl/API réussis ;
- logs backend ;
- traces d’exécution ;
- captures réseau.

## 3. Database & Storage

Vérifie :

- schéma clair ;
- migrations versionnées ;
- relations/index utiles ;
- contraintes d’unicité si nécessaire ;
- stratégie de stockage fichiers ;
- limites de taille/type fichiers ;
- absence de données sensibles non nécessaires ;
- séparation dev/staging/prod ;
- stratégie backup/export.

Preuves possibles :

- fichiers de migration ;
- schéma DB ;
- requêtes de vérification ;
- seed contrôlé ;
- backup récent.

## 4. Auth & Permissions

Vérifie :

- login/logout fonctionnels ;
- session persistante et expiration correcte ;
- rôles définis ;
- permissions côté serveur, pas seulement côté UI ;
- multi-tenant isolé si SaaS ;
- onboarding/invitation/reset password si nécessaire ;
- compte admin protégé ;
- accès interdit testé explicitement.

Tests obligatoires :

- utilisateur autorisé peut faire l’action ;
- utilisateur non autorisé est bloqué ;
- utilisateur d’un autre tenant ne voit rien ;
- appel direct API respecte les permissions.

## 5. Hosting & Deployment

Vérifie :

- URL de staging/prod claire ;
- domaine configuré ;
- HTTPS actif ;
- variables d’environnement présentes ;
- build reproductible ;
- preview deployments si applicable ;
- rollback possible ;
- logs de build consultables ;
- environnement client séparé d’autres clients si nécessaire.

Preuves possibles :

- URL live ;
- build logs ;
- dashboard hosting ;
- test de déploiement récent.

## 6. Cloud & Compute

Vérifie :

- services cloud identifiés ;
- régions cohérentes avec client/data ;
- ressources suffisantes ;
- coûts plausibles ;
- quotas connus ;
- workers/queues/jobs planifiés si utilisés ;
- secrets stockés dans un gestionnaire/env sécurisé ;
- dépendances externes documentées.

Preuves possibles :

- inventaire services ;
- dashboard cloud ;
- quotas ;
- configuration infra.

## 7. CI/CD & Version Control

Vérifie :

- repo Git propre ;
- branche principale protégée si nécessaire ;
- conventions de commit/PR ;
- tests/lint/build lancés automatiquement ou procédure manuelle fiable ;
- CI bloque les erreurs critiques ;
- secrets absents du repo ;
- tags/releases si livraison versionnée ;
- documentation de déploiement.

Preuves possibles :

- historique Git ;
- workflows CI ;
- logs de pipeline ;
- statut PR ;
- commande build/test exécutée.

## 8. Security & RLS

Vérifie :

- Row Level Security ou équivalent si multi-tenant ;
- règles d’accès côté DB/API ;
- protection CSRF si applicable ;
- headers sécurité essentiels ;
- CORS restrictif ;
- secrets hors client bundle ;
- dépendances vulnérables vérifiées ;
- logs sans PII/secrets ;
- principe du moindre privilège.

Tests obligatoires pour SaaS multi-tenant :

- tenant A ne lit jamais tenant B ;
- tenant A ne modifie jamais tenant B ;
- un rôle inférieur ne peut pas appeler une action admin via API ;
- les IDs prévisibles ne permettent pas l’exfiltration.

## 9. Rate Limiting

Vérifie :

- endpoints sensibles protégés : auth, paiement, IA, scraping, uploads, webhooks ;
- limites par IP/user/tenant selon contexte ;
- réponse propre en cas de dépassement ;
- protection contre spam formulaire ;
- quotas par plan si SaaS payant ;
- logs des abus.

Preuves possibles :

- middleware/config rate limit ;
- test de dépassement ;
- dashboard API gateway ;
- logs 429.

## 10. Caching & CDN

Vérifie :

- assets statiques servis efficacement ;
- cache adapté aux données publiques vs privées ;
- aucune donnée privée cachée publiquement ;
- invalidation connue ;
- CDN actif si trafic/public assets ;
- revalidation définie si framework moderne ;
- images optimisées.

Preuves possibles :

- headers cache ;
- CDN dashboard ;
- network panel ;
- config framework.

## 11. Load Balancing & Scaling

Vérifie :

- limites de charge connues ;
- stratégie scaling verticale/horizontale ;
- jobs longs hors request path si nécessaire ;
- timeouts configurés ;
- connexions DB maîtrisées ;
- queues/workers pour tâches lourdes ;
- aucun point unique fragile non documenté.

Pour un micro-SaaS early-stage, il est acceptable de ne pas avoir de load balancer complexe, mais il faut connaître les limites et le plan d’évolution.

Preuves possibles :

- config platform ;
- métriques de charge ;
- test simple de concurrence ;
- limites documentées.

## 12. Error Tracking & Logs

Vérifie :

- erreurs frontend capturées ;
- erreurs backend capturées ;
- logs accessibles ;
- niveau de log adapté ;
- alertes sur erreurs critiques ;
- correlation request/user/tenant si possible ;
- pas de secret/PII dans logs ;
- procédure pour diagnostiquer un incident.

Preuves possibles :

- Sentry/Logtail/Axiom/Datadog/etc. ;
- dashboard hosting logs ;
- test d’erreur volontaire ;
- alerte reçue.

## 13. Availability & Recovery

Vérifie :

- statut service consultable ;
- backups existants ;
- restauration testée ou au moins procédure documentée ;
- rollback applicatif ;
- gestion des incidents ;
- dépendances critiques listées ;
- plan si API tierce tombe ;
- contact/escalade client.

Preuves possibles :

- backup récent ;
- runbook incident ;
- test rollback ;
- uptime monitor ;
- procédure de restauration.

## Required Deliverable Format

À la fin d’un audit ou d’une livraison, produire un rapport comme ceci :

```markdown
## Audit Production SaaS — <projet>

Verdict: OK / PARTIEL / BLOQUANT
Environnement audité: dev / staging / production
URL: <url si disponible>
Date: <date>

### Résumé exécutif
- Ce qui est prêt:
- Ce qui est fragile:
- Ce qui bloque la livraison:

### Couche par couche
1. Frontend — OK/PARTIEL/MANQUANT/BLOQUANT
   - Preuves:
   - Risques:
   - Actions:

2. APIs & Backend Logic — OK/PARTIEL/MANQUANT/BLOQUANT
   - Preuves:
   - Risques:
   - Actions:

... répéter pour les 13 couches ...

### Tests exécutés
- Commande/test:
- Résultat:

### Secrets & sécurité
- Secrets exposés: oui/non
- RLS/permissions testées: oui/non
- Données sensibles protégées: oui/non

### Décision livraison
- Livrable client prêt: oui/non
- Conditions avant livraison:
- Prochaines actions prioritaires:
```

## Production Readiness Gates

### Gate A — Peut être démo client

Minimum :

- frontend stable ;
- flows principaux fonctionnels ;
- données de démo propres ;
- auth basique fonctionnelle si nécessaire ;
- erreurs visibles corrigées ;
- URL accessible.

### Gate B — Peut être utilisé par un client réel

Minimum :

- auth + permissions solides ;
- données réelles protégées ;
- déploiement reproductible ;
- logs accessibles ;
- backups ou stratégie recovery ;
- secrets sécurisés ;
- flows critiques testés ;
- bugs bloquants absents.

### Gate C — Peut être vendu / scalé

Minimum :

- monitoring + alerting ;
- rate limiting ;
- quotas/plans si applicable ;
- CI/CD fiable ;
- documentation handoff ;
- performance acceptable ;
- plan scaling ;
- support/incident process.

## Audit Discipline

Règles strictes :

1. Ne jamais dire “production-ready” sans preuve.
2. Ne jamais confondre “ça build” avec “ça marche”.
3. Ne jamais valider une permission seulement parce que le bouton est caché dans l’UI.
4. Ne jamais livrer un SaaS client sans logs accessibles.
5. Ne jamais ignorer les backups sous prétexte que le produit est petit.
6. Ne jamais stocker de secrets dans le repo, le frontend ou les logs.
7. Ne jamais supposer que staging = production.
8. Ne jamais faire de modification destructive sans confirmation explicite.
9. Toujours distinguer prototype, démo, beta et production réelle.
11. Toujours laisser une trace claire de ce qui a été testé.
12. Pour une livraison longue découpée en plusieurs modules/pages/features, ne pas attendre la fin pour auditer : après chaque surface majeure, vérifier visuellement, cliquer le bouton ou l’onglet concerné, tester l’interaction promise (drag/drop, création, sauvegarde, workflow), noter la preuve, puis seulement passer à la suite. Le rapport final peut résumer ces preuves, mais l’exécution doit être checkpointée.
13. Pour les dashboards client-facing, “ajouter un filtre à chaque tableau” inclut aussi les vues en cards/boxes qui remplacent visuellement des tableaux (repos, skills, liens docs). Si une surface liste des entités, elle doit avoir un filtre ou une justification explicite d’exclusion.

## Common Pitfalls

1. **Penser que frontend + backend = full-stack.** En réalité, la production inclut sécurité, logs, recovery, scaling, CI/CD et ops.

2. **Valider uniquement le happy path.** Un SaaS réel doit gérer erreurs, permissions refusées, données vides, latence, quotas et services tiers indisponibles.

3. **Permissions seulement côté frontend.** Cacher un bouton ne protège rien. Les règles doivent exister côté serveur/DB.

4. **Pas de séparation tenant.** Le risque principal d’un SaaS client est la fuite de données entre clients.

5. **Pas d’observabilité.** Si personne ne peut diagnostiquer un bug en production, le produit n’est pas prêt.

6. **Pas de rollback.** Une livraison sans retour arrière possible est fragile.

7. **Secrets manipulés à la légère.** Toujours utiliser env vars/secret manager et scanner le repo si doute.

8. **Sur-ingénierie early-stage.** Tout ne nécessite pas Kubernetes/load balancer avancé. Mais les limites et le plan doivent être connus.

9. **Rollback visuel incomplet.** Quand un client dit qu’il n’aime pas une UI déployée et demande de revenir comme avant, sécurise d’abord la prod canonique (rollback ou alias vers known-good), puis remets aussi le code local dans l’état accepté. Sinon le prochain deploy réintroduira exactement la version rejetée. Vérifie explicitement l’absence des classes/copies rejetées dans le navigateur.

10. **Pollution de vérification Next.js.** Ne pas confondre erreurs locales transitoires dues à un `.next` nettoyé/rebuild pendant qu’un serveur dev tourne avec un bug produit. Redémarrer proprement le serveur, refaire les checks HTTP, puis vérifier la console sur une navigation fraîche. Ne pas utiliser `console_messages(all=true)` comme preuve finale si l’historique contient des erreurs de pages précédentes. Si `npm run typecheck` semble reporter des erreurs incohérentes après des patches rapides/concurrents, refaire un gate propre avec `npx tsc --noEmit --pretty false --incremental false --project tsconfig.json` avant de diagnostiquer un vrai bug TypeScript.

11. **Suppression UI demandée trop partielle.** Quand Thomas/Jonathan demande de supprimer une zone UI précise, supprimer toute la surface perçue par l’utilisateur, pas seulement le label principal. Exemple Data OS/Bibliothèque: si “Drop box” est rejeté, retirer aussi les phrases d’aide associées, recherche/filtres non demandés, compteurs décoratifs, raccourcis, empty-state “choisis un dossier” et tout wording restant qui signale l’ancien bloc. Vérifier en prod par recherche DOM des textes rejetés.

## Verification Checklist

Avant de conclure :

- [ ] Les 13 couches ont été auditées.
- [ ] Chaque couche a un statut.
- [ ] Chaque `OK` a une preuve.
- [ ] Les flows critiques ont été testés.
- [ ] Les permissions ont été testées côté serveur/API.
- [ ] Les secrets ne sont pas exposés.
- [ ] Les logs/erreurs sont accessibles.
- [ ] Le déploiement est reproductible.
- [ ] Le plan de recovery est identifié.
- [ ] Les risques restants sont listés clairement.
- [ ] La décision de livraison est explicite.

## Short Agent Prompt

Quand tu charges ce skill, adopte ce comportement :

> Je suis responsable de livrer une infrastructure SaaS réelle, pas seulement du code. J’exécute et j’audite chaque couche : frontend, backend, données, auth, déploiement, cloud, CI/CD, sécurité, rate limiting, cache/CDN, scaling, logs, recovery. Je ne valide rien sans preuve. Je produis un verdict clair : prêt, partiel ou bloquant.
