# Zero-Latency Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer la latence perçue lors de la navigation entre modules en pré-chargeant les données critiques au boot et en migrant les pages `useEffect` vers SWR.

**Architecture:** Un composant `DataPrefetcher` monté dans le layout racine déclenche `preload()` SWR pour les endpoints critiques dès le boot de l'app. Les pages `calendrier` et `devis` passent de `useEffect+setState` à `useSWR` avec `keepPreviousData`, de sorte qu'au retour sur ces pages les données sont déjà en cache. La sidebar ajoute un `onMouseEnter` pour pré-remplir le cache ~200ms avant le clic.

**Tech Stack:** Next.js 14 App Router, SWR 2.x (`preload`, `useSWR`, `useSWRConfig`), TypeScript

---

## Fichiers

| Action | Chemin |
|---|---|
| Créer | `src/components/DataPrefetcher.tsx` |
| Modifier | `src/app/layout.tsx` |
| Modifier | `src/components/Sidebar.tsx` |
| Modifier | `src/app/calendrier/page.tsx` |
| Modifier | `src/app/devis/page.tsx` |

---

### Task 1: Créer le composant DataPrefetcher

**Files:**
- Create: `src/components/DataPrefetcher.tsx`

`preload` de SWR 2.x pré-remplit le cache global sans déclencher de re-render. Il est idempotent — si la donnée est déjà fraîche, rien ne se passe.

- [ ] **Step 1: Créer le fichier**

```tsx
// src/components/DataPrefetcher.tsx
'use client'

import { useEffect } from 'react'
import { preload } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CRITICAL_ENDPOINTS = [
  '/api/dashboard',
  '/api/conversations/list',
  '/api/calendrier',
  '/api/devis/list',
]

export default function DataPrefetcher() {
  useEffect(() => {
    for (const url of CRITICAL_ENDPOINTS) {
      preload(url, fetcher)
    }
  }, [])

  return null
}
```

- [ ] **Step 2: Vérifier que SWR est bien installé**

```bash
rtk grep "\"swr\"" package.json
```

Attendu : une ligne avec la version de swr (ex: `"swr": "^2.x.x"`). Si absent : `pnpm add swr`.

---

### Task 2: Monter DataPrefetcher dans le layout racine

**Files:**
- Modify: `src/app/layout.tsx`

Le layout racine est un Server Component — on importe `DataPrefetcher` (client) et on le monte dans `<body>`. Il s'exécute une seule fois au chargement de l'app.

- [ ] **Step 1: Modifier layout.tsx**

Remplacer le contenu de `src/app/layout.tsx` par :

```tsx
import type { Metadata } from 'next'
import { Fraunces, Inter, Montserrat, Outfit, Plus_Jakarta_Sans } from 'next/font/google'
import DataPrefetcher from '@/components/DataPrefetcher'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Soren - Infrastructure d'Acquisition Organisationnelle",
  description: 'Plateforme agentique pour la gestion des leads et workflows BTP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable} ${montserrat.variable} ${outfit.variable} ${jakarta.variable}`}>
      <body>
        <DataPrefetcher />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Attendu : `TypeScript compilation completed` sans erreurs.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/DataPrefetcher.tsx src/app/layout.tsx
rtk git commit -m "perf: prefetch critical API endpoints on app boot"
```

---

### Task 3: Hover prefetch dans la Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

Au survol d'un lien sidebar, on déclenche `mutate` si le cache SWR est vide pour cet endpoint. `useSWRConfig` donne accès au `mutate` global et au `cache`.

- [ ] **Step 1: Définir la map href → endpoint dans Sidebar.tsx**

Ajouter après les imports existants, avant `SectionLabel` :

```tsx
import { useSWRConfig } from 'swr'

const PREFETCH_MAP: Record<string, string> = {
  '/dashboard':     '/api/dashboard',
  '/conversations': '/api/conversations/list',
  '/calendrier':    '/api/calendrier',
  '/devis':         '/api/devis/list',
}

const prefetchFetcher = (url: string) => fetch(url).then(r => r.json())
```

- [ ] **Step 2: Ajouter le hook et le handler dans NavLink**

Remplacer la fonction `NavLink` entière par :

```tsx
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, icon: Icon, label, also = [] } = item
  const { mutate, cache } = useSWRConfig()
  const active =
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href)) ||
    also.some(a => pathname.startsWith(a))

  function handleMouseEnter() {
    const endpoint = PREFETCH_MAP[href]
    if (!endpoint) return
    // Ne prefetch que si le cache est vide pour cet endpoint
    if (cache.get(endpoint)?.data) return
    void mutate(endpoint, prefetchFetcher(endpoint))
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      className={`
        flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
        ${active
          ? 'bg-[#E2FF8D] text-[#111111] shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-white/8'
        }
      `}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className={`text-[12px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </Link>
  )
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Attendu : `TypeScript compilation completed` sans erreurs.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/Sidebar.tsx
rtk git commit -m "perf: hover prefetch API data on sidebar links"
```

---

### Task 4: Migrer calendrier de useEffect vers SWR

**Files:**
- Modify: `src/app/calendrier/page.tsx`

`useSWR` avec `keepPreviousData: true` garde les données affichées pendant une revalidation — pas de flash de loading au retour sur la page. Le cache préchargé par DataPrefetcher sera utilisé automatiquement.

- [ ] **Step 1: Réécrire calendrier/page.tsx**

```tsx
'use client'

import useSWR from 'swr'
import CalendarView from '@/components/calendrier/CalendarView'
import CalendrierLoading from './loading'
import type { Appointment } from '@/components/calendrier/types'
import type { GHLCalendar } from '@/lib/ghl'

type CalData = {
  appointments: Appointment[]
  calendars: GHLCalendar[]
  googleConfigured: boolean
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CalendrierPage() {
  const { data, isLoading } = useSWR<CalData>('/api/calendrier', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  if (isLoading && !data) return <CalendrierLoading />

  return (
    <CalendarView
      appointments={data?.appointments ?? []}
      calendars={data?.calendars ?? []}
      googleConfigured={data?.googleConfigured ?? false}
    />
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Attendu : `TypeScript compilation completed` sans erreurs.

- [ ] **Step 3: Commit**

```bash
rtk git add src/app/calendrier/page.tsx
rtk git commit -m "perf: migrate calendrier from useEffect to SWR"
```

---

### Task 5: Migrer devis de useEffect vers SWR

**Files:**
- Modify: `src/app/devis/page.tsx`

- [ ] **Step 1: Réécrire devis/page.tsx**

```tsx
'use client'

import useSWR from 'swr'
import DevisView from '@/components/devis/DevisView'
import DevisLoading from './loading'

type DevisData = {
  devisList: Record<string, unknown>[]
  brandColor: string
}

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

export default function DevisPage() {
  const { data, isLoading, error } = useSWR<DevisData>('/api/devis/list', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  })

  if (error) return (
    <div className="h-full flex items-center justify-center text-sm text-[#6B7280] page-fade-in">
      Impossible de charger les devis. Actualise la page.
    </div>
  )

  if (isLoading && !data) return <DevisLoading />

  return (
    <div className="h-full page-fade-in">
      <DevisView devisList={(data?.devisList ?? []) as any} brandColor={data?.brandColor ?? ''} />
    </div>
  )
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Attendu : `TypeScript compilation completed` sans erreurs.

- [ ] **Step 3: Commit final**

```bash
rtk git add src/app/devis/page.tsx
rtk git commit -m "perf: migrate devis from useEffect to SWR"
```

---

## Validation manuelle

Après toutes les tâches :

1. Lancer `pnpm dev`
2. Ouvrir le dashboard — ouvrir DevTools Network
3. Observer : au boot, 4 requêtes partent en arrière-plan (`/api/dashboard`, `/api/conversations/list`, `/api/calendrier`, `/api/devis/list`)
4. Naviguer vers Calendrier → les données s'affichent **immédiatement** (pas de skeleton)
5. Naviguer vers Devis → idem
6. Revenir sur Dashboard → idem
7. Survoler "Calendrier" dans la sidebar sans cliquer → vérifier dans Network qu'une requête `/api/calendrier` part (si cache expiré)
