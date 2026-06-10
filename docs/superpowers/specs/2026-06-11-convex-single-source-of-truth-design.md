# Data OS — Convex source unique de vérité + intégrité des liens

> Design / spec. Statut : validé en brainstorming le 2026-06-11. Prochaine étape : plan d'implémentation (writing-plans), Vague 0 (vérificateur) en premier.

## 1. Contexte & objectif

Le Data OS (QOS) s'appuie aujourd'hui sur **trois sources de données simultanées** : Convex (la vraie), Supabase (auth héritée + ~16 routes API), et GoHighLevel/GHL (fiche client, pipeline, champs `ghl_contact_id`). Beaucoup d'« informations reliées à rien » le sont parce qu'elles pointent vers Supabase ou GHL qui ne répondent plus.

**Fait déterminant : le Data OS n'a jamais été utilisé en production — aucune donnée réelle nulle part.** Donc : aucune migration de données, liberté totale pour supprimer Supabase + GHL, et risque minimal.

**Objectif :** faire de **Convex l'unique source de vérité**, supprimer Supabase et GHL entièrement, et garantir que **chaque lien logique entre données est valide** — c'est-à-dire (a) aucun **orphelin** (relié à rien) et (b) aucune **désynchronisation** (relié mais faux, ex. une card pipeline qui reste « inbound » alors que le contact est « outbound ») — et que **chaque bouton/route est cliquable** (aucun élément mort). Ces garanties sont le **test de réception** du projet.

**Approche retenue : hybride C → A.** D'abord un **vérificateur réutilisable** (C) qui rend l'audit répétable et produit la liste de courses exacte ; ensuite une migration **module par module** (A), le vérificateur servant de test de réception après chaque vague.

### Ancrage sur l'audit du 2026-06-10
Un audit multi-agents de ~7h (8 agents + 3 juges « tribunal » + passe interactive) a déjà produit **109 findings** (9 critiques, 42 majeurs). Cet audit est de fait **la première exécution manuelle du vérificateur** : ses findings seedent la carte des liens, la liste d'UI morte, et l'ordre de priorité. Le vérificateur doit au minimum **reproduire** tout ce que l'audit a trouvé (jeu de calibration). Le corpus d'audit est sauvegardé comme worklist versionnée (voir §7).

## 1bis. Principe d'exécution : CHIRURGICAL (non négociable)

Tout ce projet se fait au scalpel, jamais à la hache.

- **Une modification = une intention.** Aucun refactoring non lié, aucune « amélioration » opportuniste hors périmètre. Ce qui marche reste tel quel.
- **On ne supprime rien sans prouver que c'est mort.** Avant de couper un module : grep des références entrantes depuis les modules gardés (0), aucune route live qui en dépend (0), aucune donnée réelle (0). Pas de suppression à l'aveugle. _(Rappel : le tribunal a averti que `/signer` semblait vivant en prod — donc on vérifie chaque module, on n'assume pas. Le verdict « legacy Soren » du user oriente, mais le grep confirme.)_
- **Petits commits atomiques**, un module / une vague à la fois. Le vérificateur passe **au vert** sur le périmètre avant de passer au suivant.
- **Diff minimal, branche + preview, validation avant prod.** Rien sur le backend Convex partagé (avec Jonathan) sans confirmation explicite.
- **Réversibilité.** Chaque vague est un point de retour propre ; on peut s'arrêter entre deux sans laisser l'app à moitié cassée.

## 2. Le vérificateur (Vague 0 — livrable « C »)

Trois pièces.

### 2.a La carte des INVARIANTS (le pivot)
Un fichier unique (`scripts/integrity/invariant-map.ts`) qui déclare **les règles que les données doivent toujours respecter**. C'est la source de vérité de la cohérence : ajouter un lien/une dérivation dans le SaaS = ajouter sa règle dans la carte. Deux types de règles :

| Type | Règle | Exemple | Attrape |
|---|---|---|---|
| **Référentiel** | le lien pointe vers une cible existante | `paiement.contactId` existe dans `crm_contacts` | les **orphelins** (relié à rien) |
| **Cohérence / dérivation** | la valeur dérivée = sa source | `pipeline_card.source` = `contact.source` | les **désync** (relié mais faux) |

**Insight central : la fiche contact est le hub.** Un contact (client / lead / perdu) porte des champs — `statut`, `source` (inbound/outbound), `canton`, `métier`, `niche` — qui doivent se propager **identiquement partout** où ils s'affichent : card pipeline, fiche, compteurs dashboard, prospection, performance. **La même règle se répète sur des dizaines d'endroits** → on la déclare **une fois** (« tout affichage de la source d'un contact = `contact.source` »), le scanner l'applique **partout**. C'est pour ça qu'il n'y a pas des milliers de règles à écrire : il y a quelques dizaines de relations, chacune s'appliquant à des milliers de lignes/écrans.

Exemples de règles (seedées par l'audit) :

| Champ / affichage | Règle | Type | Note (audit) |
|---|---|---|---|
| `pipeline_card.source` | = `contact.source` | cohérence | **stocké en localStorage, divergé → reste inbound** |
| `paiements.contactId` | existe dans `crm_contacts` | référentiel | |
| `os_tasks.assigneeId` (type=agent) | existe dans `os_agents` | référentiel | assignee mock |
| `os_activities.entityId` (selon `entityType`) | existe dans la table cible | référentiel | non résolu |
| `pipeline_clients.ghl_contact_id` | = un `crm_contacts._id` | référentiel | **relique GHL — fiche 404** |
| `crm_leads.statut` / colonne pipeline | cohérent avec `contact.statut` | cohérence | Yasmine en R2 alors que contact « perdu » |
| `osProspection.contactId` / `leadId` | existent | référentiel | |

### 2.b Scanner d'intégrité données (orphelins + désync)
Une fonction Convex (`convex/integrity.ts`, query/action) qui parcourt chaque règle de la carte et, pour chaque ligne concernée, vérifie soit que la cible existe (référentiel), soit que la valeur dérivée est conforme à sa source (cohérence). Sortie structurée : `{ règle, table, id, champ, attendu, observé, raison }`. Lançable à la demande (`npx convex run integrity:scan`).

> **Correctif chirurgical privilégié pour les désync : dériver au lieu de dupliquer.** Quand une valeur peut être lue en direct depuis sa source (ex. la card pipeline lit `contact.source` au lieu d'en garder une copie localStorage), l'invariant **ne peut plus casser par construction**. Le scanner ne sert alors que de filet pour les cas non dérivables.

### 2.c Scanner d'UI morte (boutons/routes)
Un script node (`scripts/integrity/scan-ui.ts`) qui balaie `src/` et remonte les cas francs :
- handlers `onClick` vides / no-op,
- `href="#"`,
- `router.push()` / `<Link>` vers une route absente de `src/app`,
- boutons branchés sur `localStorage`/mock présentés comme persistants.

Sortie : `{ fichier, ligne, élément, problème }`. *(Un crawl Playwright « clique tout » exhaustif reste optionnel pour plus tard — on commence par le statique, haut signal.)*

**Où ça vit :** des scripts dans le repo, réutilisables à volonté, qui deviennent le **test de réception** de chaque module. Un écran « cockpit d'intégrité » dans le Data OS pourra venir plus tard.

## 3. Découpage cœur / coupé des modules

### Cœur — gardés, (re)branchés 100% Convex
Dashboard, Contacts + **fiche client**, Pipeline + Clients, Prospection, Performance, Onboarding, Paiement, Data/Records/Process, Tâches, Activités, Équipe IA, Base de connaissance, Intégrations, **/formulaire** (funnel public d'acquisition — actuellement écrit Supabase/GHL → **leads perdus**, à recâbler Convex).

### Cas « mock à remplacer par une vraie intégration »
- **Calendrier** → connexion **Google Agenda** (sync par profil ; table `google_accounts` + routes OAuth déjà amorcées).
- **Paiement** → connexion **Revolut Pro** (banque ; sync des transactions, fini la saisie mock).
- **Budget** → migrer Convex (faible priorité).

### Coupés — legacy Soren / Supabase / redondant
`/devis` (+ `/signer`), `/conversations`, `/chatbot` (Kai), `/agent` (Kai qualif), `/communication`, `/conversion`, `/transcripts`, `/modules`, `/architecture`. → Ce sont des vestiges de l'ancien produit « Soren ». Supprimés avec leur code Supabase/GHL et leurs routes API.

### Gardés (publics / auth)
`/(public)/start`, `/inscription`, `/parametres`.

## 4. Séquence de migration (6 vagues)

Chaque vague se termine par un passage du vérificateur (vert = plus d'orphelin / bouton mort / dépendance Supabase-GHL sur le périmètre).

- **Vague 0 — Vérificateur.** Découpée en trois étapes :
  - **0.0 — Cartographie exhaustive des liens** (on ne peut pas vérifier ce qu'on n'a pas listé). Deux passes : (1) **extraction automatique** — un script lit le schéma Convex (tous les champs référence) + grep le code UI (tout champ affiché qui correspond à un champ d'une entité liée → invariant candidat) ; (2) **passe de découverte** (audit ciblé « relations entre données », possiblement multi-agents comme l'audit de 7h) qui valide/complète, surtout les **dérivations sémantiques** que l'auto rate (inbound/outbound, où les noms diffèrent). Résultat = la carte des invariants complète. Rappel de cadrage : quelques **dizaines de règles** (borné), chacune appliquée à des milliers de lignes — on découvre les règles, la machine trouve les violations.
  - **0.1 — Les 2 scanners** (référentiel + cohérence, §2.b ; UI morte, §2.c) qui consomment la carte.
  - **0.2 — Calibration.** Le scanner doit retrouver **tout** ce que l'audit de 7h avait trouvé (corpus versionné, §7). S'il en rate, la carte est incomplète → on l'enrichit.
- **Vague 1 — Couper le mort.** Suppression des modules legacy Soren + Supabase ci-dessus + routes API associées. Une grosse partie des orphelins/boutons morts disparaît d'un coup. Risque quasi nul.
- **Vague 2 — Cœur sur Convex.** Fiche client/Contacts (finir GHL), badge source pipeline → Convex, `/formulaire` → Convex, purge des `ghl_contact_id`, correction des maths dashboard (R1/R2 période, CA 14 984 vs 16 000). **Fin de toute trace GHL & Supabase.**
- **Vague 3 — Vraies intégrations.** Google Agenda → Calendrier (read sync d'abord), puis **Revolut Pro → Paiement** (intégration la plus lourde, faite en dernier).
- **Vague 4 — Modules agentiques réels.** Équipe IA → `os_agents` + comptes agents Hermes, SOPs/Playbooks persistants (déjà en cours), `proof`/`cost` dans Activités.
- **Vague 5 — Balayage final.** Relancer le vérificateur, corriger les derniers orphelins/boutons, purger la pollution de test (`TEST AUDIT`, `ZZ-*`, `d d`).

## 5. Patterns techniques

**Arracher Supabase :** routes survivantes `getAuthContext` → `auth()` (Clerk) + Convex ; routes mortes supprimées avec leur module ; tables Supabase abandonnées (rien de réel) ; retrait de `@supabase/*` du `package.json` en fin de course.

**Arracher GHL :** chaque `fetch` GHL → query/mutation Convex (la fiche client est le modèle déjà fait) ; `ghl_contact_id: string` → `contactId: v.id("crm_contacts")` (lien **typé** validé par Convex → orphelin impossible par construction) ; suppression de `src/lib/ghl.ts`, `mock-data.ts`, env `GHL_*`.

**Nettoyage du modèle :** partout où c'est possible, `string` → `v.id("table")` typé (orphelin impossible), et **dériver au lieu de dupliquer** pour les valeurs qui ont une source unique (désync impossible). Ce qui ne peut être ni typé ni dérivé (ex. `os_activities.entityId` polymorphe) reste couvert par la carte des invariants. Règle : **aucun lien sans filet** — soit Convex le garantit, soit la dérivation l'empêche, soit le scanner le surveille.

## 6. Intégrations externes

**Google Agenda (la plus avancée).** Table `google_accounts` (token par profil, serveur-only) + routes OAuth `/api/auth/google` déjà amorcées. Reste : finir le flux OAuth, lire les events via Google Calendar API, les afficher dans Calendrier (sync lecture d'abord, puis création). Bloqueur connu : config Google Cloud.

**Revolut Pro (la plus neuve, la plus lourde).** API **Revolut Business** : auth exigeante (certificat auto-signé uploadé chez Revolut + JWT client-assertion, pas un simple OAuth). Token stocké serveur-only. Sync des transactions → enregistrements paiement Convex, réconciliés avec les clients. Faite en dernier de la Vague 3.

## 7. Corpus d'audit = worklist de référence

Le résultat de l'audit du 2026-06-10 (109 findings + verdicts du tribunal + passe interactive) est sauvegardé dans le repo (`docs/superpowers/specs/2026-06-10-audit-corpus.md`) comme **point de départ versionné** que le vérificateur doit reproduire et compléter. Findings structurants déjà connus :
- **Critiques :** fiche client 404 pour 100% des vrais contacts (GHL) ; double stack d'auth Supabase (16 routes) ; `/formulaire` perd les leads ; pollution de données de test dans les KPIs.
- **Majeurs liens/UI :** badge inbound/outbound lu depuis localStorage (donnée fausse) ; route `/activites` 404 ; boutons d'édition `opacity-0` ; toggle Actif/Inactif + DocEditor en localStorage ; mocks affichés comme réels (calendrier, agent-logs, budget) ; CA désynchronisé ; R1/R2 hors période.

## 8. Critères de réception

Le projet est « fini » quand :
1. `npx convex run integrity:scan` renvoie **0 orphelin** (référentiel) **et 0 désync** (cohérence/dérivation) sur toutes les règles de la carte des invariants.
2. La carte des invariants est jugée **exhaustive** (étape 0.0 complétée : extraction auto + passe de découverte) et **calibrée** (retrouve tout le corpus d'audit du 2026-06-10).
3. Le scanner d'UI renvoie **0 bouton/route mort** sur les modules cœur.
4. **Aucune** occurrence de GHL (`src/lib/ghl.ts`, `GHL_*`, `ghl_contact_id`) ni de Supabase (`@supabase/*`, `getAuthContext`) dans le code.
5. Les modules cœur lisent/écrivent **exclusivement Convex** (sauf intégrations externes Google/Revolut, serveur-only).
6. La pollution de test est purgée.

## 9. Notes de mise en œuvre

- **Backend Convex partagé avec Jonathan** (`standing-malamute-439`) : pas de preview isolée. Tout déploiement Convex est additif/coordonné. Suppressions de tables = en fin de parcours, prudemment.
- **Déploiement frontend :** branche + preview Vercel pour validation avant prod (les valeurs d'env prod ne sont pas déchiffrables via le CLI → preview buildée localement avec l'instance Clerk dev ; preuve du gating faite en local).
- Voir mémoire : `qos-convex-deploy`, `qos-local-audit-env`, `qos-hermes-agent-accounts`, `feedback-shared-convex`.
