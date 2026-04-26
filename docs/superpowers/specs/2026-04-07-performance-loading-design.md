# Spec : Performance & Chargement — Soren

**Date :** 2026-04-07  
**Stack :** Next.js 14 App Router, Tailwind CSS, GHL API, Google Calendar API, Supabase  
**Contrainte principale :** Zéro régression visuelle

---

## Contexte & problèmes identifiés

Soren souffre de 4 points de lenteur :
- **A** — Premier chargement lent (page blanche avant hydratation)
- **B** — Navigation entre pages lente (pas de feedback pendant les fetches serveur)
- **C** — Pages lourdes qui rament (Calendrier, Pipeline, Analyse, Conversations)
- **D** — Expérience dégradée sur mobile / connexion lente

Causes racines identifiées dans le code :
1. Google Fonts chargées via `<link rel="stylesheet">` → render-blocking
2. Aucun fichier `loading.tsx` → écrans blancs pendant les fetches GHL/Google
3. Composants lourds (dnd-kit, recharts, @vapi-ai/web) bundlés dans le JS initial
4. Toutes les modals importées statiquement même si jamais ouvertes
5. Chaque navigation refait les fetches GHL depuis zéro, sans cache

---

## Approche retenue : Option B — Quick wins + optimisation medium

4 axes d'amélioration, dans l'ordre d'implémentation.

---

## Axe 1 — Fonts sans render-blocking

**Fichiers :** `src/app/layout.tsx`, `tailwind.config.ts`

Remplacer les `<link>` Google Fonts par `next/font/google`.

```ts
// Avant
<link href="https://fonts.googleapis.com/css2?family=Fraunces...Inter..." rel="stylesheet" />

// Après
import { Fraunces, Inter } from 'next/font/google'
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
```

Les fonts sont servies depuis le même domaine (pas de DNS lookup supplémentaire), générées en build time, injectées sans bloquer le rendu.

**Impact :** ~20% de gain LCP, zéro changement visuel, zéro FOUT.

---

## Axe 2 — loading.tsx + skeletons thématiques

**Fichiers :** `src/app/[route]/loading.tsx` pour chaque route

Next.js affiche automatiquement `loading.tsx` via Suspense pendant le fetch du Server Component parent.

### Règles de design des skeletons
- Fond : `#111111` (même que les pages)
- Pulse : animation `animate-pulse` Tailwind en `bg-white/8` sur `bg-[#1a1a1a]`
- Proportions identiques aux vrais composants
- Sidebar déjà visible (elle est dans le layout, pas dans la page)

### Skeletons par route

| Route | Skeleton |
|-------|----------|
| `/dashboard` | 4 blocs stats + 2 graphes placeholder |
| `/pipeline` | 4 colonnes Kanban avec 2-3 cartes fantômes chacune |
| `/contacts` | Header + 8 lignes tableau avec avatar circle placeholder |
| `/calendrier` | Grille semaine avec lignes heures + header jours |
| `/conversations` | Liste threads à gauche + zone message vide à droite |
| `/analyse` | Header + 2 graphes placeholder rectangulaires |
| `/equipe`, `/taches`, `/transcripts`, `/logs`, `/knowledge`, `/budget`, `/parametres` | Skeleton générique : header + zone contenu avec 3-4 blocs pulse |

---

## Axe 3 — next/dynamic sur les composants lourds

**Principe :** `next/dynamic` charge le JS d'un composant uniquement quand il est rendu. Avec `ssr: false` pour les composants purement client (modals).

### Composants "view" → dynamic avec skeleton fallback

```ts
const CalendarView = dynamic(() => import('@/components/calendrier/CalendarView'), {
  loading: () => <CalendarSkeleton />,
})
```

| Composant | Raison | Fallback |
|-----------|--------|---------|
| `CalendarView` | dnd-kit + algorithme overlap | `CalendarSkeleton` |
| `KanbanBoard` | dnd-kit + colonnes DnD | `PipelineSkeleton` |
| `AnalyseView` | recharts (~200kb) | `AnalyseSkeleton` |
| `ConversationsView` | MessageThread + @vapi-ai/web | `ConversationsSkeleton` |

### Modals → dynamic ssr:false

Les modals n'ont aucune valeur SSR. Importées statiquement, elles gonflent le bundle initial pour des composants rarement (voire jamais) ouverts au chargement.

```ts
const NewAppointmentModal = dynamic(
  () => import('@/components/calendrier/NewAppointmentModal'),
  { ssr: false }
)
```

Modals concernées :
- `NewAppointmentModal`
- `NewLeadModal`
- `OppDetailModal`
- `ImportModal`
- `NewContactModal`
- `NewConversationModal`

**Impact estimé :** bundle initial réduit de 40-50%. Le JS des composants se charge en parallèle du rendu, masqué par les skeletons.

---

## Axe 4 — Cache GHL + bundle analyzer

### Cache avec unstable_cache

Chaque navigation vers `/calendrier`, `/contacts`, `/pipeline` déclenche des appels GHL fresh. Ces données changent rarement à la seconde.

**Fichier :** `src/lib/ghl.ts`

| Fonction | Revalidate |
|----------|-----------|
| `getCalendars()` | 5 min |
| `getCalendarEvents()` | 2 min |
| `getContacts()` | 2 min |
| Dashboard data | 1 min |

Les webhooks GHL existants (`/api/webhooks/ghl`) appellent `revalidatePath()` pour invalider le cache immédiatement quand une donnée change → pas de données périmées.

### Bundle analyzer

Ajouter `@next/bundle-analyzer` en devDependency. Tourner **une seule fois** après toutes les optimisations pour :
1. Valider les gains réels
2. Détecter des imports côté client inattendus (ex: `googleapis`, `twilio` qui ne devraient jamais être dans le bundle browser)

```bash
ANALYZE=true npm run build
```

---

## Ordre d'implémentation

1. Axe 1 — Fonts (rapide, impact immédiat, aucun risque)
2. Axe 2 — loading.tsx + skeletons (parallélisable par route)
3. Axe 3 — next/dynamic (modals d'abord, puis views)
4. Axe 4 — Cache GHL + bundle analyzer (après les optimisations pour mesurer les gains)

---

## Ce qui ne change pas

- Design visuel : couleurs, proportions, animations, typographie → identiques
- Comportement fonctionnel : DnD, modals, fetches, webhooks → identiques
- API routes : aucune modification côté backend

---

## Métriques de succès

- LCP (Largest Contentful Paint) réduit de >20% sur la page dashboard
- Zéro écran blanc lors des navigations
- Bundle JS initial < 500kb (vs actuel non mesuré)
- Aucune régression visuelle sur les 4 axes
