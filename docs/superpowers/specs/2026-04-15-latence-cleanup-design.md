# Latence Cleanup — Design Spec

**Date:** 2026-04-15  
**Goal:** Supprimer les 10 sources de latence inutiles identifiées dans le SaaS (polling, force-dynamic, dead code, debounce manquant, bundle lourd).

---

## Groupe 1 — Server / ISR

### Issue 2 — force-dynamic overuse (6 pages)
Pages concernées : `analyse`, `pipeline`, `contacts`, `workflows`, `chatbot`, `contacts/[id]`  
Fix : remplacer `export const dynamic = 'force-dynamic'` par `export const revalidate = 300`  
Justification : ces données (GHL opportunités, pipelines, contacts, soul/memory) ne changent pas à la seconde. ISR 5 min est suffisant.

### Issue 3 — Sequential calendar fetches
Fichier : `src/lib/dashboard.ts`  
Fix : les events calendrier sont fetchés en 2e vague (après `getCalendars()`). On peut paralléliser en gardant la structure `Promise.allSettled` existante et en loggant les IDs dès qu'on les a.  
Note : `getCalendars()` utilise `unstable_cache` donc elle est rapide — le vrai gain est de ne pas bloquer les events si les calendars sont déjà en cache.

### Issue 4 — getPipelines() inutile dans conversations/list
Fichier : `src/app/api/conversations/list/route.ts`  
Fix : retirer l'appel `getPipelines()` du `Promise.allSettled`. Les pipelines ne sont pas utilisés dans la réponse de cette route.

### Issue 9 — Duplicate soul/memory Supabase queries
Fichiers : `workflows/page.tsx`, `chatbot/page.tsx`  
Fix : extraire dans `src/lib/agent-config.ts` une fonction `getAgentConfig(agentId)` qui fait les deux requêtes Supabase et retourne `{ soul, memory }`.

---

## Groupe 2 — Bundle

### Issue 5 — Recharts chargé synchroniquement
Fichiers : `DashboardClient.tsx`, `AnalyseView.tsx`  
Fix : wrapper les composants chart dans `next/dynamic({ ssr: false })`. Réduit le bundle initial (~60KB gzippé).

---

## Groupe 3 — Client / UX

### Issue 1 — BudgetView setInterval → SWR
Fichier : `src/components/budget/BudgetView.tsx`  
Fix : remplacer `setInterval` + `useEffect` par `useSWR` avec `dedupingInterval: 300_000` (5 min). SWR gère le cleanup automatiquement.

### Issue 6 — ContactsView filtre sans debounce
Fichier : `src/components/contacts/ContactsView.tsx`  
Fix : debounce 200ms sur `query` avant le `useMemo` de filtrage, via un état `debouncedQuery` avec `useEffect + setTimeout`.

### Issue 7 — Dead code useLiveFeed + LIVE_EVENTS
Fichier : `src/components/dashboard/DashboardClient.tsx`  
Fix : supprimer `useLiveFeed`, `LIVE_EVENTS`, `LiveEvent` type, et tout code associé.

### Issue 8 — DevisView search sans debounce
Fichier : `src/components/devis/DevisView.tsx`  
Fix : debounce 300ms sur `search` avant le `fetch('/api/contact')` dans le `useEffect`.

### Issue 10 — Background message refetch doublons
Fichier : `src/components/conversations/ConversationsView.tsx`  
Fix : le `Set` `prefetching` existe déjà — l'utiliser aussi pour les background refreshes afin d'éviter les doubles fetches quand on switche vite.

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/app/analyse/page.tsx` | force-dynamic → revalidate=300 |
| `src/app/pipeline/page.tsx` | force-dynamic → revalidate=300 |
| `src/app/contacts/page.tsx` | force-dynamic → revalidate=300 |
| `src/app/contacts/[id]/page.tsx` | force-dynamic → revalidate=300 |
| `src/app/workflows/page.tsx` | force-dynamic → revalidate=300 + agent-config |
| `src/app/chatbot/page.tsx` | force-dynamic → revalidate=300 + agent-config |
| `src/lib/agent-config.ts` | Nouveau — getAgentConfig() |
| `src/lib/dashboard.ts` | Paralléliser calendar events |
| `src/app/api/conversations/list/route.ts` | Retirer getPipelines() |
| `src/components/budget/BudgetView.tsx` | setInterval → SWR |
| `src/components/dashboard/DashboardClient.tsx` | Lazy Recharts + suppr dead code |
| `src/components/analyse/AnalyseView.tsx` | Lazy Recharts |
| `src/components/contacts/ContactsView.tsx` | Debounce search |
| `src/components/devis/DevisView.tsx` | Debounce search |
| `src/components/conversations/ConversationsView.tsx` | Dédup background fetch |

---

## Hors scope
- Virtualisation de la table contacts (>1000 lignes)
- Service Worker / cache HTTP
- Supabase realtime subscriptions
