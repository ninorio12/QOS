---
name: vividflow-saas-logic-mapper
description: Use when building, auditing, or iterating a SaaS/micro-SaaS and the user needs to map UI elements, empty buttons, cards, modules, statuses, KPIs, formulas, relationships, permissions, or cross-page logic into a clear implementation spec. Trigger on phrases like “ce bouton correspond à ça”, “relie ça à ça”, “lien logique”, “liens mathématiques”, “formule KPI”, “quand je clique ici”, “cette card doit calculer”, “ça doit alimenter cette page”, “éviter de perdre du temps sur la logique”.
version: 1.0.0
author: VividFlow / Hermes
license: proprietary
metadata:
  hermes:
    tags: [vividflow, saas, product-logic, ux, kpi, formulas, implementation-spec]
    category: business
    related_skills: [developpeur, software-delivery-workflow, frontend-ui-workflow, webapp-testing, deploy-to-vercel]
---

# VividFlow SaaS Logic Mapper

## Objectif

Ce skill sert à gagner du temps sur les projets SaaS/micro-SaaS en transformant rapidement des indications naturelles du type :

- “ce bouton vide correspond à cette action” ;
- “cette card doit afficher ce calcul” ;
- “ce module doit alimenter cette autre page” ;
- “quand on change ce statut, ça doit bouger ici” ;
- “ce chiffre est la somme de ces éléments” ;
- “ce champ doit être lié à tel objet client”.

En sortie, l’agent doit produire une **carte logique actionnable** : UI → action → donnée → formule → effet attendu → fichiers probables → tests.

Le but n’est pas de faire une spec longue. Le but est de convertir une intuition produit en instructions dev claires, sans perdre 30 minutes à tout réexpliquer.

## Quand l’utiliser

Utiliser ce skill dès que Thomas ou Jonathan travaille sur :

- un SaaS ;
- un dashboard ;
- un micro-SaaS ;
- un Data OS ;
- une maquette interactive ;
- une page avec boutons/cards/champs vides ;
- des KPI, scores, stats, montants, pourcentages ou formules ;
- des relations entre modules ;
- des workflows cross-page ;
- une transformation prototype → produit réellement fonctionnel.

Déclencheurs typiques :

- “ce bouton correspond à ça” ;
- “relie-moi ça” ;
- “fais les liens logiques” ;
- “lien mathématique” ;
- “formule” ;
- “quand je clique ici” ;
- “ça doit remplir cette partie” ;
- “ça doit se calculer automatiquement” ;
- “on perd trop de temps sur la logique”.

## Principe central

Ne jamais traiter une UI comme seulement visuelle.

Chaque élément visible doit être classé :

1. **Action** — bouton, menu, CTA, drag/drop, changement de statut.
2. **Donnée** — input, texte, record, objet métier, fichier, URL.
3. **Calcul** — KPI, score, somme, ratio, moyenne, pondération, heat score.
4. **Navigation** — route, modal, drawer, onglet, redirection, URL profonde.
5. **État** — empty/loading/error/success/disabled/active.
6. **Permission** — qui peut voir, cliquer, modifier, supprimer.
7. **Effet secondaire** — création DB, update, notification, webhook, audit log, recalcul.

Si un élément est vide ou décoratif, demander/poser une hypothèse courte : “par défaut je le mappe à X”.

### Règle URL profonde / sens du clic

Quand Thomas/Jonathan dit qu’un lien “ramène au dashboard” ou demande de “donner du sens à chaque clic”, traiter ça comme une dette logique SaaS, pas comme un simple bug de navigation.

Pour tout endroit spécifique du SaaS :

- Module/page : encoder dans l’URL (`?module=...&page=...` ou route équivalente).
- Dossier ouvert : encoder l’identifiant du dossier (`folder=...`).
- Card/projet/record sélectionné : encoder l’identifiant métier (`project=...`, `record=...`, `client=...`).
- Modal/drawer important : soit route dédiée, soit query param stable si le contenu est partageable.
- Navigation interne : mettre à jour l’URL au clic, pas seulement le state React local.
- Chargement direct : au mount, lire l’URL et restaurer exactement module → page → dossier → item.
- Retour navigateur : écouter `popstate` ou utiliser le routeur framework pour que Back/Forward fonctionne.
- Changement de contexte : nettoyer les params devenus invalides (`folder`, `record`, etc.) quand on sort du module.

Test minimal : copier l’URL après avoir ouvert un dossier/item, recharger dans un nouvel onglet, vérifier qu’on revient au même endroit — jamais au dashboard par défaut.

## Workflow rapide

### 1. Capturer la phrase utilisateur

Quand l’utilisateur dit un truc approximatif, ne pas lui demander une spec complète.

Exemple :
> “Ce bouton qui est vide, en fait il doit ouvrir le détail du lead et alimenter le score.”

Traduire directement en mapping :

- Élément : bouton vide sur card lead.
- Action : ouvrir détail lead.
- Donnée source : leadId.
- Effet : charger lead + activités + score.
- Calcul : score recalculé depuis interactions.
- UI cible : drawer/modale détail lead.
- Test : clic bouton → drawer ouvert → données correctes.

### 2. Produire la carte logique courte

Format par défaut :

```markdown
## Mapping logique — <feature/module>

### 1. Élément UI
- Élément :
- Emplacement :
- État actuel : vide / mock / incomplet / ambigu

### 2. Logique attendue
- Action utilisateur :
- Donnée utilisée :
- Effet immédiat :
- Effet secondaire :

### 3. Formule / relation si applicable
- Formule :
- Source de vérité :
- Cas limites :

### 4. Implémentation probable
- Frontend :
- Backend/API :
- DB/Schema :
- Permissions :

### 5. Tests de validation
- Test clic/action :
- Test donnée :
- Test formule :
- Test empty/error :
```

### 3. Identifier les liens cross-module

Pour chaque logique, vérifier si elle impacte :

- dashboard ;
- détail client/lead/projet ;
- analytics/KPI ;
- notifications ;
- calendrier ;
- pipeline ;
- settings ;
- permissions ;
- exports ;
- audit logs.

Si oui, le dire explicitement :

> Ce bouton n’est pas isolé : il doit aussi mettre à jour `X`, recalculer `Y`, et être visible uniquement pour `Z`.

### 4. Transformer les calculs flous en formules

Quand l’utilisateur parle de “liens mathématiques”, formaliser.

Exemples :

- `totalRevenue = sum(deals.amount where status = "won")`
- `conversionRate = wonDeals / totalQualifiedLeads`
- `completionRate = completedTasks / totalTasks`
- `heatScore = weightedSum(opened, clicked, replied, booked, inactivePenalty)`
- `progress = completedSteps / requiredSteps`

Toujours préciser :

- unité : CHF, %, nombre, score /100 ;
- période : total, 7 jours, 30 jours, mois courant ;
- source de vérité : table/collection/API ;
- cas limite : division par zéro, donnée absente, statut inconnu ;
- arrondi : entier, 1 décimale, 2 décimales.

### 5. Ne pas inventer si la logique business change le produit

Si la décision change fortement le produit, proposer une recommandation au lieu de deviner.

Format :

```markdown
Hypothèse recommandée : <option>
Pourquoi : <raison business>
Impact : <ce que ça change>
À valider : oui/non
```

Ne poser une question que si l’ambiguïté bloque vraiment l’implémentation.

### 6. Connecter la logique jusqu’au déploiement Vercel

Quand le projet est déployé sur Vercel ou doit l’être, ne pas s’arrêter au code local. Mapper aussi les **liens de production** : routes, boutons, pages, variables d’environnement, API routes et checks live.

For les modules Data OS / Fiches clients qui doivent relier onboarding et exécution workflows, applique `references/data-os-client-fiches-onboarding-workflows.md` : fiche pleine page, modale/drawer riche, onglet `Infos client + onboarding`, accès direct au workflow builder, vérification browser des tabs et des règles CSS legacy qui peuvent masquer le contenu.

Pour les modules d’acquisition Data OS inspirés de Sheets/Excel, surtout Prospection et Performance setter, applique `references/vividflow-dataos-acquisition-prospection-performance.md` : Contacts source de vérité, Prospection = tracker horizontal premium Phase 1/2/3 en cellules, R1 booké via Calendrier, Performance = production R1 setter uniquement.

Pour les modules agentiques Data OS (`Équipe IA`, `Tâches`, `Activités`, `Base de connaissance`) et les sujets mémoire/Second Brain/GBrain/skills/SOPs, applique `references/vividflow-dataos-agentic-second-brain.md` : ne pas proposer Obsidian externe par défaut; `Activités` doit devenir le Second Brain interne relié aux agents, tâches, clients, preuves, décisions et SOP candidates.

Pour un audit ou une reprise de code VividFlow Service Execution OS/Vercel, applique aussi `references/vividflow-service-execution-os-prod-readiness.md` : confirmer le repo Vercel exact, inventorier les changements locaux, traiter d’abord auth/secrets/quotas IA/webhooks/data env, et ne pas confondre VividFlow avec Brand Lab.

Pour chaque bouton/lien/action qui mène vers une page ou déclenche une API, préciser :

- route locale attendue : `/dashboard`, `/clients/:id`, `/api/...` ;
- route Vercel attendue : `https://<project>.vercel.app/...` ou alias canonique ;
- dépendances env : Clerk, Convex, Stripe, GHL, etc. ;
- comportement si l’utilisateur arrive directement sur l’URL ;
- fallback si donnée absente ou auth requise ;
- test live : HTTP 200, pas de 404/401 inattendu, console clean, action réellement cliquée.

Format rapide :

```markdown
### Lien déploiement / prod
- Route locale :
- Route Vercel :
- Env nécessaire :
- Auth requise : oui/non
- Test live :
- Risque :
```

Règle : une logique n’est pas terminée tant qu’elle n’est pas vérifiée sur l’URL live quand le livrable cible est Vercel.

## Notation ultra-rapide pour Thomas/Jonathan

L’utilisateur peut donner des mappings en langage court. L’agent doit les comprendre.

### Syntaxe simple

```text
[élément] -> [action] -> [effet]
```

Exemples :

```text
Bouton “Voir” card lead -> ouvre drawer lead -> charge interactions + score
Card CA mensuel -> somme deals won du mois -> affiche CHF + évolution vs mois précédent
Status projet “bloqué” -> remonte au dashboard -> crée une alerte action prioritaire
Bouton “Générer CDC” -> prend notes audit + fiche client -> crée draft CDC
```

### Syntaxe calcul

```text
KPI = formule | source | période | format
```

Exemples :

```text
MRR = sum(subscriptions.amount where status=active) | Stripe | mois courant | CHF
Taux conversion = clients signés / leads qualifiés | CRM | 30j | %
Heat score = ouvert*1 + cliqué*3 + répondu*8 + RDV*15 - inactif*5 | events | rolling 30j | /100
```

### Syntaxe permission

```text
[action] visible pour [rôle] sauf [condition]
```

Exemple :

```text
Supprimer client visible pour admin uniquement sauf client actif avec facture ouverte
```

## Sortie attendue avant code

Avant de coder une feature logique, produire un mini-bloc :

```markdown
Je mappe comme ça :
- UI :
- Action :
- Donnée :
- Calcul :
- Effet :
- Permissions :
- Tests :
```

Puis coder seulement après avoir une logique stable ou une hypothèse raisonnable.

## Mode editor interactif

Quand Thomas demande un mode visuel pour connecter les liens logiques, créer ou utiliser un éditeur ultra simple :

- canvas central avec éléments SaaS/micro-SaaS draggable ;
- clic sur un élément = bulle commentaire directement à côté ;
- commentaire structuré : `ce que c’est`, `où ça va`, `donnée/source`, `formule`, `route Vercel`, `test` ;
- sauvegarde automatique locale ;
- export JSON du mapping logique ;
- option d’ajouter bouton/card/KPI/page/flèche ;
- pas de complexité type Figma/PPT : le but est de placer et expliquer vite les liens.

Ce mode sert à discuter visuellement avec Thomas : il déplace les éléments, clique, écrit la logique, puis l’agent transforme l’export en spec dev.

## Règles SaaS importantes

- Un bouton sans effet est une dette produit.
- Un KPI sans formule est un chiffre décoratif.
- Une card sans source de vérité est un mock.
- Une action sans permission serveur est une faille.
- Une logique cross-module doit être testée sur toutes les surfaces impactées.
- Un empty state doit expliquer quoi faire ensuite.
- Un calcul doit avoir une période, une source, un format et un cas limite.

### Sécurité P0 avant logique produit

Quand un audit SaaS révèle un bypass auth, des routes API publiques, des secrets fallback, des webhooks qui acceptent sans secret, ou des appels IA sans quota, traiter ça comme une dette P0 avant toute nouvelle logique produit.

Ordre recommandé :
1. Mettre en pause les autres agents/devs et préserver leurs changements non commit.
2. Créer une branche dédiée depuis l’état courant.
3. Corriger uniquement le socle sécurité/coût : auth, middleware, secrets, webhooks, rate limit IA.
4. Ne pas toucher aux modules métier actifs tant que le P0 n’est pas validé.
5. Vérifier avec diff/build/tests runtime avant toute annonce de fin ou déploiement.

Pour VividFlow Service Execution OS/QOS, voir `references/vividflow-service-execution-os-p0-security.md`.

## Exemples rapides

### Exemple 1 — bouton vide

Input utilisateur :
> “Le bouton sur la card client, ça doit ouvrir le suivi client.”

Mapping :

- UI : bouton card client.
- Action : ouvrir route `/clients/:id` ou drawer détail client.
- Donnée : `clientId`.
- Effet : afficher tasks, notes, statut, prochaine action.
- Backend : query `getClientById(clientId)`.
- Permission : owner/admin du workspace.
- Test : clic depuis dashboard → détail correct, pas de fuite autre client.

### Exemple 2 — lien mathématique

Input utilisateur :
> “La progression doit dépendre des étapes terminées.”

Mapping :

- KPI : progression onboarding.
- Formule : `completedRequiredSteps / totalRequiredSteps * 100`.
- Source : étapes onboarding du client.
- Cas limite : si 0 étape requise, afficher 0% ou “non configuré”.
- Effet : met à jour card dashboard + barre progression fiche client.
- Test : terminer une étape → progression augmente immédiatement.

### Exemple 3 — action cross-module

Input utilisateur :
> “Quand un projet passe bloqué, je veux le voir direct dans le dashboard.”

Mapping :

- Action : changement `project.status = blocked`.
- Effet direct : badge bloqué sur projet.
- Effet secondaire : ajoute l’item aux alertes dashboard.
- Source : query dashboard filtre projets bloqués.
- Permission : visible aux roles delivery/admin.
- Test : modifier statut → dashboard affiche l’alerte après refresh/realtime.

## Pitfalls

- Coder directement un bouton avant d’avoir défini donnée/action/effet.
- Brancher un KPI sur une constante temporaire sans le signaler.
- Oublier les cas limites mathématiques.
- Créer une logique frontend sans mutation/backend durable.
- Oublier qu’un changement de statut peut impacter plusieurs pages.
- Confondre “ça s’affiche” avec “c’est calculé depuis la bonne source”.
- Demander trop de détails à l’utilisateur alors qu’une hypothèse évidente suffit.

## Verification Checklist

Avant de conclure une feature logique :

- [ ] Chaque bouton/CTA important a une action.
- [ ] Chaque KPI a une formule explicite.
- [ ] Chaque formule a une source de vérité.
- [ ] Les cas limites sont gérés.
- [ ] Les permissions sont testées côté serveur/API si action sensible.
- [ ] Les impacts cross-module sont listés.
- [ ] Les états empty/loading/error/success existent.
- [ ] Le test utilisateur réel est fait : clic, modification, recalcul, refresh.
- [ ] Si Vercel est impliqué : route live testée, HTTP OK, console clean, pas de 404/401 inattendu.
- [ ] Les variables d’environnement nécessaires au lien logique sont identifiées.
- [ ] Les boutons/liens critiques fonctionnent aussi après refresh direct de l’URL live.

## Réponse finale courte

Quand ce skill est utilisé, répondre en mode opérationnel :

```text
J’ai mappé la logique :
- bouton X → action Y → effet Z
- KPI A → formule B → source C
- impact cross-module : D
- tests à faire : E
```

Ne pas faire un long cours. Donner la carte logique et avancer.
