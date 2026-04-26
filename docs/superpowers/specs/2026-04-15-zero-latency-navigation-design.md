# Zero-Latency Navigation — Design Spec

**Date:** 2026-04-15  
**Goal:** Éliminer la latence perçue lors de la navigation entre les modules du SaaS QOS.

---

## Problème

Quand l'utilisateur clique sur un lien de la sidebar, certains modules affichent un délai notable avant que les données apparaissent. Cause : les données sont récupérées *après* la navigation, pas avant.

**Pages concernées :**
- `calendrier` — `useEffect + fetch`, re-fetch à chaque navigation
- `devis` — `useEffect + fetch`, re-fetch à chaque navigation
- `contacts` — server component `force-dynamic`, re-fetch GHL à chaque hit
- `pipeline` — server component `force-dynamic`, re-fetch GHL à chaque hit

**Pages déjà rapides :** `dashboard`, `conversations` (SWR avec `keepPreviousData`)

---

## Solution : Approche A + C

### A — Prefetch global au démarrage

Un composant client `<DataPrefetcher />` monté dans le layout racine. Au boot de l'app, il pré-remplit le cache SWR pour les endpoints critiques via `mutate()` :

```
/api/dashboard
/api/conversations/list
/api/contacts/list
/api/calendrier
/api/devis
```

SWR déduplique automatiquement — si les données sont déjà fraîches, pas de re-fetch.

### C — Migration useEffect → SWR

`calendrier/page.tsx` et `devis/page.tsx` passent de `useEffect + setState` à `useSWR` avec :
- `keepPreviousData: true` — pas de flash de skeleton au retour sur la page
- `dedupingInterval: 30_000` — cohérent avec dashboard/conversations
- `revalidateOnFocus: false`

### Bonus — Hover prefetch sidebar

Sur chaque `<Link>` de la sidebar : `onMouseEnter` déclenche `mutate(endpoint)` si cache vide. ~200ms d'avance supplémentaire.

---

## Architecture

```
layout.tsx
  └── <DataPrefetcher />   ← nouveau, client component, monté une fois
        ├── mutate('/api/dashboard')
        ├── mutate('/api/conversations/list')
        ├── mutate('/api/contacts/list')
        ├── mutate('/api/calendrier')
        └── mutate('/api/devis')

Sidebar.tsx
  └── <Link onMouseEnter={() => mutate(endpoint)} />  ← hover prefetch

calendrier/page.tsx   useEffect → useSWR
devis/page.tsx        useEffect → useSWR
```

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/app/layout.tsx` | Importer et monter `<DataPrefetcher />` |
| `src/components/DataPrefetcher.tsx` | Nouveau — prefetch SWR au boot |
| `src/components/Sidebar.tsx` | Ajouter `onMouseEnter` sur les liens |
| `src/app/calendrier/page.tsx` | Migrer `useEffect` → `useSWR` |
| `src/app/devis/page.tsx` | Migrer `useEffect` → `useSWR` |

---

## Hors scope

- Contacts et pipeline restent en server-component (fraîcheur GHL requise)
- Pas de Service Worker / cache HTTP
- Pas de streaming SSR supplémentaire
