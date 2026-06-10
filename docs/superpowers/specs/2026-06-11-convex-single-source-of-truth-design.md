# Data OS — Convex source unique de vérité + intégrité des liens

> Design / spec. Statut : validé en brainstorming le 2026-06-11. Prochaine étape : plan d'implémentation (writing-plans), Vague 0 (vérificateur) en premier.

## 1. Contexte & objectif

Le Data OS (QOS) s'appuie aujourd'hui sur **trois sources de données simultanées** : Convex (la vraie), Supabase (auth héritée + ~16 routes API), et GoHighLevel/GHL (fiche client, pipeline, champs `ghl_contact_id`). Beaucoup d'« informations reliées à rien » le sont parce qu'elles pointent vers Supabase ou GHL qui ne répondent plus.

**Fait déterminant : le Data OS n'a jamais été utilisé en production — aucune donnée réelle nulle part.** Donc : aucune migration de données, liberté totale pour supprimer Supabase + GHL, et risque minimal.

**Objectif :** faire de **Convex l'unique source de vérité**, supprimer Supabase et GHL entièrement, et garantir que **chaque lien logique entre données est valide** (aucun orphelin) et que **chaque bouton/route est cliquable** (aucun élément mort). La cohérence des liens + boutons cliquables est le **test de réception** du projet.

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

### 2.a La carte des liens (le pivot)
Un fichier unique (`scripts/integrity/link-map.ts`) qui déclare **quel champ référence quelle table**. C'est la source de vérité de la cohérence : ajouter un lien dans le SaaS = l'ajouter dans la carte. Seedé par les liens cassés que l'audit a identifiés. Exemples :

| Champ source | Doit pointer vers | Note (audit) |
|---|---|---|
| `paiements.contactId` | `crm_contacts._id` | |
| `os_tasks.assigneeId` (type=agent) | registre d'agents (`os_agents`) | assignee mock |
| `os_tasks.linkedClientId` | `crm_contacts` / `pipeline_clients` | |
| `os_activities.entityId` (selon `entityType`) | table polymorphe | non résolu |
| `pipeline_clients.ghl_contact_id` | `crm_contacts` | **relique GHL — fiche 404** |
| `crm_leads.contactId` | `crm_contacts` | désync (Yasmine R2 vs contact perdu) |
| `osProspection.contactId` / `leadId` | `crm_contacts` / `crm_leads` | |

### 2.b Scanner d'intégrité données (orphelins)
Une fonction Convex (`convex/integrity.ts`, query/action) qui parcourt chaque entrée de la carte et vérifie que chaque valeur pointe vers une cible existante. Sortie structurée : `{ table, id, champ, valeur, raison }`. Lançable à la demande (`npx convex run integrity:scan`).

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

- **Vague 0 — Vérificateur.** Carte des liens + 2 scanners + corpus d'audit versionné.
- **Vague 1 — Couper le mort.** Suppression des modules legacy Soren + Supabase ci-dessus + routes API associées. Une grosse partie des orphelins/boutons morts disparaît d'un coup. Risque quasi nul.
- **Vague 2 — Cœur sur Convex.** Fiche client/Contacts (finir GHL), badge source pipeline → Convex, `/formulaire` → Convex, purge des `ghl_contact_id`, correction des maths dashboard (R1/R2 période, CA 14 984 vs 16 000). **Fin de toute trace GHL & Supabase.**
- **Vague 3 — Vraies intégrations.** Google Agenda → Calendrier (read sync d'abord), puis **Revolut Pro → Paiement** (intégration la plus lourde, faite en dernier).
- **Vague 4 — Modules agentiques réels.** Équipe IA → `os_agents` + comptes agents Hermes, SOPs/Playbooks persistants (déjà en cours), `proof`/`cost` dans Activités.
- **Vague 5 — Balayage final.** Relancer le vérificateur, corriger les derniers orphelins/boutons, purger la pollution de test (`TEST AUDIT`, `ZZ-*`, `d d`).

## 5. Patterns techniques

**Arracher Supabase :** routes survivantes `getAuthContext` → `auth()` (Clerk) + Convex ; routes mortes supprimées avec leur module ; tables Supabase abandonnées (rien de réel) ; retrait de `@supabase/*` du `package.json` en fin de course.

**Arracher GHL :** chaque `fetch` GHL → query/mutation Convex (la fiche client est le modèle déjà fait) ; `ghl_contact_id: string` → `contactId: v.id("crm_contacts")` (lien **typé** validé par Convex → orphelin impossible par construction) ; suppression de `src/lib/ghl.ts`, `mock-data.ts`, env `GHL_*`.

**Nettoyage du modèle :** partout où c'est possible, `string` → `v.id("table")` typé. Le polymorphe non typable (ex. `os_activities.entityId`) reste couvert par la carte des liens. Règle : **aucun lien sans filet** — soit Convex le garantit, soit le scanner le surveille.

## 6. Intégrations externes

**Google Agenda (la plus avancée).** Table `google_accounts` (token par profil, serveur-only) + routes OAuth `/api/auth/google` déjà amorcées. Reste : finir le flux OAuth, lire les events via Google Calendar API, les afficher dans Calendrier (sync lecture d'abord, puis création). Bloqueur connu : config Google Cloud.

**Revolut Pro (la plus neuve, la plus lourde).** API **Revolut Business** : auth exigeante (certificat auto-signé uploadé chez Revolut + JWT client-assertion, pas un simple OAuth). Token stocké serveur-only. Sync des transactions → enregistrements paiement Convex, réconciliés avec les clients. Faite en dernier de la Vague 3.

## 7. Corpus d'audit = worklist de référence

Le résultat de l'audit du 2026-06-10 (109 findings + verdicts du tribunal + passe interactive) est sauvegardé dans le repo (`docs/superpowers/specs/2026-06-10-audit-corpus.md`) comme **point de départ versionné** que le vérificateur doit reproduire et compléter. Findings structurants déjà connus :
- **Critiques :** fiche client 404 pour 100% des vrais contacts (GHL) ; double stack d'auth Supabase (16 routes) ; `/formulaire` perd les leads ; pollution de données de test dans les KPIs.
- **Majeurs liens/UI :** badge inbound/outbound lu depuis localStorage (donnée fausse) ; route `/activites` 404 ; boutons d'édition `opacity-0` ; toggle Actif/Inactif + DocEditor en localStorage ; mocks affichés comme réels (calendrier, agent-logs, budget) ; CA désynchronisé ; R1/R2 hors période.

## 8. Critères de réception

Le projet est « fini » quand :
1. `npx convex run integrity:scan` renvoie **0 orphelin** sur tous les liens de la carte.
2. Le scanner d'UI renvoie **0 bouton/route mort** sur les modules cœur.
3. **Aucune** occurrence de GHL (`src/lib/ghl.ts`, `GHL_*`, `ghl_contact_id`) ni de Supabase (`@supabase/*`, `getAuthContext`) dans le code.
4. Les modules cœur lisent/écrivent **exclusivement Convex** (sauf intégrations externes Google/Revolut, serveur-only).
5. La pollution de test est purgée.

## 9. Notes de mise en œuvre

- **Backend Convex partagé avec Jonathan** (`standing-malamute-439`) : pas de preview isolée. Tout déploiement Convex est additif/coordonné. Suppressions de tables = en fin de parcours, prudemment.
- **Déploiement frontend :** branche + preview Vercel pour validation avant prod (les valeurs d'env prod ne sont pas déchiffrables via le CLI → preview buildée localement avec l'instance Clerk dev ; preuve du gating faite en local).
- Voir mémoire : `qos-convex-deploy`, `qos-local-audit-env`, `qos-hermes-agent-accounts`, `feedback-shared-convex`.
