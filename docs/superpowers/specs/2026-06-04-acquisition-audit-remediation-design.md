# Remédiation — Cohérence logique des modules Acquisition (QOS)

Date : 2026-06-04
Périmètre : Tableau de bord, Contacts, Prospection, Performance, Onboarding, Paiement, Calendrier
Contrainte absolue : **aucun changement visuel/UI** — uniquement la logique de calcul, de synchronisation et de gestion du temps. On corrige pour matcher les règles métier fournies, sans dénaturer le comportement existant au-delà de ce qu'exigent ces règles.

## 1. Objectif

Corriger les incohérences identifiées par l'audit pour que **calculs, synchronisations et comportements temporels** correspondent exactement aux règles métier. On part des **fondations transverses** (temps local + couche de synchro unifiée) puis on rebranche les KPI qui en dépendent.

Posture validée : **corriger d'office les bugs nets** ; pour les cas qui changent des chiffres, suivre les décisions ci-dessous (déjà tranchées).

## 2. Règle globale — Temps local

Toute notion de temps (calendriers, périodes Aujourd'hui/Semaine/Mois, KPI, objectifs, événements, synchros) doit être calculée dans le **fuseau horaire du PC de l'utilisateur**.

## 3. Décisions validées

- **D1 — Fenêtrage Dashboard** : « durant la période » = entités **créées dans `[from, to]`** (flux). S'applique à Clients, Leads. (R1/R2 = comptage **live** des colonnes, conforme à la règle.)
- **D2 — Définition Client/Lead = intersection** :
  - **Client** = `crm_contacts.statut='client'` **ET** présent dans `pipeline_clients`.
  - **Lead** = `crm_contacts.statut='lead'` **ET** présent dans la pipeline Leads (`crm_leads`).
  - **Invariant source** : un lead **outbound** (cold call) doit **aussi** avoir une carte **Prospection** ; un lead **inbound** est dans la pipeline Leads sans être forcément dans Prospection.
- **D3 — Performance « Réponses » / « À rappeler »** = **leads distincts** (comportement actuel conservé), cohérent avec « Leads contactés » et un taux de réponse propre (0–100 %).

## 4. Chantier 1 — Temps local partout (Fondation A1)

**Bugs nets corrigés d'office.**

- **Client** : remplacer le helper `iso()` (`toISOString().slice(0,10)`, jour UTC) par `localDate()` (composantes locales) pour les presets Aujourd'hui/Semaine/Mois de `PerformanceView.tsx` (lignes 9-10, 139-145). Corriger `fmtDateInput` (UTC) dans `DateRangePicker.tsx:37` et `DashboardClient.tsx:196` (affichage du champ date).
- **Serveur (Convex tourne en UTC)** : ajouter un paramètre `tz` (chaîne IANA du navigateur, ex. `Intl.DateTimeFormat().resolvedOptions().timeZone`) aux queries qui bucketisent par jour :
  - `performance.summary`, `performance.activityCalendar`, `performance.objectivesForRange`
  - `dashboard.getMetrics`, `paiement.overview`
  - Introduire un helper `localDay(isoUtc, tz)` qui convertit `createdAt` (UTC) vers le jour **local** avant comparaison/regroupement. Remplacer tous les `e.createdAt.slice(0,10)` et `d.toISOString().split('T')[0]` de bucketing par ce helper (`performance.ts:35,62,83`, `dashboard.ts:12-47`, `paiement.ts:9-56`, `analytics.ts:32`).
  - Le client envoie déjà ses bornes `from/to` en local (Dashboard) ; uniformiser Performance pour faire pareil.
- **Calendrier** : remplacer le `timeZone:'Europe/Paris'` codé en dur par le fuseau du **navigateur** transmis depuis le client :
  - `google-events/route.ts:56-57`, `google-events/[id]/route.ts:46-47`, `calendar-event/route.ts:33`.
- **Réglage « Fuseau » (Paramètres)** : hors périmètre immédiat — par défaut on prend le fuseau navigateur. (Le réglage manuel reste mort pour l'instant ; on pourra le brancher plus tard comme override.)

Garde-fou : la conversion serveur doit rester correcte aussi pour les presets (qui deviennent locaux côté client). Convention unique : **bornes locales (client) + bucketing local (serveur via `tz`)**.

## 5. Chantier 2 — Couche de synchro unifiée (Fondation B1)

Nouveau module `convex/leadSync.ts` centralisant **toutes** les transitions, appelé par toutes les portes d'entrée (Prospection, drag Kanban, API `/api/crm/leads`, toggle statut Contacts) :

- `moveStage(ctx, contactId, stageId)` : patch `crm_leads.stageId` + `lead_stage_history` + **miroir** vers `prospection_records` (colonne/phase) si une carte Prospection existe.
- `markLost(ctx, contactId, { reason, stage })` : `crm_leads.status='lost'` + `crm_contacts.statut='perdu', leadStatus='non_qualifie'` + `prospection_records.status='lost', lostReason, lostStage` (si carte Prospection).
- `setLeadStatus(ctx, contactId, leadStatus)` : cohérence `leadStatus` ↔ `statut`.

**Synchro bidirectionnelle (le manque principal) :**
- `crm_leads.updateStage` / `updateStatus` et les routes API Kanban appellent désormais ces helpers → **Pipeline → Prospection** fonctionne.
- Déplacer une carte dans **Perdu** depuis le Kanban → carte Prospection passe en Perdu, contact en perdu, retirée de « Leads à traiter ».
- Déplacer une carte vers une autre colonne → la phase/colonne Prospection reflète le changement.

**Capture du stade de perte (règle Cas 1 / Cas 2) :**
- Nouveau champ `prospection_records.lostStage` ∈ `nouveau-lead | conversation`.
- Calculé au moment de la perte : `conversation` si au moins une `phase1/2/3Status` est renseignée, sinon `nouveau-lead`. Posé dans `markLost` (donc valable que la perte vienne de Prospection **ou** du Kanban).

**Bugs nets corrigés d'office :**
- **Doublon de lead** : `linkInternal` ne réutilise qu'un lead `open` → si le lead existant est `lost`/`won`, soit on le rouvre, soit on le réutilise (pas de second `crm_lead` pour un même contact).
- **Lead orphelin** : `osProspection.remove` doit aussi clôturer/retirer le `crm_lead` associé (pas d'open orphelin dans le Pipeline).
- **Dédup unifiée** : remplacer les 3 implémentations divergentes (`crm_contacts.create` phone/email/linkedin ; `osProspection.createOrLink` + nom+entreprise ; seed phone/email) par **un seul helper** de dédup partagé (clés : phone, email, linkedin ; nom+entreprise en option explicite).

**Invariant outbound** : à la création/synchro d'un lead `source='outbound'`, garantir l'existence d'une carte Prospection (déjà le cas via la création Prospection ; on s'assure que les chemins Pipeline/Contacts ne créent pas un outbound sans carte).

*Note : R1 → Client (conversion) n'est pas dans les règles fournies (Prospection s'arrête à R1/Perdu). On ne l'auto-câble pas (risque de dénaturer) ; la couche `leadSync` reste prête pour un `toClient()` explicite si demandé plus tard.*

## 6. Chantier 3 — KPI Dashboard rebranchés (après fondations)

**Bugs nets corrigés d'office :**
- **CA encaissé** = somme des **installments réellement payés dans `[from,to]`** (logique existante `paiement.ts:32-44`), au lieu de la valeur de contrat (`dashboard.ts:24`).
- **CA à collecter** = somme des montants non cochés (en attente) — brancher la valeur `attente` déjà calculée (`paiement.ts:38-51` / `onboarding.ts:42-61`) sur la carte aujourd'hui en `'—'` (`DashboardClient.tsx:630`).
- **Métiers clients** = nombre de métiers **distincts** dans les fiches contacts clients (`metierMap.size`), pas le total clients (`dashboard.ts:52-64`).
- **Niches** = nombre de niches **distinctes** (exposer `nicheMap.size`).
- **Table « Paiements encaissés »** = filtrée par la période du dashboard (passer `from/to` à la source, aujourd'hui `onboarding.paymentsOverview` est global — `onboarding.ts:19`).

**Selon décisions D1/D2 :**
- **Clients** = `crm_contacts.statut='client'` ∩ `pipeline_clients`, **créés dans `[from,to]`**.
- **Leads** = `crm_contacts.statut='lead'` ∩ `crm_leads`, **créés dans `[from,to]`** (exclure `won`).
- **R1 / R2** = comptage **live** des cartes en colonne `r1` / `r2` (état courant, conforme à la règle « cartes présentes dans la colonne »).
- **Conversions globale/inbound/outbound** : maths conservées ; aligner le client utilisé (intersection D2) et la fenêtre.
- **Graphique Clients** : déjà fenêtré ; aligner sur la définition Client (intersection) pour que les barres correspondent au compteur.

**Structure prête (vérifier seulement) :** « Paiements encaissés » (connexion bancaire future) et « Publicité investie » (Meta Ads future) restent des placeholders propres.

## 7. Chantier 4 — Performance & Objectifs

- **Avancées de phase** fiabilisées : `quickAction` doit poser `phase` sur l'event qu'il insère (`osProspection.ts:214`) pour que `activityCalendar.avancees` ne sous-compte plus les actions faites via boutons/MCP. Affiner la définition (avancée = entrée en phase supérieure, R1 ou Perdu).
- **Redondance objectif R1** : `prospection_goals.targetR1Booked` (jauge calendrier) vs objectif auto « Booker X R1 » (`setter_tasks`). On garde **un seul** mécanisme (préférence : l'objectif `setter_tasks`, déjà éditable côté UI) et on supprime/relie l'autre.
- **Réponses / À rappeler** : **leads distincts** (D3) — comportement actuel conservé, aucun changement.
- **Non touché (voulu)** : le strip KPI Performance est volontairement all-setters (le sélecteur a été retiré précédemment) → on ne le re-scope pas.

## 8. Chantier 5 — Calendrier

**Bugs nets corrigés d'office :**
- **Persistance du type R1/R2/…** : stocker le `type` dans `extendedProperties.private.type` (Google) + notes/champ GHL à la création, et le **relire** dans `GET /api/calendrier` → le type survit au rechargement et le filtre fonctionne.
- **Fenêtre de fetch** : suivre le **mois/semaine affiché** au lieu de ±30 j fixes autour de maintenant (`api/calendrier/route.ts:76`).
- **Rafraîchir** : remplacer `router.refresh()` (no-op avec SWR) par un `mutate()` SWR (`CalendarView.tsx:861`).
- **Suppression** : cascader Google→GHL (aujourd'hui seul GHL→Google cascade).
- **Toast création** : n'afficher « RDV créé » que si l'événement a réellement persisté (GHL ou Google), pas en cas d'échec total.
- **Fuseau** : couvert par le Chantier 1 (navigateur, pas Paris).

*Note : pas de table calendrier en Convex (événements en GHL/Google). On ne crée pas de table maintenant ; on documente que les événements ne sont pas liés à un contact en base (lien hors périmètre des règles fournies).*

## 9. Chantier 6 — Fiche contact unique

- Vérifier le point d'entrée « clic carte » du **Pipeline** (Kanban Leads & Clients) : il doit ouvrir la **même** `NewContactModal` (mode édition) que Contacts et Prospection. Si ce n'est pas le cas, l'homogénéiser. Les droits d'affichage (sections masquées selon contexte) restent gérés par les props du modal, la fiche reste unique.

## 10. Hors périmètre (non touché)

- Aucun changement visuel/UI/CSS.
- R1 → Client automatique (non demandé par les règles).
- Réglage manuel du fuseau dans Paramètres (on prend le navigateur).
- Connexions bancaire / Meta Ads (placeholders vérifiés, pas câblés).
- Création d'une table calendrier en Convex.

## 11. Stratégie de vérification

- **Par fondation puis dépendances** : (1) Temps local → vérifier en prod qu'une action en fin de journée tombe le bon jour (Performance/Calendrier) ; (2) Couche sync → tester les 4 chemins (Prospection→Pipeline, Pipeline→Prospection, Perdu des deux côtés, lostStage) via `convex run` + données démo ; (3) KPI Dashboard rebranchés → comparer avant/après sur la démo ; (4) Calendrier ; (5) Fiche unique.
- À chaque étape : `npx tsc --noEmit`, déploiement Convex + Vercel, vérification via `convex run`/données démo, nettoyage des données de test.
- Garde-fou anti-régression : on liste, pour chaque KPI dont le chiffre change, l'ancienne et la nouvelle valeur sur le jeu de démo, pour validation.

## 12. Risques & garde-fous

- **Risque** : rebrancher les définitions (intersection, fenêtrage, CA) change des chiffres affichés. **Garde-fou** : c'est attendu (objectif de l'audit) ; on documente chaque delta sur la démo avant/après.
- **Risque** : la couche sync introduit des effets de bord cross-module. **Garde-fou** : un seul module de transition, appelé partout, testé chemin par chemin avant de brancher les UIs.
- **Risque** : timezone serveur. **Garde-fou** : convention unique (bornes locales + bucketing local via `tz`) et tests en bord de journée.
</content>
