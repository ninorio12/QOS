# Performance & Chargement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les écrans blancs, réduire le bundle initial et accélérer la navigation dans Soren sans aucune régression visuelle.

**Architecture:** 4 axes indépendants : (1) fonts via next/font, (2) loading.tsx skeletons par route, (3) next/dynamic sur les modals lourdes, (4) cache GHL avec unstable_cache. Chaque axe est auto-suffisant et committé séparément.

**Tech Stack:** Next.js 14 App Router, next/font/google, next/dynamic, next/cache (unstable_cache, revalidatePath), Tailwind CSS animate-pulse, @next/bundle-analyzer

---

## Note : pourquoi pas de dynamic() sur les views elles-mêmes

La spec mentionnait `CalendarView`, `KanbanBoard`, `AnalyseView` en `next/dynamic` depuis les pages. Ce n'est pas implémenté ici car :
- En Next.js 14 App Router, chaque route est **déjà un chunk JS séparé** — `CalendarView` n'est jamais dans le bundle de `/pipeline`
- Ajouter `dynamic()` au niveau page crée un **double-skeleton** (loading.tsx puis dynamic fallback) sans gain de bundle
- Le vrai gain est dans les **modals** (Tasks 9-10) : importées statiquement dans leurs views mais jamais utilisées au chargement

## File Map

**Créés :**
- `src/app/dashboard/loading.tsx`
- `src/app/pipeline/loading.tsx`
- `src/app/contacts/loading.tsx`
- `src/app/calendrier/loading.tsx`
- `src/app/conversations/loading.tsx`
- `src/app/analyse/loading.tsx`
- `src/app/equipe/loading.tsx`
- `src/app/taches/loading.tsx`
- `src/app/transcripts/loading.tsx`
- `src/app/logs/loading.tsx`
- `src/app/knowledge/loading.tsx`
- `src/app/budget/loading.tsx`
- `src/app/parametres/loading.tsx`

**Modifiés :**
- `src/app/layout.tsx` — next/font à la place des `<link>` Google Fonts
- `tailwind.config.ts` — fontFamily avec variables CSS
- `src/lib/ghl.ts` — unstable_cache sur les fonctions de fetch
- `src/components/calendrier/CalendarView.tsx` — NewAppointmentModal en dynamic
- `src/components/pipeline/KanbanBoard.tsx` — OppDetailModal + NewContactModal en dynamic
- `src/components/contacts/ContactsView.tsx` — NewContactModal + ImportModal en dynamic
- `next.config.mjs` — bundle analyzer

---

## Task 1 : next/font — stop render-blocking Google Fonts

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1 : Modifier layout.tsx**

Remplacer le contenu de `src/app/layout.tsx` par :

```tsx
import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  axes: ['opsz'],
  variable: '--font-fraunces',
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
    <html lang="fr" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2 : Mettre à jour tailwind.config.ts**

Modifier la section `fontFamily` pour utiliser les variables CSS :

```ts
fontFamily: {
  sans:     ['var(--font-inter)', 'system-ui', 'sans-serif'],
  fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
},
```

- [ ] **Step 3 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3001 — les polices doivent s'afficher identiquement. Aucun FOUT (flash de texte sans style) visible.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/app/layout.tsx tailwind.config.ts && rtk git commit -m "perf: fonts via next/font — stop render-blocking"
```

---

## Task 2 : loading.tsx — skeleton Dashboard

**Files:**
- Create: `src/app/dashboard/loading.tsx`

La page dashboard est dans `src/app/dashboard/page.tsx`. Elle affiche : 4 blocs stats en haut, un graphe hebdomadaire, un funnel de stages, une liste de deals récents.

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="h-full flex flex-col p-5 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="h-8 w-40 bg-[#D9DDD6] rounded-xl" />
        <div className="h-8 w-28 bg-[#D9DDD6] rounded-xl" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB]">
            <div className="h-3 w-20 bg-[#E5E7EB] rounded mb-3" />
            <div className="h-8 w-16 bg-[#D9DDD6] rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main content row */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Weekly chart */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB]">
          <div className="h-3 w-32 bg-[#E5E7EB] rounded mb-4" />
          <div className="h-full flex items-end gap-2 pb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#E5E7EB] rounded-t-lg"
                  style={{ height: `${40 + Math.random() * 40}%` }}
                />
                <div className="h-2 w-6 bg-[#E5E7EB] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="w-56 bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB] flex flex-col gap-2">
          <div className="h-3 w-24 bg-[#E5E7EB] rounded mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 bg-[#E5E7EB] rounded" style={{ width: `${80 - i * 15}%` }} />
              <div className="h-2 w-6 bg-[#D9DDD6] rounded ml-auto" />
            </div>
          ))}
        </div>

        {/* Recent opps */}
        <div className="w-72 bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB] flex flex-col gap-3">
          <div className="h-3 w-28 bg-[#E5E7EB] rounded mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex-shrink-0" />
              <div className="flex-1">
                <div className="h-2.5 w-24 bg-[#D9DDD6] rounded mb-1.5" />
                <div className="h-2 w-16 bg-[#E5E7EB] rounded" />
              </div>
              <div className="h-2.5 w-12 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier**

```bash
npm run dev
```

Naviguer vers http://localhost:3001/dashboard en throttlant la connexion (DevTools → Network → Slow 3G). Le skeleton doit apparaître pendant le fetch.

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/dashboard/loading.tsx && rtk git commit -m "perf: skeleton loading dashboard"
```

---

## Task 3 : loading.tsx — skeleton Pipeline

**Files:**
- Create: `src/app/pipeline/loading.tsx`

La page pipeline affiche un KanbanBoard avec 4+ colonnes et des cartes par colonne.

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/pipeline/loading.tsx
export default function PipelineLoading() {
  const columns = ['Nouveau Lead', '1er Contact', 'En Conv.', 'Qualifié']

  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-32 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-[#D9DDD6] rounded-xl" />
          <div className="h-8 w-8 bg-[#D9DDD6] rounded-xl" />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 flex gap-3 px-6 pb-6 overflow-hidden">
        {columns.map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex-1 min-w-[220px] flex flex-col bg-white/50 rounded-2xl p-3 border border-[#E5E7EB]"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-24 bg-[#D9DDD6] rounded" />
              <div className="h-5 w-5 bg-[#E5E7EB] rounded-full" />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 - (colIdx % 2) }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-white rounded-xl p-3 border border-[#E5E7EB] shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#E5E7EB]" />
                    <div className="flex-1">
                      <div className="h-2.5 w-20 bg-[#D9DDD6] rounded mb-1" />
                      <div className="h-2 w-14 bg-[#E5E7EB] rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-16 bg-[#E5E7EB] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
npm run dev
```

Naviguer vers /pipeline. Skeleton visible au chargement.

```bash
rtk git add src/app/pipeline/loading.tsx && rtk git commit -m "perf: skeleton loading pipeline"
```

---

## Task 4 : loading.tsx — skeleton Contacts

**Files:**
- Create: `src/app/contacts/loading.tsx`

La page contacts affiche une barre de recherche + un tableau avec avatar, nom, téléphone, email, pipeline, date.

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/contacts/loading.tsx
export default function ContactsLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-28 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-9 w-56 bg-[#E5E7EB] rounded-xl" />
          <div className="h-9 w-24 bg-[#D9DDD6] rounded-xl" />
          <div className="h-9 w-9 bg-[#E5E7EB] rounded-xl" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 mx-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center px-4 py-3 border-b border-[#E5E7EB] gap-4">
          {[120, 100, 80, 100, 80, 70].map((w, i) => (
            <div key={i} className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: w }} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3 border-b border-[#F3F4F6] gap-4"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2.5" style={{ width: 120 }}>
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex-shrink-0" />
              <div className="h-2.5 flex-1 bg-[#D9DDD6] rounded" />
            </div>
            {/* Phone */}
            <div className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: 100 }} />
            {/* Email */}
            <div className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: 80 }} />
            {/* Pipeline */}
            <div className="h-5 w-24 bg-[#E5E7EB] rounded-full" />
            {/* Date */}
            <div className="h-2.5 bg-[#E5E7EB] rounded ml-auto" style={{ width: 70 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
rtk git add src/app/contacts/loading.tsx && rtk git commit -m "perf: skeleton loading contacts"
```

---

## Task 5 : loading.tsx — skeleton Calendrier

**Files:**
- Create: `src/app/calendrier/loading.tsx`

CalendarView affiche : sidebar droite (mini-calendrier + boutons) et une grille semaine (header jours + lignes heures 7h–21h).

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/calendrier/loading.tsx
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h
const DAYS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function CalendrierLoading() {
  return (
    <div className="h-full flex overflow-hidden animate-pulse">
      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#E5E7EB] rounded-lg" />
            <div className="h-5 w-36 bg-[#D9DDD6] rounded" />
            <div className="h-8 w-8 bg-[#E5E7EB] rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-[#E5E7EB] rounded-lg" />
            <div className="h-8 w-20 bg-[#E5E7EB] rounded-lg" />
            <div className="h-8 w-8 bg-[#E5E7EB] rounded-lg" />
          </div>
        </div>

        {/* Day headers */}
        <div className="flex border-b border-[#E5E7EB] bg-white flex-shrink-0">
          <div className="w-14 flex-shrink-0" />
          {DAYS.map(d => (
            <div key={d} className="flex-1 flex flex-col items-center py-2 gap-1">
              <div className="h-2.5 w-6 bg-[#E5E7EB] rounded" />
              <div className="h-7 w-7 bg-[#D9DDD6] rounded-full" />
            </div>
          ))}
        </div>

        {/* Hour grid */}
        <div className="flex-1 overflow-hidden">
          {HOURS.map(h => (
            <div
              key={h}
              className="flex border-b border-[#F3F4F6]"
              style={{ height: 80 }}
            >
              <div className="w-14 flex-shrink-0 flex items-start pt-1 px-2">
                <div className="h-2 w-8 bg-[#E5E7EB] rounded" />
              </div>
              <div className="flex-1 flex gap-px">
                {DAYS.map((d, i) => (
                  <div key={i} className="flex-1 border-l border-[#F3F4F6]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-[#E5E7EB] bg-white p-4 flex flex-col gap-4">
        {/* New RDV button */}
        <div className="h-10 w-full bg-[#D9DDD6] rounded-xl" />
        {/* Mini calendar */}
        <div>
          <div className="h-3 w-24 bg-[#E5E7EB] rounded mb-3" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-6 w-6 bg-[#E5E7EB] rounded-full mx-auto" />
            ))}
          </div>
        </div>
        {/* Calendar list */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#D9DDD6]" />
              <div className="h-2.5 flex-1 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
rtk git add src/app/calendrier/loading.tsx && rtk git commit -m "perf: skeleton loading calendrier"
```

---

## Task 6 : loading.tsx — skeleton Conversations

**Files:**
- Create: `src/app/conversations/loading.tsx`

ConversationsView est un split pane : liste de conversations à gauche, thread de messages à droite.

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/conversations/loading.tsx
export default function ConversationsLoading() {
  return (
    <div className="h-full flex overflow-hidden animate-pulse">
      {/* Left nav (InboxNav) */}
      <div className="w-40 flex-shrink-0 border-r border-[#E5E7EB] bg-white p-3 flex flex-col gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-[#E5E7EB] rounded-xl" />
        ))}
      </div>

      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
        <div className="p-3 border-b border-[#E5E7EB]">
          <div className="h-8 w-full bg-[#E5E7EB] rounded-xl" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border-b border-[#F3F4F6]">
              <div className="w-9 h-9 rounded-full bg-[#D9DDD6] flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <div className="h-2.5 w-24 bg-[#D9DDD6] rounded" />
                  <div className="h-2 w-10 bg-[#E5E7EB] rounded" />
                </div>
                <div className="h-2 w-36 bg-[#E5E7EB] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Thread header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-full bg-[#D9DDD6]" />
          <div>
            <div className="h-3 w-32 bg-[#D9DDD6] rounded mb-1.5" />
            <div className="h-2 w-20 bg-[#E5E7EB] rounded" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          {[false, true, false, false, true].map((isMe, i) => (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`h-10 rounded-2xl ${isMe ? 'bg-[#D9DDD6]' : 'bg-[#E5E7EB]'}`}
                style={{ width: `${30 + Math.random() * 30}%` }}
              />
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="h-10 w-full bg-[#E5E7EB] rounded-xl" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
rtk git add src/app/conversations/loading.tsx && rtk git commit -m "perf: skeleton loading conversations"
```

---

## Task 7 : loading.tsx — skeleton Analyse

**Files:**
- Create: `src/app/analyse/loading.tsx`

AnalyseView affiche des filtres pipeline/période + des graphes recharts.

- [ ] **Step 1 : Créer le skeleton**

```tsx
// src/app/analyse/loading.tsx
export default function AnalyseLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden p-5 animate-pulse">
      {/* Header + filters */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="h-8 w-24 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-[#E5E7EB] rounded-xl" />
          <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm">
            <div className="h-2.5 w-20 bg-[#E5E7EB] rounded mb-3" />
            <div className="h-7 w-14 bg-[#D9DDD6] rounded-lg" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm flex flex-col">
            <div className="h-3 w-32 bg-[#E5E7EB] rounded mb-4" />
            <div className="flex-1 flex items-end gap-2 pb-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <div
                  key={j}
                  className="flex-1 bg-[#E5E7EB] rounded-t"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
rtk git add src/app/analyse/loading.tsx && rtk git commit -m "perf: skeleton loading analyse"
```

---

## Task 8 : loading.tsx — skeletons génériques (7 routes)

**Files:**
- Create: `src/app/equipe/loading.tsx`
- Create: `src/app/taches/loading.tsx`
- Create: `src/app/transcripts/loading.tsx`
- Create: `src/app/logs/loading.tsx`
- Create: `src/app/knowledge/loading.tsx`
- Create: `src/app/budget/loading.tsx`
- Create: `src/app/parametres/loading.tsx`

Un skeleton générique réutilisé dans toutes ces routes : header + zone contenu avec blocs.

- [ ] **Step 1 : Créer les 7 fichiers**

Créer le fichier suivant dans **chacun** des 7 dossiers de route (`equipe`, `taches`, `transcripts`, `logs`, `knowledge`, `budget`, `parametres`) :

```tsx
// src/app/[route]/loading.tsx  (répéter pour chaque route)
export default function Loading() {
  return (
    <div className="h-full flex flex-col p-5 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="h-8 w-36 bg-[#D9DDD6] rounded-xl" />
        <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
      </div>

      {/* Content blocks */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm h-24 p-4 flex flex-col justify-between">
          <div className="h-3 w-48 bg-[#E5E7EB] rounded" />
          <div className="h-2.5 w-64 bg-[#D9DDD6] rounded" />
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6]">
                <div className="w-8 h-8 rounded-xl bg-[#E5E7EB] flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2.5 w-40 bg-[#D9DDD6] rounded mb-1.5" />
                  <div className="h-2 w-24 bg-[#E5E7EB] rounded" />
                </div>
                <div className="h-2.5 w-16 bg-[#E5E7EB] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier + commit**

```bash
rtk git add src/app/equipe/loading.tsx src/app/taches/loading.tsx src/app/transcripts/loading.tsx src/app/logs/loading.tsx src/app/knowledge/loading.tsx src/app/budget/loading.tsx src/app/parametres/loading.tsx
rtk git commit -m "perf: skeleton loading generique (7 routes)"
```

---

## Task 9 : next/dynamic — modals dans CalendarView

**Files:**
- Modify: `src/components/calendrier/CalendarView.tsx`

`CalendarView` importe `NewAppointmentModal` statiquement. Cette modal n'est jamais ouverte au chargement — elle gonfle le chunk `/calendrier` inutilement.

- [ ] **Step 1 : Remplacer l'import statique par dynamic**

Dans `src/components/calendrier/CalendarView.tsx`, trouver la ligne :

```ts
import NewAppointmentModal from './NewAppointmentModal'
```

La remplacer par :

```ts
import dynamic from 'next/dynamic'

const NewAppointmentModal = dynamic(() => import('./NewAppointmentModal'), {
  ssr: false,
})
```

- [ ] **Step 2 : Vérifier que le modal s'ouvre toujours correctement**

```bash
npm run dev
```

Naviguer vers /calendrier → cliquer "Nouveau RDV" → modal doit s'ouvrir normalement. Tester la création d'un RDV.

- [ ] **Step 3 : Commit**

```bash
rtk git add src/components/calendrier/CalendarView.tsx && rtk git commit -m "perf: CalendarView — NewAppointmentModal en dynamic"
```

---

## Task 10 : next/dynamic — modals dans KanbanBoard et ContactsView

**Files:**
- Modify: `src/components/pipeline/KanbanBoard.tsx`
- Modify: `src/components/contacts/ContactsView.tsx`

**KanbanBoard** importe `OppDetailModal` et `NewContactModal` statiquement.
**ContactsView** importe `NewContactModal` et `ImportModal` statiquement.

- [ ] **Step 1 : KanbanBoard — remplacer les imports**

Dans `src/components/pipeline/KanbanBoard.tsx`, trouver :

```ts
import OppDetailModal from './OppDetailModal'
import NewContactModal from '@/components/contacts/NewContactModal'
```

Remplacer par :

```ts
import dynamic from 'next/dynamic'

const OppDetailModal   = dynamic(() => import('./OppDetailModal'),                    { ssr: false })
const NewContactModal  = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })
```

- [ ] **Step 2 : ContactsView — remplacer les imports**

Dans `src/components/contacts/ContactsView.tsx`, trouver :

```ts
import NewContactModal from './NewContactModal'
import ImportModal from './ImportModal'
```

Remplacer par :

```ts
import dynamic from 'next/dynamic'

const NewContactModal = dynamic(() => import('./NewContactModal'), { ssr: false })
const ImportModal     = dynamic(() => import('./ImportModal'),     { ssr: false })
```

- [ ] **Step 3 : Vérifier les modals**

```bash
npm run dev
```

- /pipeline → cliquer sur une opportunité → OppDetailModal s'ouvre ✓
- /pipeline → cliquer "Nouveau contact" → NewContactModal s'ouvre ✓
- /contacts → cliquer "Nouveau" → NewContactModal s'ouvre ✓
- /contacts → cliquer "Importer" → ImportModal s'ouvre ✓

- [ ] **Step 4 : Commit**

```bash
rtk git add src/components/pipeline/KanbanBoard.tsx src/components/contacts/ContactsView.tsx
rtk git commit -m "perf: modals KanbanBoard + ContactsView en dynamic (ssr:false)"
```

---

## Task 11 : Cache GHL avec unstable_cache

**Files:**
- Modify: `src/lib/ghl.ts`
- Modify: `src/app/api/webhooks/ghl/route.ts`
- Modify: `src/app/calendrier/page.tsx` (supprimer revalidate = 0 redondant)
- Modify: `src/app/pipeline/page.tsx`
- Modify: `src/app/contacts/page.tsx`
- Modify: `src/app/conversations/page.tsx`
- Modify: `src/app/analyse/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

Note : `force-dynamic` reste sur toutes les pages (le CRM doit rester dynamique). `unstable_cache` cache les réponses GHL pour éviter de refaire l'appel réseau sur chaque requête.

- [ ] **Step 1 : Ajouter unstable_cache aux fonctions GHL**

En haut de `src/lib/ghl.ts`, ajouter l'import :

```ts
import { unstable_cache } from 'next/cache'
```

Puis wrapper les fonctions. **Remplacer** les 5 fonctions concernées :

```ts
export const getContacts = unstable_cache(
  async (limit = 100) => {
    const data = await ghlFetch(`/contacts/?locationId=${ghlLocationId()}&limit=${limit}`)
    return { contacts: (data.contacts ?? []) as GHLContact[], total: (data.meta?.total ?? 0) as number }
  },
  ['ghl-contacts'],
  { revalidate: 120, tags: ['ghl-contacts'] }
)

export const getOpportunities = unstable_cache(
  async (limit = 50, pipelineId?: string) => {
    let url = `/opportunities/search?location_id=${ghlLocationId()}&limit=${limit}`
    if (pipelineId) url += `&pipeline_id=${pipelineId}`
    const data = await ghlFetch(url)
    return (data.opportunities ?? []) as GHLOpportunity[]
  },
  ['ghl-opportunities'],
  { revalidate: 120, tags: ['ghl-opportunities'] }
)

export const getPipelines = unstable_cache(
  async () => {
    const data = await ghlFetch(`/opportunities/pipelines?locationId=${ghlLocationId()}`)
    return (data.pipelines ?? []) as GHLPipeline[]
  },
  ['ghl-pipelines'],
  { revalidate: 600, tags: ['ghl-pipelines'] }
)

export const getConversations = unstable_cache(
  async (limit = 50) => {
    const data = await ghlFetch(`/conversations/search?locationId=${ghlLocationId()}&limit=${limit}`)
    return (data.conversations ?? []) as GHLConversation[]
  },
  ['ghl-conversations'],
  { revalidate: 60, tags: ['ghl-conversations'] }
)

export const getCalendars = unstable_cache(
  async () => {
    const data = await ghlFetch(`/calendars/?locationId=${ghlLocationId()}`)
    return (data.calendars ?? []) as GHLCalendar[]
  },
  ['ghl-calendars'],
  { revalidate: 300, tags: ['ghl-calendars'] }
)
```

Laisser `getCalendarEvents` et `sendGHLMessage` **sans cache** (getCalendarEvents a un range temporel dynamique ; sendGHLMessage est une mutation).

- [ ] **Step 2 : Invalider le cache depuis le webhook GHL**

Dans `src/app/api/webhooks/ghl/route.ts`, ajouter en haut :

```ts
import { revalidateTag } from 'next/cache'
```

À la fin du handler POST (avant le `return NextResponse.json({ ok: true })`), ajouter :

```ts
// Invalider les caches GHL concernés par le webhook
revalidateTag('ghl-contacts')
revalidateTag('ghl-opportunities')
revalidateTag('ghl-conversations')
```

- [ ] **Step 3 : Supprimer les exports revalidate = 0 redondants**

Dans chacun des fichiers de page suivants, supprimer la ligne `export const revalidate = 0` (elle est redondante avec `force-dynamic`) :

- `src/app/calendrier/page.tsx` — supprimer `export const revalidate = 0`
- `src/app/pipeline/page.tsx` — supprimer `export const revalidate = 0`
- `src/app/contacts/page.tsx` — supprimer `export const revalidate = 0`
- `src/app/conversations/page.tsx` — supprimer `export const revalidate = 0`
- `src/app/analyse/page.tsx` — supprimer `export const revalidate = 0`
- `src/app/dashboard/page.tsx` — supprimer `export const revalidate = 0`

- [ ] **Step 4 : Vérifier que les pages fonctionnent**

```bash
npm run dev
```

Naviguer vers /contacts, /pipeline, /calendrier, /conversations, /analyse → les données s'affichent correctement. Naviguer vers chacune une deuxième fois → le chargement doit être plus rapide (données depuis cache).

- [ ] **Step 5 : Commit**

```bash
rtk git add src/lib/ghl.ts src/app/api/webhooks/ghl/route.ts src/app/calendrier/page.tsx src/app/pipeline/page.tsx src/app/contacts/page.tsx src/app/conversations/page.tsx src/app/analyse/page.tsx src/app/dashboard/page.tsx
rtk git commit -m "perf: cache GHL avec unstable_cache (60-600s) + revalidateTag sur webhook"
```

---

## Task 12 : Bundle analyzer — mesure des gains

**Files:**
- Modify: `next.config.mjs`
- Modify: `package.json` (devDependency)

- [ ] **Step 1 : Installer le bundle analyzer**

```bash
npm install --save-dev @next/bundle-analyzer
```

- [ ] **Step 2 : Mettre à jour next.config.mjs**

Remplacer le contenu de `next.config.mjs` par :

```js
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withBundleAnalyzer(nextConfig)
```

- [ ] **Step 3 : Lancer l'analyse**

```bash
ANALYZE=true npm run build
```

Le navigateur s'ouvre avec deux treemaps : bundle client et bundle serveur.

**Vérifier :**
- `googleapis` n'est PAS dans le bundle client (ne doit exister que côté serveur)
- `twilio` n'est PAS dans le bundle client
- `@dnd-kit/*` apparaît uniquement dans les chunks `/calendrier` et `/pipeline`
- `recharts` apparaît uniquement dans le chunk `/analyse`

**Si un module inattendu est dans le bundle client :** chercher l'import dans le code et ajouter `ssr: false` ou déplacer l'import dans une API route.

- [ ] **Step 4 : Commit**

```bash
rtk git add next.config.mjs package.json package-lock.json
rtk git commit -m "perf: ajout bundle analyzer (@next/bundle-analyzer)"
```

---

## Vérification finale

Après tous les commits :

- [ ] `npm run build` sans `ANALYZE=true` → build sans erreurs
- [ ] `npm run dev` → naviguer sur toutes les routes, vérifier que les skeletons apparaissent
- [ ] Tester en throttlant sur "Slow 3G" dans DevTools → zéro écran blanc
- [ ] Tester l'ouverture de chaque modal → toutes fonctionnent
- [ ] Tester la création d'un RDV dans le calendrier → fonctionne
- [ ] Aucune régression visuelle sur aucune page
