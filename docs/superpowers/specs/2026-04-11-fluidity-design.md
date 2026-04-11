# Fluidity SaaS — Design Spec
**Date:** 2026-04-11  
**Statut:** Validé

## Contexte
Le SaaS Soren (app.qorpoia.com) souffre de 3 types de problèmes de fluidité :
- Temps d'attente trop longs sur Dashboard, Devis, Conversations
- Pas assez de feedback visuel sur les actions (save, delete, send)
- Transitions de pages brutales entre les modules

## Modules ciblés
- Dashboard (métriques/graphiques lents)
- Devis (liste + PDF lent)
- Conversations (feed + réponses IA lentes)
- Navigation générale (toutes les pages)

## Solution choisie — Approche combinée

### 1. Client-side loading (Dashboard, Devis, Conversations)
**Principe :** Convertir les Server Components lents en pages client-side.
La page s'affiche instantanément avec un skeleton loader, les données arrivent en fond via fetch sur une API route.

**Pattern (déjà validé sur Calendrier) :**
```
page.tsx (client) → affiche skeleton → useEffect fetch /api/[module] → setData → rend le composant
/api/[module]/route.ts → getAuthContext + appels GHL/Supabase → JSON response
```

**Modules à convertir :**
- `src/app/dashboard/page.tsx` → `/api/dashboard` (déjà existe, adapter)
- `src/app/devis/page.tsx` → `/api/devis` (déjà existe)
- `src/app/conversations/page.tsx` → `/api/feed` (déjà existe)

### 2. Transitions de pages — Fade doux
**Principe :** Ajouter un fade-in CSS de 150ms sur le contenu principal à chaque navigation.

**Implémentation :**
- Ajouter une classe CSS `page-fade-in` avec `@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`
- L'appliquer sur le wrapper de contenu dans le layout principal (`src/app/layout.tsx` ou le layout dashboard)
- Durée : 150ms, easing : ease-out
- Pas de librairie externe nécessaire (CSS pur)

### 3. Feedback actions — Spinner inline + Toast
**Principe :** Chaque action utilisateur doit avoir 2 niveaux de feedback :
1. **Spinner inline** sur le bouton pendant l'action (remplace le texte par un spinner)
2. **Toast** en bas à droite à la fin (succès vert / erreur rouge)

**Toast system :** Déjà en place (`src/hooks/useToast.ts` + `src/components/shared/Toaster.tsx`)

**Modules à couvrir :**
- Devis : création, envoi, suppression
- Conversations : envoi de message, actions IA
- Dashboard : refresh des métriques
- Navigation sidebar : aucun feedback nécessaire (instantané)

## Architecture

### Fichiers à créer/modifier
| Fichier | Action |
|---|---|
| `src/app/dashboard/page.tsx` | Convertir en client-side |
| `src/app/devis/page.tsx` | Convertir en client-side |
| `src/app/conversations/page.tsx` | Convertir en client-side |
| `src/app/layout.tsx` | Ajouter fade-in CSS |
| `src/components/devis/DevisView.tsx` | Spinner + toast sur actions |
| `src/components/conversations/MessageThread.tsx` | Spinner + toast sur envoi |

### Fichiers existants à réutiliser
- `src/hooks/useToast.ts` — hook toast (existant)
- `src/components/shared/Toaster.tsx` — composant toast (existant)
- `src/app/calendrier/page.tsx` — modèle de référence pour client-side loading
- `src/app/api/calendrier/route.ts` — modèle de référence pour API route

## Critères de succès
- Dashboard, Devis, Conversations affichent un skeleton en < 100ms
- Navigation entre pages a un fade de 150ms visible mais non intrusif
- Toute action critique (save/delete/send) montre un spinner + toast
- 0 régression sur les fonctionnalités existantes
