# Formulaire d'onboarding public → card « Formulaire d'onboarding » — Design

**Date :** 2026-06-05
**Statut :** design validé (scope resserré) — en attente plan d'implémentation

## Objectif (scope final, resserré)

Quand un client remplit le **formulaire d'onboarding public**, ses réponses doivent
**remplir automatiquement la card « Formulaire d'onboarding »** du module Onboarding
(vue par client). La card existe déjà et lit `onboarding.form` ; il manque uniquement
**l'alimentation** par le formulaire public.

## Hors scope (explicitement demandé)

- **Aucune modification du module Data.**
- **Aucune refonte du module Contacts** (pas de badge, pas de nouveau flux).
- Pas d'auto-sync OAuth/API de comptes externes.
- On ne touche pas au reste du Data OS.

## Ce qui existe déjà (ne pas reconstruire)

- Table `onboarding` avec `form` (par `contactId`) — magasin des valeurs.
- Mutation `onboarding.patch` (upsert merge par contactId).
- Card « Formulaire d'onboarding » = composant `OnboardingForm` dans
  `src/components/bibliotheque/OnboardingView.tsx` : affiche les `FORM_FIELDS`
  (browserUse, gemini, falAi, firecrawl, vercel, convex, gmailApi, microsoftApi,
  yahooApi, serverIp, serverPassword, codexSubscription) avec valeur + statut.
- Liste clients de l'onboarding = `pipeline_clients.list` (la card s'affiche pour le client sélectionné).

## Ce qu'on construit

### 1. Formulaire public (frontend, dans QOS)

- Route **publique** hors `AppShell` (sans sidebar, sans auth) : `app/(public)/onboarding/page.tsx`.
- Multi-étapes + progression (reprend l'esprit du mockup).
- **Étape 1 = identité** : entreprise, nom, **email** (obligatoire, validé) — clé de rattachement.
- **Étapes suivantes = les `FORM_FIELDS`** (mêmes `key` que la card, pour un mapping 1:1) : champs « clé/valeur » pour les clés API/accès, toggle pour `codexSubscription`. Tous optionnels (« je fournirai plus tard »).
- Soumission → `POST /api/onboarding/intake` avec `{ identity, form }`.

### 2. Intake (backend, dans QOS)

- `app/api/onboarding/intake/route.ts` (POST) :
  1. **Valide** : email présent + format valide, payload borné, ne garde que les `key` connues de `FORM_FIELDS` + identité (rejette le reste).
  2. **Rate-limit** basique (par IP / fenêtre) — endpoint public.
  3. Appelle une mutation Convex `onboarding.intakeSubmit({ identity, form })`.
- Réponse `{ ok: true }`, jamais de secret renvoyé.

### 3. Rattachement au bon client (mutation `onboarding.intakeSubmit`)

- **Match par email** sur `crm_contacts` (index `by_email`) → on récupère le `contactId`.
- **Merge dans `onboarding.form`** de ce `contactId` (réutilise la logique de `onboarding.patch` : on ne met que les champs fournis, pas d'écrasement des valeurs existantes).
- **Si aucun contact ne matche** (le client n'est pas encore dans le système) : créer un `crm_contacts` minimal (`firstName`/`companyName`/`email`/`phone` depuis l'identité, `statut:'lead'`, `source:'onboarding'`, `createdAt`) pour que la soumission ait un foyer et soit rattachable. *(Minimum nécessaire pour ne rien perdre — pas un « feature Contacts ».)*
- Résultat : la card « Formulaire d'onboarding » du client correspondant **affiche les valeurs** dès qu'on sélectionne ce client.

> **Note matching :** la card de l'onboarding s'affiche par `pipeline_clients`. Le chemin
> nominal = l'agence envoie le lien à un client déjà présent → match email → sa card se
> remplit. Le cas « email inconnu » crée un contact minimal ; son apparition comme *client*
> sélectionnable dépend du flux existant lead→client (inchangé). À confirmer au plan si on
> veut aussi le rendre immédiatement visible dans la liste onboarding.

## Sécurité

- Endpoint public : validation stricte, taille bornée, email obligatoire, rate-limit, on n'accepte que les `key` attendues.
- Les secrets ne transitent jamais en clair vers un client non authentifié (l'intake n'est qu'en écriture ; la lecture reste dans les vues internes existantes).
- Upsert en **merge** (pas d'écrasement destructif).

## Critère d'acceptation

Un client remplit le formulaire public (avec son email) → en sélectionnant ce client dans
le module Onboarding, la card « Formulaire d'onboarding » affiche les valeurs saisies, avec
leur `key` mappée 1:1.

## Structure réelle récupérée (mockup vividflow-onboarding, 100%)

Récupérée par walk Playwright du site déployé (HTML + CSS `.vf-*` + screenshots dans
`/tmp/vf_onb/steps`). 9 étapes :

1. **Intro** « On y va ? » — kick-off avec Thomas (CTO), durée 25-35 min. Pas d'input.
2. **ENTREPRISE** — nom, site web, secteur (Immobilier, BTP, Conseil/agence, Cabinet, Services aux entreprises, Commerce/retail, Santé/paramédical, Industrie, Tech/SaaS, Formation, Autre), localisation, type d'activité, taille équipe (1 / 2-5 / 6-15 / 16-50 / 50+), modèle éco (B2B / B2C / B2B+B2C / B2G / hybride), CA + période (mois/trimestre/année). **VOUS** : prénom, nom, **email** *(clé de rattachement)*, téléphone + indicatif pays, rôle, note libre.
3. **OBJECTIF** — problème prioritaire (texte + 6 cases), tâches chronophages (texte), attentes IA/semaine (texte + 6 cases).
4. **CONTEXTE** — départements concernés (Direction, Commercial, Marketing, Opérations, Support, Finance, RH, Autre) + précisions.
5. **OUTILS** — familles d'outils à ajouter (CRM/fichier clients, Cloud/documents, Meta Ads/BM, Autre) avec statut d'accès.
6. **MÉTHODE ACTUELLE** — parcours habituel (texte + 6 modèles de process), étapes à risque, deadlines.
7. **PRÉPA TECHNIQUE** — statut par compte (À faire / Fait / À faire pendant l'appel / Bloqué / Je ne sais pas) : Vercel, Hébergement/VPS, Clé API LLM (OpenAI/Anthropic), Convex, Google Workspace.
8. **KICK-OFF modules** — modules à cadrer (Bras droit dirigeant, Data OS/cockpit KPI) + précisions.
9. **KICK-OFF créneau** — réservation appel 30 min avec Thomas.

Écran final : « Onboarding terminé · X% prêt · Votre préparation est enregistrée. »

## Impact sur le modèle de données

`onboarding.form` est typé `v.any()` → **pas de migration de schéma nécessaire**, on y stocke
un objet structuré par section (`company`, `you`, `objectives`, `departments`, `tools`,
`method`, `accounts`, `modules`, `kickoff`). La **card** « Formulaire d'onboarding » sera
étendue pour afficher ces sections (au-delà des seuls `FORM_FIELDS` clés API actuels).

> Note : l'étape 7 (Vercel / VPS / Clé LLM / Convex / Google Workspace) **remplace** le set
> `FORM_FIELDS` actuel de la card comme source des « comptes/accès ». Mapping à définir au plan.

## Assets de récupération (dispo pour le portage fidèle)

- `/tmp/vf_onb/steps/step_0..8.{html,txt,png}` — HTML rendu + texte + screenshot par étape.
- `/tmp/vf_onb/style.css` — feuille de style exacte (classes `.vf-input`, `.vf-choice`, `.vf-btn-*`, `.vf-tag`, `.vf-select`, `.vf-textarea`, `.vf-enter`).
