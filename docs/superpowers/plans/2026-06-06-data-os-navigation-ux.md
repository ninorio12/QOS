# Data OS — Navigation & UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tuer le flash/remount de la coquille (Sidebar + Header) lors de la navigation entre modules, et donner un feedback de clic immédiat, sans déplacer de dossiers ni toucher au contenu des modules.

**Architecture:** Aujourd'hui chaque route applicative monte `AppShell` via son propre `layout.tsx` ; comme les routes sœurs ne partagent pas leur layout en App Router, `AppShell` se démonte/remonte à chaque navigation. On déplace le montage d'`AppShell` dans le **root layout** via un wrapper client `ShellGate` qui décide, selon `usePathname()`, si la route porte la coquille (allowlist de préfixes = exactement les 22 routes qui l'avaient). `AppShell` vit alors dans le parent commun → ne remonte plus jamais. On ajoute une barre de progression de navigation globale (`nextjs-toploader`) pour le feedback de clic.

**Tech Stack:** Next.js 14.2 (App Router), React, framer-motion (déjà présent), SWR (déjà présent), `nextjs-toploader` (nouvelle dépendance, ~3 kB). Pas de test runner frontend → vérification via `next build` / `next lint` + checklist manuelle navigateur.

**Référence spec :** `docs/superpowers/specs/2026-06-06-data-os-navigation-ux-design.md`

---

## Décisions de scope (lire avant de commencer)

- **Allowlist, pas denylist.** `ShellGate` rend la coquille UNIQUEMENT pour les 22 préfixes listés (les routes qui avaient un layout `AppShell`). Tout le reste (login, formulaire, signer, seed-demo, cockpit, agents, conversion, architecture, agent, (public)/start, …) reste sans coquille — comportement **identique** à aujourd'hui. C'est plus robuste qu'une liste de routes publiques (aucun risque d'ajouter une coquille à une page qui n'en avait pas).
- **`(public)/layout.tsx` n'est PAS supprimé** : le grep `AppShell` le matchait via un commentaire (« pas d'AppShell »). Il n'utilise pas la coquille.
- **PREFETCH_MAP non étendu.** Le prefetch SWR au hover ne bénéficie réellement qu'à `conversations` et `devis` (clés SWR exactes). `dashboard`/`calendrier` utilisent des clés paramétrées (`?from=…`) et les autres modules sont en Convex/server → étendre serait du no-op. On laisse `PREFETCH_MAP` tel quel.
- **Pas de tests unitaires frontend** : le repo n'a aucun harness de test frontend (jest/playwright = `gateway/` backend). On vérifie par build + lint + manuel.

## File Structure

- **Create** `src/components/ShellGate.tsx` — wrapper client : décide coquille vs pas de coquille selon le pathname. Responsabilité unique : routage de la coquille.
- **Modify** `src/app/layout.tsx` — monte `ShellGate` autour de `children` et `NextTopLoader` (root layout, server component).
- **Delete** les 22 `src/app/<module>/layout.tsx` qui faisaient `return <AppShell>{children}</AppShell>`.
- **Modify** `src/components/Sidebar.tsx` — supprime le hack de sauvegarde/restauration du scroll (`sessionStorage.sidebar_scroll`), devenu inutile.
- **Modify** `package.json` / `package-lock.json` — ajout de `nextjs-toploader`.

`src/components/AppShell.tsx` reste **inchangé** (il est déjà `'use client'` et contient déjà `PageTransition`).

---

## Task 1: ShellGate — monter AppShell une seule fois dans le root layout

But : `AppShell` cesse de remonter entre modules. Le swap (création du gate + branchement + suppression des 22 layouts) se fait dans **un seul commit** car tout état intermédiaire serait incohérent (double coquille ou aucune coquille).

**Files:**
- Create: `src/components/ShellGate.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/{dashboard,prospection,workflows,logs,transcripts,conversations,onboarding,integrations,equipe,budget,parametres,contacts,knowledge,pipeline,calendrier,taches,paiement,performance,bibliotheque,devis,chatbot,communication}/layout.tsx`

- [ ] **Step 1: Vérifier qu'aucun `page.tsx` n'importe AppShell directement**

Run:
```bash
cd /root/QOS && grep -rl "AppShell" src/app --include="page.tsx"
```
Expected: aucune sortie (seuls les `layout.tsx` montent AppShell). Si une page l'importe, l'inclure dans le raisonnement avant de continuer.

- [ ] **Step 2: Créer `src/components/ShellGate.tsx`**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import AppShell from '@/components/AppShell'

/**
 * ShellGate — monte AppShell (Sidebar + Header) UNE seule fois, depuis le root
 * layout, pour que la coquille ne remonte jamais lors d'une navigation entre
 * modules (fin du flash / re-fetch user / reset scroll sidebar).
 *
 * Allowlist : la coquille s'affiche uniquement pour les routes applicatives qui
 * la portaient déjà (anciens `layout.tsx` -> <AppShell>). Toute autre route
 * (login, formulaire, signer, seed-demo, cockpit, agents, conversion,
 * architecture, agent, (public)/start, …) reste SANS coquille — comportement
 * identique à avant.
 */
const SHELL_PREFIXES = [
  '/dashboard', '/prospection', '/workflows', '/logs', '/transcripts',
  '/conversations', '/onboarding', '/integrations', '/equipe', '/budget',
  '/parametres', '/contacts', '/knowledge', '/pipeline', '/calendrier',
  '/taches', '/paiement', '/performance', '/bibliotheque', '/devis',
  '/chatbot', '/communication',
]

export default function ShellGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const withShell = SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  return withShell ? <AppShell>{children}</AppShell> : <>{children}</>
}
```

- [ ] **Step 3: Brancher `ShellGate` dans le root layout**

Dans `src/app/layout.tsx`, ajouter l'import et envelopper `children`. Remplacer le bloc `<Providers>…</Providers>` actuel :

```tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import ShellGate from '@/components/ShellGate'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'VividFlow Data OS',
  description: 'VividFlow Data OS',
  icons: {
    icon:             [
      { url: '/favicon.ico',    sizes: '48x48',  type: 'image/x-icon' },
      { url: '/favicon-32.png', sizes: '32x32',  type: 'image/png'    },
    ],
    apple:            { url: '/apple-touch-icon.png', sizes: '180x180' },
    shortcut:         '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <ShellGate>{children}</ShellGate>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
```

(Le `NextTopLoader` sera ajouté en Task 3 — ne pas l'ajouter ici.)

- [ ] **Step 4: Supprimer les 22 layouts par route**

Run:
```bash
cd /root/QOS && git rm \
  src/app/dashboard/layout.tsx src/app/prospection/layout.tsx \
  src/app/workflows/layout.tsx src/app/logs/layout.tsx \
  src/app/transcripts/layout.tsx src/app/conversations/layout.tsx \
  src/app/onboarding/layout.tsx src/app/integrations/layout.tsx \
  src/app/equipe/layout.tsx src/app/budget/layout.tsx \
  src/app/parametres/layout.tsx src/app/contacts/layout.tsx \
  src/app/knowledge/layout.tsx src/app/pipeline/layout.tsx \
  src/app/calendrier/layout.tsx src/app/taches/layout.tsx \
  src/app/paiement/layout.tsx src/app/performance/layout.tsx \
  src/app/bibliotheque/layout.tsx src/app/devis/layout.tsx \
  src/app/chatbot/layout.tsx src/app/communication/layout.tsx
```
Expected: 22 `rm` sans erreur.

- [ ] **Step 5: Confirmer qu'il ne reste aucun `layout.tsx` montant AppShell**

Run:
```bash
cd /root/QOS && for f in $(grep -rl "AppShell" src/app --include="layout.tsx"); do echo "$f"; grep -q "from '@/components/AppShell'" "$f" && echo "  -> IMPORTE AppShell (à vérifier)"; done
```
Expected: au plus `src/app/(public)/layout.tsx` listé (faux positif via commentaire), SANS la ligne « -> IMPORTE AppShell ». Aucun autre fichier.

- [ ] **Step 6: Build**

Run:
```bash
cd /root/QOS && npm run build
```
Expected: build réussi, aucune erreur de route (« You cannot have two parallel pages », conflit de segment) ni d'import cassé.

- [ ] **Step 7: Lint**

Run:
```bash
cd /root/QOS && npm run lint
```
Expected: aucune nouvelle erreur (warnings préexistants tolérés).

- [ ] **Step 8: Vérification manuelle (navigateur, `npm run dev`)**

Run: `cd /root/QOS && npm run dev` puis ouvrir http://localhost:3000 (ou le port affiché).
Checklist :
- Naviguer entre `/dashboard` → `/conversations` → `/contacts` → `/pipeline` : la **sidebar ne flashe pas** (avatar/nom stables, pas d'écran vide `!isLoaded`), le **header reste fixe**, seule la zone de contenu change.
- Le scroll de la sidebar (si la liste dépasse) reste à sa position entre deux navigations.
- Routes sans coquille toujours sans coquille : `/login`, `/formulaire`, `/seed-demo`, `/cockpit`, `/agents` → pas de sidebar/header.
- `/signer/<token>` (page publique de signature) → pas de coquille.

- [ ] **Step 9: Commit**

```bash
cd /root/QOS && git add src/components/ShellGate.tsx src/app/layout.tsx && \
git commit -m "perf(nav): monte AppShell une seule fois via ShellGate (root layout) — fin du remount/flash entre modules"
```

---

## Task 2: Supprimer le hack de scroll de la sidebar

La sidebar ne remonte plus → le hack `sessionStorage.sidebar_scroll` (qui restaurait le scroll après chaque remount) est inutile et ajoute du bruit.

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Confirmer qu'aucun autre code n'utilise la clé**

Run:
```bash
cd /root/QOS && grep -rn "sidebar_scroll" src
```
Expected: les occurrences uniquement dans `src/components/Sidebar.tsx`.

- [ ] **Step 2: Retirer les deux effets de scroll**

Dans `src/components/Sidebar.tsx`, supprimer ce bloc (les deux hooks + le commentaire au-dessus, actuellement autour des lignes 242-259) :

```tsx
  // Restore the saved scroll position BEFORE the browser paints, so the
  // remount (each route re-wraps its own <AppShell>) never flashes scrollTop=0
  // then jumps to the saved offset — that post-paint jump is what made the
  // bottom sections (Agentique / Configuration) visibly shift on navigation.
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const saved = sessionStorage.getItem('sidebar_scroll')
    if (saved) nav.scrollTop = parseInt(saved, 10)
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const save = () => sessionStorage.setItem('sidebar_scroll', String(nav.scrollTop))
    nav.addEventListener('scroll', save, { passive: true })
    return () => nav.removeEventListener('scroll', save)
  }, [])
```

`navRef` reste utilisé par le `<nav ref={navRef} …>` — ne pas le supprimer.

- [ ] **Step 3: Nettoyer les imports inutilisés**

Si `useLayoutEffect` et/ou `useEffect` ne sont plus utilisés ailleurs dans le fichier, retirer leur import. Vérifier :
```bash
cd /root/QOS && grep -nE "useLayoutEffect|useEffect" src/components/Sidebar.tsx
```
Ajuster la ligne `import { useEffect, useLayoutEffect, useRef, useState } from 'react'` pour ne garder que ce qui reste référencé (au minimum `useRef`, `useState`, et `useEffect` s'il sert encore).

- [ ] **Step 4: Lint (capte les imports/variables inutilisés)**

Run:
```bash
cd /root/QOS && npm run lint
```
Expected: aucune erreur « is defined but never used » sur `useLayoutEffect`/`useEffect`.

- [ ] **Step 5: Build**

Run:
```bash
cd /root/QOS && npm run build
```
Expected: build réussi.

- [ ] **Step 6: Vérification manuelle**

Recharger l'app, scroller la sidebar, naviguer entre modules : le scroll de la sidebar reste stable (persistance native, plus via sessionStorage). Aucun saut.

- [ ] **Step 7: Commit**

```bash
cd /root/QOS && git add src/components/Sidebar.tsx && \
git commit -m "refactor(sidebar): retire le hack sessionStorage de scroll, inutile depuis le shell persistant"
```

---

## Task 3: Barre de progression de navigation (feedback de clic)

Donne un retour visuel immédiat à chaque clic de navigation, même quand la data charge. `useLinkStatus` n'existant qu'en Next 15.3+, on utilise `nextjs-toploader` (App Router, Next 13/14).

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Installer la dépendance**

Run:
```bash
cd /root/QOS && npm install nextjs-toploader
```
Expected: `nextjs-toploader` ajouté à `dependencies`, install sans erreur.

- [ ] **Step 2: Monter `<NextTopLoader />` dans le root layout**

Dans `src/app/layout.tsx`, ajouter l'import et placer le loader en tête du `<body>`, avant `ShellGate` :

```tsx
import NextTopLoader from 'nextjs-toploader'
```

et dans le rendu :

```tsx
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextTopLoader
          color="#FF4D00"
          height={2}
          showSpinner={false}
          shadow={false}
        />
        <Providers>
          <ShellGate>{children}</ShellGate>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
```

- [ ] **Step 3: Build**

Run:
```bash
cd /root/QOS && npm run build
```
Expected: build réussi, `nextjs-toploader` résolu.

- [ ] **Step 4: Vérification manuelle**

`npm run dev`, puis :
- Cliquer sur plusieurs modules dans la sidebar → une fine barre orange (`#FF4D00`, 2px) apparaît en haut au clic et disparaît quand la page est rendue.
- Aucun spinner (désactivé).
- Avec `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate CSS prefers-reduced-motion), la barre n'a pas d'animation superflue — la règle globale `@media (prefers-reduced-motion: reduce)` de `globals.css` (sélecteur `*`) neutralise déjà les animations CSS du loader. Confirmer visuellement.

- [ ] **Step 5: Commit**

```bash
cd /root/QOS && git add package.json package-lock.json src/app/layout.tsx && \
git commit -m "feat(nav): barre de progression de navigation (nextjs-toploader) pour feedback de clic immédiat"
```

---

## Self-Review (rempli)

**Spec coverage :**
- Couche 1 (fin du remount via conditional shell + suppression des layouts + suppression du hack scroll) → Task 1 + Task 2. ✅
- Couche 2 — feedback de clic immédiat (barre de progression) → Task 3. ✅
- Couche 2 — prefetch hover « généralisé » → **intentionnellement non fait** : justifié dans « Décisions de scope » (no-op pour les modules Convex/paramétrés ; `conversations`/`devis` déjà couverts). À confirmer avec l'utilisateur.
- Hors scope (route group, skeletons, cross-fade, layoutId) → non touchés. ✅

**Placeholder scan :** aucun TODO/TBD ; tout le code est complet et exact.

**Type/nom consistency :** `ShellGate` / `SHELL_PREFIXES` / `NextTopLoader` cohérents entre tasks. `navRef` conservé en Task 2. Liste des 22 préfixes = liste des 22 fichiers supprimés (mêmes segments).

**Risques :** voir la section « Risques & mitigations » du spec. Le risque principal (double coquille) est neutralisé en faisant le swap dans un commit atomique (Task 1). Le risque de faux positif de préfixe est écarté par `pathname === p || startsWith(p + '/')`.
