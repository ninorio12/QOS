# Vague 2 — Arracher GHL (GoHighLevel) — Plan

> Spec : `2026-06-11-convex-single-source-of-truth-design.md`. Exécution CHIRURGICALE (§1bis) : une tranche = un build vert + vérificateur, avant d'avancer. GHL est **porteur** (≈30 fichiers) — pas de big-bang.

**Goal:** Supprimer toute dépendance à GoHighLevel ; Convex devient l'unique source de vérité pour contacts/pipeline/leads. Le scanner ne doit plus trouver ni `ghl_contact_id` orphelin ni référence GHL.

**Constat clé (inventaire 2026-06-11) :** `ghl_contact_id` est la **clé de jointure** actuelle entre `pipeline_clients` et les contacts, lue par `convex/dashboard.ts` (KPIs clients), `convex/crm_contacts.ts` (remove cascade), `convex/contact_meta.ts`. Donc l'ordre est imposé : **migrer la clé de jointure AVANT** de toucher au reste.

## Inventaire (périmètre)
- **Lib :** `src/lib/ghl.ts` (501 l.), `src/lib/mock-data.ts` (146 l.), `src/lib/env.ts` (GHL_*).
- **Routes API GHL :** `api/{calendrier,calendar-event,calendar-event/[id],google-events/[id],pipeline-opps,pipelines,opp,opp/[id],leads,leads/capture,send-message,chat,contact/import,tasks,admin,health,integrations,webhooks/ghl}`.
- **Composants gardés branchés GHL :** `ContactsView`, `NewContactModal`, `ContactDetailPage` (fiche déjà migrée Convex), `CalendarView`, `NewAppointmentModal`, `ProspectionView`.
- **Agents lib :** `src/lib/agents/{executor,runner,tools}.ts`.
- **Convex :** `ghl_contact_id` dans `contact_meta.ts`, `crm_contacts.ts`, `dashboard.ts` ; index `by_ghl_contact` sur `pipeline_clients`.

## Phasage (chaque phase : build vert + `npm run integrity` avant la suivante)

### Phase 2.0 — Migration de la clé de jointure (fondation, Convex)
La plus délicate ; tout en dépend. Sur le backend Convex partagé (déploiement autorisé, à vérifier en live après).
1. Ajouter `contactId: v.optional(v.id("crm_contacts"))` à `pipeline_clients` (en plus de `ghl_contact_id`, transition douce — pas de suppression de colonne tout de suite).
2. Backfill : mutation one-shot qui remplit `contactId` à partir de `ghl_contact_id` quand il matche un `crm_contacts._id` (vu que les ids GHL et Convex coïncident dans les données de test — à vérifier ; sinon, match par email/téléphone).
3. Migrer les lecteurs vers `contactId` : `dashboard.ts` (jointure KPI clients), `crm_contacts.remove` (cascade), `contact_meta.ts`.
4. Ajouter la règle vérificateur : `pipeline_clients.contactId→crm_contacts` (typée) ; retirer/garder en surveillance `ghl_contact_id` le temps de la transition.
5. **Vérifier :** `scan-data` → 0 orphelin sur la nouvelle clé ; KPIs dashboard inchangés (comparer avant/après en live, lecture seule).

### Phase 2.1 — Contacts sans GHL
`ContactsView`, `NewContactModal`, `api/contact/import` : lire/écrire `crm_contacts` (Convex) au lieu de GHL. (La fiche `/contacts/[id]` est déjà faite — modèle de référence.) Build + vérif.

### Phase 2.2 — Pipeline & leads sans GHL
`api/pipeline-opps`, `api/pipelines`, `api/opp`, `api/opp/[id]`, `api/leads`, `api/leads/capture` (le funnel public — **arrêter la perte de leads**, écrire dans `crm_contacts`/`crm_leads`), `ProspectionView`. Build + vérif.

### Phase 2.3 — Calendrier (recoupe Vague 3)
`CalendarView`, `NewAppointmentModal`, `api/calendrier`, `api/calendar-event*`, `api/google-events*` : aujourd'hui mocks/GHL → bascule sur l'intégration Google Agenda (traitée en Vague 3). En 2.3 : retirer la dépendance GHL ; le branchement Google réel = Vague 3.

### Phase 2.4 — Agents & messaging
`src/lib/agents/{executor,runner,tools}.ts`, `api/{send-message,chat,tasks}` : retirer les appels GHL (ou les router vers Convex/Hermes selon l'usage réel). Vérifier qu'aucun module gardé ne casse.

### Phase 2.5 — Suppression finale + nettoyage
1. Supprimer `api/webhooks/ghl` (webhook entrant GHL — mort une fois GHL parti ; prouver 0 appelant).
2. Supprimer `src/lib/ghl.ts`, `src/lib/mock-data.ts`, les `GHL_*` de `src/lib/env.ts` et de la config.
3. Retirer `ghl_contact_id` + index `by_ghl_contact` de `pipeline_clients` (Convex) une fois plus aucun lecteur — **en dernier, prudemment**.
4. **Critère de sortie :** `grep -rE "ghl|GHL|leadconnector" src convex` = 0 (hors historique) ; `npm run integrity` vert sur le périmètre contacts/pipeline ; build OK ; vérif live post-déploiement.

## Notes
- **Déploiements** (autorisés) : Convex (Phase 2.0, 2.5) + Vercel prod. Vérifier en live après chaque déploiement (lecture seule + un smoke connecté).
- **Risque principal :** la clé de jointure (2.0). Faire la transition douce (2 colonnes en parallèle), ne supprimer `ghl_contact_id` qu'en 2.5.
- Tenir le vérificateur à jour (carte des invariants) à chaque phase.
